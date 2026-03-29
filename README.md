# TrackAm

AI-powered financial tracker for Africa's informal economy. Log income and expenses by text or photo, get AI-driven insights, and set savings goals.

## Stack

- Nuxt 4 · Vue 3 · Tailwind CSS · Nuxt UI
- Pinia (state, persisted to localStorage)
- Supabase Auth (email + Google OAuth)
- PWA-ready

## Local Setup

**Prerequisites:** Node.js 20+, pnpm

1. Copy the env template and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

2. Install and run:
   ```bash
   pnpm install
   pnpm dev
   ```

App runs at `http://localhost:3000`. Requires the [trackam-api](https://github.com/Phinart98/trackam-api) backend running on port 8080.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NUXT_PUBLIC_API_BASE_URL` | Backend URL (`http://localhost:8080` for dev) |
| `NUXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

## Deployment

Deploy to Vercel. Set the three environment variables above in project settings, pointing `NUXT_PUBLIC_API_BASE_URL` at your Cloud Run backend URL.

## Project Structure

```
app/
├── pages/         # Route views (dashboard, transactions, goals, advisor, settings)
├── components/    # Shared UI components
├── stores/        # Pinia stores (auth, transactions, goals, categories)
├── composables/   # useAI, useConfirm, etc.
├── utils/         # formatters, forecasting
└── types/         # TypeScript interfaces
```
