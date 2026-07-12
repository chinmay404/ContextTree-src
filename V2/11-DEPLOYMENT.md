# V2 — Deployment (go-live runbook)

Backend: Render (blueprint in `ContextTree/render.yaml`, branch `main`,
Frankfurt — co-located with Supabase eu-west-1). Frontend: Vercel (already
deploys `ContextTree-src` main). Database: Supabase `ContextTree_prod`
(migrations 001–003 applied).

## Owner steps (one time, ~10 min)

1. **Render**: render.com → New → Blueprint → connect GitHub repo
   `chinmay404/ContextTree` (branch main). It reads render.yaml.
2. Paste env vars in the Render dashboard (values are in your local
   `ContextTree/.env`): `DATABASE_URL`, `BACKEND_JWT_SECRET`,
   `GROQ_API_KEY`, `GOOGLE_API_KEY`, `BYOK_ENCRYPTION_SECRET`
   (+ `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` if you want those providers
   server-side). Deploy. Migrations run automatically on start.
3. Verify: `https://<your-service>.onrender.com/api/v1/health/` → healthy.
4. **Vercel** (project ContextTree-src) → Settings → Environment Variables:
   - `DATABASE_URL` = same new Supabase URL (NextAuth sessions + interim
     data layer need it)
   - `BACKEND_JWT_SECRET` = SAME value as Render
   - `LLM_API_URL` = `https://<your-service>.onrender.com/api/v1/chat`
   Redeploy the frontend.
5. Tell the agent "backend is live" → it reverts the shutdown sign-in page
   (`git revert 858717f`), verifies sign-in + a real chat turn end-to-end,
   and pushes.

## Notes

- The shutdown page stays up BY DESIGN until step 5 — it is currently the
  truth (no backend running).
- Render free tier sleeps after idle → first request ~30s cold start.
  Acceptable for private beta; upgrade to Starter ($7) when real users
  arrive.
- Old EC2 backend + duckdns URL are dead; `lib/llm-backend.ts` default
  production URL should be updated to the Render URL in step 5's commit.
