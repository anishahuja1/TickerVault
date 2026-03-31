# TickerVault — Deployment Guide

## Live URLs (fill in after deploying)
- Frontend: https://tickervault.vercel.app
- Backend:  https://tickervault-api.onrender.com
- API Docs: https://tickervault-api.onrender.com/docs

---

## STEP-BY-STEP DEPLOYMENT

### STEP 1 — Push code to GitHub

```bash
cd stock-watchlist    # your project root
git init
git add .
git commit -m "Initial commit — TickerVault"
```

Go to https://github.com/new and create a new repository called `TickerVault`.
Then run:

```bash
git remote add origin https://github.com/anishahuja1/TickerVault.git
git branch -M main
git push -u origin main
```

---

### STEP 2 — Set up Database on Supabase (FREE)

1. Go to https://supabase.com → Sign up free
2. Click "New Project"
   - Name: `tickervault`
   - Password: create a strong password (save it!)
   - Region: pick closest to you
3. Wait ~2 minutes for project to start
4. Go to: Settings → Database → Connection String → URI
5. Copy the URI — it looks like:
   `postgresql://postgres:[YOUR-PASSWORD]@db.abcdefgh.supabase.co:5432/postgres`
6. Save this — you need it in Step 3

> Supabase free tier: 500MB storage, 2 projects, no credit card needed.

---

### STEP 3 — Deploy Backend on Render (FREE)

1. Go to https://render.com → Sign up free (use GitHub login)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo → select `tickervault`
4. Fill in settings:
   - **Name**: `tickervault-api`
   - **Root Directory**: `stock-watchlist/backend`  *(Note: Path adjusted for your actual repo structure)*
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
5. Click "Advanced" → "Add Environment Variable" — add ALL of these:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (paste from Supabase Step 2) |
   | `SECRET_KEY` | (generate: run `openssl rand -hex 32` in terminal) |
   | `ALGORITHM` | `HS256` |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` |
   | `FRONTEND_URL` | `https://tickervault.vercel.app` (update after Step 4) |

6. Click "Create Web Service"
7. Wait 3-5 minutes for first deploy
8. Copy your Render URL: `https://tickervault-api.onrender.com`

> Render free tier: service sleeps after 15 min inactivity. First request after sleep takes ~30 seconds.
> To avoid this, use Render's "cron job" to ping /health every 14 minutes (see Step 5).

---

### STEP 4 — Deploy Frontend on Vercel (FREE)

1. Update `.env.production`:
   ```
   VITE_API_URL=https://tickervault-api.onrender.com
   ```
   (replace with your actual Render URL from Step 3)

2. Commit and push:
   ```bash
   git add .
   git commit -m "Add production env config"
   git push
   ```

3. Go to https://vercel.com → Sign up free (use GitHub login)
4. Click "New Project" → Import your `tickervault` GitHub repo
5. Fill in settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` *(Your frontend is in the root directory)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add Environment Variable:
   - `VITE_API_URL` = `https://tickervault-api.onrender.com`
7. Click "Deploy"
8. Wait ~2 minutes
9. Copy your Vercel URL: `https://tickervault.vercel.app`

---

### STEP 5 — Update CORS on Backend

After you have your Vercel URL:

1. Go to Render dashboard → tickervault-api → Environment
2. Update `FRONTEND_URL` to your actual Vercel URL:
   `https://tickervault-abc123.vercel.app`
3. Click "Save Changes" → Render auto-redeploys

---

### STEP 6 — Keep Render Awake (Optional but Recommended)

Render free tier sleeps after 15 minutes. To keep it awake:

1. Go to Render dashboard → "Cron Jobs" → "New Cron Job"
2. Command: `curl https://tickervault-api.onrender.com/health`
3. Schedule: `*/14 * * * *` (every 14 minutes)
4. This is free and keeps your backend always responsive

---

### STEP 7 — Verify Everything Works

After all 4 steps:

1. Open your Vercel URL in browser
2. Register a new account
3. Search for AAPL → add to watchlist
4. Confirm:
   - ✅ Price loads
   - ✅ Change % shows (not 0.00)
   - ✅ Top right shows "ONLINE" (green dot)
   - ✅ Click AAPL → candlestick chart loads
   - ✅ Prices update every 10 seconds

---

## IMPORTANT: WebSocket on Render Free Tier

Render's **free tier does NOT support WebSockets**.
This means the "ONLINE" indicator won't work and live price updates won't stream.

**Option A — Upgrade Render (recommended, $7/month)**
Render Starter plan supports WebSockets fully.

**Option B — Use Railway instead of Render**
Railway.app free tier ($5 free credit/month) supports WebSockets.
Setup is identical to Render.
