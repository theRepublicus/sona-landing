// Keeps the contents rail useful the whole way down the document: marks the
// section the reader is in, and on narrow screens turns the rail into a panel
// behind a floating button, since a pinned rail would eat the viewport.
(() => {
  "use strict";

  const nav = document.querySelector(".mf-contents");
  if (!nav) return;
  const links = [...nav.querySelectorAll("a[href^='#']")];
  if (!links.length) return;

  /* Scroll spy ---------------------------------------------------------- */

  const targets = links
    .map((a) => ({ a, el: document.getElementById(decodeURIComponent(a.hash.slice(1))) }))
    .filter((t) => t.el);

  const mark = (a) => {
    for (const l of links) l.removeAttribute("aria-current");
    if (a) a.setAttribute("aria-current", "true");
  };

  if ("IntersectionObserver" in window) {
    const seen = new Set();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.isIntersecting ? seen.add(e.target) : seen.delete(e.target);
        // The topmost section still on screen is the one being read.
        let best = null;
        for (const t of targets) if (seen.has(t.el)) { best = t.a; break; }
        if (best) mark(best);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    for (const t of targets) io.observe(t.el);
  }

  /* Pinning ------------------------------------------------------------- */

  // The rail is fixed only after its own place in the page has scrolled under
  // the header. The threshold is the rail's own position measured in flow:
  // inserting a sentinel to mark it would add a grid child, and that child
  // takes the rail's column and drops the rail on top of the prose.
  const wide = window.matchMedia("(min-width: 88rem)");
  const TOP = 136; // matches the pinned `top` in manifesto.css
  const article = nav.closest("article") || nav.closest(".mf-body") || document.body;
  let threshold = Infinity;
  let limit = Infinity;

  const pin = (on) => {
    if (on) nav.dataset.pinned = "true";
    else delete nav.dataset.pinned;
  };

  const measure = () => {
    if (!wide.matches) { threshold = Infinity; limit = Infinity; return; }
    const was = nav.dataset.pinned;
    delete nav.dataset.pinned;                       // read it where it sits in flow
    threshold = nav.getBoundingClientRect().top + window.scrollY - TOP;
    // ...and released again at the end of the article, or it sits on the footer.
    limit = article.getBoundingClientRect().bottom + window.scrollY - nav.offsetHeight - TOP - 48;
    if (was) nav.dataset.pinned = was;
  };

  // The rail and its button are fixed, so nothing inherits the band they are
  // over. They are told which one on every frame that the pin is checked.
  const bands = [...document.querySelectorAll(".mf-band")];
  // Every row of the rail, so each one can take the ink of the band behind it
  // rather than the whole rail taking one tone and half of it going dark on
  // dark at a seam.
  const toneSync = () => {
    if (!bands.length) return;
    const rects = bands.map((el) => [el.getBoundingClientRect(), el.dataset.tone]);
    const toneAt = (y) => {
      for (const [r, t] of rects) if (r.top <= y && r.bottom > y) return t;
      return "light";
    };

    // A row whose text crosses a seam cannot be inked either way, and matching
    // the ground to the seam does not help: the row still spans both. So once
    // pinned the rail is a card carrying its own ground, toned from its top
    // edge and fading between tones rather than snapping.
    const navR = nav.getBoundingClientRect();
    nav.dataset.tone = toneAt(navR.top + 1);
    // The button's own rect is useless here: it is display:none above the
    // breakpoint and translated off-screen while the reader scrolls. Probe
    // where it rests instead.
    const btnProbe = window.innerHeight - 38;
    const under = bands.find((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= btnProbe && r.bottom > btnProbe;
    });
    btn.dataset.tone = under ? under.dataset.tone : "light";
  };

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      pin(wide.matches && window.scrollY > threshold && window.scrollY < limit);
      toneSync();
    });
  };

  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { pin(false); measure(); onScroll(); });
  wide.addEventListener("change", () => { pin(false); measure(); onScroll(); });

  /* Narrow screens: the rail becomes a panel ---------------------------- */

  // Below the pin breakpoint the rail cannot follow the page, so the button does.
  const narrow = window.matchMedia("(max-width: 87.99rem)");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "toc-toggle";
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", nav.id || (nav.id = "mf-contents"));
  btn.innerHTML = '<span aria-hidden="true">≡</span> Contents';
  document.body.appendChild(btn);

  const setOpen = (on) => {
    btn.setAttribute("aria-expanded", String(on));
    nav.dataset.panel = String(on);
    document.body.style.overflow = on ? "hidden" : "";
  };

  btn.addEventListener("click", () => setOpen(btn.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));

  const sync = () => {
    btn.hidden = !narrow.matches;
    if (!narrow.matches) setOpen(false);
  };
  sync();
  narrow.addEventListener("change", sync);
  onScroll();                                   // btn exists from here on

  // On a phone the button sits over body copy for the whole document. It gets
  // out of the way while the reader is moving down the page, and comes back
  // the moment they stop or scroll back up.
  let lastY = window.scrollY;
  let idle;
  const nudge = () => {
    if (!narrow.matches || btn.getAttribute("aria-expanded") === "true") {
      btn.dataset.away = "false";
      return;
    }
    const y = window.scrollY;
    btn.dataset.away = String(y > lastY + 4 && y > 400);
    lastY = y;
    clearTimeout(idle);
    idle = setTimeout(() => { btn.dataset.away = "false"; }, 700);
  };
  window.addEventListener("scroll", nudge, { passive: true });
})();
