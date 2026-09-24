/* =====================================================================
   AMIRANTE ATELIER — MOTORE DI PRENOTAZIONE
   - Generazione slot per servizio/data (Europe/Rome, gestione fuso esplicita)
   - Blocco agenda per capienza (3 sale prova) con lettura in tempo reale
   - Backend Supabase (RPC atomica book_slot) con fallback WhatsApp
   Esposto come window.Booking (engine) e monta la UI in #booking-app.
   ===================================================================== */
(function () {
  "use strict";

  const CFG = window.DATA.booking;
  const SERVICES = window.DATA.services;
  const CONTACT = window.DATA.contact;

  /* ---------------- Utility fuso orario (Europe/Rome) ---------------- */

  // Offset (in minuti) del fuso `tz` per un dato istante.
  function tzOffsetMinutes(tz, date) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const p = {};
    for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((asUTC - date.getTime()) / 60000);
  }

  // Converte un orario "da parete" (Europe/Rome) in un istante UTC reale.
  function zonedWallToInstant(y, m, d, hh, mm, tz) {
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    let off = tzOffsetMinutes(tz, new Date(guess));
    let inst = guess - off * 60000;
    // correzione per i confini DST
    const off2 = tzOffsetMinutes(tz, new Date(inst));
    if (off2 !== off) inst = guess - off2 * 60000;
    return new Date(inst);
  }

  // Data odierna (parti Y/M/D) nel fuso configurato.
  function todayParts(tz) {
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    });
    const p = {};
    for (const part of dtf.formatToParts(new Date())) p[part.type] = part.value;
    return { y: +p.year, m: +p.month, d: +p.day };
  }

  const pad = (n) => String(n).padStart(2, "0");
  const toISODate = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const hmToMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
  const minToHM = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

  /* ---------------- Generazione slot ---------------- */

  // Tutti gli slot teorici per un servizio (indipendenti dalla data).
  // Regola: uno slot è valido solo se termina ENTRO la fine della fascia.
  function slotsForService(service) {
    const dur = service.durationMin;
    const step = CFG.stepMin;
    const out = [];
    for (const w of CFG.windows) {
      const wStart = hmToMin(w.start);
      const wEnd = hmToMin(w.end);
      for (let s = wStart; s + dur <= wEnd; s += step) {
        out.push({ startMin: s, endMin: s + dur, label: minToHM(s) });
      }
    }
    return out;
  }

  function isOpenDay(y, m, d) {
    const iso = toISODate(y, m, d);
    if (CFG.closedDates.includes(iso)) return false;
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Dom
    return CFG.openDays.includes(wd);
  }

  // Limiti del calendario: da oggi (Rome) a oggi + horizonMonths.
  function dateBounds() {
    const t = todayParts(CFG.timezone);
    const min = new Date(Date.UTC(t.y, t.m - 1, t.d));
    const months = CFG.horizonMonths || 12;
    const max = new Date(Date.UTC(t.y, t.m - 1 + months, t.d));
    return { min, max, today: t };
  }

  // Un giorno è prenotabile se: giorno di apertura, non chiuso,
  // non passato e non oltre l'orizzonte.
  function isBookable(y, m, d) {
    if (!isOpenDay(y, m, d)) return false;
    const { min, max } = dateBounds();
    const cur = Date.UTC(y, m - 1, d);
    return cur >= min.getTime() && cur <= max.getTime();
  }

  /* ---------------- Accesso dati (Supabase) ---------------- */

  const SB = CFG.supabase;
  const sbEnabled = () => !!(SB && SB.url && SB.anonKey && SB.clientId);
  const sbHeaders = () => ({ apikey: SB.anonKey, Authorization: `Bearer ${SB.anonKey}` });

  // Legge gli slot occupati di Amirante per una data, tramite la funzione
  // sicura slots_occupati (ritorna solo orario+durata, nessun dato personale).
  async function fetchBookings(iso) {
    if (!sbEnabled()) return null; // nessun backend → nessun blocco server-side
    const res = await fetch(`${SB.url}/rest/v1/rpc/slots_occupati`, {
      method: "POST",
      headers: { ...sbHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ p_client: SB.clientId, p_data: iso }),
    });
    if (!res.ok) throw new Error("read " + res.status);
    return await res.json(); // [{booking_time:"HH:MM:SS", duration_min:60}]
  }

  // Slot liberi per (servizio, data): capienza CFG.capacity condivisa
  // tra TUTTI i tipi di consulenza (stesse sale prova).
  async function freeSlots(service, iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const now = Date.now();
    const leadMs = CFG.leadTimeHours * 3600 * 1000;

    let booked = [];
    try { booked = (await fetchBookings(iso)) || []; }
    catch (e) { booked = []; /* in caso di errore rete: mostra comunque gli slot */ }

    const busy = booked.map((b) => {
      const s = hmToMin(String(b.booking_time).slice(0, 5));
      const dur = Number(b.duration_min) || service.durationMin || 60;
      return { s, e: s + dur };
    });

    const cap = CFG.capacity;
    const result = [];
    for (const slot of slotsForService(service)) {
      // preavviso minimo
      const inst = zonedWallToInstant(y, m, d, Math.floor(slot.startMin / 60), slot.startMin % 60, CFG.timezone);
      if (inst.getTime() < now + leadMs) continue;
      // capienza: conta sovrapposizioni
      const overlap = busy.filter((b) => b.s < slot.endMin && b.e > slot.startMin).length;
      const free = cap - overlap;
      result.push({ ...slot, endLabel: minToHM(slot.endMin), free: Math.max(0, free), available: free > 0 });
    }
    return result;
  }

  /* ---------------- Creazione prenotazione ---------------- */

  async function createBooking(payload) {
    // payload: { service, iso, startMin, endMin, nome, telefono, email, note }
    if (!sbEnabled()) {
      return { ok: true, mode: "whatsapp" }; // nessun backend: solo notifica staff
    }

    // Ricontrollo disponibilità appena prima di inserire (riduce le doppie
    // prenotazioni concorrenti sulla stessa risorsa/orario).
    try {
      const check = await freeSlots(payload.service, payload.iso);
      const slot = check.find((s) => s.startMin === payload.startMin);
      if (slot && !slot.available) return { ok: false, error: "slot occupato" };
    } catch (e) { /* se il controllo fallisce, si prosegue con l'inserimento */ }

    // Inserimento diretto nella tabella condivisa "bookings" di Scintilla.
    const body = {
      client_id: SB.clientId,
      booking_type_id: payload.service.bookingTypeId,
      customer_name: payload.nome,
      customer_phone: payload.telefono,
      customer_email: payload.email || null,
      booking_date: payload.iso,
      booking_time: minToHM(payload.startMin) + ":00",
      duration_min: payload.service.durationMin || 60,
      party_size: 1,
      status: "in_attesa",
      notes: payload.note || null,
      consent_given: true,
      consent_at: new Date().toISOString(),
      source: "form",
    };
    const res = await fetch(`${SB.url}/rest/v1/${SB.table}`, {
      method: "POST",
      headers: {
        apikey: SB.anonKey,
        Authorization: `Bearer ${SB.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: t || ("HTTP " + res.status) };
    }
    return { ok: true, mode: "supabase" };
  }

  function whatsappLink(payload) {
    const dateLabel = new Date(payload.iso + "T00:00:00").toLocaleDateString("it-IT", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const ora = minToHM(payload.startMin);
    const msg =
      `Buongiorno, sono ${payload.nome} e vorrei prenotare una consulenza presso l'Atelier Amirante.%0A%0A` +
      `Sarei felice di venirvi a trovare per: ${payload.service.name}.%0A` +
      `Il giorno che preferisco è ${dateLabel}, verso le ${ora}.%0A%0A` +
      `Potete contattarmi al ${payload.telefono}` +
      (payload.email ? ` oppure via email a ${payload.email}` : "") + `.%0A` +
      (payload.note ? `%0AUn'ultima nota: ${payload.note}%0A` : "") +
      `%0AAttendo una vostra conferma. Grazie!`;
    return `https://wa.me/${CONTACT.whatsappNumber}?text=${msg}`;
  }

  /* ================================================================
     UI — widget prenotazione (mounts in #booking-app)
     ================================================================ */

  const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
  const dayNames = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];

  const state = { service: null, iso: null, slot: null, slotsCache: {}, calY: null, calM: null };

  function mount() {
    const root = document.getElementById("booking-app");
    if (!root) return;
    renderStep1(root);
  }

  function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  /* ---- Step 1: scelta servizio ---- */
  function renderStep1(root) {
    root.innerHTML = "";
    const wrap = el(`<div class="bk"></div>`);
    wrap.appendChild(el(`<div class="bk-progress"><span class="on">1 · Consulenza</span><span>2 · Data e ora</span><span>3 · Dati</span></div>`));
    const grid = el(`<div class="bk-svc-grid"></div>`);
    SERVICES.forEach((s) => {
      const card = el(`
        <button class="bk-svc reveal" type="button" data-id="${s.id}">
          <img class="bk-svc-img" src="${s.image}" alt="${s.name} — Atelier Amirante" width="800" height="1000" loading="lazy">

          <span class="bk-svc-body">
            <span class="bk-svc-kicker">${s.kicker}</span>
            <span class="bk-svc-name">${s.name}</span>
            <span class="bk-svc-dur">Su appuntamento</span>
          </span>
          <span class="bk-svc-go">Scegli <i>→</i></span>
        </button>`);
      card.addEventListener("click", () => { state.service = s; state.iso = null; state.slot = null; renderStep2(root); });
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    root.appendChild(wrap);
    if (window.__reveal) window.__reveal();
  }

  /* ---- Step 2: calendario + orari ---- */
  function renderStep2(root) {
    root.innerHTML = "";
    const wrap = el(`<div class="bk"></div>`);
    wrap.appendChild(el(`<div class="bk-progress"><span class="done">1 · Consulenza</span><span class="on">2 · Data e ora</span><span>3 · Dati</span></div>`));

    const head = el(`<div class="bk-head">
        <button class="bk-back" type="button">← Consulenza</button>
        <div class="bk-chosen">${state.service.name}</div>
      </div>`);
    head.querySelector(".bk-back").addEventListener("click", () => renderStep1(root));
    wrap.appendChild(head);

    // mese visualizzato di default
    if (state.calY == null) {
      const t = todayParts(CFG.timezone);
      state.calY = t.y; state.calM = t.m;
    }

    const cols = el(`<div class="bk-cols bk-cols-cal"></div>`);

    // colonna calendario
    const dcol = el(`<div class="bk-cal"><h4>Scegli il giorno</h4></div>`);
    dcol.appendChild(buildCalendar(root));
    cols.appendChild(dcol);

    // colonna orari
    const tcol = el(`<div class="bk-times"><h4>Orari disponibili</h4><div class="bk-time-list"></div></div>`);
    const tlist = tcol.querySelector(".bk-time-list");
    if (!state.iso) {
      tlist.appendChild(el(`<p class="bk-hint">Seleziona prima un giorno.</p>`));
    } else {
      tlist.appendChild(el(`<p class="bk-hint bk-loading">Verifica disponibilità…</p>`));
      loadSlots(state.service, state.iso).then((slots) => {
        tlist.innerHTML = "";
        const morning = slots.filter((s) => s.startMin < 13 * 60);
        const afternoon = slots.filter((s) => s.startMin >= 13 * 60);
        const section = (title, arr) => {
          if (!arr.length) return;
          tlist.appendChild(el(`<div class="bk-time-sec">${title}</div>`));
          const g = el(`<div class="bk-time-grid"></div>`);
          arr.forEach((s) => {
            const b = el(`<button class="bk-time ${s.available ? "" : "off"}" type="button" ${s.available ? "" : "disabled"}>${s.label}</button>`);
            if (s.available) b.addEventListener("click", () => {
              state.slot = s;
              tlist.querySelectorAll(".bk-time").forEach((x) => x.classList.remove("sel"));
              b.classList.add("sel");
              cta.disabled = false;
            });
            g.appendChild(b);
          });
          tlist.appendChild(g);
        };
        section("Mattina", morning);
        section("Pomeriggio", afternoon);
        if (!morning.length && !afternoon.length)
          tlist.appendChild(el(`<p class="bk-empty">Nessun orario libero per questa data. Prova un altro giorno.</p>`));
      });
    }
    cols.appendChild(tcol);
    wrap.appendChild(cols);

    const cta = el(`<button class="btn btn-gold bk-next" type="button" disabled>Continua →</button>`);
    cta.addEventListener("click", () => { if (state.slot) renderStep3(root); });
    wrap.appendChild(cta);

    root.appendChild(wrap);
    if (window.__reveal) window.__reveal();
  }

  const weekLabels = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const mIdx = (y, m) => y * 12 + (m - 1);

  // Costruisce la griglia calendario del mese state.calY/calM.
  function buildCalendar(root) {
    const y = state.calY, m = state.calM;
    const { min, max, today } = dateBounds();
    const minM = mIdx(min.getUTCFullYear(), min.getUTCMonth() + 1);
    const maxM = mIdx(max.getUTCFullYear(), max.getUTCMonth() + 1);
    const curM = mIdx(y, m);

    const wrap = el(`<div class="bk-cal-wrap"></div>`);

    // header con navigazione
    const hdr = el(`<div class="bk-cal-hdr">
        <button class="bk-cal-nav" type="button" data-dir="-1" ${curM <= minM ? "disabled" : ""} aria-label="Mese precedente">‹</button>
        <div class="bk-cal-title">${monthNames[m - 1]} ${y}</div>
        <button class="bk-cal-nav" type="button" data-dir="1" ${curM >= maxM ? "disabled" : ""} aria-label="Mese successivo">›</button>
      </div>`);
    hdr.querySelectorAll(".bk-cal-nav").forEach((b) => b.addEventListener("click", () => {
      if (b.disabled) return;
      let nm = m + Number(b.dataset.dir), ny = y;
      if (nm < 1) { nm = 12; ny--; } else if (nm > 12) { nm = 1; ny++; }
      state.calY = ny; state.calM = nm;
      renderStep2(root);
    }));
    wrap.appendChild(hdr);

    // intestazione giorni settimana
    const wk = el(`<div class="bk-cal-week"></div>`);
    weekLabels.forEach((d) => wk.appendChild(el(`<span>${d}</span>`)));
    wrap.appendChild(wk);

    // griglia giorni
    const grid = el(`<div class="bk-cal-grid"></div>`);
    const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0=Dom
    const lead = (firstDow + 6) % 7; // lunedì come primo giorno
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let i = 0; i < lead; i++) grid.appendChild(el(`<span class="bk-cal-empty"></span>`));
    for (let d = 1; d <= days; d++) {
      const iso = toISODate(y, m, d);
      const bookable = isBookable(y, m, d);
      const isToday = (y === today.y && m === today.m && d === today.d);
      const cls = "bk-cal-day" + (bookable ? "" : " off") + (state.iso === iso ? " sel" : "") + (isToday ? " today" : "");
      const cell = el(`<button class="${cls}" type="button" ${bookable ? "" : "disabled"}>${d}</button>`);
      if (bookable) cell.addEventListener("click", () => { state.iso = iso; state.slot = null; renderStep2(root); });
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  async function loadSlots(service, iso) {
    const key = service.id + "|" + iso;
    if (state.slotsCache[key]) return state.slotsCache[key];
    const s = await freeSlots(service, iso);
    state.slotsCache[key] = s;
    return s;
  }

  /* ---- Step 3: dati cliente ---- */
  function renderStep3(root) {
    root.innerHTML = "";
    const wrap = el(`<div class="bk"></div>`);
    wrap.appendChild(el(`<div class="bk-progress"><span class="done">1 · Consulenza</span><span class="done">2 · Data e ora</span><span class="on">3 · Dati</span></div>`));

    const jsd = new Date(state.iso + "T00:00:00");
    const dateLabel = jsd.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

    const head = el(`<div class="bk-head">
        <button class="bk-back" type="button">← Data e ora</button>
        <div class="bk-chosen">${state.service.name} · ${dateLabel} · ${state.slot.label}</div>
      </div>`);
    head.querySelector(".bk-back").addEventListener("click", () => renderStep2(root));
    wrap.appendChild(head);

    const isSposa = state.service.id === "sposa";
    const form = el(`
      <form class="bk-form" novalidate>
        <div class="bk-field"><label>Nome e cognome *</label><input name="nome" type="text" required autocomplete="name"></div>
        <div class="bk-field"><label>Telefono *</label><input name="telefono" type="tel" required autocomplete="tel" inputmode="tel"></div>
        <div class="bk-field"><label>Email (facoltativo)</label><input name="email" type="email" autocomplete="email"></div>
        <div class="bk-field bk-field-full"><label>${isSposa ? "Data dell'evento e note" : "Note (facoltativo)"}</label><textarea name="note" rows="3" placeholder="${isSposa ? "Es. matrimonio il 12 giugno 2027, cerco un abito…" : "Raccontaci l'occasione…"}"></textarea></div>
        <p class="bk-error" hidden></p>
        <button class="btn btn-gold bk-submit" type="submit">Conferma la prenotazione</button>
        <p class="bk-privacy">Inviando la richiesta acconsenti a essere ricontattato/a dall'atelier per la gestione dell'appuntamento.</p>
      </form>`);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const err = form.querySelector(".bk-error");
      const nome = form.nome.value.trim();
      const telefono = form.telefono.value.trim();
      const email = form.email.value.trim();
      const note = form.note.value.trim();
      if (!nome || telefono.replace(/\D/g, "").length < 6) {
        err.textContent = "Inserisci nome e un numero di telefono valido.";
        err.hidden = false; return;
      }
      err.hidden = true;
      const btn = form.querySelector(".bk-submit");
      btn.disabled = true; btn.textContent = "Invio in corso…";

      const payload = { service: state.service, iso: state.iso, startMin: state.slot.startMin, endMin: state.slot.endMin, nome, telefono, email, note };
      createBooking(payload).then((r) => {
        if (r.ok) {
          renderDone(root, payload, r.mode);
        } else if (r.error && /occupat|pieno|full|conflict/i.test(r.error)) {
          // slot davvero occupato → invita a sceglierne un altro
          err.textContent = "Questo orario è appena stato prenotato da qualcun altro. Scegli un altro slot.";
          err.hidden = false;
          btn.disabled = false; btn.textContent = "Conferma la prenotazione";
          delete state.slotsCache[state.service.id + "|" + state.iso];
        } else {
          // altro errore (rete/permessi): non blocchiamo il cliente, ripieghiamo su WhatsApp
          renderDone(root, payload, "whatsapp");
        }
      }).catch(() => {
        // errore imprevisto → fallback WhatsApp
        renderDone(root, payload, "whatsapp");
      });
    });

    wrap.appendChild(form);
    root.appendChild(wrap);
  }

  /* ---- Conferma ---- */
  function renderDone(root, payload, mode) {
    root.innerHTML = "";
    const jsd = new Date(payload.iso + "T00:00:00");
    const dateLabel = jsd.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const wa = whatsappLink(payload);

    // Messaggio in base al canale: prenotazione registrata nel gestionale
    // (Scintilla) → conferma via email dopo l'ok del titolare; oppure
    // fallback WhatsApp se il backend non è attivo/raggiungibile.
    let sub;
    if (mode === "supabase") {
      sub = payload.email
        ? "Abbiamo ricevuto la tua richiesta. Riceverai un'email di conferma non appena l'atelier confermerà l'appuntamento."
        : "Abbiamo ricevuto la tua richiesta. L'atelier ti ricontatterà al numero indicato per confermare l'appuntamento.";
    } else {
      sub = "Per completare, invia la richiesta allo staff via WhatsApp: ti risponderemo con la conferma.";
    }

    const waBtn = (mode === "supabase")
      ? `<a class="btn bk-wa" href="${wa}" target="_blank" rel="noopener">Avvisa l'atelier su WhatsApp (facoltativo)</a>`
      : `<a class="btn btn-gold bk-wa" href="${wa}" target="_blank" rel="noopener">Invia richiesta su WhatsApp</a>`;

    const wrap = el(`
      <div class="bk bk-done">
        <div class="bk-done-mark">✓</div>
        <h3>La tua richiesta è stata inviata</h3>
        <p class="bk-done-sub">${sub}</p>
        <div class="bk-recap">
          <div><span>Consulenza</span><strong>${payload.service.name}</strong></div>
          <div><span>Data</span><strong>${dateLabel}</strong></div>
          <div><span>Orario</span><strong>${minToHM(payload.startMin)}</strong></div>
          <div><span>A nome di</span><strong>${payload.nome}</strong></div>
        </div>
        ${waBtn}
        <button class="bk-restart" type="button">Prenota un'altra consulenza</button>
      </div>`);
    wrap.querySelector(".bk-restart").addEventListener("click", () => { state.iso = null; state.slot = null; state.slotsCache = {}; renderStep1(root); });
    root.appendChild(wrap);
    // Nel fallback WhatsApp apre la chat automaticamente; nel flusso gestionale no.
    if (mode !== "supabase") { try { window.open(wa, "_blank", "noopener"); } catch (e) {} }
  }

  /* ---------------- Export ---------------- */
  window.Booking = { mount, slotsForService, freeSlots, isBookable, dateBounds, _internals: { zonedWallToInstant, tzOffsetMinutes, hmToMin, minToHM } };

  if (document.readyState !== "loading") mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
