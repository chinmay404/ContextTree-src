# ContextTree — Interior UI Specification
## "The Atelier" design language

A complete redesign spec for the canvas, nodes, edges, and chat panel. Designed to feel like a natural extension of the landing page — but tuned for information-dense working sessions instead of marketing.

---

## 0. Design philosophy — why this looks the way it looks

Your landing page says: *"This is a learning notebook, not another AI chat."* The interior must say the same thing, but with more utility and less ceremony.

**The atelier metaphor:**
- You are sitting at a drafting table with a large sheet of warm paper in front of you.
- Your conversations are pinned paper cards you can arrange.
- Main threads are connected by **ink lines** (moss green) drawn across the page.
- Tangents are marked with **amber pencil lines**.
- Reference material (attached docs) is pinned with **indigo thread**.
- You write in the margins, annotate, and can always zoom out to see the whole page.

**What stays consistent with the landing page:**
- Warm paper background (`#FBF9F4`)
- Moss-green as the primary accent
- Amber for highlights and tangents
- Fraunces italic for labels and signifiers, Geist for everything dense
- The feeling of quiet, confident craft

**What's different from the landing page:**
- No marginalia annotations, no scroll indicators, no hand-drawn flourishes — the app is a *working surface*, not a document to read
- Higher information density
- Interactions resolve in ≤150ms (not 600ms reveal animations)
- No 3D elements anywhere — every pixel must earn its place in a tool

---

## 1. Foundation — design tokens

All tokens live in `atelier.css` (see accompanying file). Drop into your `globals.css`.

```css
:root {
  /* Paper surfaces */
  --at-paper:        #FBF9F4;   /* Canvas background */
  --at-paper-soft:   #F4F0E6;   /* Elevated surfaces (chat panel, nodes) */
  --at-paper-edge:   #E8E2D1;   /* Borders, dividers, grid lines */
  --at-paper-shadow: rgba(58, 44, 20, 0.04);  /* Warm-tinted shadow, not gray */

  /* Ink (text) */
  --at-ink:          #0A0E1A;
  --at-ink-soft:     #2A3142;
  --at-ink-muted:    #6B7280;
  --at-ink-faint:    #9CA3AF;

  /* Accents (used sparingly) */
  --at-moss:         #2D5F3F;   /* Main thread, primary actions, "own notes" */
  --at-moss-soft:    #5B8A6D;
  --at-moss-tint:    rgba(45, 95, 63, 0.08);

  --at-amber:        #C97B2F;   /* Branches, highlights, annotations */
  --at-amber-soft:   #E09A55;
  --at-amber-tint:   rgba(201, 123, 47, 0.08);

  --at-indigo:       #4338CA;   /* ONLY for context/reference nodes */
  --at-indigo-tint:  rgba(67, 56, 202, 0.06);

  /* Typography */
  --at-font-serif:   'Fraunces', Georgia, serif;
  --at-font-sans:    var(--font-geist-sans, 'Geist Sans', system-ui, sans-serif);
  --at-font-mono:    var(--font-geist-mono, 'Geist Mono', 'SFMono-Regular', monospace);

  /* Radii */
  --at-radius-sm:  6px;   /* small chips, tags */
  --at-radius-md:  10px;  /* buttons */
  --at-radius-lg:  14px;  /* node cards */
  --at-radius-xl:  18px;  /* chat panel, modals */

  /* Shadows — warm-tinted, mimic paper layered on paper */
  --at-shadow-sm:  0 1px 2px var(--at-paper-shadow);
  --at-shadow-md:  0 1px 2px var(--at-paper-shadow), 0 4px 12px var(--at-paper-shadow);
  --at-shadow-lg:  0 2px 4px var(--at-paper-shadow), 0 12px 32px rgba(58, 44, 20, 0.08);
  --at-shadow-focus: 0 0 0 3px rgba(45, 95, 63, 0.18);
}
```

---

## 2. The Canvas Surface

### 2.1 Background — 3 stacked layers

**Layer 1 — base color:** solid `--at-paper` (#FBF9F4). Not white. Warm off-white signals "notebook" not "screen."

**Layer 2 — grid paper:** 24px × 24px grid, 1px lines, ink at 0.05 opacity. The grid is subtle enough to not compete with content but visible enough to give the canvas a working-surface feel.

**Layer 3 — vignette (optional):** a soft radial that darkens to 2% opacity toward the edges. Focuses attention on the center. Can be skipped on wide monitors where it looks gimmicky.

```css
.atelier-canvas {
  background-color: var(--at-paper);
  background-image:
    linear-gradient(to right, rgba(10, 14, 26, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(10, 14, 26, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

### 2.2 Canvas controls (zoom in/out, fit view, mini-map)

Positioned bottom-right, 16px from edges. A small horizontal "control strip" with a thin 1px `--at-paper-edge` border, `--at-paper-soft` background, `--at-radius-md`. Icons in ink-soft, 14px.

Instead of the default ReactFlow square buttons, use a single flat bar:

```
[ - ]  [ fit ]  [ + ]     •     [ minimap toggle ]     •     [ ⌘K ]
```

Dot separators (8px dot in paper-edge color) create breathing room.

### 2.3 The mini-map (when open)

Bottom-right corner, above the control strip. 180×120px. Inside:
- Background: `--at-paper-soft`
- 1px `--at-paper-edge` border
- Node dots: colored by type — moss (entry), amber (branch), indigo (context)
- Current viewport: marked by a thin moss-green rectangle outline, not filled
- Labeled "Contents" in Fraunces italic 11px at the top-left — treats it like a table of contents

---

## 3. Node Designs

Every node shares a structural pattern:
1. Paper card background
2. Colored left accent bar (1.5px wide, full height) — the "book ribbon" marker
3. Italic Fraunces label at top indicating node type
4. Main content
5. Small meta strip at the bottom (optional)

Three variants by role: Entry (moss), Branch (amber), Context (indigo).

### 3.1 Entry Node — "Main Thread"

The root of every canvas. Only ONE entry node per canvas (`data.primary = true`).

**Dimensions:** 320px wide × auto height (min 96px)

**Visual structure:**

```
┌──────────────────────────────────────────┐
│█│                                          │
│█│  Main thread                             │   <- Fraunces italic, 11px, moss, uppercase tracking
│█│                                          │
│█│  Calculus — Fourier transforms           │   <- Fraunces 400, 18px, ink
│█│                                          │
│█│  Exploring how periodic signals decom-   │   <- Geist 400, 13px, ink-soft, 2 lines max
│█│  pose into sinusoidal components...      │
│█│                                          │
│█│  claude-opus-4.7 · 12 messages · 2h ago  │   <- Geist Mono, 10px, ink-muted
└──────────────────────────────────────────┘
 ^
 3px wide moss accent bar, full height
```

**Details:**
- Card background: `--at-paper`
- Border: 1px `--at-paper-edge`
- Radius: `--at-radius-lg` (14px)
- Padding: 20px top/left/right, 14px bottom
- Left accent bar: 3px wide, `--at-moss`, full height, same radius as card (only left corners)
- Shadow (idle): `--at-shadow-sm`
- Shadow (hover): `--at-shadow-md`, plus transforms: `translateY(-1px)`
- Shadow (selected): `--at-shadow-lg` + `0 0 0 1.5px var(--at-moss)` ring

**Labels:**
- Type label "Main thread" in Fraunces italic 11px, moss color, letter-spacing 0.08em, uppercase
- Title: up to 2 lines, ellipsis on overflow
- Preview text: gets a subtle amber underline on any highlighted phrases (if user highlighted sections — future feature)

**Corner treatments:**
- Top-right: a tiny "◉" glyph (5px dot) in moss if this is the currently-active thread in chat. Otherwise empty.
- On hover: a tiny delete "×" appears in the top-right corner as a 20×20 paper button (paper-soft bg, 1px paper-edge border, moss X icon)

**Handles (connection points):**
- Top, right, bottom, left — tiny 6px circles, `--at-paper` fill with `--at-moss` 1.5px stroke
- Hidden by default, appear only on node hover (opacity 0 → 1, 150ms ease)
- On connecting: handle scales 1.3 and moss-tint halo appears

### 3.2 Branch Node — "Tangent"

A forked conversation. These are the most common nodes on a canvas.

**Dimensions:** 280px wide × auto height

**Visual structure:**

```
┌────────────────────────────────────┐
│█│                                    │
│█│  Branch · 02      ↳ from Main      │   <- Fraunces italic, 11px, amber (branch label) + Geist 10px (parent link)
│█│                                    │
│█│  Python implementation             │   <- Fraunces 400, 16px
│█│                                    │
│█│  How to compute FFT in NumPy       │   <- Geist 400, 13px, ink-soft
│█│  with windowing...                 │
│█│                                    │
│█│  ┌──── gpt-4 ────┐    6 msgs      │   <- Model chip + count
└────────────────────────────────────┘
 ^
 2px wide amber accent bar
```

**Details:**
- Card background: `--at-paper-soft` — slightly darker than entry node (creates hierarchy)
- Border: 1px `--at-paper-edge`
- Radius: `--at-radius-lg`
- Padding: 18px top/left/right, 12px bottom
- Left accent bar: 2px wide, `--at-amber`

**Type label pattern:**
- `"Branch · 02"` — the number is the branch's rank from its parent. So if you fork a node three times, they are Branch 01, 02, 03. Tiny numbering helps users navigate.
- `"↳ from Main"` or `"↳ from Python impl."` — shows parent node name, small arrow glyph. Keep to 20 chars max, truncate with ellipsis.

**Model badge:**
- A small paper chip: 1px `--at-paper-edge` border, 2px horizontal padding, 4px vertical, `--at-radius-sm`, Geist Mono 10px
- Model icon (16×16) inline to the left
- Accent color: moss if the model is a "premium" one (Claude, GPT-4, Gemini), otherwise ink-muted

**States:**
- Default: shadow-sm
- Hover: shadow-md, `translateY(-1px)`
- Selected: shadow-lg + `0 0 0 1.5px var(--at-amber)` ring
- Dragging: opacity 0.85, scale 1.02, cursor grabbing

**Handles:** same pattern as entry, but amber-stroked.

### 3.3 Context Node — "Reference"

An attached document, text, or external data source.

**Dimensions:** 260px wide × auto height

**Visual structure:**

```
┌───────────────────────────────────┐
│█│                                   │
│█│  Reference · Doc                  │   <- Fraunces italic 11px, indigo
│█│                                   │
│█│  📄  Fourier_primer.pdf           │   <- File icon + filename
│█│                                   │
│█│  "The Fourier transform is a      │   <- Geist italic 12px, ink-soft (quoted snippet)
│█│  mathematical tool that decom..."  │
│█│                                   │
│█│  ⋯ 12 pages · 4,200 tokens        │   <- Meta
└───────────────────────────────────┘
 ^
 2px wide indigo accent bar
```

**Details:**
- Card background: `--at-paper-soft` with an additional subtle cross-hatch texture. This is the *only* node with a visual texture — it distinguishes "this is a reference" from "this is a conversation."

Cross-hatch texture:
```css
background-image:
  repeating-linear-gradient(
    45deg,
    rgba(67, 56, 202, 0.03) 0,
    rgba(67, 56, 202, 0.03) 1px,
    transparent 1px,
    transparent 6px
  );
```

- Left accent bar: 2px `--at-indigo`
- File icon: 16×16 lucide icon relevant to content type (FileText, Image, Link, etc.), indigo color
- Content quote: italic Geist, truncated to 3 lines
- Meta row: lucide icons at 10px + Geist 10px

**Processing state:** If the document is being ingested/embedded:
- Show a shimmer animation across the quote area
- Right side of the meta row: "Processing..." with a small spinner

---

## 4. Edges (connections between nodes)

Edges carry meaning. Each edge color tells the user something:

| Edge type | Color | Style | Meaning |
|---|---|---|---|
| Main thread | `--at-moss` (#2D5F3F) | 1.5px, solid | The primary conversation line |
| Branch | `--at-amber` (#C97B2F) | 1.5px, dashed (6,3) | A fork to explore a tangent |
| Context attach | `--at-indigo` (#4338CA) | 1px, dotted (2,3) | A reference being pulled in |
| Highlighted (on hover/select) | same color | 2.5px with soft glow filter | Active state |
| Inactive (unselected lineage) | ink at 0.25 opacity | 1px, solid | All other edges when something is selected |

**Curve type:** CatmullRom (smooth bezier), NOT straight lines. Lines feel mechanical; curves feel drawn.

**Drawing animation:** when an edge is first created, it animates using `stroke-dasharray` + `stroke-dashoffset` from 1 to 0 over 400ms — the "pencil line being drawn" effect.

**Active (streaming) edge:** uses a subtle flow animation — a small moss-green dot travels along the edge every 1.2s when a message is streaming. This visualizes "context is flowing."

**Edge labels (optional):**
Floating text at the midpoint of the edge, Fraunces italic 11px, amber, background-paper chip with paper-edge border. Shows things like `"shared context"` or `"isolated fork"`. Usually hidden; appears on edge hover.

---

## 5. The Chat Panel

The chat panel is where users spend 80% of their time. It needs to feel like opening a notebook, not a chat app.

### 5.1 Dimensions & positioning

- Docked right side of the screen
- Default width: 440px
- Min width: 360px, max width: 720px (drag to resize with a moss-green resize handle on the left edge)
- Full height of the viewport

### 5.2 Background & structure

Background: `--at-paper-soft` (#F4F0E6) — creates hierarchy against the main canvas.

Left edge: 1px `--at-paper-edge` vertical divider.

Three vertical zones:

```
┌────────────────────────────────┐
│  HEADER (72px)                 │   <- Node name, mode indicator, actions
├────────────────────────────────┤
│                                │
│  MESSAGES (fills remaining)    │   <- Scrollable conversation
│                                │
├────────────────────────────────┤
│  INPUT (auto, 80-200px)        │   <- Textarea + controls
└────────────────────────────────┘
```

### 5.3 Header

```
╔═══════════════════════════════════════╗
║                                       ║
║  Conversing with                      ║   <- Fraunces italic, 11px, ink-muted
║  Calculus — Fourier transforms        ║   <- Fraunces 400, 17px, ink
║                                       ║
║  claude-opus-4.7  ·  main thread      ║   <- Geist Mono 11px, amber (model) + ink-muted
╚═══════════════════════════════════════╝
                           [ ⤢ ]  [ × ]
```

- Height: 72px
- Horizontal padding: 20px
- Vertical padding: 14px
- Bottom border: 1px `--at-paper-edge`
- Right-side controls: maximize/close buttons, 32×32 paper-button style (see 5.6)

### 5.4 Messages area

The core of the panel. Each message is a "paper note" layered on the notebook page.

**User messages** (right-aligned, speaks as YOU):
```
                   ┌───────────────────┐
                   │  What is the      │
                   │  Python equivalent │   <- paper bg with warm shadow
                   │  of convolve?      │
                   └───────────────────┘
                              14:32   ▲
                                       |
                                    right-aligned
```

- Background: `--at-paper` with `--at-shadow-sm`
- Padding: 12px 14px
- Radius: `--at-radius-md` (10px) but with top-right corner at radius 2px (the "speech direction" cue)
- Max width: 75% of container
- Text: Geist 400, 14px, ink, line-height 1.55
- Timestamp below: Geist Mono 10px, ink-faint

**Assistant messages** (left-aligned, speaks as the MODEL):
```
   ┌─────────────────────────────────┐
   │  In NumPy, `np.convolve()` is   │
   │  the equivalent. Signature is   │   <- cream bg, rendered markdown
   │  `np.convolve(a, v, mode=...)`. │
   │                                 │
   │  ```python                      │
   │  import numpy as np             │   <- code block: ink-bg
   │  result = np.convolve(a, v)     │
   │  ```                            │
   │                                 │
   │  — claude-opus-4.7    [⤴ Fork] │   <- model citation + fork button
   └─────────────────────────────────┘
```

- Background: `--at-paper-soft` (slightly darker than user msg — inversed hierarchy)
- Padding: 16px 18px
- Radius: `--at-radius-md` with top-left at radius 2px
- Max width: 85% of container
- Text: Geist 400, 14px, ink
- Model citation: Fraunces italic 11px amber — reads like a footnote source
- Fork button: tiny paper chip with `⤴ Fork` glyph, visible on hover or text-selection

**Between message pairs:**
A thin 1px `--at-paper-edge` horizontal rule with 8px vertical margin. Like separators between sections in a book. Subtle but present.

**Streaming state:**
- While AI is typing: a row of three small moss-green dots with a pulse animation at the bottom of the AI message bubble
- As tokens arrive: no typewriter-style character animation (too slow for long responses) — just smooth append

**Markdown rendering inside assistant messages:**
- Headers: Fraunces 500, sized down (h1 = 18px, h2 = 16px, h3 = 14px)
- Code blocks: ink-dark background (#0A0E1A), Fira Code or Geist Mono 12px, paper-colored text, 8px radius
- Inline code: cream background, Geist Mono 12px, ink-soft, 4px padding, 4px radius
- Lists: standard, but bullet marker in amber
- Links: moss-green, underlined on hover
- Blockquotes: 2px amber left border, ink-soft italic text

**Text selection (the Fork trigger):**
When the user highlights text in an AI message, a small floating "Fork from here →" button appears above the selection. Click → fork a new branch with that selection as the starting prompt. This is the core magic move.

### 5.5 Input area

The "what you're writing" zone. Feels like a notebook margin where you jot your next question.

```
┌─────────────────────────────────────────┐
│ (thin 1px divider above)                │
│                                         │
│  Ask anything...                        │   <- textarea, Geist 400, 15px
│  _                                      │
│                                         │
│  ────────────────────────────────────   │
│  [ claude-opus-4.7 ▾ ]     [ ⤴ ] [ → ] │   <- model chip, fork btn, send btn
└─────────────────────────────────────────┘
```

- Top border: 1px `--at-paper-edge`
- Padding: 16px
- Textarea:
  - Transparent background
  - No border, no focus ring
  - Geist 400, 15px, line-height 1.55
  - Placeholder: "Ask anything..." in ink-faint italic
  - Auto-resize min 36px, max 180px
  - Focus: no ring — but a 1px amber line appears at the bottom of the textarea area
- Controls row:
  - 12px above the controls, a hairline divider in `--at-paper-edge`
  - Left: model selector chip (paper with paper-edge border, Geist Mono 11px, dropdown arrow, opens a model picker dialog)
  - Right: 
    - Fork button: ghost, 36×36, amber arrow icon — forks a new branch from current conversation
    - Send button: solid moss-green, 36×36, paper-colored arrow icon, `--at-shadow-sm`
- Cmd+Enter / Ctrl+Enter submits. Shift+Enter for newline. These bindings shown as tiny hint text below the textarea when focused.

### 5.6 Paper buttons (used throughout)

A common pattern across the app:

```css
.atelier-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--at-paper-soft);
  border: 1px solid var(--at-paper-edge);
  border-radius: var(--at-radius-md);
  color: var(--at-ink-soft);
  font: 500 13px var(--at-font-sans);
  transition: all 150ms cubic-bezier(0.22, 1, 0.36, 1);
  cursor: pointer;
}
.atelier-button:hover {
  background: var(--at-paper);
  border-color: var(--at-moss-soft);
  color: var(--at-ink);
}
.atelier-button:active {
  transform: translateY(1px);
}
.atelier-button[data-variant="primary"] {
  background: var(--at-moss);
  border-color: var(--at-moss);
  color: var(--at-paper);
}
.atelier-button[data-variant="primary"]:hover {
  background: #234A32;  /* moss darker */
}
.atelier-button[data-variant="ghost"] {
  background: transparent;
  border-color: transparent;
}
.atelier-button[data-variant="ghost"]:hover {
  background: var(--at-paper);
  border-color: var(--at-paper-edge);
}
```

---

## 6. Micro-interactions

Every interaction resolves fast (≤150ms) and rewards with tactile feedback.

| Action | Feedback | Duration |
|---|---|---|
| Hover a node | slight lift (translateY -1px) + shadow-md | 150ms |
| Select a node | accent-color ring appears, amber if branch, moss if entry | 200ms |
| Drag a node | opacity 0.85, scale 1.02 | instant |
| Drop a node | settle back with a tiny spring (overshoot 1.03 → 1.0) | 250ms |
| Create new node | scale from 0.9 → 1.0 + fade from 0.5 → 1.0 | 300ms |
| Delete a node | scale to 0.9 + fade to 0 + slight rotate 2° | 220ms |
| Connect an edge | edge draws in using dashoffset 1 → 0 | 400ms |
| Send a message | send button pulses moss tint, input clears 100ms after | 200ms |
| Receive AI message | message bubble slides up from 8px below + fades in | 250ms |
| Streaming | 3 moss dots pulse with staggered 0.2s delay | loop |
| Fork from selection | selection highlights amber → new branch appears with animation | 500ms |
| Zoom canvas | no animation, native scroll | instant |

---

## 7. Typography in the interior

More utilitarian than the landing page. Hierarchy:

| Role | Font | Size | Weight | Example |
|---|---|---|---|---|
| Node title | Fraunces | 16-18px | 400 | "Python implementation" |
| Node type label | Fraunces italic | 11px | 400 | "Main thread", "Branch · 02" |
| Body text (messages) | Geist Sans | 14-15px | 400 | message content |
| UI buttons | Geist Sans | 13px | 500 | "Fork", "Send" |
| Meta (timestamps, counts) | Geist Mono | 10-11px | 400-500 | "14:32", "6 msgs" |
| Model names | Geist Mono | 10-11px | 500 | "claude-opus-4.7" |
| Section numbers/identifiers | Fraunces | 11-14px | 400, italic | "Ref · Doc" |
| Code blocks | Geist Mono | 12px | 400 | `np.convolve()` |

**Line-height:** 1.55 for body text, 1.3 for headings, 1.45 for UI.

**No Inter. No Roboto. No generic sans-serif substitutions.** Geist is already distinctive enough for UI; Fraunces gives every labeled moment personality.

---

## 8. Dark mode

Skip it for v1. Seriously.

Warm-paper aesthetics don't translate well to dark mode — they either go muddy (warm-toned dark) or lose identity entirely (cold dark). Every successful "paper" product (Paper by Dropbox, iA Writer, Things 3) either doesn't ship dark mode or ships it as a secondary feature that looks completely different.

If you must ship dark mode, treat it as an entirely separate design system with its own tokens. Don't try to map the warm-paper palette into dark — you'll end up with something generic.

---

## 9. Accessibility (must-haves)

- All color combinations pass WCAG AA (body text 4.5:1, large 3:1). The moss on paper combo passes at 7.2:1 — actually excellent.
- Every interactive element has a focus-visible ring: `0 0 0 3px var(--at-moss-tint)` on a 2px offset
- Keyboard shortcuts documented (and actually visible when user presses `?`):
  - `Cmd/Ctrl + K` — command palette
  - `Cmd/Ctrl + Enter` — send message
  - `Cmd/Ctrl + Shift + F` — fork current conversation
  - `Space + drag` — pan canvas
  - `Cmd/Ctrl + +/-` — zoom
  - `Cmd/Ctrl + 0` — fit view
- Screen reader: every node has an `aria-label` summarizing its role ("Main thread node, 12 messages, Calculus Fourier transforms")
- `prefers-reduced-motion`: disable all enter animations, snap to final state; keep only essential state transitions

---

## 10. What to build first (priority order)

If you can't rebuild everything at once, ship in this order:

**Week 1 — highest visible impact:**
1. Canvas background (paper color + grid)
2. Entry node redesign
3. Branch node redesign
4. Edge color changes (moss main, amber branch)

**Week 2 — experience upgrade:**
5. Chat panel redesign (messages + input)
6. Context node redesign
7. Paper-button treatment across all UI controls

**Week 3 — polish:**
8. Micro-interactions (spring bounces, edge drawing animation)
9. Text-selection fork button
10. Command palette (Cmd+K)
11. Keyboard shortcut overlay

**Week 4 — delight moments:**
12. Streaming flow dot animation
13. Model picker dialog redesign
14. Minimap as "Contents" panel
15. Empty states + error states

Don't try to ship all of this at once. Each shipped piece should feel complete.

---

## 11. Things I'm DELIBERATELY leaving out

These are common "app polish" items that would hurt more than help at this stage:

- ❌ A full onboarding tour — users should discover by doing
- ❌ Gamification (streaks, badges) — feels childish for a learning tool
- ❌ AI-suggested next prompts — takes agency away from the learner
- ❌ Emoji reactions on messages — this isn't Slack
- ❌ Collaborative cursors — single-player first
- ❌ Export to PDF — users won't ask for this in the first 6 months
- ❌ Customizable themes — opinion is strength; don't let users dilute it

If a user asks for one of these, your response should be: *"We're keeping the surface minimal on purpose. Here's what we're shipping instead."*

---

*End of spec.*
