# Load Ledger

Mobile-first range-data and ammunition-development recordkeeping app.

> Load Ledger is a personal recordkeeping and data-analysis tool. It does not provide load data, pressure predictions, safety limits, substitutions, or ammunition recommendations. Always follow published component-manufacturer load data and safe reloading practices.

## Architecture

| Layer | Tech | Hosting |
|---|---|---|
| App (PWA now, iOS/Android later) | React + TypeScript + Vite, Dexie (IndexedDB) | Vercel (`frontend/`) |
| API | Node + Express + TypeScript | Render (`backend/`) |
| Database / Auth / Files | Supabase Postgres + RLS, Supabase Auth, Storage bucket `range-files` | Supabase (`load-ledger-prod`) |

### Local-first by design
Every screen reads and writes **the phone's local database** (`frontend/src/data/db.ts`). The sync engine
(`frontend/src/lib/sync.ts`) pushes unsynced records to `/api/sync/push` and pulls changes from `/api/sync/pull`
whenever a connection is available (on launch, on reconnect, every 30 s). Records use client-generated UUIDs,
`updated_at` timestamps, and soft deletes (`deleted_at`), so data captured with no signal is never lost and
merges cleanly later. The header badge shows `Synced`, `N to sync`, or `Offline · N saved on phone`.

This is the same model the native apps will use, so moving to the App Store / Play Store does not require a rewrite.

## Repo layout
```
frontend/   React PWA (Vercel root directory)
backend/    Express API (Render root directory)
supabase/migrations/  SQL schema, RLS policies, storage bucket
docs/       Roadmap and native-app plan
```

## Local development
```bash
cd backend && npm install && SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... npm run dev   # :3001
cd frontend && cp .env.example .env.local && npm install && npm run dev                 # :5173
```

## Deploys
- **Vercel**: project root `frontend`, build `npm run build`, output `dist`. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_URL`.
- **Render**: see `render.yaml`. Health check `/health`.
- Branch flow: work on feature branches → PR → `main` auto-deploys.
