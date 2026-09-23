// Turns the inline citation anchors into hover and focus cards.
// Without this file every citation is still a working link down to its entry
// in the reference list, so nothing here is load-bearing for reading the page.
(() => {
  "use strict";

  const cites = [...document.querySelectorAll("a.cite[data-ref]")];
  if (!cites.length) return;

  const hoverable = window.matchMedia("(hover: hover) and (pointer: fine)");
  const card = document.createElement("div");
  card.className = "cite-card";
  card.setAttribute("role", "tooltip");
  card.id = "cite-card";
  card.dataset.open = "false";
  document.body.appendChild(card);

  let current = null;
  let hideTimer = null;
  let openedAt = 0;

  const close = () => {
    clearTimeout(hideTimer);
    card.dataset.open = "false";
    if (current) current.setAttribute("aria-expanded", "false");
    current = null;
  };

  const fill = (a) => {
    const ref = document.getElementById("ref-" + a.dataset.ref);
    if (!ref) return false;
    const srcs = [...ref.querySelectorAll(".ref-srcs a")]
      .map((s) => `<li><a href="${s.href}" target="_blank" rel="noopener noreferrer">${s.textContent}</a></li>`)
      .join("");
    card.innerHTML =
      `<button type="button" class="cite-card-close" data-cite-close aria-label="Close">\u2715</button>` +
      `<p class="cite-card-label">Supporting research</p>` +
      `<p class="cite-card-t">${ref.querySelector(".ref-t").textContent}</p>` +
      `<p class="cite-card-claim">${ref.querySelector(".ref-claim").textContent}</p>` +
      `<ul class="cite-card-srcs">${srcs}</ul>`;
    return true;
  };

  // Place below the citation, flipping above when there is no room, and clamp
  // to the viewport so a card near the right gutter stays fully on screen.
  const place = (a) => {
    const r = a.getBoundingClientRect();
    card.style.left = "0px";
    card.style.top = "0px";
    const c = card.getBoundingClientRect();
    const margin = 12;
    let left = r.left + r.width / 2 - c.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - c.width - margin));
    const below = r.bottom + 10;
    const above = r.top - c.height - 10;
    const top = below + c.height + margin > window.innerHeight && above > 80 ? above : below;
    card.style.left = left + window.scrollX + "px";
    card.style.top = top + window.scrollY + "px";
  };

  const open = (a) => {
    clearTimeout(hideTimer);
    if (!fill(a)) return;
    current = a;
    openedAt = Date.now();
    a.setAttribute("aria-expanded", "true");
    // The card lives on the body, so it inherits nothing from the band the
    // link is in. It is told which one to wear.
    card.dataset.tone = a.closest(".mf-band")?.dataset.tone || "light";
    card.dataset.open = "true";
    place(a);
  };

  for (const a of cites) {
    a.setAttribute("aria-describedby", "cite-card");
    a.setAttribute("aria-expanded", "false");

    a.addEventListener("mouseenter", () => hoverable.matches && open(a));
    a.addEventListener("mouseleave", () => {
      if (hoverable.matches) hideTimer = setTimeout(close, 160);
    });
    a.addEventListener("focus", () => open(a));
    a.addEventListener("blur", () => {
      if (!card.contains(document.activeElement)) close();
    });

    // Where hover is unavailable, the first tap opens the card instead of
    // jumping to the foot of the page; the card carries its own source links.
    // A tap also fires focus first, which opens the card, so a click arriving
    // right behind it must not read as the second tap of a toggle.
    a.addEventListener("click", (e) => {
      if (hoverable.matches) return;
      e.preventDefault();
      if (current === a && Date.now() - openedAt > 400) return close();
      open(a);
    });
  }

  card.addEventListener("click", (e) => {
    if (e.target.closest("[data-cite-close]")) {
      const a = current;
      close();
      a?.focus();
    }
  });
  card.addEventListener("mouseenter", () => clearTimeout(hideTimer));
  card.addEventListener("mouseleave", () => hoverable.matches && close());
  document.addEventListener("keydown", (e) => e.key === "Escape" && close());
  document.addEventListener("click", (e) => {
    if (current && !card.contains(e.target) && !current.contains(e.target)) close();
  });
  window.addEventListener("scroll", () => current && place(current), { passive: true });
  window.addEventListener("resize", close);
})();

// Diagrams render at their drawn size, so narrow viewports scroll the frame.
// Mark the ones that actually overflow; the stylesheet does the rest.
(() => {
  "use strict";
  const figs = [...document.querySelectorAll("figure.ig")];
  if (!figs.length) return;
  const sync = (first) => {
    for (const f of figs) {
      const frame = f.querySelector(".ig-frame");
      const over = frame.scrollWidth - frame.clientWidth;
      f.dataset.scrolls = String(over > 1);
      // A left-to-right flow reads from its start; the ladder reads from the
      // middle, because its canvas carries an axis label on either edge.
      if (first && over > 1 && f.dataset.focus === "center") {
        frame.scrollLeft = over / 2;
      }
    }
  };
  sync(true);
  window.addEventListener("resize", () => sync(false), { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(() => sync(true));
})();
