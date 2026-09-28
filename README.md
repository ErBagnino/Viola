# Vio ♡ — il piccolo mondo digitale che Adam ha costruito per Viola

Web app personale e privata (PWA installabile su iPhone e Android) per due persone:
**Viola** trova un posto dove calmarsi, sentirsi vicina ad Adam, divertirsi e chiedere aiuto;
**Adam** gestisce tutto da una dashboard, senza toccare il codice.

> Non è una terapia e non sostituisce professionisti. In pericolo: **112**.

👉 **Hai già l'app online con un database creato prima del 28/09/2026?** Esegui una volta `supabase/update.sql` nello SQL Editor di Supabase ([SETUP.md, passo 5](./SETUP.md#5-migrations)).

👉 **Per metterla online segui [SETUP.md](./SETUP.md)** (passo dopo passo, tutto gratuito). Descrizione completa del progetto: [PROGETTO.md](./PROGETTO.md).

---

## Cosa c'è dentro

### Area di Viola (`/viola`)
- **Home configurabile**: saluto, frase casuale, "Aiutami adesso", "Come ti senti?", **Cuore a distanza**, card "Di cosa hai bisogno?", sorpresa del giorno, countdown, distanza. Ordine, testi, icone e colori decisi da Adam. "Ho bisogno di Adam" è **sempre** raggiungibile (in home e in alto a destra in ogni pagina), anche se Adam non lo mette tra i moduli; senza moduli c'è una home di partenza.
- **Momenti speciali**: nel giorno di un compleanno, anniversario o incontro (i countdown di Adam) la home si apre con una card dedicata e una piccola festa di cuori. I countdown dicono "Mancano 12 giorni per rivederti" e, il giorno stesso, "È oggi. ♡".
- **Calma**: 8 modalità visive (cuore, fiore, onda, stella, respiro visivo, orbita, particelle, cerchio luminoso) con timer 1/2/5 min/libero; **respirazione guidata** con preset configurabili, forma che cresce/si ferma/si riduce, **foto di Adam che da sfocata diventa nitida** e frasi ("Respira con me."); grounding passo-passo; **5-4-3-2-1** interattivo; percorso **"Ho paura"** a schermo intero; **"Aiutami adesso"** (motore casuale pesato, senza ripetizioni immediate).
- **HO BISOGNO DI ADAM**: crea la richiesta, avvisa Adam (Telegram → Web Push), mostra sempre WhatsApp e "Chiama Adam". Stati Nuova / Vista / Hai risposto / Chiusa e risposta di Adam.
- **Noi**: **Cuore a distanza** (un tocco = "ti penso"; Adam lo vede e può rimandarne uno), "Insieme da N giorni ♡" (facoltativo), galleria (polaroid, mosaico, timeline, grande + lightbox), "Fammi vedere noi", ricordi (con "Sei qui ♡" e la prossima data), dediche "Per te ♡", buste "Aprimi quando…" (con "Scegli tu per me"), countdown, distanza Torino ↔ Rosolina (senza GPS), capsule del tempo (il testo resta segreto fino alla data, garantito dal database), la voce di Adam (audio).
- **Adam AI** (Gemini): chat vera per qualsiasi domanda, modalità Generale / Personale / **Conforto** (risposte brevissime e scorciatoie dirette: respira, grounding, 5-4-3-2-1, una foto, un ricordo, scrivi ad Adam), streaming, stop, rigenera, copia, elimina, cronologia, Markdown, e **strumenti dell'app** (avvia respirazione, mostra una foto, una dedica, un ricordo, WhatsApp…).
- **Altro**: umore (senza diagnosi), diario privato/condiviso, scrivi ad Adam, giochi (memory con le foto, trova il cuore, puzzle, quiz "quanto mi conosci?", acchiappa i cuori, termometro, domande, roulette, **indovina il ricordo**), sorprendimi, una cosa per te, abbraccio, buongiorno, buonanotte, notifiche, **La tua privacy** (chi vede cosa, in parole semplici, e l'interruttore "Adam può vedere quando uso esercizi e giochi"), cancella i miei dati. E qualche piccolo segreto da scoprire.
- **Onboarding** mostrato una sola volta; **offline**: respirazione, 5-4-3-2-1, grounding e idee di conforto funzionano senza rete, e "Chiama Adam / Scrivi ad Adam" restano disponibili anche offline o se l'app va in errore.
- **Tema chiaro e scuro automatici** (segue il telefono), nello stile dell'icona: nero, rosso e bianco.
- **Foto sempre belle**: ogni foto si adatta alla sua cornice senza deformarsi — ritaglio leggero che tiene il soggetto, oppure foto intera su uno sfondo sfocato della stessa foto (niente bande bianche); nel visualizzatore è sempre intera; se non si carica compare un segnaposto gentile.

### Dashboard di Adam (`/admin`)
Panoramica con "♡ Viola ha bisogno di te" e **"Vio ♡ è pronta al N%"**; **Completa Vio ♡** (checklist calcolata dai dati reali, con link diretto a ogni cosa da fare, "Dove si usano le foto", stato dei giochi e **Controllo Vio ♡**); **Vedi come Viola** fedele (solo ciò che vede lei, niente viene inviato) con giro guidato; azioni rapide; richieste con **risposte con un tocco**, inbox messaggi e diario condiviso, umore, la sua home, dediche, foto e audio (upload multiplo, "usata in…", filtri non usate/private, luogo e posizione del soggetto, **modifica di più foto insieme** con "Non modificare", conferma e Annulla, eliminazione multipla con conferma), ricordi, buste "Aprimi quando…", countdown, capsule, sorprese, frasi, quiz, "Aiutami adesso", respirazione (+ foto del respiro), grounding — con anteprima **"Come la vede Viola"** nei moduli —, **profilo e personalità di Adam AI**, memoria dell'AI, **AI Copilot** (crea/modifica contenuti a parole, con conferma per eliminazioni e disattivazioni), notifiche (stato, prova, chat ID Telegram guidato), impostazioni (tutti i testi), costi e limiti, backup JSON, registro in italiano.

---

## Quanto costa?

**€0 al mese** per l'uso previsto (2 persone, traffico basso, qualche centinaio di foto, uso moderato dell'AI).
Nessun servizio richiede la carta di credito e **nessun upgrade è mai automatico**.

### GRATUITO
| Servizio | Uso | Piano |
|---|---|---|
| **Next.js** | il framework | open source |
| **Supabase Free** | database, login, storage foto | 500 MB DB · 1 GB storage · 5 GB traffico/mese · 50.000 utenti/mese · pausa dopo 7 giorni di inattività (evitata dal cron giornaliero) |
| **Vercel Hobby** | hosting | uso personale non commerciale · 100 GB traffico/mese · cron 1 volta al giorno |
| **Telegram Bot API** | notifica "Viola ha bisogno di te" | gratis |
| **Web Push** | notifiche dall'app (standard del browser) | gratis |
| **WhatsApp deep link** (`wa.me`) | fallback: Viola scrive/chiama con un tocco | gratis |
| **Gemini Free Tier** (Google AI Studio) | Adam AI + Copilot | gratis entro i limiti giornalieri del piano gratuito |

### POSSIBILI COSTI (solo se li attivi tu)
| Cosa | Quando | Costo indicativo |
|---|---|---|
| Dominio personalizzato (es. `vio.it`) | se non vuoi `*.vercel.app` | ~€10–15/anno |
| Gemini oltre il Free Tier | solo se attivi la fatturazione su Google Cloud | a consumo (l'app **non** lo fa mai da sola: al limite si mette in pausa) |
| Supabase oltre il Free | oltre 500 MB DB / 1 GB storage | piano Pro ~$25/mese |
| Vercel oltre Hobby | uso commerciale o traffico enorme | piano Pro ~$20/mese |
| Storage oltre quota | migliaia di foto | incluso nel piano Pro di Supabase |
| WhatsApp Business API | **non usata**; solo se in futuro vuoi messaggi automatici su WhatsApp | a messaggio (Meta) |

La pagina **Admin → Cost Control** mostra uso AI, database, storage e notifiche, con avvisi quando ti avvicini ai limiti gratuiti.

> **Privacy AI:** sul piano gratuito Google può usare le conversazioni per migliorare i suoi servizi. Adam AI riceve solo il contesto necessario (mai password o chiavi); le informazioni personali sono solo quelle che scegli tu in "Memoria AI".

---

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · Motion · Supabase (Postgres + RLS, Auth, Storage) · Gemini (`@google/genai`) · Telegram Bot API · Web Push (`web-push`, VAPID) · Zod · sharp · Vitest · PGlite (test RLS).

## Architettura

```
src/
  app/            route (pagine sottili: caricano dati e compongono componenti)
    viola/…       area di Viola          admin/…   dashboard di Adam
    api/…         AI chat, copilot, upload, cron     offline/  kit offline
  components/     UI riutilizzabile (ui/, layout/, decor/)
  features/       una cartella per funzionalità (breathing, grounding, fear, comfort,
                  need-adam, gallery, games, ai-chat, admin, settings, pwa, …)
  server/         codice solo-server: auth, settings, media, notifiche, AI, CRUD, audit
  lib/            client Supabase (browser / server / service role), env pubbliche
  db/             tipi TypeScript generati dal database
  hooks/ utils/ types/
supabase/
  migrations/     schema, RLS, storage       seed.sql   contenuti iniziali
  setup.sql       tutto insieme, da incollare nello SQL Editor (npm run db:bundle)
public/           sw.js (service worker), icone, splash iOS
scripts/          icone, utenti, chiavi VAPID, bundle SQL
tests/            unit test + test RLS sulle migrazioni reali
```

- **Tutto modificabile dall'admin**: un **registro delle risorse** (`src/features/admin/resources.ts`) descrive ogni contenuto (campi, validazione Zod, ordinamento). Da lì nascono i form admin, gli strumenti del Copilot e l'import/export.
- **Impostazioni** (`src/features/settings/schema.ts`): ogni testo/opzione ha un default, quindi l'app funziona anche con il database vuoto.
- **Azioni dell'app** (`src/features/actions/registry.ts`): un solo vocabolario per card della home, comfort action, buste, sorprese e strumenti AI.

## Sicurezza

- **RLS su ogni tabella**, niente "allow all": `anon` non legge nulla; account "pending" non vedono nulla; Viola legge solo contenuti pubblicati e i propri dati; **il diario privato e l'umore non condiviso sono invisibili anche all'admin**; conversazioni AI private al proprietario; capsule del tempo illeggibili prima della data; audit log solo in aggiunta.
- Ruoli assegnabili solo via `app_metadata` (service role) o SQL: un utente non può promuoversi. Le funzioni del database non sono eseguibili da chi non ha fatto l'accesso.
- Nessuna pagina indicizzabile (`robots.txt`, `X-Robots-Tag: noindex`, meta robots).
- `/admin` protetto lato server (layout + ogni server action/API verifica il ruolo). Nessuna password o chiave nel frontend: i segreti stanno solo nelle variabili d'ambiente server.
- Upload: MIME verificato dai **magic bytes**, estensione, dimensione, bucket con limiti propri, **ri-codifica con sharp** (WebP, rimuove EXIF/GPS), URL firmati temporanei.
- AI: niente SQL/file/codice arbitrari, solo strumenti espliciti validati con Zod; eliminazioni e disattivazioni richiedono conferma; log degli strumenti senza segreti; limiti giornalieri, al minuto e budget di token.
- XSS: Markdown senza HTML grezzo e con link filtrati; CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Anti-spam su "Ho bisogno di Adam" (max 4 avvisi automatici in 10 minuti, ma i contatti diretti restano sempre visibili).

## Sviluppo

```bash
npm install
cp .env.example .env.local     # compila i valori (vedi SETUP.md)
npm run dev                    # http://localhost:3000
```

Database locale (opzionale, richiede Docker): `npx supabase start` applica migrazioni e seed.

| Script | Cosa fa |
|---|---|
| `npm run dev` / `build` / `start` | sviluppo / build di produzione / avvio |
| `npm run lint` · `typecheck` · `test` · `check` | qualità (check = tutti e tre) |
| `npm run create-user -- --email … --password … --role admin\|user` | crea/aggiorna un account e il ruolo |
| `npm run vapid` | genera le chiavi Web Push |
| `npm run icons` | rigenera icone, favicon e splash iOS da `scripts/icon-svg.mjs` |
| `npm run db:bundle` | rigenera `supabase/setup.sql` (progetti nuovi) e `supabase/update.sql` (aggiornamento dei progetti già installati) |

## Test

`npm test` esegue:
- **unit**: motore casuale, ciclo di respirazione, date/countdown/distanza, azioni e link sicuri, impostazioni, registro admin (incluso il bug "update parziale che resetta i default"), riconoscimento file, elaborazione foto (EXIF rimosso), catena di notifiche e provider Telegram (il token non finisce mai nei log), prompt dell'AI (niente segreti, niente fatti inventati), elenco strumenti AI, moduli server action;
- **integrazione RLS**: le **migrazioni reali** vengono applicate a un Postgres embedded (PGlite) e ogni permesso di Viola, Adam, utenti in attesa e anonimi viene verificato, compresi i tentativi di attacco (scrivere a nome d'altri, cambiare lo stato delle richieste, leggere impostazioni o foto private, chiamare funzioni da anonimo, cuori falsificati).

## Icona

L'icona (`scripts/icon-svg.mjs`) è originale: una **viola** (il fiore da cui prende il nome Viola) con cinque petali fatti di **cuori**, rossa su nero, con una stellina bianca — lo stesso linguaggio visivo dell'icona di riferimento che piace a Viola (nero pieno, simbolo rosso a linea, stelline Y2K), senza copiarla. Da un solo SVG vengono generati favicon, apple-touch-icon, icone PWA 192/512, maskable e splash screen iOS (`npm run icons`).
