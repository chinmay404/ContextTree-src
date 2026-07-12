# Blog draft — "I shut down my AI app. Then I rebuilt it in a weekend with AI agents."

Publish at contexttree.tech/blog (or dev.to + cross-link) in week 1.
~1,400 words when expanded; skeleton with all facts below. Engineering
honesty is the marketing — no softening.

## Outline + key facts

**1. The shutdown (hook)**
Screenshot of the actual sunset page: "I couldn't get enough people to
actually use it to justify keeping the servers running." Why that page was
the best thing I shipped in V1: it was honest, and people remembered it.

**2. Why relaunch anyway**
The problem never went away: best threads die from context pollution; 4
tabs of AI chats; pasting context between models by hand. ChatGPT shipped
flat forks (Sept 2025) and proved demand — while defining its ceiling: no
tree view, no naming, no merge, no cost visibility.

**3. The rebuild, by the numbers**
- One day from "revert the shutdown page" to fully live (auth, backend
  on Railway, NVIDIA NIM default via BYOK-friendly dispatcher).
- −26,606 lines in one commit (the REMOVE sweep: 13 dead surfaces).
- Canvas rewritten from scratch: 1,560 lines → ~700, always-auto-layout.
- Same-day competitor UX research fed straight into design decisions
  (one fork gesture, no backdrop-blur, linear-first entry).

**4. War story #1 — EMAXCON (the auth outage)**
Symptom: intermittent "Error in callback handler" on Google sign-in that
PASSED a smoke test then failed an hour later. Cause: pg default pool
max=10 per warm lambda × several lambdas against Supabase's session
pooler (port 5432) = client-slot exhaustion. Fix: transaction pooler
(:6543) for serverless + pool max 3 + no session-level SETs. Lesson:
pooler mode must match the compute model; a passing smoke test proves
nothing about connection exhaustion.

**5. War story #2 — the delete that ate a conversation**
Symptom: delete a child branch → the PARENT's conversation vanished.
Cause: dual-write architecture — client full-canvas PUT triggered
delete+reinsert of every node's messages from the client's copy, which is
hollow for nodes the user never opened (messages are written server-side).
Fix: the sync boundary refuses destructive replacement when the payload
carries none of that data; deletes became per-entity endpoints. Lesson:
in dual-write systems, whoever doesn't own a field must not be able to
overwrite it with its absence.

**6. War story #3 — the model catalog rotated under us**
NVIDIA NIM's July catalog: the Kimi ids we'd shipped 404'd (while still
listed in /models). Live-tested the catalog with curl, aliased dead ids to
working models so old nodes kept answering, default → GLM-5.2. Lesson:
free model catalogs are unstable infrastructure; alias tables beat hard
references.

**7. What the agents did vs what I did**
Agents: the mechanical sweeps, restyles, refactors, and first drafts of
features — in parallel. Me/owner: direction, live testing on prod (every
bug above was found by a human clicking), taste calls (nodes should NOT
be draggable; thinking should stream like Claude's), and the honesty
calls. AI didn't replace judgment; it removed the typing between
judgments.

**8. CTA**
contexttree.tech — free, no key needed, exports everything. The goodbye
page is still in git history; the difference this time is I'm building
for the person I was when I wrote it.
