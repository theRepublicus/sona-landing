// Plays each chart's reveal once it enters the viewport, in the same idiom as
// the reference build: arm on load, play on entry, never rewind.
// The CSS only hides anything while data-armed is set, so a chart with no
// JavaScript renders finished rather than blank.
(() => {
  "use strict";
  const charts = [...document.querySelectorAll("figure.ch")];
  if (!charts.length) return;

  for (const c of charts) c.dataset.armed = "true";

  if (!("IntersectionObserver" in window)) {
    for (const c of charts) c.dataset.played = "true";
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.dataset.played = "true";
        io.unobserve(e.target);
      }
    },
    { root: null, rootMargin: "0px 0px -12% 0px", threshold: 0 }
  );

  for (const c of charts) io.observe(c);
})();

/* Detail on demand --------------------------------------------------------
   Binds every [data-detail] hit area in a figure to one shared detail line
   under the frame. Hover, tap, click and keyboard all reach it, and the cue
   tells the reader which one this device uses. */
(() => {
  "use strict";
  const coarse = window.matchMedia("(hover: none)");

  for (const fig of document.querySelectorAll("figure.ch")) {
    const hits = [...fig.querySelectorAll("[data-detail]")];
    const foot = fig.querySelector(".ig-foot");
    if (!hits.length || !foot) continue;

    const bar = document.createElement("p");
    bar.className = "ch-detail";
    const cue = document.createElement("span");
    cue.className = "ch-detail-cue";
    const txt = document.createElement("span");
    txt.className = "ch-detail-t";
    txt.setAttribute("aria-live", "polite");
    bar.append(cue, txt);
    foot.prepend(bar);

    const base = hits.find((h) => h.dataset.default === "true");
    const clear = () => { for (const h of hits) delete h.dataset.on; };
    /* Every figure whose hits carry structured detail opens on a click and
       stays closed until then. Hovering a shape used to swap a line of text
       far below it, which read as flicker rather than as an answer. */
    const carded = hits.some((h) => h.dataset.dt);
    const clickOnly = carded || fig.dataset.reveal === "click";

    /* A single line under a 960-wide frame put the words a long way from the
       node they belonged to, on a measure no one reads. A figure that carries
       structured detail gets a card instead, at a readable width, with the
       comparables and the angle on their own labelled lines. */
    let card = null, cardT = null, cardBody = null, slot = null, holder = null, active = null;

    if (carded) {
      card = document.createElement("div");
      card.className = "ch-card";
      card.setAttribute("role", "group");
      const x = document.createElement("button");
      x.type = "button";
      x.className = "ch-card-x";
      x.setAttribute("aria-label", "Close detail");
      x.textContent = "\u00d7";
      cardT = document.createElement("p");
      cardT.className = "ch-card-t";
      cardBody = document.createElement("div");
      cardBody.setAttribute("aria-live", "polite");
      card.append(x, cardT, cardBody);
      x.addEventListener("click", () => { const a = active; rest(); if (a) a.focus(); });

      // The card for a node sits in the flow under the frame, indented to the
      // node it came from. The narrow rendition is a list, so there it opens
      // as its own item under the row instead.
      slot = document.createElement("div");
      slot.className = "ch-card-slot";
      foot.after(slot);
      holder = document.createElement("li");
      holder.className = "cn-detail-li";
    }

    const line = (label, text) => {
      if (!text) return;
      if (label) {
        const l = document.createElement("p");
        l.className = "ch-card-l";
        l.textContent = label;
        cardBody.append(l);
      }
      const b = document.createElement("p");
      b.className = "ch-card-b";
      b.textContent = text;
      cardBody.append(b);
    };

    const rest = () => {
      clear();
      // A touch reader is not clicking anything.
      const own = fig.dataset.cue || (carded ? "Click any part for the detail" : "");
      cue.textContent = own
        ? (coarse.matches ? own.replace(/^(Click|Hover)/, "Tap") : own)
        : (coarse.matches ? "Tap a row" : "Hover a row");
      txt.textContent = carded ? "" : base ? base.dataset.detail : "";
      bar.dataset.on = "false";
      if (card) {
        card.dataset.open = "false";
        slot.dataset.open = "false";
        holder.remove();
        active = null;
      }
    };

    const show = (h) => {
      if (carded && active === h) { rest(); return; }
      clear();
      h.dataset.on = "true";
      // A carded figure keeps its cue: the card carries its own heading.
      if (!carded) cue.textContent = "Detail";
      if (carded) {
        active = h;
        cardT.textContent = h.dataset.dt || "";
        cardBody.replaceChildren();
        line("", h.dataset.db);
        line("Comparables", h.dataset.dc);
        line("The Bittensor angle", h.dataset.da);
        if (h.ownerSVGElement) {
          holder.remove();
          slot.append(card);
          slot.dataset.open = "true";
        } else {
          slot.dataset.open = "false";
          holder.append(card);
          h.after(holder);
        }
        card.dataset.open = "true";
      } else {
        txt.textContent = h.dataset.detail;
      }
      bar.dataset.on = "true";
    };

    for (const h of hits) {
      if (!clickOnly) h.addEventListener("pointerenter", () => show(h));
      // Focus alone does not open a card: the focus event lands before the
      // click, and opening there turned every click into a close.
      h.addEventListener("focus", () => { if (!carded) show(h); });
      h.addEventListener("click", (e) => { e.preventDefault(); show(h); });
      h.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(h); }
      });
    }
    if (!clickOnly) fig.addEventListener("pointerleave", rest);
    /* A click on the card itself blurs the node with no new focus target, and
       closing on that would shut the card the moment anyone tried to select a
       line of it. A carded figure closes on Escape, the button, a second click
       on the same node, or a click outside. */
    fig.addEventListener("focusout", (e) => {
      if (carded && !e.relatedTarget) return;
      if (!fig.contains(e.relatedTarget)) rest();
    });

    if (carded) {
      fig.addEventListener("keydown", (e) => { if (e.key === "Escape") { rest(); } });
      document.addEventListener("click", (e) => {
        if (active && !fig.contains(e.target)) rest();
      });
    }

    rest();
  }
})();
