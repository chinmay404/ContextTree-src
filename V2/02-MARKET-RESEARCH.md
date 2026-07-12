# V2 — Market Research (evidence base, gathered 2026-07-12)

Two independent web-research passes: (A) competitive landscape,
(B) demand + monetization. Key claims carry source URLs. This document is
the evidence; the decisions drawn from it live in `03-PRODUCT-DECISION.md`.

---

## 1. The branching feature has been sherlocked — but only the shallow half

- **ChatGPT** shipped native "Branch in new chat" on 2025-09-04
  (https://x.com/OpenAI/status/1963697012014215181). It is a *flat fork*:
  a new sidebar conversation carrying context up to that point. Documented
  gaps users are actively complaining about: **no tree view** (open feature
  requests: community.openai.com/t/987553, /t/1385220), sidebar clutter with
  multi-branch work (/t/1088636), a bug where branches lose parent context
  (/t/1367751), no mobile support, same-model only.
- **Gemini**: AI Studio branching since Feb 2025; the consumer app's flat
  "Branch in new chat" was at ~20% rollout April 2026
  (androidauthority.com/google-gemini-branch-conversations-3649659).
- **Claude.ai**: still only implicit branch-on-edit; no map, no management.

**Implication:** incumbents educated hundreds of millions of users on the
*vocabulary* of branching, then delivered one-shot forks. "I sometimes want
one fork" is dead as a product. "I work in trees and need to see and manage
them" is live, articulated (in their own forums), and unserved.

## 2. Competitive field

| Segment | Who | Pricing | State |
|---|---|---|---|
| VC canvas | **Flowith** | $19.90–499.90/mo credits | 1M+ users, Sequoia China seed (Mar 2026); pivoting to 1000-step agents, credit-resale model (anti-BYOK); complaints: credit burn, learning curve |
| VC casualty | **Cove** | sub | **Shut down 2026-04-01**, team to Microsoft (techcrunch.com/2026/03/18/...) — paying visual-workspace users orphaned; long-term signal: a Copilot canvas someday |
| Indie direct comp | **RabbitHoles AI → Slashspace** | $89 one-time / $249 lifetime, BYOK | The one commercial scoped-canvas comparable; **mid-rebrand/pivot in 2026** = churn among exactly our target users |
| Multi-model branch (flat) | **big-AGI Beam** (~7k stars, free + $10.99/mo sync), **Msty** ($149/yr, $349 lifetime — already sells flat "split chats" branching) | — | Proof people pay for branching workflows; nobody combines it with a spatial tree + scoped lineage |
| Free/hobby long tail | Chat-tree, TreeLM, LM Canvas, Chatvas, Canvas Chat, Nodini, Graphine… | free | A new OSS branching canvas ships ~monthly; **none breaks out** (Show HN results: 1–5 points each; only GrafyChat hit — 459 points, HN 40300126) |
| UI commoditizer | **tldraw branching-chat starter kit** (free, tldraw.dev/starter-kits/branching-chat) | — | The canvas UI itself is now a weekend clone. **The moat cannot be "canvas with nodes."** |
| BYOK frontends | **TypingMind** ($39+ one-time; $1M in 20 months; $130–160k/mo Oct 2025, >50% now B2B teams — news.tonydinh.com), Chatbox, Jan, Open WebUI (~139k stars, free), LibreChat (acquired by ClickHouse 2025-11) | — | The monetization playbook source; also the free-gravity warning |
| Comparison tools | Arena AI (free), Poe ($19.99/mo, monetizes access bundling), OpenRouter playground (free) | — | Side-by-side comparison **as a feature is free everywhere — dead as a paid wedge** |

## 3. Demand signals (who actually feels the pain)

- r/ChatGPT: "Long chats go bad but starting a new one means losing all
  context" (~97 comments); users hand-maintain "context documents" to paste
  into fresh chats — manually simulating scoped branching.
- Claude users hit conversation-length limits so often that
  summarize-and-restart guides are a content genre (XDA, Substack).
- HN (May 2025, 43992376): "I want to fork conversations so I can experiment
  … without irrevocably poisoning a promising well."
- GrafyChat's breakout thread named the real use cases: research/snippet
  organization, prompt iteration, visual thinking, multi-branch
  code-problem-solving.
- **Counter-signal:** the same audience that complains loudest (developers,
  HN) self-hosts Open WebUI/LibreChat for $0 and does not convert. Retention
  killers observed across the space: incumbent feature-copying (the Nov 2023
  "ChatGPT for PDFs" extinction event), free OSS gravity, and canvas fatigue
  ("dragging nodes around becomes homework" — top GrafyChat criticism).

## 4. Willingness-to-pay ranking (for THIS product shape)

1. **Fiction / long-form writers** — already stack 2–4 paid tools
   (Sudowrite $10–44/mo, NovelCrafter $4–20/mo + BYOK); branching is their
   *native* workflow ("what if the scene goes this way"); can't self-host;
   ChatGPT's flat branch gives them no project memory or organization;
   reachable in days (r/WritingWithAI, writer Discords/Twitter).
2. Consultants/knowledge workers — highest ceiling, too slow to reach in 30 days.
3. Prompt engineers — real budgets but default to free Langfuse/AI Studio;
   pay only at team level for eval features we don't have.
4. Researchers/deep thinkers — loudest, weakest wallet (self-hosters).
5. Role-play/character chat — huge market, disqualifying content/payment risk.
6. Students — price-sensitive, churny. Skip.

## 5. Monetization evidence

- **The proven indie architecture:** one-time BYOK license for the personal
  tier + small subscription for cloud sync + B2B teams later.
  TypingMind: 4,000 paying users in 3 months at $39–99; sync tier alone
  reached $15k MRR; paid ads flopped ($600 → 2 conversions), word-of-mouth won.
- Working prosumer price band 2025–26: **$5–20/mo or $39–99 one-time**
  (NovelCrafter, Sudowrite, RabbitHoles, Msty, RecurseChat all inside it).
- First-30-day playbook that still works for audience-less indies:
  soft-launch to niche communities (subreddits/Discords where the persona
  lives) → Show HN + build-in-public X → Product Hunt as a credibility/backlink
  event, not the main channel → self-run "founding license" instead of
  AppSumo (which takes 30–70%).
- Realistic month-one for no-audience indie: **dozens of one-time sales at
  $39–79** if the launch hits the right niche — far above the ~$50/mo infra
  bar, far below viral outliers (SuperX $1k MRR day one had an existing
  audience).

## 6. The one genuinely unclaimed narrative

A Dec 2025 study of context branching measured a **58.1% context-size
reduction** with cost and quality gains (arxiv.org/html/2512.13914v1).
Nobody markets scoped context as an *economics* feature:

- Flowith **can't** — it resells credits; its incentive is more tokens.
- ChatGPT/Claude **can't** — subscriptions hide token costs entirely.
- Free OSS tools **don't** — no billing relationship, no motive.
- **A BYOK product is the only shape that profits from saving the user
  money.** "Draft on cheap models, synthesize on expensive ones, and never
  pay to re-send context a branch doesn't need" is a purchase justification,
  not a UX nicety — and V1's ancestry-scoped retrieval + per-node models
  already implement the hard part.

## 7. Honest anti-thesis (why this could still fail)

- The hobby graveyard is real: most branching canvases get 1–5 HN points.
  Distribution, not code, is the risk.
- A Microsoft Copilot canvas (Cove team) or an OpenAI tree view could land
  any quarter; the exploitable window is ~12–18 months.
- Canvas fatigue: if the tool demands node-gardening before value appears,
  users churn. V2's UX must deliver value in the first linear chat and make
  branching *opt-in leverage*, not homework.
- One-time pricing on a hosted app means revenue is front-loaded while
  server cost is forever; the cloud-sync subscription and fair-use limits
  are the hedge, and infra must stay <$100/mo until teams revenue exists.
