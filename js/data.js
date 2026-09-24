/* =====================================================================
   AMIRANTE ATELIER — DATA (fonte unica di verità)
   Modifica QUI testi, contatti, servizi, orari e configurazione.
   Nessun contenuto è hard-coded nell'HTML: tutto nasce da questo file.
   ===================================================================== */

const DATA = {

  /* ---------- IDENTITÀ ATELIER ---------- */
  brand: {
    name: "Amirante",
    tagline: "atelier",
    fullName: "Atelier Amirante — Meg Shop",
    claim: "L'abito dei momenti che non si dimenticano",
    subclaim: "Sartoria d'alta moda per la sposa, la cerimonia e lo sposo. Dal cuore della tradizione.",
    logoDark: "assets/logo-dark.png",   // logo nero (su fondo chiaro)
    logoLight: "assets/logo-light.png", // logo bianco (su fondo scuro)
  },

  /* ---------- CONTATTI ---------- */
  contact: {
    phone: "081 818 6855",
    phoneHref: "tel:+390818186855",
    // WhatsApp dedicato alle prenotazioni consulenze
    whatsapp: "+39 351 623 2607",
    whatsappNumber: "393516232607", // formato internazionale senza + per wa.me
    email: "", // (opzionale) inserire se disponibile
    address: "Via della Libertà, 1174",
    city: "80010 Villaricca (NA)",
    mapsQuery: "Atelier Amirante Meg Shop Via della Libertà 1174 Villaricca",
    mapsEmbed: "https://www.google.com/maps?q=Via+della+Libert%C3%A0+1174+Villaricca+NA&output=embed",
    instagram: "https://www.instagram.com/amirante.megshop/",
    facebook: "https://www.facebook.com/atelieramirante/?locale=it_IT",
  },

  /* ---------- ORARI (mostrati nel footer / contatti) ---------- */
  hours: {
    note: "Riceviamo esclusivamente su appuntamento",
    lines: [
      { d: "Lunedì — Sabato", h: "09:00 – 13:30  ·  16:00 – 20:30" },
      { d: "Domenica", h: "Su richiesta" },
    ],
  },

  /* ---------- FILOSOFIA ---------- */
  philosophy: {
    kicker: "La nostra filosofia",
    title: "Ogni abito è un gesto d'amore verso il dettaglio",
    body: [
      "Amirante nasce dalla convinzione che un abito non si indossi soltanto: si vive. Nel nostro atelier ogni creazione prende forma lentamente, cucitura dopo cucitura, seguendo la persona che la indosserà.",
      "Tessuti scelti a mano, ricami eseguiti con pazienza artigianale, proporzioni studiate sul corpo di chi sogna: è così che trasformiamo un desiderio in un capo unico, destinato a durare ben oltre il giorno per cui è stato pensato.",
    ],
    stats: [],
  },

  /* ---------- SERVIZI / CONSULENZE ---------- */
  /* durationMin  = durata slot in minuti
     Le finestre orarie e le regole sono in booking.config           */
  services: [
    {
      id: "sposa",
      name: "Prova abito da sposa",
      durationMin: 60,
      kicker: "L'esperienza sposa",
      desc: "Un tempo tutto dedicato a te. Ti accogliamo in una sala privata per scoprire le nostre collezioni, provare gli abiti e immaginare insieme le linee, i tessuti e i dettagli del giorno più importante.",
      expect: [
        "Accoglienza in sala prova",
        "Prova di più modelli e silhouette",
        "Consulenza su tessuti, ricami e personalizzazioni",
      ],
      image: "assets/gallery/sposa-03.webp",
    },
    {
      id: "cerimonia",
      name: "Sartoria abiti da cerimonia",
      durationMin: 30,
      kicker: "Per gli invitati speciali",
      desc: "Per mamme della sposa, damigelle e ospiti che desiderano un abito impeccabile. Un incontro per definire modello, colore e vestibilità, con la cura sartoriale che ci distingue.",
      expect: [
        "Analisi dell'occasione e dello stile",
        "Selezione di modelli e palette colori",
        "Presa misure e tempistiche di realizzazione",
      ],
      image: "assets/gallery/sposa-06.webp",
    },
    {
      id: "uomo",
      name: "Sartoria uomo",
      durationMin: 30,
      kicker: "Lo sposo e la cerimonia",
      desc: "Per lo sposo e per l'uomo che non rinuncia all'eleganza. Definiamo insieme l'abito perfetto per la cerimonia: taglio, tessuto e dettagli su misura, dal completo classico al più contemporaneo.",
      expect: [
        "Consulenza di stile dedicata",
        "Scelta di tessuti e configurazione dell'abito",
        "Presa misure e prova sartoriale",
      ],
      image: "assets/gallery-uomo/uomo-14.webp",
    },
  ],

  /* ---------- COME FUNZIONA (3 step) ---------- */
  steps: [
    { n: "01", t: "Scegli la consulenza", d: "Seleziona l'esperienza più adatta a te tra le nostre tre proposte sartoriali." },
    { n: "02", t: "Trova il tuo momento", d: "Guarda la disponibilità reale e scegli il giorno e l'orario che preferisci." },
    { n: "03", t: "Ti aspettiamo in atelier", d: "Ricevi conferma immediata. Il resto lo creiamo insieme, di persona." },
  ],

  /* ---------- GALLERIA (a categorie) ---------- */
  gallery: {
    kicker: "Le nostre creazioni",
    title: "Collezione",
    // Galleria filtrabile per categoria. Aggiungere/rimuovere immagini qui.
    categories: [
      {
        id: "spose",
        label: "Spose",
        images: [
          "assets/gallery/sposa-01.webp",
          "assets/gallery/sposa-02.webp",
          "assets/gallery/sposa-03.webp",
          "assets/gallery/sposa-04.webp",
          "assets/gallery/sposa-05.webp",
          "assets/gallery/sposa-06.webp",
          "assets/gallery/sposa-07.webp",
          "assets/gallery/sposa-08.webp",
          "assets/gallery/sposa-09.webp",
          "assets/gallery/sposa-10.webp",
          "assets/gallery/sposa-12.webp",
          "assets/gallery/sposa-13.webp",
        ],
      },
      {
        id: "uomo",
        label: "Uomo",
        images: [
          "assets/gallery-uomo/uomo-02.webp",
          "assets/gallery-uomo/uomo-01.webp",
          "assets/gallery-uomo/uomo-03.webp",
          "assets/gallery-uomo/uomo-04.webp",
          "assets/gallery-uomo/uomo-06.webp",
          "assets/gallery-uomo/uomo-07.webp",
          "assets/gallery-uomo/uomo-08.webp",
          "assets/gallery-uomo/uomo-11.webp",
          "assets/gallery-uomo/uomo-12.webp",
          "assets/gallery-uomo/uomo-13.webp",
          "assets/gallery-uomo/uomo-14.webp",
          "assets/gallery-uomo/uomo-17.webp",
          "assets/gallery-uomo/uomo-19.webp",
          "assets/gallery-uomo/uomo-05.webp",
          "assets/gallery-uomo/uomo-09.webp",
          "assets/gallery-uomo/uomo-10.webp",
          "assets/gallery-uomo/uomo-15.webp",
          "assets/gallery-uomo/uomo-16.webp",
          "assets/gallery-uomo/uomo-18.webp",
          "assets/gallery-uomo/uomo-20.webp",
        ],
      },
    ],
  },

  /* ---------- MEDIA ---------- */
  media: {
    heroVideo: "assets/video-hero.mp4",
    heroPoster: "assets/hero-poster.jpg",
    luxVideo: "assets/video-lux.mp4",
  },

  /* ===================================================================
     CONFIGURAZIONE MOTORE DI PRENOTAZIONE
     =================================================================== */
  booking: {
    timezone: "Europe/Rome",

    // Finestre orarie di apertura (valgono per tutti i servizi).
    // L'ultimo slot generato termina SEMPRE entro la fine della fascia.
    windows: [
      { start: "09:00", end: "13:30" },
      { start: "16:00", end: "20:30" },
    ],

    stepMin: 30,        // unità base di generazione slot
    capacity: 3,        // 3 sale prova → 3 appuntamenti in parallelo
    leadTimeHours: 2,   // preavviso minimo per prenotare
    horizonMonths: 18,  // quanti mesi in avanti si può prenotare (calendario completo)

    // Giorni della settimana aperti (0 = Domenica ... 6 = Sabato)
    openDays: [1, 2, 3, 4, 5, 6],

    // Date di chiusura straordinaria (formato "YYYY-MM-DD")
    closedDates: [],

    /* ---- BACKEND SUPABASE (agenda condivisa e persistente) ----
       Compilare url + anonKey per attivare il blocco slot in tempo reale.
       Se lasciati vuoti, il sito funziona comunque: gli slot vengono
       generati e la richiesta viene inviata allo staff via WhatsApp
       (senza blocco agenda server-side). Vedi supabase/schema.sql. */
    supabase: {
      url: "",        // es. "https://xxxx.supabase.co"
      anonKey: "",    // chiave PUBBLICA anon (mai la service_role!)
      table: "prenotazioni_occupate", // VISTA pubblica per la lettura slot (no dati personali)
      tenant: "amirante", // tenant per gestionale multi-tenant "Scintilla"
    },
  },
};

window.DATA = DATA;
