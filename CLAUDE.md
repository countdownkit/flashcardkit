# CLAUDE.md — flashcardkit

Project instructions for Claude Code working in this repo. Inherits the ElevatedProgress
venture playbook from the parent folder's CLAUDE.md.

## What this is

A zero-dependency static-site generator for **free printable flashcards**. `generate.js`
reads `data/flashcards.json` + `assets/` and writes one page per topic into `public/`.
Target: https://flashcards.elevatedprogress.com/. One SEO page per deck (slugs match real
searches): multiplication / addition / division / sight-words / letters / numbers /
states-and-capitals / spanish, plus a blank template, plus the homepage grouped into
Blank / Math / Reading & language.

## The product rule

**The artifact IS the page.** Each page server-renders a real sheet (or sheets) of flashcard
cells — a FRONT sheet and a matching BACK sheet per printable page. `assets/tool.js` only
re-renders the deck (via the shared CARDS module) when cards-per-page changes and toggles
classes for the rest (on-screen front/back view, single/double-sided print, font size), then
calls `window.print()`. Print CSS strips everything with `.no-print`; "save as PDF" is just
the print dialog. Never turn this into a download/builder flow — instant-print is the
differentiator vs the template mills.

## Double-sided alignment (get this right)

Each printable page emits a front sheet then a back sheet. In the **back sheet, every row is
reversed left-to-right** (`sheetHtml(..., "back", ...)` in `assets/cards.js`). Reason: when you
print double-sided and flip on the **long edge**, the paper mirrors horizontally, so a back
cell laid out at column *c* lands behind the front cell at column *(cols-1-c)*. Reversing the
row cancels that mirror, so each answer lands behind its own prompt. Layouts are 2-column, so a
row of two just swaps. If you change columns or the flip edge, redo this math.

## Card data + rendering (shared module)

Deck building + rendering live in `assets/cards.js`, a UMD module required by BOTH
`generate.js` (server) and `tool.js` (browser) so their output matches exactly. **Math decks
are COMPUTED** (`buildMath` — multiplication/addition/division answers correct by
construction, divisions divide evenly), never a hand-typed answer table. Curated lists
(sight words, all 50 states+capitals, ~30 Spanish words, A-Z, numbers 0-20) live in the
module as constants so server + client share identical data. Blank cells are
`contenteditable`; generated cells are filled and not editable.

## Deploy — just push

`git push` to `main` is the deploy — GitHub Actions (`.github/workflows/deploy.yml`).

- **Never manually build and commit output.** `public/` is git-ignored build output.
- **Never hand-edit anything in `public/`.**
- Commit as the neutral identity:
  `git -c user.name="flashcardkit" -c user.email="flashcardkit@users.noreply.github.com" commit …`

## Local build / preview

```
node generate.js     # writes ./public
node server.js       # preview at http://localhost:5073 (5060-5062 are Chrome-blocked ports)
```

## Page families

- `/<topic>-flashcards/` — one deck per topic, from `data/flashcards.json`. Add a deck by
  adding an entry: `type` is `blank`, `math` (with `op` + ranges), or `builtin` (with a
  `set` name resolved in `cards.js`). No generator changes needed for math/list decks; a new
  builtin `set` needs a case in `buildBuiltin`.
- `/` — homepage, links every deck grouped by its `group` field.

## Don't break these (generated, must keep serving)

- `ads.txt` + AdSense loader in `<head>` — publisher `ca-pub-5580575158570188`.
- GA4 `G-TJY4TRRKD6` (shared across all EP sites; hostname splits them).
- `sitemap.xml`, `robots.txt`, `.nojekyll`, `CNAME` (flashcards.elevatedprogress.com).
- GSC verification file once the property is verified.

## Config knobs

`DOMAIN` and `BASE`, same semantics as the other tools. Production values in the workflow.
`DEFAULT_LAYOUT` / `LAYOUT_OPTS` (cards per page) live at the top of `generate.js`.
