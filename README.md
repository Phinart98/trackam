# TrackAm

**AI-powered financial tracker for Africa's informal economy.** Built for the BeOrchid Africa Developers Hackathon 2026 (FinTech track). Solo build by [Philip Narteh](https://github.com/Phinart98), Accra.

→ Live: **https://trackam-indol.vercel.app**
→ Backend repo: [trackam-api](https://github.com/Phinart98/trackam-api) (Spring Boot + Spring AI on Cloud Run)
→ Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## What it does

85% of African workers are informal — market traders, trotro drivers, food vendors — and existing tools (QuickBooks, Expensify) were built for Western formal businesses. TrackAm removes the friction:

- **Type it.** "Bought 3 bags of rice 150 cedis at Makola" → AI extracts amount, category, vendor, type, confidence.
- **Snap it.** A MoMo screenshot or printed receipt → vision AI extracts the same fields.
- **Speak it.** Voice → Groq Whisper transcribes → text parser fills the form.
- **Ask it.** "Where do I spend the most?" → tool-use advisor queries your real transaction SQL and answers with grounded numbers.

Each AI parse surfaces a violet `AI parsed · X.Xs` badge and a `How I parsed this` panel that highlights the exact tokens in your input that drove each field. The AI is never a black box.

## How it works (the "AI moment" flow)

```
1. User types in /add → "Trotro from Madina 5 cedis"
2. Frontend POST /api/ai/parse-text { text, currency } + Bearer JWT
3. Backend AiService.callWithFallback(userId, "parse-text", ...):
     · primary  : Google Gemini Flash-Lite  (cheap + fast)
     · fallback : Groq Llama 4 Scout
     · fallback : Google Gemini Flash       (complex reasoning)
     · last     : Cerebras gpt-oss-120b     (different vendor)
4. Schema-validated ParsedTransaction → returned
5. Frontend renders:
     · AI moment badge: "AI parsed · 0.4s"
     · Editable form with parsed values
     · Collapsible "How I parsed this" reasoning trace
     · Confidence bar (red <80, yellow 80–89, green ≥90)
6. User confirms → POST /api/transactions → Supabase
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full architecture, reliability layer, and the data flow end-to-end.

## Stack

- **Nuxt 4** · **Vue 3** · **Tailwind CSS 4** · **Nuxt UI 4**
- **Pinia** (state, persisted via `pinia-plugin-persistedstate`)
- **Chart.js + vue-chartjs** (income/expense, category doughnut, activity heatmap)
- **Supabase JS SDK** (auth — JWT validated server-side via JWKS)
- **PWA-ready** via `@vite-pwa/nuxt`

## Local setup

**Prerequisites:** Node.js 20+, pnpm 10+

1. Copy the env template and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

2. Install and run:
   ```bash
   pnpm install
   pnpm dev
   ```

App runs at `http://localhost:3000` (or `3333` if 3000 is taken). The `dev` script loads `.env.local` automatically.

Requires the [trackam-api](https://github.com/Phinart98/trackam-api) backend (locally on port 8080, or pointed at the Cloud Run URL).

## Environment variables

| Variable | Description |
|----------|-------------|
| `NUXT_PUBLIC_API_BASE_URL` | Backend URL (`http://localhost:8080` for dev, Cloud Run URL for prod) |
| `NUXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

## Deployment

Deploys to Vercel. Push to `master` → auto-deploy. Set the three env vars above in Project Settings, pointing `NUXT_PUBLIC_API_BASE_URL` at your Cloud Run backend URL.

Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are applied via [`vercel.json`](vercel.json).

## Project structure

```
app/
├── pages/         # dashboard, add, history, advisor, goals, categories, more, login, onboarding
├── components/    # shared UI
├── stores/        # Pinia: auth, transactions, goals, categories, chat
├── composables/   # useAI, useSupabase, useAuthToken, useVoice, useConfirm
├── utils/         # formatters, forecasting, parseBreakdown (AI moment reasoning)
├── middleware/    # auth.global (route guards, gated on auth._initialized)
└── types/         # TypeScript interfaces
docs/
└── ARCHITECTURE.md  # full architecture + reliability layer + data flow
```
