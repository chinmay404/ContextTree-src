# Show HN — ready to post

**Title (79 chars):**
Show HN: I shut down my AI chat app, then rebuilt it for people who think in branches

**URL:** https://contexttree.tech

**Text (post body):**

A few months ago I shut ContextTree down and put up an honest goodbye page:
I couldn't get enough people to use it to justify the servers. Last week I
rebuilt the whole thing in a few days — new backend, new canvas, new
positioning — because I kept hitting the same problem the product was born
from: my best AI conversations die from context pollution.

What it does:

- Every conversation is a tree. Ask a side question in a branch — your
  main thread never sees it.
- Any branch can continue on a different model (GPT → Claude → Gemini →
  open-weight via NVIDIA) and the context comes along: each branch carries
  a rolling summary + its own lineage's messages, not the whole history.
- Fork 2–3 directions, read them side by side, promote the winner. Losers
  collapse to recoverable pills — nothing is ever deleted.
- BYOK: your API keys, encrypted at rest. Free tier runs on open-weight
  models with a daily cap, no key needed. Export everything as Markdown.

Because each branch only carries scoped context, long projects cost a
fraction of the tokens of one endless linear chat — there's an inspector
that shows exactly what got sent and what it cost.

Stack: Next.js on Vercel, FastAPI + LangGraph on Railway, Postgres/pgvector
on Supabase. The relaunch had some fun failures — the Supabase session
pooler exhausting under lambda fan-out (EMAXCON), and a dual-write bug
where deleting a child node wiped the parent's conversation — happy to go
into any of it.

New canvases open as a plain linear chat; the tree only appears at your
first fork. Would love blunt feedback on whether branching earns its place
in your workflow.

---

**First comment (post immediately after):**

Honest context: this is a relaunch. V1's shutdown page said "I couldn't
get enough people to use it" — that page is still in the git history. What
changed: repositioned from "ChatGPT alternative" (losing frame) to a tool
for people who already fork threads manually across tabs; killed 26k lines
of feature sprawl; made linear-first onboarding the default because canvas
UIs scare people off. Pricing will be a $59 one-time founding license
(BYOK, so my infra cost stays near zero) — not live yet, no dark patterns,
free tier stays.

**Rules for the thread:** answer every comment for 24h; never argue with
criticism, ask follow-ups instead; EMAXCON/dual-write war stories on
request; if someone says "this makes things more complicated" — that's the
expected polarization, respond with the linear-first design rationale.
