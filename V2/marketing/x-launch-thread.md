# X launch thread + loop captions — ready to post

## Day-1 thread (the shutdown→relaunch story)

**1/**
A few months ago I shut down my AI startup and wrote an honest goodbye
page: "I couldn't get enough people to use it."

Last week I rebuilt the entire thing in days.

Here's what changed — and why the second version is nothing like the first 🧵

**2/**
V1 called itself a "ChatGPT alternative."

That's a losing frame. You don't out-ChatGPT ChatGPT.

V2 is for a specific person: the one with 4 AI tabs open, pasting context
between Claude and GPT, losing their best thread to one side question.

**3/**
The core idea: your conversation is a tree, not a scroll.

Side question? Branch. Your main thread never sees it.
Want Claude's take mid-thought? The branch carries your context across
models. Nobody else has this.

**4/**
The part I'm proudest of: you don't start on a canvas.

New project = a plain chat. Type like you always do.
The tree only appears the moment you actually branch.

(Canvas-first onboarding kills these tools. We learned by reading every
competitor's complaints.)

**5/**
Each branch carries only what it needs — a rolling summary + its own
lineage. Not your whole history.

That's not just cleaner thinking. It's visibly cheaper. There's a meter
that shows tokens saved vs one long chat.

**6/**
Rebuilding in days meant AI agents wrote most of the code while I directed
and tested. The bugs we hit were REAL ones:

- Supabase's session pooler exhausting under serverless fan-out
- a dual-write bug where deleting a branch wiped its parent's conversation

Postmortems coming.

**7/**
It's live: contexttree.tech

Free tier, no API key needed. BYOK for the full catalog. Everything
exports as Markdown — if this dies too, you lose nothing.

If you think in branches, I built this for you. Tell me what breaks.

---

## Silent loop captions (one post each, video attached)

**Loop 1 (side question):**
Your main thread never has to see the dumb question again. ⌘B → branch →
back to clean. [video]

**Loop 2 (model flip) — THE bet:**
Started with GPT. Want Claude's take? One click. The context comes along.
[video]

**Loop 3 (compare/promote):**
Fork two directions. Read them side by side. Keep the winner — the loser
collapses, never deleted. [video]

**Loop 4 (cost meter):**
This branch sent 3.1k tokens. The same conversation as one long chat:
15.5k. Scoped context is real money. [video]

**Loop 5 (linear→tree):**
It starts as a normal chat. The tree appears when your thinking does.
[video]

---

## Reply-guy targets (from the UX research — answer these thread types)
- "ChatGPT branching is useless because you can't see the branches" → loop 5
- "I lost my whole conversation when I regenerated" → nothing is ever
  deleted in a tree + loop 3
- "Which model should I use for X" → per-branch model switching + loop 2
- LibreChat/Flowith complaint threads → cost meter + BYOK angle
