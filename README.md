# Amirante Atelier — Sito con motore di prenotazione

Sito statico d'alta moda per **Atelier Amirante — Meg Shop** (Villaricca, NA), con
motore di prenotazione a slot, blocco agenda per capienza (3 sale prova) e
integrazione Supabase opzionale. Pronto per GitHub Pages.

---

## 📁 Struttura

```
amirante-atelier/
├── index.html            # SEO, JSON-LD, OG/Twitter, critical CSS inline, HTML semantico
├── .nojekyll             # (IMPORTANTE) evita che GitHub Pages droppi le cartelle asset
├── robots.txt            # crawl + riferimento alla sitemap
├── sitemap.xml           # sitemap XML
├── favicon.ico / favicon.png
├── css/
│   ├── style.css         # sorgente (da editare)
│   └── style.min.css     # ← usato in produzione (rigenerare dopo le modifiche)
├── js/
│   ├── data.js           # ← FONTE UNICA DI VERITÀ (testi, contatti, servizi, config) — usato così com'è
│   ├── booking.js        # sorgente motore slot + Supabase + WhatsApp + UI
│   ├── booking.min.js    # ← usato in produzione (rigenerare dopo le modifiche)
│   ├── main.js           # sorgente rendering, nav, galleria/lightbox, a11y
│   └── main.min.js       # ← usato in produzione (rigenerare dopo le modifiche)
├── assets/
│   ├── logo-*.webp / logo-*.png
│   ├── og-image.jpg      # immagine social 1200×630
│   ├── video-hero.mp4 / video-lux.mp4 (+ poster .jpg)
│   ├── marble-light.webp / marble-dark.webp
│   ├── gallery/sposa-*.webp
│   └── gallery-uomo/uomo-*.webp
└── supabase/schema.sql   # tabella + RLS + funzione atomica book_slot
```

Per modificare **qualsiasi contenuto** (testi, orari, contatti, servizi) basta
editare `js/data.js` (usato direttamente, non minificato).

### Rigenerare i file minificati (dopo aver modificato style.css / main.js / booking.js)
```bash
npx clean-css-cli -O2 -o css/style.min.css css/style.css
npx terser js/main.js -c -m -o js/main.min.js
npx terser js/booking.js -c -m -o js/booking.min.js
```

## 🔎 SEO / Performance / Accessibilità (già implementati)
- Un solo `<h1>` con keyword + geo, gerarchia H2/H3 corretta, HTML semantico (`header/nav/main/section/article/footer/address`).
- `<title>` (50 car., keyword in apertura), meta description (154 car.), canonical assoluto, `lang="it"`.
- **Dati strutturati JSON-LD** (`@graph`): `ClothingStore` con NAP, `geo`, `openingHoursSpecification`, `sameAs`, `hasOfferCatalog`; `WebSite`; `BreadcrumbList`.
- **Open Graph** completo + **Twitter Card** `summary_large_image` (immagine `assets/og-image.jpg`).
- Immagini **WebP** con `width`/`height` espliciti (niente CLS) e `loading="lazy"`; LCP con `preload` + `fetchpriority`.
- **CSS/JS minificati**, **critical CSS inline**, CSS e font caricati in modo asincrono.
- **Accessibilità**: skip-link, `:focus-visible`, ARIA (`aria-expanded`, `aria-pressed`, `role="dialog"`), contrasti AA, navigazione da tastiera, `robots.txt` + `sitemap.xml`.

> ⚠️ Gli URL assoluti (canonical, OG, JSON-LD, sitemap) puntano a
> `https://scintillaanselmo0-cell.github.io/amirante-atelier/`. Se colleghi un
> **dominio personalizzato**, sostituisci quell'URL in `index.html`, `sitemap.xml`
> e `robots.txt`.

---

## 🚀 Deploy su GitHub Pages

Dalla cartella del progetto (con la GitHub CLI `gh` autenticata sull'account
`scintillaanselmo0-cell`):

```bash
cd amirante-atelier
git init
git add -A
git commit -m "Amirante Atelier — sito + motore prenotazioni"

# crea il repo, imposta origin e pusha in un colpo solo
gh repo create amirante-atelier --public --source=. --remote=origin --push

# attiva GitHub Pages sul branch main
gh api --method POST repos/scintillaanselmo0-cell/amirante-atelier/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

Il sito sarà su: `https://scintillaanselmo0-cell.github.io/amirante-atelier/`

> **`.nojekyll` è già incluso**: senza di esso GitHub Pages, usando Jekyll,
> potrebbe ignorare silenziosamente le cartelle di asset (soprattutto i video).

---

## 🗓️ Motore di prenotazione

### Come funziona
1. L'utente sceglie la consulenza (3 card).
2. Sceglie il giorno tra quelli aperti.
3. Vede **solo gli slot realmente liberi** per quel servizio/data.
4. Compila i dati e conferma.
5. La prenotazione viene salvata lato server (se Supabase è attivo) e parte una
   notifica WhatsApp allo staff con il riepilogo.

### Regole slot (già implementate e testate)
- **Prova abito da sposa**: 60 min · 09:00–12:30 e 16:00–19:30 → ultimo start 11:30 / 18:30
- **Cerimonia** e **Uomo**: 30 min · stesse fasce → ultimo start 12:00 / 19:00
- Nessuno slot nella pausa **12:30–16:00**.
- Fuso **Europe/Rome** gestito esplicitamente in JS (nessun bug da fuso del browser).
- **Capienza 3** (3 sale prova): uno slot resta disponibile finché non sono
  occupate tutte e 3 le sale. Il blocco è **condiviso tra i tre tipi di consulenza**
  (le sale sono le stesse), quindi niente doppie prenotazioni sulla stessa risorsa.
- Preavviso minimo 2 ore, orizzonte 18 mesi (calendario mensile completo, navigabile;
  configurabile con `horizonMonths` in `data.js`).

Tutto configurabile in `data.js → booking` (finestre, step, capienza, giorni
aperti, date di chiusura, preavviso, orizzonte).

---

## 🔌 Attivare il backend Supabase (agenda condivisa)

Senza Supabase il sito **funziona comunque**: genera gli slot e invia la richiesta
allo staff via WhatsApp (senza blocco agenda server-side). Per avere il blocco
slot in tempo reale, condiviso tra tutti i visitatori:

1. Crea un progetto su [supabase.com] (oppure usa il progetto del gestionale
   **Scintilla** e aggiungi questo atelier come tenant `amirante`).
2. Nel **SQL Editor**, esegui `supabase/schema.sql`.
3. In `js/data.js → booking.supabase` inserisci:
   ```js
   url: "https://xxxx.supabase.co",
   anonKey: "eyJ...",   // chiave PUBBLICA anon (Project Settings → API)
   table: "prenotazioni_occupate",
   tenant: "amirante",
   ```
   ⚠️ Usa **solo** la chiave `anon` pubblica nel frontend, **mai** la `service_role`.

### Sicurezza (già nello schema)
- I dati personali dei clienti **non sono leggibili** dal frontend: il calendario
  legge solo una vista ridotta (`prenotazioni_occupate`) con i soli orari.
- Si prenota **esclusivamente** tramite la funzione `book_slot`, che verifica la
  capienza **in modo atomico** (advisory lock) prima di inserire → niente doppie
  prenotazioni anche con clienti simultanei.
- Lo staff legge/gestisce tutte le prenotazioni dalla dashboard Supabase.

---

## 💳 (Opzionale) Acconto con Stripe

Se in futuro vuoi richiedere un acconto per fissare la consulenza:
- Usa uno **Stripe Payment Link**.
- Imposta il redirect di conferma **direttamente nella dashboard Stripe**,
  **mai** passandolo come parametro nell'URL.

---

## 📸 Materiale fotografico — da integrare

La galleria è filtrabile per categoria (**Spose** / **Uomo**). Le foto sposa sono
gli scatti reali dell'atelier; la sezione **Uomo** usa il materiale del fornitore
(collezione Petrelli Uomo) in `assets/gallery-uomo/`. La card della consulenza
**Sartoria uomo** usa una di queste foto. Per aggiungere/rimuovere immagini o
categorie, modifica `data.js → gallery.categories`. Per la sezione **cerimonia**
(invitati/mamme) servono ancora scatti dedicati.

> Come da indicazioni: **nessuna foto stock** spacciata per materiale reale e
> **nessuna recensione inventata**. La sezione testimonianze è volutamente
> assente finché non ci sarà materiale autentico da pubblicare.

---

## ✅ Test già eseguiti
- Generazione slot per tutti e 3 i servizi (ultimo slot mattina/sera corretti).
- Esclusione della pausa 12:30–16:00.
- Blocco capienza e sovrapposizione cross-servizio.
- Conversione fuso Europe/Rome estate (UTC+2) e inverno (UTC+1).
- Flusso completo di prenotazione (servizio → data → slot → dati → conferma) su
  desktop e mobile.
