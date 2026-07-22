// Flashcard controls: cards-per-page layout, front/back on-screen view, print
// single/double-sided, font size, and print. The deck is server-rendered for SEO;
// this re-renders it (via the shared CARDS module) when the layout changes so the
// client output matches the server, and toggles classes for the rest.
(function () {
  const deck = document.querySelector("[data-deck]");
  if (!deck || !window.CARDS) return;

  const cfg = JSON.parse(deck.querySelector("[data-cfg]").textContent);
  const bodyEl = deck.querySelector("[data-body]");
  const ctl = name => document.querySelector(`[data-ctl=${name}]`);
  const isBlank = cfg.type === "blank";

  function render() {
    const layout = +ctl("layout").value || 8;
    const cards = CARDS.buildCards(cfg);
    bodyEl.innerHTML = CARDS.renderDeck(cards, { layout, editable: isBlank, blank: isBlank });
  }

  ctl("layout").addEventListener("change", render);

  ctl("view").addEventListener("change", e => {
    deck.classList.toggle("view-front", e.target.value === "front");
    deck.classList.toggle("view-back", e.target.value === "back");
  });

  ctl("sides").addEventListener("change", e => {
    deck.classList.toggle("sides-double", e.target.value === "double");
    deck.classList.toggle("sides-single", e.target.value === "single");
  });

  ctl("size").addEventListener("change", e => {
    deck.classList.remove("size-s", "size-m", "size-l");
    deck.classList.add("size-" + e.target.value);
  });

  ctl("print").addEventListener("click", () => window.print());
})();
