# V2 — The 30-Day Plan (day by day)

Goal (decision §7): **day-30 revenue > infra**, ≥10 activated beta users,
zero cross-tenant access, a stranger can pay unassisted.

Sequencing logic: security → data ownership → the three money features →
polish → sell. Marketing is NOT saved for week 4 — community presence
starts day 8, because launch-day strangers don't buy; two-week-old
acquaintances do.

Solo-founder honesty: every day below is 4–6 focused hours. If a day
slips, cut from §"Slack" — never from Security, Tenancy tests, or the
three money features (F1/F2/F3).

---

## Week 1 — Trust boundary & foundation (nobody sees this week; everything stands on it)

| Day | Work | Done-when |
|-----|------|-----------|
| **0** | **(DONE 2026-07-12) Landing page redesign, explorer-first** — new single landing component with F0a/F0b-led copy (spec §8), wired into `page.tsx`, pushed | New landing live in the repo before any other work |
| 1 | Repo hygiene **in the existing two repos** (owner decision 2026-07-12: no monorepo — development stays in `ContextTree/` + `ContextTree-src/`): delete cut-list debris, tighten .gitignore, **rotate every secret** (.env, .pem, Supabase, Stripe, provider keys) then remove those files | Old keys revoked; clean `git log` going forward |
| 2 | Migration runner (`scripts/migrate.py`) + migration 001 baseline; remove runtime DDL (NextAuth adapter + PostgresStore setup) | Fresh DB from migrations == prod schema |
| 3 | Migration 002: UUID identity, backfill, `user_email` → `user_id` FKs | App runs on UUIDs end-to-end; emails out of LangSmith |
| 4 | **JWT trust boundary**: Next proxy mints HS256 token; FastAPI middleware verifies; delete `ChatMessage.user_id`; store call sites use verified id | Forged/absent-token requests rejected in tests |
| 5 | **Tenancy test suite** (the launch blocker, arch §7 row 1) + Postgres quota buckets replacing SlowAPI | Cross-tenant matrix green; quota survives restart/2 workers |
| 6 | Single-writer: FastAPI canvas/node/message CRUD endpoints; delete Next CRUD routes + `lib/mongodb.ts`; ONE psycopg3 pool in lifespan | Frontend saves through FastAPI only; psycopg2 gone |
| 7 | Migration 006 layout-blob strip (kills dual-write) + `canvases.version` optimistic concurrency; **backup + rehearsed restore** | Restore runbook executed once for real |

## Week 2 — The product becomes V2 (cut, then build the money features)

| Day | Work | Done-when |
|-----|------|-----------|
| 8 | Execute the frontend cut list (routes, components, deps). Renames: `mongo_store`→`store`, package name. **Evening: create accounts + start lurking/helpfully posting in r/WritingWithAI + 2 writer Discords** (no pitching yet) | Build passes ~40% lighter; community presence day 1 |
| 9 | Console split (spec §7) + branch **names** (migration 003) + lineage color stripes | Rename a branch inline; tree readable at a glance |
| 10 | **F1 compare**: sibling select → side-by-side modal → continue/promote (collapse losers) | Fork "Version A/B", compare, promote — the demo loop works |
| 11 | **F3 compile-a-path** → Markdown/JSON export, client-side | Export of a 3-branch path reads as clean prose |
| 12 | **F2 Codex** part 1: `context_cards`/`node_cards` (migration 004), CRUD + sidebar UI | Cards create/edit/attach; persisted |
| 13 | **F2 Codex** part 2: scoped injection via existing context path + fork inheritance; Context-tab shows cards | Card text verifiably in the prompt (inspector proof) |
| 14 | **F4 cost meter**: per-message token/cost capture (migration 003 cols), node badges, canvas "saved vs linear" + Context inspector tab (grow `prompt-preview-panel`) | Every turn shows tokens+$; inspector matches reality |

## Week 3 — First strangers (beta), onboarding, model routing

| Day | Work | Done-when |
|-----|------|-----------|
| 15 | **F5**: in-console model switch + routing presets (draft/synthesize) | Switch model mid-branch; preset applies at fork |
| 16 | **F7 onboarding**: 3 template canvases + 60-sec walkthrough + free-tier server-key cap (20/day via quota table) | New account → value with zero setup |
| 17 | Error/edge states (spec §10): resume-on-stream-fail, provider-error banners, delete/collapse rules, multi-tab conflict toast | Kill the network mid-stream → resume works |
| 18 | **Beta recruit**: DM/post honestly in the communities from day 8 ("I built a branching drafting studio, 10 free founding-beta spots for feedback"). Sentry + uptime + structured logs live | ≥10 beta invites accepted; errors observable |
| 19 | Fix the top beta breakage same-day; Playwright E2E smoke in CI | E2E green on deploy |
| 20 | **F6 ChatGPT import** wizard (their export JSON → canvas with linear spine ready to branch) | A real writer's export imports cleanly |
| 21 | **F8 trust surface**: privacy + terms pages, data export-all/delete-account; landing page rewrite (spec §8) with real screenshots + demo GIF | A skeptic can answer "where's my data" without asking |

## Week 4 — Money

| Day | Work | Done-when |
|-----|------|-----------|
| 22 | Stripe one-time checkout: Founding $59 (cap 100) / $79 after; `purchases` table (migration 005); plan gate (free = 2 canvases) | Test-mode purchase unlocks instantly |
| 23 | Webhook hardening (signature, idempotent replay — arch §7) + refund runbook + license email receipt | Replayed webhook = no double-grant |
| 24 | Beta feedback round 2: ship the single most-requested small thing; polish pass on compare/compile (the demo surfaces) | Beta users say the loop feels solid |
| 25 | Launch assets: 90-sec video (fork→compare→promote→compile), 6 screenshots, copy for each channel written in that channel's voice | Assets reviewed by 2 beta users |
| 26 | **Soft launch to the writer communities** (where you're now 2.5 weeks known) + personal offer to every beta user (founding price honored) | First real sales expected TODAY |
| 27 | Respond-and-fix day: every comment answered, every bug same-day; post build-in-public thread on X | <24h response to 100% of feedback |
| 28 | **Show HN + Product Hunt** (credibility/backlink motion, not the main channel) with the workspace/economics framing — never "ChatGPT with branching" | Posts live; monitoring |
| 29 | Second wave: answer the exact complaint threads (research §1 URLs — ChatGPT tree-view feature requests, context-loss threads) with genuinely helpful replies that mention the tool once | Traffic from complaint vocabulary |
| 30 | **Close the books**: sales vs. infra, activation funnel (signup→first fork→export), write `V2/08-DAY-30-RETRO.md` with the decision-§8 kill-criteria check | Honest numbers written down |

## Slack (pre-authorized deferrals if days slip)

Defer in this order: F6 import (day 20) → routing presets half of F5 →
day-24 polish → PH launch (day 28; communities matter more). Never defer:
week 1, tenancy tests, F1/F2/F3, Stripe hardening.

## Budget

| Item | $/mo |
|---|---|
| Supabase Pro | 25 |
| Railway/Render backend | ~10 |
| Vercel Hobby→Pro only if needed | 0–20 |
| Domain amortized | ~1 |
| Sentry/UptimeRobot free tiers | 0 |
| **Total** | **~$36–56** → **one $59 license = profitable month** |

## Risks & pre-decided responses

| Risk | Response (decided now, not in the moment) |
|---|---|
| Launch lands flat (<5 sales by day 33) | Don't build; run 5 recorded user interviews from beta pool; check kill-criteria (decision §8) at day 60 |
| A provider breaks (API change) | Dispatcher fallback already exists; announce honestly in-app same day |
| Free-tier abuse of server key | Hard quota is server-side; worst case = flip `SERVER_KEY_ENABLED=false`, BYOK-only free tier |
| Scope creep temptation | Any feature not F1–F8: write it in `V2/POST-LAUNCH-IDEAS.md`, do not build it |
| OpenAI ships a tree view mid-plan | Ship anyway; their fork still won't have scoped context economics, Codex, multi-model, or export. Reposition harder on economics if it happens |
