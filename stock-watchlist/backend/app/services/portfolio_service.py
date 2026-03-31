"""
TickerVault — Portfolio Service.

Manages buy/sell transactions and computes portfolio holdings,
P&L, and allocation breakdowns.
"""

from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..exceptions import InsufficientSharesError, PortfolioLimitError
from ..repositories.portfolio_repository import PortfolioRepository
from ..schemas.portfolio import (
    HoldingResponse,
    PortfolioSummary,
    TransactionListResponse,
    TransactionResponse,
)
from .stock_service import StockService


class PortfolioService:
    """Business logic for portfolio tracking."""

    def __init__(self, db: AsyncSession):
        self.repo = PortfolioRepository(db)
        self.stock_service = StockService()
        self.settings = get_settings()

    async def add_transaction(
        self,
        user_id: int,
        ticker: str,
        company_name: str,
        transaction_type: str,
        quantity: float,
        price_per_share: float,
        notes: str | None = None,
        transacted_at=None,
    ) -> TransactionResponse:
        """
        Record a buy or sell transaction.

        For sell transactions, validates sufficient shares are held.
        """
        ticker = ticker.upper()

        # Check transaction limit
        count = await self.repo.count(user_id)
        if count >= self.settings.MAX_PORTFOLIO_TRANSACTIONS:
            raise PortfolioLimitError(self.settings.MAX_PORTFOLIO_TRANSACTIONS)

        # For sell: validate sufficient shares
        if transaction_type == "sell":
            holdings = await self._compute_holdings_raw(user_id)
            held = holdings.get(ticker, {}).get("total_shares", 0)
            if quantity > held:
                raise InsufficientSharesError(ticker, held, quantity)

        # Auto-fetch company name if not provided
        if not company_name:
            try:
                info = await self.stock_service.get_company_info(ticker)
                company_name = info.get("name", ticker)
            except Exception:
                company_name = ticker

        txn = await self.repo.create(
            user_id=user_id,
            ticker=ticker,
            company_name=company_name,
            transaction_type=transaction_type,
            quantity=quantity,
            price_per_share=price_per_share,
            notes=notes,
            transacted_at=transacted_at,
        )
        return TransactionResponse(
            id=txn.id,
            ticker=txn.ticker,
            company_name=txn.company_name,
            transaction_type=txn.transaction_type,
            quantity=txn.quantity,
            price_per_share=txn.price_per_share,
            total_amount=txn.total_amount,
            notes=txn.notes,
            transacted_at=txn.transacted_at,
            created_at=txn.created_at,
        )

    async def get_transactions(self, user_id: int) -> TransactionListResponse:
        """Get all transactions for a user."""
        txns = await self.repo.get_all(user_id)
        return TransactionListResponse(
            transactions=[
                TransactionResponse(
                    id=t.id,
                    ticker=t.ticker,
                    company_name=t.company_name,
                    transaction_type=t.transaction_type,
                    quantity=t.quantity,
                    price_per_share=t.price_per_share,
                    total_amount=t.total_amount,
                    notes=t.notes,
                    transacted_at=t.transacted_at,
                    created_at=t.created_at,
                )
                for t in txns
            ],
            count=len(txns),
        )

    async def get_portfolio_summary(self, user_id: int) -> PortfolioSummary:
        """
        Compute the full portfolio summary with live prices.

        Aggregates transactions per ticker to compute:
        - Total shares held
        - Average cost basis
        - Current value (from live quotes)
        - Unrealized P&L
        - Allocation percentages
        """
        raw = await self._compute_holdings_raw(user_id)
        if not raw:
            return PortfolioSummary(
                total_invested=0,
                current_value=0,
                total_pnl=0,
                total_pnl_percent=0,
                holdings=[],
                holdings_count=0,
                transactions_count=await self.repo.count(user_id),
            )

        # Fetch live prices for all held tickers
        held_tickers = [t for t, h in raw.items() if h["total_shares"] > 0]
        quotes = await self.stock_service.get_batch_quotes(held_tickers)

        holdings = []
        total_invested = 0.0
        total_current_value = 0.0

        for ticker, data in raw.items():
            if data["total_shares"] <= 0:
                continue  # Fully sold off

            quote = quotes.get(ticker, {})
            current_price = quote.get("price", 0)
            current_value = round(data["total_shares"] * current_price, 2)
            invested = round(data["total_shares"] * data["avg_cost"], 2)
            pnl = round(current_value - invested, 2)
            pnl_pct = round((pnl / invested) * 100, 2) if invested != 0 else 0

            holdings.append(
                HoldingResponse(
                    ticker=ticker,
                    company_name=data["company_name"],
                    total_shares=round(data["total_shares"], 4),
                    avg_cost=round(data["avg_cost"], 2),
                    total_invested=invested,
                    current_price=current_price,
                    current_value=current_value,
                    unrealized_pnl=pnl,
                    unrealized_pnl_percent=pnl_pct,
                    day_change=quote.get("change", 0),
                    day_change_percent=quote.get("change_percent", 0),
                )
            )
            total_invested += invested
            total_current_value += current_value

        # Calculate allocation percentages
        for h in holdings:
            h.allocation_percent = (
                round((h.current_value / total_current_value) * 100, 2)
                if total_current_value > 0
                else 0
            )

        total_pnl = round(total_current_value - total_invested, 2)
        total_pnl_pct = (
            round((total_pnl / total_invested) * 100, 2) if total_invested != 0 else 0
        )

        return PortfolioSummary(
            total_invested=total_invested,
            current_value=round(total_current_value, 2),
            total_pnl=total_pnl,
            total_pnl_percent=total_pnl_pct,
            holdings=sorted(holdings, key=lambda h: h.current_value, reverse=True),
            holdings_count=len(holdings),
            transactions_count=await self.repo.count(user_id),
        )

    async def _compute_holdings_raw(self, user_id: int) -> dict:
        """
        Aggregate all transactions to compute net holdings.

        Uses weighted average cost basis method:
        - Buy: adds shares, adjusts avg cost
        - Sell: removes shares (FIFO avg cost stays same)
        """
        tickers = await self.repo.get_distinct_tickers(user_id)
        holdings = {}

        for ticker in tickers:
            txns = await self.repo.get_by_ticker(user_id, ticker)
            total_shares = 0.0
            total_cost = 0.0
            company_name = ""

            for txn in txns:
                company_name = txn.company_name or company_name
                if txn.transaction_type == "buy":
                    total_cost += txn.quantity * txn.price_per_share
                    total_shares += txn.quantity
                elif txn.transaction_type == "sell":
                    if total_shares > 0:
                        # Reduce cost proportionally
                        avg = total_cost / total_shares
                        total_cost -= txn.quantity * avg
                        total_shares -= txn.quantity

            avg_cost = (total_cost / total_shares) if total_shares > 0 else 0

            holdings[ticker] = {
                "total_shares": total_shares,
                "avg_cost": avg_cost,
                "total_cost": total_cost,
                "company_name": company_name,
            }

        return holdings
