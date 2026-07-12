# Video scripts + demo canvas recipe — production-ready

## A. The demo canvas (build once, star of every asset — 10 min)

Canvas name: **"Japan, April"** (dark theme, ~120% zoom for capture)

| # | Node | Model chip | Content to type |
|---|------|-----------|-----------------|
| 1 | Base Context (root) | GLM 5.2 | "Plan a 10-day Japan trip in April — two of us, mid budget." → let it answer (itinerary) |
| 2 | Follow-up in root | — | "Make Kyoto more food-focused." → answer |
| 3 | Branch: "Visa check" (⌘B from msg 1) | Gemini 3 Flash | "Wait — do we even need a visa? German passports." → short answer. THE side-question branch |
| 4 | Branch: "Budget version" | GLM 5.2 | "Redo days 1–4 at half the budget." → answer |
| 5 | Branch: "Luxury version" (sibling of 4) | Mistral Large 3 | "Redo days 1–4, money no object." → answer |
| 6 | Branch: "Claude's take" from msg 2 | (any second provider) | "Second opinion on this Kyoto plan?" — THE model-flip branch |
| 7 | Compare 4 vs 5 → **Promote** the budget one | — | leaves a demoted pill on canvas — the promote artifact |

Result: 3 lineage colors, 3+ model chips, one demoted pill, relatable
content, zero jargon. Screenshot everything from this one canvas.

## B. Hero video (30–36s) — voiceover script (calm, dry, first person)

| t | Screen (real product only) | VO line |
|---|---------------------------|---------|
| 0–4s | Long linear chat scrubbing down fast | "Your best thinking is in an AI chat somewhere. Buried." |
| 4–8s | Same convo explodes into the tree (fitView) | "What if you could see it?" |
| 8–15s | Type visa question → ⌘B → branch splits → main thread clean | "Side questions get their own branch. Your main thread never knows." |
| 15–24s | Node 6: model chip flips → reply streams | "Stuck? Ask another model. Your context comes along." |
| 24–30s | Compare modal → Promote → pill collapses | "Explore both. Keep the winner." |
| 30–36s | Zoom out, full colored tree → logo + URL | "ContextTree. Explore in every direction." *(then 3s silence, logo only)* |

Audio: one quiet ambient bed at −18 LUFS, cut dead at 30s. Master 16:9;
frame action in center column for the 9:16 crop.

## C. Founder video (60–90s, one take, phone or webcam + screen)

Beat sheet (don't script word-for-word — bullet cards only):
1. "I shut this product down a few months ago. This was the page." *(show
   sunset page)*
2. "I couldn't get people to use it. That part was true. But the problem
   didn't go away —" *(show 4 browser tabs of AI chats)*
3. "— so I rebuilt it. This time for people who think in branches."
   *(screen: the demo canvas, click a branch, flip a model)*
4. "It's $59 once when it launches. Your keys, your data. Everything
   exports — if it dies again, you lose nothing."
5. "It's free to try. No key needed. Tell me what breaks."

Rules: no jump cuts on claims, product footage over face when showing
features, the sunset-page screenshot is the credibility anchor.

## D. Recording checklist (one session covers everything)
- [ ] 1600×1000 window, dark theme, 120% zoom, cursor visible, 60fps
- [ ] Demo canvas built (A) + one throwaway canvas for the linear-first shot
- [ ] Capture: full linear scroll (10s) · linear→tree first fork ·
      ⌘B side question · model flip + streamed reply (with thinking
      block visible!) · compare→promote · Tidy-free auto-layout after a
      new fork · slow zoom-out of full tree (15s, for the hero close)
- [ ] Export masters: 16:9, then 9:16 + 1:1 crops
- [ ] Stills at same session: the 5 PH gallery shots + OG hero frame
