# V3 board — polish round 2 (owner, 2026-10-21)

Owner's list after testing the release candidate. Ships AFTER the first production deploy (owner: "let us deploy the
app first"). Same process and rules as polish-1 (TDD, full gate, screenshots for the owner, no stash, no push).
P9 (card colours) and P10 (string arrows) are specified in `2026-10-20-v3-board-polish-1.md`.

Order: P10 arrows → P9 colours → P12 running glow → P11 paste box → P14 browser Back → P15 note formatting →
P13 dark mode → P16 "Read all of it" (engine + board) → then polish-1's P4 (branch slide) and P7 (map of names).
Scrapers (better link/page fetching) are later, after the deploy (owner point 8).

### P11: Paste box — press V (owner point 1)
"Pasting a link or text must be easy: a key opens a box in the centre, I paste; if it's a link, fetch it and show it
in the same box; I click it and it's added to the canvas; if it's text, show it like a note and add it."
- `V` on the board (not while typing, no overlay open) opens a centred glass box with one input, focused. `Ctrl/Cmd+V`
  on the board (not in a field) opens the same box with the clipboard already in it.
- As soon as the input holds a URL (http/https or a bare domain), show a preview card in the box: favicon/type icon,
  title, site, one-line description — fetched through a new engine preview route or the existing link-add flow's
  oEmbed/title fetch (no ingest yet); YouTube shows its thumbnail and "Coming soon" for reading. Plain text shows a
  note preview (first lines). Multi-line text with several URLs: list them, each addable.
- Enter or clicking the preview adds it: links via the normal addLink (desk = the selected chat's desk, else loose
  near the viewport centre), text as a note. The box closes; the new card is selected. Esc closes.
- Errors: unreachable / blocked URL → "Couldn't open that link" + "Add as note instead".
- Replaces the old "Paste a link" pop and the paste-to-note path (both route through this box).
- Tests: V opens, focus; URL → preview → Enter adds a web card on the selected desk; text → note; Esc; blocked URL.

### P12: A running chat makes its desk glow (owner point 3)
While a chat is streaming, its desk's rim glows softly in the accent (box-shadow pulse ~1.6 s, accent at low alpha);
stops on done/error. Reduced motion: a steady accent rim, no pulse. Map view: the label gets a small accent dot.
Tests: stream start → class on the desk; done → removed; reduced motion → no animation.

### P13: Dark mode (owner point 4)
- Follows the system (`prefers-color-scheme`) by default; a toggle in the account menu (System / Light / Dark),
  remembered per browser (localStorage, read before paint to avoid a flash).
- Apple dark palette: canvas #000000 with dots #2C2C2E, desks #1C1C1E, cards #2C2C2E, fill #3A3A3C, edge #48484A,
  text #F5F5F7 / #AEAEB2 / #8E8E93, accent #0A84FF; glass rgba(30,30,32,.62) + blur; family tints re-derived for dark
  (same hues, low lightness), contrast ≥ 4.5:1 test in both themes. Model marks keep identity colours.
- Covers board, focus view, sheets, viewers, tour, toasts, and the shell (landing, sign-in, home, settings).
- Tests: theme toggle persists; no light-only hex left in components (token test); contrast test both themes;
  screenshots of every main screen in dark.

### P14: Browser Back leaves the board (owner point 5)
From a board, the browser Back button / back gesture returns to the boards home in ONE press. Opening the focus view,
viewers or sheets must not push history entries (use replaceState or no URL change); if a URL change is kept for
deep links (e.g. `?focus=<id>`), it must be replaceState so Back still leaves the board. Esc still closes overlays.
Tests: open a board, open focus view, open a viewer, press Back once → boards home.

### P15: Note formatting (owner point 6)
Notes get light formatting: bold, italic, bullet list, numbered list, heading, link, and inline code. A small floating
toolbar appears over a selection inside a note (and in the note viewer), plus shortcuts (Ctrl/Cmd+B / I / K). Stored
as Markdown in the note's text (the engine reads it as plain text — no engine change); rendered with the board's
markdown renderer (escaped, no raw HTML). Existing plain notes stay as they are.
Tests: select → Bold → `**x**` saved and rendered bold; shortcuts; paste of HTML is cleaned to text; XSS-safe.

### P16: "Read all of it" per source (owner point 7; engine + board)
Owner asked why only some sections are used. Default stays: per question the engine sends the best-matching passages
(Advanced → excerpts per question). New per-source switch "Read the whole thing" in the source viewer:
`SourceData.readAll?: boolean`. Engine: when set, send all of that source's chunks in document order if they fit the
turn's token budget; if not, send as many as fit in order and return a warning in the reads (`ReadItem.trimmed: true`).
Board: the viewer shows "The AI picks the parts that match each question" by default, and with the switch on shows the
token cost; the source card shows a small "whole" badge. Contract amendment + engine task + board task.
Tests: engine numbering/budget with readAll; reads shape; board switch PATCH + badge + cost line.

## Added 2026-10-23 (owner, after testing production)

### S1 [E]: Web search uses a standalone query, rewritten by the chat's model
Bug: `main.py` passes the raw follow-up ("what it can do for me") to DuckDuckGo, so results ignore the chat's topic
(self-help pages for a chat about OWASP ZAP). Fix on V3 turns: before searching, ask the chat's own model (on the user's
key, same TurnKey, no extra key lookup) to rewrite the message into one standalone search query using the chat name, the
last 2–3 turns and the desk's source titles (short prompt, ≤ 32 output tokens, temperature 0, 4 s timeout). On timeout,
error or an empty/oversized rewrite, fall back to "<chat name> <message>". The rewrite never counts as a daily message,
is never stored, and is not shown to the user except as the search query in the web results header. V2 unchanged.
Tests: follow-up gets the topic; fallback paths; no extra lookup; refused key during rewrite → plain fallback (the
answer then reports key_rejected as usual); the query appears in the SSE web_search frame.

### S2 [V]: Web results take one line
Today each web hit is a large card stacked above the answer. Instead: one compact row under "Searched the web for
“<query>”": small chips (favicon or globe, site, truncated title), horizontally scrollable with fade edges, each opens the
page in a new tab; the row is collapsed to "3 web results" on board cards and expanded in the focus view. "Answered with
N sources" counts web results too ("2 sources · 3 web").
Tests: chips render on one line; overflow scrolls; links have rel="noopener noreferrer"; the count line.

### S3 [V]: Source sets — a free-standing box of documents
Owner: "can't I create a desk of docs — maybe sets". A set is a named box of sources with no chat inside, laid out open
like a desk. Build it on the existing pile model so the engine needs no change: a set is a pile card with
`data.layout: 'open'`; its members keep `pileId`. Stringing a set to a chat (or several) makes those chats read every
member (the engine already expands a strung pile into its members). Create from the Add menu ("New set") or by
selecting several sources → "Group as set"; drop files/links straight into a set; rename via its title tab; a set can be
collapsed back into a pile and vice versa. Members inside an open set lay out in a grid; dragging the set moves them.
Tests: create, drop into, string to two chats → both read all members, collapse/expand, delete set (same choices as pile).

## Added 2026-10-24 (owner)

### S5 [V]: Answers render real markdown (tables, code blocks, quotes, rules)
Bug: a GFM table and a fenced code block in an answer rendered as one run-on paragraph with raw pipes and backticks.
`lib/markdown.ts` now renders fenced code (``` and ~~~, language label, unclosed fence runs to the end while streaming),
GFM tables (alignment, `\|`, short/long rows, header-only while streaming), blockquotes, rules and ~~strike~~; still
escape-first, no raw HTML. Styles in `chrome/markdown.css` (tokens only, light and dark). Tests: unit + `e2e/board/markdown.spec.ts`.

### S6 [V]: Select text in an answer → "Add to note" or "Ask in a new branch"
Owner: "if I select any text we want an option: add in note or ask in new branch … the notepad must open at the right,
where I can add notes from the conversation and edit them, and that note must show on the desk of that node and be
context for the conversation."
- Selecting text inside an answer (focus view; also the compare sheet) shows a small floating bar above the selection:
  "Add to note" and "Ask in a new branch". Esc or clicking away hides it. Keyboard: the bar is reachable with Tab.
- **Add to note** opens the **notepad**: a panel on the right of the focus view (the timeline stays on the left; the
  conversation column narrows). The notepad is ONE note card per chat, living on that chat's desk (created on first
  use, titled "Notes · <chat name>", `data.notepadFor = <chatId>`), so it is a desk source and the chat reads it as
  context on the next turn with no engine change. The selection is appended as a Markdown block quote plus a blank
  line, with the cursor placed after it so the user can type a comment. The notepad is fully editable (same Markdown and
  format bar as notes, P15), saves with the usual debounced PATCH, shows "Saved", and has a close button; the board
  shows the note on the desk at once. Reopen it from the focus view's header ("Notes") when it exists.
- **Ask in a new branch** opens the existing branch sheet from the selection, with the selected text quoted at the
  top of the new question (`> …` then the cursor on the next line); confirming follows P4 (land on the branch).
- Branches: a branch's notepad is its own (one per chat); the parent's notepad is inherited like any desk source.
- Tests: select → bar appears near the selection; Add to note creates one note on the chat's desk with the quote, a
  second add appends to the same note; the notepad edits and saves; the next ask's reads include the note; Ask in a
  new branch prefills the quote; Esc hides the bar; selection outside answers shows nothing; light + dark screenshots.
