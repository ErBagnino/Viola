# Vio ♡ — descrizione completa del progetto

> Documento di contesto: spiega **cosa è**, **come funziona** e **come è costruito** il progetto, in modo che una persona o un'AI possa capirlo tutto senza aver visto le conversazioni in cui è nato.
> Per mettere online l'app: [SETUP.md](./SETUP.md). Panoramica breve e costi: [README.md](./README.md).

---

## 1. In una frase

**Vio ♡** è una web app privata e installabile sul telefono (PWA) che **Adam** ha costruito per la sua ragazza **Viola**: un piccolo mondo digitale dove Viola può calmarsi quando è in ansia, sentirsi vicina ad Adam anche a distanza, divertirsi, ricevere sorprese e — soprattutto — **chiedere aiuto ad Adam con un tocco**. Adam gestisce tutto da una dashboard, senza toccare codice.

## 2. Contesto

- **Due sole persone** usano l'app: Viola (utente) e Adam (amministratore). Non è un prodotto pubblico: non c'è registrazione, gli account li crea Adam.
- Vivono a distanza (**Torino ↔ Rosolina**): da qui la distanza, il countdown al prossimo incontro, i messaggi, le foto e la voce di Adam.
- Viola a volte ha momenti di ansia o paura: l'app offre strumenti per **calmarsi** (respirazione, grounding, 5-4-3-2-1, percorso "Ho paura") e una via **sempre disponibile** per raggiungere Adam.
- Il nome in app è configurabile (inizialmente **"Vio ♡"**). Il progetto nel prompt originale si chiamava "VIOLA × ADAM".

### Cosa NON è
- **Non è una terapia** e non sostituisce professionisti. L'app non fa diagnosi, non chiama mai "attacco di panico" ciò che prova Viola e in caso di pericolo indica il **112**.
- **Adam AI non finge di essere Adam**: è un assistente con il suo tono, che non inventa ricordi o fatti.

## 3. Principi che guidano ogni scelta

In ordine di priorità: **sicurezza > costo zero > semplicità > esperienza d'uso > prestazioni > estetica > numero di funzioni**.

1. **Free first, €0 al mese**: solo servizi gratuiti (Supabase Free, Vercel Hobby, Gemini free tier, Telegram, Web Push, link WhatsApp). Nessuna carta di credito, nessun upgrade automatico. Se un limite gratuito viene raggiunto, la funzione si mette in pausa, non si paga.
2. **Tutto modificabile dall'admin**: testi, frasi, ordine della home, contenuti, personalità dell'AI, limiti, contatti. Ogni impostazione ha un valore di default, quindi l'app funziona anche con il database vuoto.
3. **Sicurezza reale**: RLS su ogni tabella, segreti solo lato server, admin protetto lato server, upload verificati, AI con strumenti espliciti e conferma per le azioni distruttive.
4. **Viola non resta mai senza un modo per raggiungere Adam**: anche se le notifiche falliscono, WhatsApp e "Chiama Adam" sono sempre visibili.
5. **Tono**: caldo, dolce, mai clinico. Interfaccia mobile-first, pensata per l'iPhone di Viola, con animazioni leggere che rispettano "riduci movimento".

## 4. Utenti e ruoli

| Ruolo | Chi | Accesso |
|---|---|---|
| `admin` | Adam | dashboard `/admin` + può vedere l'area di Viola in anteprima |
| `user` | Viola | area `/viola` |
| `pending` | chiunque altro | nessun accesso (vede "account non ancora abilitato") |

- Login con **email + password** (Supabase Auth). Registrazione pubblica disattivata.
- Il ruolo sta nella tabella `profiles`. Si assegna **solo** via SQL o via `app_metadata` (service role): un utente non può promuoversi da solo.
- Alla prima apertura Viola vede un **onboarding** (una sola volta).

---

## 5. L'area di Viola (`/viola`)

Navigazione a schede in basso: **Home · Calma · Noi · Adam AI · Altro**.

### Home (`/viola`)
Composta da **moduli configurabili** (ordine, testi, icone, colori, visibilità decisi da Adam in "Home builder"): saluto, frase casuale, pulsante **"Aiutami adesso"**, **"Come ti senti?"** (umore), **Cuore a distanza**, card **"Di cosa hai bisogno?"** (Voglio calmarmi / parlare / distrarmi / sorridere…), **sorpresa del giorno**, **countdown**, **distanza**, pulsante **"Ho bisogno di Adam"**.
- **Garanzie**: "Ho bisogno di Adam" c'è **sempre** (se Adam lo toglie dai moduli viene rimesso dopo "Aiutami adesso"; in più c'è un cuore in alto a destra in ogni pagina di Viola). Senza moduli configurati si vede una home di partenza (`src/features/content/fallbacks.ts`).
- **Momenti speciali**: il giorno di un countdown (compleanno, anniversario, incontro) la home si apre con una card "Oggi" e una festa di cuori (una volta al giorno).
- Piccoli **easter egg**: 7 tocchi sul saluto mostrano un messaggio segreto (modificabile), alle 11:11 e 23:11 appare "esprimi un desiderio", 5 tocchi sul fiore della schermata di accesso.

### Calma (`/viola/calma`)
- **Respira** (`/calma/respira`): respirazione guidata con **preset configurabili** (Respiro calmo, lento, a quadrato, lungo, della buonanotte…), una forma che cresce / si ferma / si riduce, frasi ("Respira con me.") e **foto di Adam che da sfocata diventa nitida** durante l'esercizio.
- **Calmati** (`/calma/calmati`): 8 modalità visive (cuore, fiore, onda, stella, respiro visivo, orbita, particelle, cerchio luminoso) con timer 1 / 2 / 5 minuti / libero.
- **Grounding** (`/calma/grounding` e `/calma/grounding/[slug]`): esercizi passo-passo (piedi a terra, mani, la stanza…).
- **5-4-3-2-1** (`/calma/54321`): gioco dei sensi interattivo.
- **Ho paura** (`/calma/paura`): percorso a schermo intero, una cosa alla volta, con passi modificabili dall'admin e nota di sicurezza (112).
- **Aiutami adesso** (`/calma/aiutami`): motore casuale **pesato** di "comfort actions" (20 iniziali), senza ripetere subito la stessa. Se non ce n'è nessuna, usa idee di conforto incorporate: non è mai una schermata vuota.

### Ho bisogno di Adam (`/viola/adam`)
Il cuore dell'app. Viola preme il cuore (con un messaggio opzionale):
1. viene creata una **richiesta** (`adam_requests`) con stato **NEW → SEEN → RESPONDED → CLOSED**;
2. Adam riceve un avviso (**Telegram**, poi **Web Push** — vedi §8);
3. a Viola vengono **sempre** mostrati "Scrivi su WhatsApp" e "Chiama Adam";
4. quando Adam risponde dalla dashboard, Viola vede la risposta (e riceve una notifica push se attiva).
Anti-spam: al massimo 4 avvisi automatici ogni 10 minuti (i contatti diretti restano sempre visibili).

### Noi (`/viola/noi`)
- **Foto** (`/noi/foto`): galleria con viste polaroid, mosaico, timeline, grande + lightbox. **"Fammi vedere noi"** (`/noi/foto/random`): una foto a caso con una frase.
- **Cuore a distanza** (in cima a Noi, in home e nella dashboard di Adam): un tocco manda un cuore; l'altro lo vede e può rimandarne uno. Notifica leggera al massimo ogni 10 minuti.
- **"Insieme da N giorni ♡"**: sottotitolo di Noi, se Adam imposta la data in Impostazioni → Generale.
- **Ricordi** (`/noi/ricordi`): timeline dei momenti della coppia, con **"Sei qui ♡"** e sopra la prossima data importante.
- **Dediche** "Per te ♡" (`/noi/dediche`): messaggi di Adam per categoria (quando sei triste, quando mi manchi…), anche programmabili nel tempo.
- **Aprimi quando…** (`/noi/aprimi`): buste da aprire in un certo stato d'animo, con animazione; **"Scegli tu per me"** apre quella aperta meno volte.
- **Countdown** (`/noi/countdown`): quanto manca alle date importanti, con frasi calde ("Mancano 12 giorni per rivederti", "È oggi. ♡"); tutto il giorno della data conta come "oggi" (fuso di Roma).
- **Distanza** (`/noi/distanza`): Torino ↔ Rosolina calcolata da coordinate configurate, **senza GPS**.
- **Capsule del tempo** (`/noi/capsule`): messaggi il cui testo resta **segreto fino alla data di apertura** (garantito dal database, non solo dall'interfaccia).
- **La voce di Adam** (`/viola/audio`): vocali e canzoni caricate da Adam.

### Adam AI (`/viola/ai`)
Chat con un assistente basato su **Gemini** (dettagli in §7).

### Altro (`/viola/altro`) e pagine singole
- **Umore** (`/viola/umore`): come mi sento oggi, storico; senza diagnosi. Può essere condiviso con Adam.
- **Diario** (`/viola/diario`): pagine **private** (invisibili anche ad Adam) o **condivise con Adam**.
- **Scrivi ad Adam** (`/viola/scrivi`): messaggi per categoria (Un pensiero, Ti amo, Sono giù, Ho bisogno, Sono felice…); Adam li legge e risponde dall'inbox.
- **Voglio parlare** (`/viola/parliamo`), **Voglio distrarmi** (`/viola/distraiti`), **Voglio sorridere** (`/viola/sorridi`).
- **Sorprendimi** (`/viola/sorpresa`) e **Una cosa per te** (`/viola/oggi`, la sorpresa del giorno).
- **Giochi** (`/viola/giochi`): memory con le loro foto, trova il cuore, puzzle, quiz "quanto mi conosci?" (frasi finali modificabili), acchiappa i cuori (riflessi), termometro, domande, roulette, **indovina il ricordo** (foto sfocata + "Ti ricordi dov'eravamo?", poi si svela).
- **Abbraccio** (`/viola/abbraccio`), **Buongiorno** (`/viola/buongiorno`), **Buonanotte** (`/viola/buonanotte`).
- **Notifiche** (attiva/disattiva Web Push).
- **La tua privacy** (`/viola/privacy`): chi vede cosa, in parole semplici (cosa resta solo suo, cosa vede Adam, cosa sa Adam AI — comprese quante informazioni nascoste ha —, nota su Gemini), interruttore **"Adam può vedere quando uso esercizi e giochi"** e **Cancella i miei dati**.

### Offline
Respirazione, 5-4-3-2-1, grounding e idee di conforto funzionano **senza connessione** (service worker con pagine precaricate e pagina `/offline`). I contatti diretti di Adam (telefono / WhatsApp) vengono ricordati sul telefono, così "Chiama Adam" compare anche offline e nelle schermate d'errore.

### Tema e stile
Tema **chiaro e scuro automatici** (seguono il telefono), con la palette dell'icona: carta bianca / nero, vino profondo e rosso dell'icona, tinte leggere. Le schermate immersive (paura, abbraccio, notte) hanno colori fissi; le "polaroid" restano bianche in entrambi i temi.

---

## 6. La dashboard di Adam (`/admin`)

Protetta lato server (layout + ogni azione/API verifica il ruolo `admin`). Sezioni:

| Area | Cosa fa |
|---|---|
| **Dashboard** | panoramica: "♡ Viola ha bisogno di te", **Cuore a distanza**, richieste aperte, ultimi messaggi, umore, attività |
| **Ho bisogno di Adam** | lista richieste, "visto", rispondi, chiudi; esito di ogni canale di notifica |
| **Messaggi** | inbox dei messaggi di Viola + pagine di diario **condivise** |
| **Umore** | storico dell'umore condiviso |
| **AI Copilot** | chat con cui Adam crea/modifica contenuti a parole (§7) |
| **Home** | home builder: moduli, ordine, testi, icone, colori |
| **Contenuti** | Dediche, Ricordi, Open When, Countdown, Time capsule, Sorprese, Frasi, Quiz, Audio, Comfort, Respirazione (+ foto del respiro), Grounding |
| **Foto e audio** | upload multiplo drag & drop, con compressione e rimozione dei dati GPS |
| **Adam AI** | profilo, **foto avatar**, personalità, tono, modello, limiti, verifica modelli disponibili |
| **Memoria AI** | fatti che l'AI può sapere (soprannomi, preferenze…), visibili a Viola in "Cosa sa Adam AI di voi" |
| **Notifiche** | stato dei canali (CONNECTED / DISCONNECTED / NOT CONFIGURED), test, **ricerca guidata del chat ID Telegram**, attivazione Web Push sul telefono di Adam |
| **Impostazioni** | tutti i testi e le opzioni (generale, onboarding, testi, contatti, notifiche, AI, distanza, calma, costi) |
| **Cost control** | uso AI, database, storage, notifiche, con avvisi vicino ai limiti gratuiti |
| **Import / Export** | backup JSON dei contenuti (**senza segreti**) e ripristino validato |
| **Registro** | audit log delle azioni admin, log degli strumenti AI, attività |

Ogni contenuto ha: crea, modifica, duplica, elimina (con conferma), attiva/disattiva, ordina, cerca, filtra. I form usano componenti dedicati: scelta foto, icone, colori, azioni dell'app, editor di testo, liste, passi, opzioni del quiz, peso casuale, programmazione.

---

## 7. Intelligenza artificiale (Gemini)

### Adam AI (per Viola)
- Chat vera per qualsiasi domanda, con **streaming**, stop, rigenera, copia, elimina, cronologia delle conversazioni, Markdown.
- **Modalità**: *Generale* (assistente generico), *Personale* (conosce il contesto della coppia), *Conforto* (per i momenti difficili: massimo 2-3 frasi, prima accoglie e poi propone UNA cosa concreta; sotto la chat compaiono scorciatoie dirette — Respira con me, Facciamo grounding, 5-4-3-2-1, Fammi vedere una foto, Apriamo un ricordo, Scrivi ad Adam, Ho bisogno di Adam — che funzionano anche se l'AI non risponde).
- **Strumenti dell'app** (function calling) — l'AI può proporre azioni che diventano pulsanti nella chat:
  `start_breathing`, `start_grounding`, `start_panic_flow`, `start_5_4_3_2_1`, `show_random_photo`, `show_random_memory`, `show_random_dedication`, `show_open_when`, `show_surprise`, `open_gallery`, `open_countdown`, `start_distraction`, `open_whatsapp_adam`.
- **Memoria**: solo i fatti inseriti da Adam in "Memoria AI" (nella modalità General solo il soprannome). L'AI non inventa ricordi.
- **Regole nel prompt**: non fingere di essere Adam, non inventare, non diagnosticare, in pericolo indicare il 112 e Adam.
- **Avatar**: la foto di Adam caricata con contesto "Foto di Adam (avatar, abbraccio)".
- **Privacy**: le conversazioni di Viola sono visibili **solo a lei** (nemmeno l'admin le legge). All'AI non vengono mai inviate password, chiavi o segreti.

### AI Copilot (per Adam)
- Adam scrive cose come "crea tre dediche per quando è triste" e il Copilot usa strumenti **generati automaticamente dal registro dei contenuti**: `create_*`, `update_*`, `delete_*`, `list_*` per ogni tipo di contenuto, più `create_media_record`, `list_messages`, `mark_message_read`, `list_mood_entries`, `list_requests`, `get_app_settings`, `update_app_settings`.
- Ogni input è **validato con Zod**. Eliminazioni e disattivazioni **chiedono conferma** esplicita (pulsante) prima di essere eseguite.
- Niente SQL, file system o codice arbitrari: solo strumenti definiti. Ogni chiamata finisce in `ai_tool_logs` e le modifiche nell'audit log.
- Può ricevere allegati (foto) dall'admin.

### Modelli e limiti
- Modello di default `gemini-flash-latest`, fallback gratuito `gemini-flash-lite-latest`: si passa al successivo se il modello non esiste, ha finito la sua quota gratuita o è sovraccarico — solo prima che arrivi testo (niente risposte doppie) e ogni modello al massimo una volta. Timeout di 50 secondi. Modificabili dall'admin, con un verificatore dei modelli disponibili.
- Limiti propri dell'app (più bassi di quelli di Google, modificabili): 60 messaggi/giorno per Viola, 6 al minuto, 1024 token di risposta, 80 richieste/giorno per il Copilot. Superati i limiti, l'AI "si prende una pausa": **non si paga mai**.
- ⚠️ Sul piano gratuito Google può usare le conversazioni per migliorare i suoi servizi.

---

## 8. Notifiche

Catena di canali gratuiti, configurabile in modalità **fallback** (si ferma al primo che funziona) o **all** (li prova tutti):

1. **Telegram Bot** → messaggio ad Adam (con pulsante "Apri app"). Serve `TELEGRAM_BOT_TOKEN` + chat ID (da variabile o scelto in Admin → Notifiche).
2. **Web Push** (standard del browser, chiavi VAPID) → notifiche sul telefono di chi le ha attivate. È l'unico modo per notificare **Viola** (es. quando Adam risponde). Su iPhone funziona solo con l'app **aggiunta alla schermata Home**.
3. **WhatsApp / telefono** → non è una notifica automatica ma un link (`wa.me`, `tel:`) sempre visibile a Viola: il fallback umano.

Ogni tentativo è registrato in `notification_events` (canale, esito). Le iscrizioni push scadute vengono rimosse automaticamente. Gli avvisi **urgenti** ("Ho bisogno di Adam") su Telegram fanno **un solo** nuovo tentativo in caso di errore temporaneo (rete, 429, 5xx); mai su errori di configurazione. Timeout di 8 secondi per canale. Il "cuore" manda un avviso leggero al massimo ogni 10 minuti (disattivabile).

---

## 9. PWA, icona, offline

- Installabile su iPhone (Safari → Condividi → "Aggiungi alla schermata Home") e Android. Manifest dinamico (il nome dell'app segue le impostazioni), splash screen iOS, icone maskable.
- **Icona originale**: una **viola** (il fiore) con cinque petali fatti di **cuori**, rossa (#DA0E14) su nero, con una stellina bianca e piccoli brillantini. Ispirata all'estetica di un'immagine di riferimento amata da Viola (nero pieno, simbolo rosso a linea, stelline Y2K) ma non copiata. Tutto è generato da un solo SVG (`scripts/icon-svg.mjs`, `npm run icons`).
- **Service worker** scritto a mano (`public/sw.js`), registrato come `/sw.js?v=<id del build>`: ogni deploy installa la versione nuova, riscarica il kit offline e **cancella le cache vecchie** (nessuna versione vecchia bloccata sul telefono). Precache della pagina offline e delle pagine di calma, cache-first per i file statici, network-first per le pagine, notifiche push, pulizia della cache privata al logout.

---

## 10. Architettura tecnica

### Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · Motion · Supabase (Postgres + RLS, Auth, Storage) · Gemini (`@google/genai`) · Telegram Bot API · Web Push (`web-push`) · Zod 4 · sharp · Vitest · PGlite · Playwright (solo per test manuali).

### Struttura delle cartelle
```
src/
  app/            route: pagine "sottili" che caricano dati e compongono componenti
    viola/…       area di Viola           admin/…    dashboard di Adam
    api/…         AI chat, copilot (chat/confirm/models), upload foto/audio, cron keepalive
    offline/      kit offline               auth/signout
    manifest.ts   manifest PWA dinamico     layout.tsx metadati, font, provider
  proxy.ts        (in Next 16 sostituisce middleware.ts) aggiorna la sessione e blocca /viola e /admin senza login
  components/     UI riutilizzabile: ui/ (button, card, sheet, toast, fields, markdown…), layout/, decor/
  features/       una cartella per funzionalità: breathing, calm, grounding, fear, comfort, need-adam,
                  gallery, memories, dedications, open-when, capsules, countdown, distance, surprise,
                  games, hug, night, smile, mood, journal, messages, letters, ai-chat, admin, settings,
                  actions, content, pwa, push, offline, onboarding, privacy, activity, auth, home
  server/         solo server: auth, settings, media, upload, notifiche, AI, CRUD admin, audit, backup
  lib/            client Supabase (browser / server / service role) e variabili pubbliche
  db/             tipi TypeScript generati dal database
  hooks/ utils/   hook (localStorage, orologio, isClient) e utility (random pesato, date, distanza)
supabase/
  migrations/     001 schema · 002 RLS e funzioni · 003 storage
  seed.sql        contenuti iniziali
  setup.sql       migrazioni + seed in un unico file da incollare nello SQL Editor (npm run db:bundle)
public/           sw.js, icone, splash iOS
scripts/          icone, creazione utenti, chiavi VAPID, bundle SQL
tests/            unit + integrazione RLS
```

### Tre "registri" centrali (il modo in cui l'app resta configurabile)
1. **Registro delle risorse** — `src/features/admin/resources.ts`: descrive ogni tipo di contenuto (tabella, campi, tipo di campo, schema Zod, ordinamento, campo titolo, interruttore attivo). Da qui nascono automaticamente i **form admin**, gli **strumenti del Copilot** e l'**import/export**. Tipi registrati: `dedications`, `memories`, `comfort_actions`, `breathing_presets`, `breathing_media`, `grounding_exercises`, `countdowns`, `time_capsules`, `open_when_cards`, `daily_surprises`, `home_modules`, `phrases`, `quiz_questions`, `audio_items`, `ai_memory`, `media`.
2. **Impostazioni** — `src/features/settings/schema.ts`: gruppi `general`, `onboarding`, `texts`, `contact`, `notifications`, `ai`, `ai_profile`, `distance`, `calm`, `cost`, ognuno con schema Zod e **default**. Salvate nella tabella `app_settings` (chiave/valore, con flag pubblico/privato).
3. **Azioni dell'app** — `src/features/actions/registry.ts`: un solo vocabolario di azioni (apri respirazione, mostra foto, WhatsApp…) usato da card della home, comfort actions, buste, sorprese e strumenti AI; include la validazione dei link (solo URL sicuri).

### Flusso dei dati
- Le pagine sono **Server Components**: leggono dal database con il client Supabase dell'utente (quindi **sotto RLS**).
- Le modifiche passano da **Server Actions** (`"use server"`) o route API, che verificano sempre il ruolo e validano con Zod.
- Il **service role** (che salta la RLS) si usa solo lato server per: leggere le impostazioni private, memoria AI, notifiche, contatori, cron.
- Le foto sono in un bucket **privato**; il browser riceve **URL firmati** validi 3 ore.

---

## 11. Database (Supabase / Postgres)

### Tabelle
| Gruppo | Tabelle |
|---|---|
| Utenti e config | `profiles`, `app_settings` |
| Media | `media` (foto/audio, con "contesti": galleria, respiro, avatar AI…) |
| Contenuti di Adam | `dedications`, `memories`, `comfort_actions`, `breathing_presets`, `breathing_media`, `grounding_exercises`, `countdowns`, `time_capsules`, `open_when_cards`, `daily_surprises`, `home_modules`, `phrases`, `quiz_questions`, `audio_items` |
| Dati di Viola | `messages`, `journal_entries`, `mood_entries`, `adam_requests`, `activity_events` (registrati solo se `profiles.share_activity`) |
| Cuore a distanza | `hearts` (chi l'ha mandato, quando, se è stato visto) |
| Notifiche | `notification_subscriptions`, `notification_events` |
| AI | `ai_conversations`, `ai_messages`, `ai_memory`, `ai_tool_logs`, `ai_usage_daily` |
| Audit | `admin_audit_logs` |

### Regole di accesso (RLS) — nessun "allow all"
- `anon` (non loggato): **nessun accesso**. Utente `pending`: nessun accesso.
- Viola legge solo contenuti **pubblicati** e attivi (es. dediche con data di pubblicazione passata, sorprese fino a oggi, capsule solo dopo la data di apertura) e **i propri dati**.
- Adam (admin) gestisce i contenuti; vede diario e umore **solo se condivisi**; **non** vede le conversazioni AI di Viola.
- Colonne modificabili limitate per tipo di utente (es. Viola su `adam_requests` può scrivere solo il messaggio; Adam solo stato e risposta).
- Audit log solo in aggiunta.
- `hearts`: si mandano solo a proprio nome, si segnano come visti solo quelli ricevuti, si cancellano solo i propri.
- Nessuna funzione del database è eseguibile da `anon` (migration `20260928000001_hardening`).
- Funzioni SQL: `is_admin()`, `is_member()`, `app_role()`, trigger `handle_new_user` (crea il profilo, ruolo da `app_metadata` altrimenti `pending`), RPC `list_time_capsules`, `mark_capsule_opened`, `mark_open_when_opened`, `increment_ai_usage`, `admin_usage_stats`.

### Storage
Bucket `media` **privato**, 10 MB per file, solo JPEG/PNG/WebP e audio. Viola può leggere solo i file collegati a un record condiviso; solo l'admin carica ed elimina.

### Contenuti iniziali (seed)
16 moduli home, 58 frasi, 10 dediche, 20 comfort actions, 5 preset di respirazione, 4 esercizi di grounding, 6 buste "Aprimi quando", 5 ricordi (bozze), 1 countdown (bozza), 5 sorprese, 3 quiz (disattivati), 1 fatto in memoria AI. I ricordi e il countdown vanno completati da Adam.

---

## 12. Sicurezza (riassunto)

- Segreti **solo** in variabili d'ambiente lato server; nessuna password o chiave nel frontend o nel repository.
- `/admin` protetto lato server a ogni livello (layout, azioni, API).
- RLS su tutte le tabelle, testata con le migrazioni reali.
- Upload: tipo verificato dai **magic bytes** (non dall'estensione), dimensione limitata, foto **ricodificate con sharp** in WebP (rimuove EXIF e posizione GPS), miniature, compressione lato client prima dell'invio.
- AI: strumenti espliciti + Zod + conferma per delete/disable, log senza segreti, limiti di uso.
- Markdown senza HTML grezzo e con link filtrati; header di sicurezza (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`).
- Export JSON **senza segreti**.

---

## 13. Configurazione

### Servizi esterni (tutti gratuiti)
| Servizio | Serve per | Obbligatorio? |
|---|---|---|
| Supabase (Free) | database, login, foto | **sì** |
| Vercel (Hobby) | hosting + cron giornaliero | **sì** (o altro hosting Next.js) |
| Google AI Studio (Gemini) | Adam AI e Copilot | no (senza, l'AI è disattivata) |
| Telegram Bot | avvisi ad Adam | no, ma consigliato |
| Web Push (VAPID) | notifiche nell'app, anche a Viola | no |
| WhatsApp (link) | contatto diretto di emergenza | no, ma consigliato |

### Variabili d'ambiente
| Variabile | Tipo su Vercel | Note |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Config | `https://xxxx.supabase.co` (se incollata con `/rest/v1/` l'app la corregge) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Config | chiave **publishable** (o anon), mai la secret |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | chiave secret / service_role |
| `GEMINI_API_KEY` | **Secret** | da aistudio.google.com |
| `GEMINI_MODEL` | Config | opzionale |
| `TELEGRAM_BOT_TOKEN` | **Secret** | da @BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | Config | opzionale (si può scegliere dall'admin) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Config | da `npm run vapid` |
| `VAPID_PRIVATE_KEY` | **Secret** | da `npm run vapid` |
| `VAPID_SUBJECT` | Config | `mailto:tua@email` |
| `ADMIN_WHATSAPP_NUMBER` | Config | solo cifre con prefisso (es. `39333…`); si può mettere anche dall'admin |
| `NEXT_PUBLIC_SITE_URL` | Config | indirizzo pubblico dell'app |
| `CRON_SECRET` | **Secret** | protegge il cron keepalive |

Le variabili `NEXT_PUBLIC_*` vengono lette **al momento della build**: dopo averle cambiate serve un nuovo deploy.

---

## 14. Costi e limiti gratuiti

- **€0/mese** per l'uso previsto (2 persone).
- Supabase Free: 500 MB database, 1 GB storage, 5 GB traffico/mese, **pausa dopo 7 giorni senza attività** → evitata dal cron `/api/cron/keepalive` (ogni giorno, configurato in `vercel.json`).
- Vercel Hobby: uso personale, ~100 GB traffico/mese, cron una volta al giorno.
- Gemini free tier: limiti giornalieri decisi da Google (cambiano nel tempo); l'app ha limiti propri più bassi.
- Possibili costi futuri, **solo se attivati volontariamente**: dominio personalizzato (~€10–15/anno), Gemini a pagamento, Supabase Pro (~$25/mese), Vercel Pro (~$20/mese), WhatsApp Business API (non usata).

---

## 15. Sviluppo e test

```bash
npm install
cp .env.example .env.local      # compila i valori
npm run dev                     # http://localhost:3000
```

| Comando | Cosa fa |
|---|---|
| `npm run check` | lint + typecheck + test (da eseguire prima di ogni commit) |
| `npm run build` / `start` | build e avvio di produzione |
| `npm run create-user -- --email … --password … --role admin\|user` | crea/aggiorna un account |
| `npm run vapid` | genera le chiavi Web Push |
| `npm run icons` | rigenera icone, favicon, splash |
| `npm run db:bundle` | rigenera `supabase/setup.sql` (migrazioni + seed, progetti nuovi) e `supabase/update.sql` (solo le migrazioni successive alla prima versione, per i progetti già installati; sempre rieseguibile) |
| `npx supabase start` | database locale (richiede Docker) |

**Test automatici** (`npm test`, 106 test): motore casuale, ciclo di respirazione, date/countdown/distanza, link sicuri, impostazioni, registro admin, riconoscimento file, elaborazione foto (EXIF rimosso), catena notifiche e Telegram (il token non finisce nei log), prompt AI (niente segreti), strumenti AI, messaggi d'errore del login, moduli server action, sincronizzazione di `setup.sql`, e **RLS**: le migrazioni reali vengono applicate a un Postgres embedded (PGlite) e ogni permesso di Viola, Adam, utenti in attesa e anonimi viene verificato, compresi i tentativi di attacco; e la sincronizzazione di `update.sql`.

Durante lo sviluppo e l'audit sono stati eseguiti anche: la suite end-to-end (103 controlli) sulla build di produzione con Supabase locale e un finto server Gemini; controlli di resilienza (rete che cade durante "Ho bisogno di Adam" e il salvataggio dell'umore, home senza moduli, modalità Conforto, interruttore privacy); il flusso completo del cuore tra i due account; il giro di tutte le pagine a 375 / 390 / 402 / 430 / 768 / 1024 / 1440 px, in tema chiaro e scuro e con "riduci movimento" (nessun errore, nessuno scroll orizzontale); l'offline con il server spento; la compatibilità con un database non ancora aggiornato.

---

## 16. Stato attuale (settembre 2026)

- Codice completo e pubblicato su GitHub: **`ErBagnino/Viola`**, branch **`claude/upbeat-curie-54h1pn`** (è anche il branch predefinito; non esiste `main`).
- ⚠️ Il repository è **pubblico**: non contiene segreti, ma codice e testi iniziali sono leggibili da chiunque. Se diventa privato, su Vercel Hobby i deploy dei commit con autore diverso dal proprietario dell'account vengono bloccati (va sistemato l'autore dei commit).
- Deploy su **Vercel** in corso di configurazione da parte di Adam (variabili d'ambiente inserite, primo deploy creato a mano dal branch sopra).
- Verificato in sviluppo: tutto il flusso con Supabase locale, foto, AI con Gemini simulato, Copilot, notifiche simulate, offline.
- **Da verificare sul campo**: Gemini reale, notifiche Telegram reali, Web Push su iPhone installato, login sul Supabase di produzione. Il login ora mostra messaggi d'errore specifici (password errata, account non confermato, chiave o URL Supabase sbagliati, database non inizializzato) per facilitare la diagnosi.
- **Da fare una volta sul database di produzione**: eseguire `supabase/update.sql` (vedi SETUP.md, passo 5). Fino ad allora l'app funziona, ma "Cuore a distanza" e l'interruttore privacy rispondono con un errore gentile.
- Contenuti da personalizzare: ricordi e countdown iniziali sono bozze; foto, audio, avatar di Adam e memoria AI vanno caricati dall'admin.

---

## 17. Note per un'AI (o sviluppatore) che deve modificare il progetto

### Convenzioni e trappole note
- **Next.js 16** ha cambiamenti rispetto alle versioni precedenti: il middleware si chiama `src/proxy.ts`; `params`, `searchParams` e `cookies()` sono **asincroni**; non esiste `next lint` (si usa `eslint .`). Prima di scrivere codice leggere la guida in `node_modules/next/dist/docs/` (vedi `AGENTS.md`).
- I file `"use server"` possono esportare **solo funzioni async** (e tipi): costanti e oggetti vanno in moduli separati (es. `src/features/content/constants.ts`). C'è un test che lo verifica.
- **React 19 + eslint-plugin-react-hooks**: niente `setState` dentro `useEffect`, niente `Date.now()`/`Math.random()` durante il render, niente lettura di ref nel render. Per valori casuali si passa un seed/indice iniziale dal server; per localStorage/orologio si usano gli hook in `src/hooks/` (`useSyncExternalStore`).
- **Zod 4**: `.partial()` riapplica i default e resetterebbe i campi; per gli update parziali usare `parseUpdate()` (che usa `.pick()`) in `resources.ts`.
- Per i media, i flag `breathing_enabled` / `ai_avatar_enabled` sono **derivati** dai `contexts` lato server: non impostarli a mano.
- Le impostazioni si leggono con `getSettings()` (server, con service role quando disponibile), non direttamente dal client.
- Testi dell'interfaccia in **italiano**, tono caldo; messaggi d'errore gentili (`FRIENDLY_ERROR`).
- Non introdurre servizi a pagamento, non esporre segreti al client, non indebolire la RLS, non aggiungere strumenti AI che eseguono SQL/codice arbitrario.
- **Colori**: usare i token di `globals.css`. `wine-*`, `rouge-*`, `night-*`, `moon` sono fissi (per superfici piene); `canvas`, `surface`, `line`, `ink*`, `vio-*` (testo), `tint-*`, `blush/peach/lilac/cream` cambiano col tema scuro. Testo su superfici chiare → `text-vio-*`/`text-ink*`; testo su superfici piene → `text-white`/`text-wine-100…300`. Le foto "stampate" usano la utility `polaroid`.
- **Chiamare una server action dal browser** sempre con `callAction(() => azione(...))` (`src/utils/call-action.ts`): una rete che cade diventa un messaggio gentile invece della schermata d'errore.
- "Riduci movimento": usare `useReducedMotion` da `src/hooks/use-reduced-motion.ts` (non quello di `motion/react`, che rompe l'idratazione).
- Nuove migration: devono essere **rieseguibili** (`if not exists`, `drop policy if exists`…); poi `npm run db:bundle` aggiorna `setup.sql` e `update.sql`. Il codice deve continuare a funzionare anche prima che la migration sia applicata in produzione (es. `select("*")` invece di nominare una colonna nuova).

### Aggiungere un nuovo tipo di contenuto
1. Nuova migrazione in `supabase/migrations/` (tabella + trigger `touch_updated_at` + RLS con policy esplicite, niente "allow all").
2. Aggiornare i tipi in `src/db/` (`supabase gen types typescript --local`).
3. Aggiungere la definizione nel registro `src/features/admin/resources.ts` → form admin, Copilot e backup arrivano automaticamente.
4. Voce di menu in `src/features/admin/nav.ts`; pagina/componenti in `src/app/viola/…` e `src/features/…`.
5. Eventuali contenuti iniziali in `supabase/seed.sql`, poi `npm run db:bundle` (il test `setup-sql` fallisce se `setup.sql` non è aggiornato).
6. Test RLS in `tests/rls.test.ts`, poi `npm run check`.

### Aggiungere un'impostazione
Aggiungere il campo con default nello schema del gruppo in `src/features/settings/schema.ts` e l'etichetta in `src/features/settings/fields.ts`: compare da sola in Admin → Impostazioni.

### Aggiungere uno strumento per Adam AI
Definirlo in `src/server/ai/viola-tools.ts` (nome, descrizione, JSON schema dei parametri) e gestirlo in `runViolaTool`, riusando le azioni di `src/features/actions/registry.ts`.

### File da leggere per primi
`README.md` · `SETUP.md` · `src/features/admin/resources.ts` · `src/features/settings/schema.ts` · `src/features/actions/registry.ts` · `src/server/auth.ts` · `supabase/migrations/20260927000002_rls.sql` · `src/server/notifications/index.ts` · `src/server/ai/` · `public/sw.js`.
