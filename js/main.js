/* =====================================================================
   AMIRANTE ATELIER — main.js
   Rendering contenuti da DATA, nav, reveal on scroll, galleria + lightbox
   ===================================================================== */
(function () {
  "use strict";
  const D = window.DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const set = (sel, html) => { const n = $(sel); if (n) n.innerHTML = html; };

  /* ---------- HERO ---------- */
  const hv = $("#heroVideo");
  if (hv) {
    hv.src = D.media.heroVideo;
    hv.play && hv.play().catch(() => {});
  }
  set("#heroClaim", D.brand.claim);
  set("#heroSub", D.brand.subclaim);

  /* ---------- FILOSOFIA ---------- */
  set("#philoKicker", D.philosophy.kicker);
  set("#philoTitle", D.philosophy.title);
  set("#philoBody", D.philosophy.body.map((p) => `<p>${p}</p>`).join(""));
  if (D.philosophy.stats && D.philosophy.stats.length) {
    set("#philoStats", D.philosophy.stats.map((s) =>
      `<div><div class="n">${s.n}</div><div class="l">${s.l}</div></div>`).join(""));
  } else {
    const ps = $("#philoStats"); if (ps) ps.remove();
  }

  /* ---------- SERVIZI ---------- */
  set("#svcList", D.services.map((s, i) => `
    <article class="svc reveal">
      <div class="svc-media">
        <span class="svc-num" aria-hidden="true">0${i + 1}</span>
        <img src="${s.image}" alt="${s.name} — Atelier Amirante, Villaricca" width="900" height="1200" loading="lazy">
      </div>
      <div class="svc-body">
        <span class="kicker">${s.kicker}</span>
        <h3>${s.name}</h3>
        <div class="svc-dur">Su appuntamento</div>
        <p>${s.desc}</p>
        <ul class="svc-list">${s.expect.map((e) => `<li>${e}</li>`).join("")}</ul>
        <a href="#prenota" class="btn">Prenota questa consulenza</a>
      </div>
    </article>`).join(""));

  /* ---------- STEP ---------- */
  set("#stepsGrid", D.steps.map((s) => `
    <div class="step reveal">
      <div class="step-n">${s.n}</div>
      <h3>${s.t}</h3>
      <p>${s.d}</p>
    </div>`).join(""));

  /* ---------- GALLERIA (filtrabile per categoria) ---------- */
  set("#galKicker", D.gallery.kicker);
  set("#galTitle", D.gallery.title);
  const galCats = D.gallery.categories;
  let galCurrent = []; // immagini attualmente mostrate (per il lightbox)

  // barra filtri (se più categorie)
  if (galCats.length > 1) {
    const bar = $("#galFilters");
    if (bar) {
      bar.innerHTML = galCats.map((cat, i) =>
        `<button class="gal-filter${i === 0 ? " on" : ""}" type="button" data-cat="${cat.id}" aria-pressed="${i === 0}">${cat.label}</button>`).join("");
      bar.addEventListener("click", (e) => {
        const b = e.target.closest(".gal-filter"); if (!b) return;
        bar.querySelectorAll(".gal-filter").forEach((x) => { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("on"); b.setAttribute("aria-pressed", "true");
        renderGallery(galCats.find((c) => c.id === b.dataset.cat));
      });
    }
  }

  function renderGallery(cat) {
    galCurrent = cat.images.slice();
    const altBase = cat.id === "uomo" ? "Abito uomo da cerimonia" : "Abito da sposa";
    set("#galGrid", galCurrent.map((src, i) => `
      <button class="gal-item" type="button" data-i="${i}" aria-label="Ingrandisci: ${altBase} ${i + 1}">
        <img src="${src}" alt="${altBase} su misura — Atelier Amirante, Villaricca (${i + 1})" width="900" height="1200" loading="lazy">
        <span class="gal-item-ov" aria-hidden="true"><span class="gal-item-plus">+</span></span>
      </button>`).join(""));
  }
  renderGallery(galCats[0]);

  /* ---------- ATMOSPHERE ---------- */
  const lv = $("#luxVideo");
  if (lv) { lv.src = D.media.luxVideo; lv.play && lv.play().catch(() => {}); }

  /* ---------- CONTATTI ---------- */
  const c = D.contact;
  set("#cAddr", `${c.address}<br>${c.city}`);
  const cp = $("#cPhone"); cp.textContent = c.phone; cp.href = c.phoneHref;
  const cw = $("#cWa"); cw.textContent = c.whatsapp; cw.href = `https://wa.me/${c.whatsappNumber}`;
  set("#cHours", `<p style="margin:0 0 .4rem;font-size:.92rem;color:var(--ink-soft)">${D.hours.note}</p>` +
    D.hours.lines.map((l) => `<p style="margin:.2rem 0"><strong style="font-weight:400">${l.d}</strong> · ${l.h}</p>`).join(""));
  const soc = [];
  if (c.instagram) soc.push(`<a href="${c.instagram}" target="_blank" rel="noopener">Instagram</a>`);
  if (c.facebook) soc.push(`<a href="${c.facebook}" target="_blank" rel="noopener">Facebook</a>`);
  set("#cSocials", soc.join(""));
  $("#cMap").src = c.mapsEmbed;

  /* ---------- FOOTER ---------- */
  set("#fAbout", D.brand.subclaim);
  set("#fAddr", `${c.address}, ${c.city}`);
  const fp = $("#fPhone"); fp.textContent = c.phone; fp.href = c.phoneHref;
  $("#fWa").href = `https://wa.me/${c.whatsappNumber}`;
  $("#fIg").href = c.instagram || "#";
  $("#fFb").href = c.facebook || "#";
  $("#year").textContent = new Date().getFullYear();

  /* ---------- NAV scroll / menu ---------- */
  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("solid", window.scrollY > 60);
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

  const burger = $("#navBurger"), links = $("#navLinks");
  const setMenu = (open) => {
    links.classList.toggle("open", open); nav.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
  };
  burger.addEventListener("click", () => setMenu(!links.classList.contains("open")));
  $$("#navLinks a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------- REVEAL ON SCROLL ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  const observeReveals = () => $$(".reveal:not(.in)").forEach((n) => io.observe(n));
  observeReveals();
  // esposto per la UI del booking che aggiunge elementi dinamicamente
  window.__reveal = observeReveals;

  /* ---------- LIGHTBOX ---------- */
  const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCount = $("#lbCount");
  let gi = 0;
  const show = (i) => {
    const imgs = galCurrent; gi = (i + imgs.length) % imgs.length; lbImg.src = imgs[gi];
    lbImg.alt = `Creazione Atelier Amirante ${gi + 1} di ${imgs.length}`;
    if (lbCount) lbCount.textContent = `${gi + 1} / ${imgs.length}`;
  };
  let lbTrigger = null;
  const open = (i) => {
    lbTrigger = document.activeElement;
    show(i); lb.classList.add("on"); lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; $("#lbClose").focus();
  };
  const close = () => {
    lb.classList.remove("on"); lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; if (lbTrigger && lbTrigger.focus) lbTrigger.focus();
  };
  $("#galGrid").addEventListener("click", (e) => {
    const t = e.target.closest(".gal-item[data-i]"); if (t) open(+t.dataset.i);
  });
  $("#lbClose").addEventListener("click", close);
  $("#lbPrev").addEventListener("click", () => show(gi - 1));
  $("#lbNext").addEventListener("click", () => show(gi + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("on")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(gi - 1);
    if (e.key === "ArrowRight") show(gi + 1);
  });
})();
