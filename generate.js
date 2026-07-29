/*
 * Static generator for the printable flashcard site.
 * Run: node generate.js   ->   writes everything into ./public
 *
 * Page families:
 *   /<slug>-flashcards/   one printable deck per topic (from data/flashcards.json)
 *   /                     homepage, grouped Blank / Math / Reading & language
 *
 * The artifact IS the page: each page server-renders a real sheet (or sheets) of
 * flashcard cells — a FRONT sheet and a matching BACK sheet per page. Back sheets
 * are mirrored left-to-right per row so that after printing double-sided and
 * flipping on the LONG edge, each back lands behind its front. Math decks are
 * COMPUTED (answers correct by construction); blank cells are contenteditable.
 * Printed via the browser (or saved as PDF); print CSS strips all but the sheets.
 */
const fs = require("fs");
const path = require("path");
const CARDS = require("./assets/cards.js");

// ---- config -------------------------------------------------------------
const DOMAIN = process.env.DOMAIN || "https://flashcards.elevatedprogress.com";
const BASE = process.env.BASE || "";
const SITE = "Flashcard Maker";
const OUT = path.join(__dirname, "public");
const ASSETS = path.join(__dirname, "assets");
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "flashcards.json"), "utf8"));
const PAGES = DATA.pages;

const DEFAULT_LAYOUT = 8;
const LAYOUT_OPTS = [6, 8, 10];
const GROUPS = ["Blank", "Math", "Reading & language"];
const ANCHORS = { "Blank": "blank", "Math": "math", "Reading & language": "reading" };

// ---- html layout --------------------------------------------------------
function layout({ title, desc, urlPath, h1, body }) {
  const canonical = DOMAIN + BASE + urlPath;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="${BASE}/styles.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5580575158570188" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TJY4TRRKD6"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-TJY4TRRKD6');</script>
</head>
<body>
<header class="site-head no-print"><div class="wrap">
  <a class="brand" href="${BASE}/">🎴 ${SITE}</a>
  <nav class="nav"><a href="${BASE}/#math">Math</a><a href="${BASE}/#reading">Reading</a><a href="${BASE}/#blank">Blank</a></nav>
</div></header>
<main class="wrap">
  <div class="crumbs no-print"><a href="${BASE}/">Home</a> ›&nbsp;${h1}</div>
  <h1 class="no-print">${h1}</h1>
  ${body}
</main>
<footer class="site-foot no-print"><div class="wrap">
  <a href="${BASE}/">Home</a><a href="${BASE}/#math">Math flashcards</a><a href="${BASE}/#reading">Reading &amp; language</a>
  <span>· ${SITE} — free printable flashcards. No downloads, no signups: customize and print. Part of <a href="https://elevatedprogress.com/">Elevated Progress</a>. · <a href="https://elevatedprogress.com/about/">About</a> · <a href="https://elevatedprogress.com/contact/">Contact</a> · <a href="https://elevatedprogress.com/privacy/">Privacy Policy</a></span>
</div></footer>
<script src="${BASE}/cards.js"></script>
<script src="${BASE}/tool.js" defer></script>
</body>
</html>`;
}
function grid(links) {
  return `<div class="grid">` + links.map(l =>
    `<a href="${BASE}${l.href}">${l.emoji ? `<span class="chip-emoji">${l.emoji}</span>` : ""}${l.label}</a>`).join("") + `</div>`;
}

// ---- controls -----------------------------------------------------------
function controls() {
  const layoutSel = `<div><label for="l">Cards per page</label><select id="l" data-ctl="layout">${
    LAYOUT_OPTS.map(n => `<option value="${n}"${n === DEFAULT_LAYOUT ? " selected" : ""}>${n} per page</option>`).join("")
  }</select></div>`;
  return `<div class="controls no-print">
    <div class="row">
      ${layoutSel}
      <div><label for="v">Show on screen</label><select id="v" data-ctl="view"><option value="front" selected>Fronts</option><option value="back">Backs (mirrored)</option></select></div>
      <div><label for="s">Print</label><select id="s" data-ctl="sides"><option value="double" selected>Double-sided (front + back)</option><option value="single">Single-sided (fronts only)</option></select></div>
      <div><label for="z">Font size</label><select id="z" data-ctl="size"><option value="s">Small</option><option value="m" selected>Medium</option><option value="l">Large</option></select></div>
    </div>
    <div class="ctl-foot">
      <button type="button" class="print-btn" data-ctl="print">🖨️ Print flashcards</button>
      <span class="hint">Double-sided? Set your printer to flip on the <b>long edge</b> — the backs are mirrored so each answer lands behind its prompt. "Save as PDF" is a destination in the print dialog.</span>
    </div>
  </div>`;
}

// ---- write helpers ------------------------------------------------------
const urls = [];
function writePage(urlPath, html) {
  const dir = path.join(OUT, urlPath.replace(/^\/+|\/+$/g, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  urls.push(urlPath);
}

// ---- deck page ----------------------------------------------------------
function deckPage(page, related) {
  const cards = CARDS.buildCards(page);
  const isBlank = page.type === "blank";
  const deckHtml = CARDS.renderDeck(cards, { layout: DEFAULT_LAYOUT, editable: isBlank, blank: isBlank });
  const count = isBlank ? 0 : cards.length;
  // config the client needs to rebuild the deck on a control change
  const cfg = { type: page.type, op: page.op, min: page.min, max: page.max,
    dMin: page.dMin, dMax: page.dMax, qMin: page.qMin, qMax: page.qMax, set: page.set };

  const deck = `<div class="deck view-front sides-double size-m" data-deck>
    <script type="application/json" data-cfg>${JSON.stringify(cfg)}</script>
    <div data-body>${deckHtml}</div>
  </div>`;

  const countLine = isBlank
    ? `<p><b>Blank template:</b> one page of type-in cells. Change "Cards per page" for a different grid.</p>`
    : `<p><b>Deck size:</b> ${count} cards. Change "Cards per page" above to fit more or fewer on each sheet.</p>`;

  const title = `${page.title} — Free Printable (PDF)`;
  const body = `${controls()}
  ${deck}
  <div class="ad-slot no-print">Advertisement</div>
  <div class="prose no-print">
    <p>${page.blurb}</p>
    ${page.tip ? `<p>${page.tip}</p>` : ""}
    ${countLine}
    <p><b>To print:</b> pick a layout above and hit Print. <b>Double-sided cards:</b> keep Print on "Double-sided", print, then flip the paper on the <b>long edge</b> — the back sheets are mirrored per row so every answer lines up behind its prompt. <b>Single-sided:</b> switch Print to "Fronts only". <b>To save a PDF instead:</b> pick "Save as PDF" as the printer in the print dialog — nothing to install. Everything except the cards is stripped from the printout.</p>
  </div>
  <h2 class="no-print">More flashcards</h2>
  <div class="no-print">${grid(related)}</div>
  <div class="ad-slot no-print">Advertisement</div>`;
  writePage(`/${page.slug}/`, layout({ title, desc: page.desc, urlPath: `/${page.slug}/`, h1: page.title, body }));
}

// ---- build --------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
for (const entry of fs.readdirSync(OUT)) {
  if (entry === ".git" || entry === "CNAME") continue;
  fs.rmSync(path.join(OUT, entry), { recursive: true, force: true });
}
for (const f of fs.readdirSync(ASSETS)) fs.copyFileSync(path.join(ASSETS, f), path.join(OUT, f));

const pageLink = p => ({ href: `/${p.slug}/`, emoji: p.emoji, label: p.title });

for (const page of PAGES) {
  const related = PAGES.filter(o => o.slug !== page.slug).map(pageLink);
  deckPage(page, related);
}

// -- homepage --
{
  const title = `Free Printable Flashcards — Make and Print (PDF)`;
  const desc = `Free printable flashcards: multiplication, addition, division, sight words, alphabet, numbers, states and capitals, Spanish, plus blank templates. Print double-sided or save as a PDF. No signup.`;
  const sections = GROUPS.map(g => {
    const links = PAGES.filter(p => p.group === g).map(pageLink);
    if (!links.length) return "";
    return `<h2 id="${ANCHORS[g]}">${g}</h2>\n  ${grid(links)}`;
  }).join("\n  ");
  const body = `<p class="lead">Pick a topic, choose how many cards per page, then print — or save as a PDF from the print dialog. Print double-sided and each answer lands right behind its prompt. No downloads, no account, nothing to install.</p>
  ${sections}
  <div class="ad-slot no-print">Advertisement</div>
  <div class="prose"><p>These are working flashcards, not static template downloads: the cards you see on each page are the ones that print, and the math decks are computed — every answer correct by construction, never a hand-typed table. Each printable page has a front sheet and a matching back sheet whose cells are mirrored left-to-right, so when you print double-sided and flip on the long edge, the answer lands behind its prompt. Blank cards are click-to-type. The print stylesheet strips the site chrome so only the cards land on paper.</p></div>
  <div class="prose">
    <h2>How to make and print your flashcards</h2>
    <p>Start by picking a ready-made deck or the blank template. The ready-made decks cover multiplication, addition, and division facts, sight words, the alphabet, numbers 0 to 20, all fifty states and their capitals, and beginner Spanish vocabulary. The blank template gives you a full page of empty cells you can type into — click any cell and start typing to build your own set of terms and answers.</p>
    <p>On each deck page, choose 6, 8, or 10 cards per page to set how large the cards print. Every page renders two sheets: a front sheet with the prompts and a back sheet with the answers. To make front-and-back cards, leave Print set to double-sided, send the job to your printer, and set the printer to flip on the <b>long edge</b>. The back sheet is mirrored left-to-right for exactly this reason, so once the paper flips, each answer lands directly behind its own prompt. If you only want the prompts, switch Print to single-sided. Prefer a file? Choose "Save as PDF" as the printer in the print dialog — there is nothing to download or install.</p>
    <p>The cards sit in a grid with dashed guide lines. After printing, cut along those lines with scissors or a paper trimmer to separate the cards. To study, read the prompt, say the answer out loud, then flip the card to check. Shuffle the pile, set aside the cards you get right, and keep cycling the ones you miss until the pile is gone.</p>
    <h2>Frequently asked questions</h2>
    <p><b>How do I print the front and back aligned?</b> Keep Print on "double-sided" and set your printer to flip on the long edge (often called "long-edge binding"). The back cells are already mirrored per row, so the flip lines each answer up behind its prompt. Run a single test page first to confirm the setting before printing the whole deck.</p>
    <p><b>Can I make my own cards?</b> Yes. Open the blank template, click any cell, and type your own prompt. Every cell is editable, so you can fill a whole page with custom terms and print it the same way as the ready-made decks.</p>
    <p><b>What decks are included?</b> Multiplication, addition, and division (the math facts are computed, so every answer is correct and every division comes out even), sight words, uppercase and lowercase letters, numbers paired with their spelled-out words, US states and capitals, and common Spanish words — plus the blank template for your own sets.</p>
    <p><b>Do I need an account or any software?</b> No. Everything prints straight from your browser, and "Save as PDF" is simply a destination in the print dialog. No sign-up, no download, nothing to install.</p>
  </div>`;
  writePage(`/`, layout({ title, desc, urlPath: `/`, h1: `Free Printable Flashcards`, body }));
}

// -- sitemap + robots + meta files --
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${DOMAIN}${BASE}${u}</loc></url>`).join("\n")}
</urlset>`;
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}${BASE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
fs.writeFileSync(path.join(OUT, "CNAME"), "flashcards.elevatedprogress.com\n");
fs.writeFileSync(path.join(OUT, "ads.txt"), "google.com, pub-5580575158570188, DIRECT, f08c47fec0942fa0\n");

console.log(`Generated ${urls.length} pages into ./public`);
