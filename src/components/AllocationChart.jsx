import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = [
  '#22d3ee', // Cyan
  '#818cf8', // Indigo
  '#fbbf24', // Amber
  '#34d399', // Emerald
  '#f472b6', // Pink
  '#a78bfa', // Violet
  '#f87171', // Red
  '#60a5fa', // Blue
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-bg-surface border border-border-subtle p-3 rounded-xl shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-200">
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{data.ticker}</p>
        <p className="text-sm font-black text-text-primary mb-1">${data.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        <p className="text-[9px] font-bold text-accent uppercase tracking-tighter">{(data.percent * 100).toFixed(1)}% of Portfolio</p>
      </div>
    );
  }
  return null;
};

export default function AllocationChart({ holdings }) {
  const chartData = holdings
    .filter(h => h.market_value > 0)
    .map(h => ({
      name: h.ticker,
      ticker: h.ticker,
      value: h.market_value,
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="w-full h-[240px] relative group">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
            animationDuration={800}
            animationBegin={200}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
                className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-40">Assets</span>
        <span className="text-xs font-black text-text-primary tracking-tighter">{chartData.length}</span>
      </div>
    </div>
  );
}
