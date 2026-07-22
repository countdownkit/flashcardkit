/*
 * Shared flashcard logic — used by BOTH generate.js (Node, server render) and
 * tool.js (browser, re-render on control change) so server + client output match.
 * UMD-ish: attaches to module.exports under Node, window.CARDS in the browser.
 *
 * A deck is an array of { f, b } cards (front / back). Math decks are COMPUTED
 * (never a hand-typed answer table); curated list decks (sight words, states,
 * Spanish) live here so server + client share the exact same data. renderDeck()
 * lays cards into printable letter-page sheets: a FRONT sheet then a matching
 * BACK sheet per page, with each back row reversed left-to-right so that after
 * printing double-sided and flipping on the LONG edge, each answer lands behind
 * its prompt.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CARDS = factory();
})(typeof self !== "undefined" ? self : this, function () {

  // cards-per-page layouts (2 columns, so a row reverses to just [b, a])
  const LAYOUTS = { 6: { cols: 2, rows: 3 }, 8: { cols: 2, rows: 4 }, 10: { cols: 2, rows: 5 } };

  const NUM_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

  // Fry's first ~40 high-frequency (a.k.a. Dolch-overlap) sight words.
  const SIGHT_WORDS = ["the", "and", "a", "to", "in", "is", "you", "that", "it", "he",
    "was", "for", "on", "are", "as", "with", "his", "they", "at", "be", "this", "have",
    "from", "or", "one", "had", "by", "but", "not", "what", "all", "were", "we", "when",
    "your", "can", "said", "there", "use", "an"];

  // All 50 states -> capital.
  const STATES = [
    ["Alabama", "Montgomery"], ["Alaska", "Juneau"], ["Arizona", "Phoenix"],
    ["Arkansas", "Little Rock"], ["California", "Sacramento"], ["Colorado", "Denver"],
    ["Connecticut", "Hartford"], ["Delaware", "Dover"], ["Florida", "Tallahassee"],
    ["Georgia", "Atlanta"], ["Hawaii", "Honolulu"], ["Idaho", "Boise"],
    ["Illinois", "Springfield"], ["Indiana", "Indianapolis"], ["Iowa", "Des Moines"],
    ["Kansas", "Topeka"], ["Kentucky", "Frankfort"], ["Louisiana", "Baton Rouge"],
    ["Maine", "Augusta"], ["Maryland", "Annapolis"], ["Massachusetts", "Boston"],
    ["Michigan", "Lansing"], ["Minnesota", "Saint Paul"], ["Mississippi", "Jackson"],
    ["Missouri", "Jefferson City"], ["Montana", "Helena"], ["Nebraska", "Lincoln"],
    ["Nevada", "Carson City"], ["New Hampshire", "Concord"], ["New Jersey", "Trenton"],
    ["New Mexico", "Santa Fe"], ["New York", "Albany"], ["North Carolina", "Raleigh"],
    ["North Dakota", "Bismarck"], ["Ohio", "Columbus"], ["Oklahoma", "Oklahoma City"],
    ["Oregon", "Salem"], ["Pennsylvania", "Harrisburg"], ["Rhode Island", "Providence"],
    ["South Carolina", "Columbia"], ["South Dakota", "Pierre"], ["Tennessee", "Nashville"],
    ["Texas", "Austin"], ["Utah", "Salt Lake City"], ["Vermont", "Montpelier"],
    ["Virginia", "Richmond"], ["Washington", "Olympia"], ["West Virginia", "Charleston"],
    ["Wisconsin", "Madison"], ["Wyoming", "Cheyenne"]
  ];

  // ~30 common English -> Spanish words.
  const SPANISH = [
    ["hello", "hola"], ["goodbye", "adiós"], ["please", "por favor"], ["thank you", "gracias"],
    ["yes", "sí"], ["no", "no"], ["water", "agua"], ["food", "comida"], ["house", "casa"],
    ["dog", "perro"], ["cat", "gato"], ["red", "rojo"], ["blue", "azul"], ["green", "verde"],
    ["one", "uno"], ["two", "dos"], ["three", "tres"], ["friend", "amigo"], ["family", "familia"],
    ["book", "libro"], ["school", "escuela"], ["day", "día"], ["night", "noche"], ["sun", "sol"],
    ["moon", "luna"], ["man", "hombre"], ["woman", "mujer"], ["boy", "niño"], ["girl", "niña"],
    ["love", "amor"]
  ];

  // Build the full ordered card list for a page config from data/flashcards.json.
  // Returns [{ f, b }]. Blank pages return [] (renderDeck fills one page of blanks).
  function buildCards(page) {
    if (!page) return [];
    if (page.type === "math") return buildMath(page);
    if (page.type === "builtin") return buildBuiltin(page.set);
    return []; // "blank"
  }

  function buildMath(page) {
    const out = [];
    if (page.op === "×" || page.op === "+") {
      for (let a = page.min; a <= page.max; a++) {
        for (let b = page.min; b <= page.max; b++) {
          const ans = page.op === "×" ? a * b : a + b;
          out.push({ f: `${a} ${page.op} ${b}`, b: String(ans) });
        }
      }
      return out;
    }
    if (page.op === "÷") {
      // divisor d, quotient q => dividend d*q divides evenly, answer = q
      for (let d = page.dMin; d <= page.dMax; d++) {
        for (let q = page.qMin; q <= page.qMax; q++) {
          out.push({ f: `${d * q} ÷ ${d}`, b: String(q) });
        }
      }
      return out;
    }
    return out;
  }

  function buildBuiltin(set) {
    if (set === "letters") {
      const o = [];
      for (let i = 0; i < 26; i++) { const U = String.fromCharCode(65 + i); o.push({ f: U, b: U.toLowerCase() }); }
      return o;
    }
    if (set === "numbers") {
      const o = [];
      for (let n = 0; n <= 20; n++) o.push({ f: String(n), b: NUM_WORDS[n] });
      return o;
    }
    if (set === "sight") return SIGHT_WORDS.map(w => ({ f: w, b: w }));
    if (set === "states") return STATES.map(p => ({ f: p[0], b: p[1] }));
    if (set === "spanish") return SPANISH.map(p => ({ f: p[0], b: p[1] }));
    return [];
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function cellHtml(c, side, editable) {
    if (!c) return `<div class="card empty"></div>`;
    const content = side === "back" ? c.b : c.f;
    const ed = editable ? ' contenteditable="true" spellcheck="false"' : "";
    const idAttr = c._i != null ? ` data-i="${c._i}"` : "";
    return `<div class="card"${idAttr}><div class="cardface"${ed}>${esc(content)}</div></div>`;
  }

  // One printable sheet (front OR back). Back sheets reverse each row so the
  // page mirrors left-to-right for a long-edge flip.
  function sheetHtml(pageCards, side, cols, per, editable, pageNum) {
    const cells = pageCards.slice();
    while (cells.length < per) cells.push(null);
    let ordered = cells;
    if (side === "back") {
      ordered = [];
      for (let i = 0; i < cells.length; i += cols) {
        const row = cells.slice(i, i + cols).reverse();
        for (const c of row) ordered.push(c);
      }
    }
    const label = side === "front" ? "Front" : "Back (mirrored for flip)";
    const inner = ordered.map(c => cellHtml(c, side, editable)).join("");
    return `<section class="sheet ${side}">` +
      `<div class="sheet-label no-print">${label} · Page ${pageNum}</div>` +
      `<div class="cards cols-${cols}">${inner}</div></section>`;
  }

  // Render the whole deck as interleaved front/back sheets (front1, back1, ...).
  // opts: { layout 6|8|10, editable bool, blank bool }
  function renderDeck(cards, opts) {
    opts = opts || {};
    const L = LAYOUTS[opts.layout] || LAYOUTS[8];
    const per = L.cols * L.rows, cols = L.cols;
    const editable = !!opts.editable;
    const list = opts.blank
      ? Array.from({ length: per }, () => ({ f: "", b: "" }))
      : cards.map((c, i) => ({ f: c.f, b: c.b, _i: i }));
    let html = "";
    let pageNum = 0;
    for (let i = 0; i < list.length; i += per) {
      pageNum++;
      const pageCards = list.slice(i, i + per);
      html += sheetHtml(pageCards, "front", cols, per, editable, pageNum);
      html += sheetHtml(pageCards, "back", cols, per, editable, pageNum);
    }
    return html;
  }

  return { LAYOUTS, NUM_WORDS, SIGHT_WORDS, STATES, SPANISH, buildCards, renderDeck };
});
