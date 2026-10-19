# Deployment — Context Tree

_Last updated: 2026-10-19 by Claude. Names only — never keys, tokens or connection strings._
_What is running right now lives in STATE.md ("What's live"), not here._

## Where it runs
| Env | Provider | Service | URL |
|---|---|---|---|
| prod frontend | Vercel | project `ContextTree-src` (GitHub `chinmay404/ContextTree-src`, `main`) | https://contexttree.tech |
| prod backend | Railway | FastAPI (`chinmay404/ContextTree`, `main`) | api-production-310d.up.railway.app |
| prod database | Supabase | Postgres, eu-west-1, transaction pooler :6543 | — |

## How to deploy
- Frontend: push to `main` → Vercel Git integration builds it.
- Backend: push to `main` should auto-deploy, but Railway auto-deploy was observed dead on 2026-07-18;
  fallback is `railway up` (Railway CLI logged out locally — owner must log in or provide a token).
- Migrations: `railway.json` start command runs `python scripts/migrate.py` before uvicorn, so a deploy applies them.
  Fallback: run `scripts/migrate.py` locally against prod (owner approval).
- Who can run it: owner.

## Config
- Frontend settings (Vercel): `DATABASE_URL`, `BACKEND_JWT_SECRET`, `LLM_API_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `MAX_ACTIVE_USERS`, `NEXT_PUBLIC_ADMIN_EMAILS`, BYOK secret.
- Backend settings (Railway): `DATABASE_URL`, `BACKEND_JWT_SECRET`, `BYOK_ENCRYPTION_SECRET`, provider API keys.
- Local values: `ContextTree-src/.env.local`, `ContextTree/.env` (never commit).

## Check it is alive
- https://contexttree.tech returns 200; backend `/api/v1/health/`.

## Roll back
- Frontend: promote the previous deployment in Vercel. Backend: redeploy previous commit on Railway.
  Migrations are forward-only — roll back with a new migration.

## Gone wrong before
- 2026-07-12 — session pooler exhausted (EMAXCON) under serverless fan-out — switched to transaction pooler, pools capped at 3.
- 2026-07-18 — Railway auto-deploy silently stopped — deployed with `railway up`.
- 2026-07-13 — a fix sat unpushed for 4 days while prod stayed broken — "checkpoint" means commit AND push.
