# SETUP — Vio ♡ passo dopo passo

Questa guida parte da zero e non dà nulla per scontato. Segui i passi **nell'ordine**.
Tempo totale: circa **45–60 minuti**. Costo: **€0**. Non serve nessuna carta di credito.

> ✋ **Regola d'oro:** non attivare mai "billing", "upgrade" o "Pro" su nessun servizio.
> L'app è costruita per funzionare con i piani gratuiti. Se un sito ti chiede la carta, fermati: non serve.

---

## Indice

1. [Installare Node.js](#1-installare-nodejs)
2. [Scaricare il progetto e `npm install`](#2-scaricare-il-progetto-e-npm-install)
3. [Creare il progetto Supabase](#3-creare-il-progetto-supabase)
4. [Creare il database](#4-creare-il-database)
5. [Migrations e aggiornamenti del database (`update.sql`)](#5-migrations)
6. [Auth: chiudere le registrazioni](#6-auth-chiudere-le-registrazioni)
7. [Storage (foto e audio)](#7-storage-foto-e-audio)
8. [Creare gli utenti Adam e Viola](#8-creare-gli-utenti-adam-e-viola)
9. [Assegnare il ruolo ADMIN](#9-assegnare-il-ruolo-admin)
10. [Gemini (Adam AI)](#10-gemini-adam-ai)
11. [La API key di Gemini](#11-la-api-key-di-gemini)
12. [Telegram](#12-telegram)
13. [BotFather: creare il bot](#13-botfather-creare-il-bot)
14. [Trovare il Chat ID](#14-trovare-il-chat-id)
15. [Web Push](#15-web-push)
16. [Chiavi VAPID](#16-chiavi-vapid)
17. [WhatsApp (fallback)](#17-whatsapp-fallback)
18. [Il file `.env`](#18-il-file-env)
19. [GitHub](#19-github)
20. [Vercel](#20-vercel)
21. [Deploy](#21-deploy)
22. [Environment variables su Vercel](#22-environment-variables-su-vercel)
23. [Testare le notifiche](#23-testare-le-notifiche)
24. [Backup](#24-backup)
25. [Installare l'app su iPhone e controllare l'icona](#25-installare-lapp-su-iphone-e-controllare-licona)
26. [Problemi comuni](#26-problemi-comuni)

---

## 1. Installare Node.js

Serve solo se vuoi provare l'app sul tuo computer o usare gli script (`create-user`, `vapid`).
Se fai tutto dal browser (Supabase + Vercel) puoi saltare i passi 1–2 e usare il metodo "dashboard" nei passi successivi.

1. Vai su **https://nodejs.org**
2. Scarica la versione **LTS** (quella consigliata, 20 o superiore) e installala.
3. Apri il Terminale (Mac: Spotlight → "Terminale"; Windows: "Prompt dei comandi") e scrivi:
   ```bash
   node -v
   ```
   Deve apparire un numero tipo `v22.x.x`.

## 2. Scaricare il progetto e `npm install`

```bash
git clone https://github.com/ErBagnino/Viola.git
cd Viola
npm install
```

`npm install` scarica tutte le librerie (qualche minuto la prima volta).

---

## 3. Creare il progetto Supabase

Supabase è il database + login + archivio foto. Piano **Free**.

1. Vai su **https://supabase.com** → **Start your project** → accedi con GitHub (o email).
2. **New project**:
   - **Name:** `vio`
   - **Database password:** premi "Generate" e **salvala** in un posto sicuro.
   - **Region:** `Central EU (Frankfurt)` (la più vicina all'Italia).
   - **Plan:** Free.
3. Aspetta 1–2 minuti che il progetto sia pronto.

### Dove trovare URL e chiavi (ti serviranno dopo)

In Supabase apri **Project Settings** (l'ingranaggio in basso a sinistra):

| Cosa | Dove | Variabile |
|---|---|---|
| Project URL (`https://xxxx.supabase.co`) | Project Settings → **Data API** (o "API") | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key (`sb_publishable_…`) oppure la vecchia "anon public" | Project Settings → **API Keys** | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| Secret key (`sb_secret_…`) oppure la vecchia "service_role" | Project Settings → **API Keys** → Secret keys (premi "Reveal") | `SUPABASE_SERVICE_ROLE_KEY` |

> 🔒 La **secret / service_role key** è come la chiave di casa: non incollarla mai in chat, email o nel codice.
> Va **solo** nelle variabili d'ambiente (passi 18 e 22).

## 4. Creare il database

1. In Supabase apri **SQL Editor** → **New query**.
2. Apri il file **`supabase/setup.sql`** del progetto (anche da GitHub, pulsante "Raw"), seleziona tutto e copialo.
3. Incollalo nell'editor e premi **Run**.
4. Deve comparire **"Success. No rows returned"**.

Questo crea in un colpo solo: tutte le tabelle, la sicurezza (RLS) su ogni tabella, lo storage privato per le foto e i contenuti iniziali (10 dediche, 20 comfort action, 5 respirazioni, 6 buste "Aprimi quando", 5 sorprese, frasi…).

> Esegui `setup.sql` **una sola volta** su un progetto nuovo.

## 5. Migrations

I file in `supabase/migrations/` sono la "storia" del database. `supabase/setup.sql` è la loro somma, pronta da incollare.

### Hai già eseguito `setup.sql` in passato? Aggiorna il database

Se il database l'hai creato con una versione precedente dell'app, esegui **una volta** anche **`supabase/update.sql`** (in caso di dubbio: la pagina **Completa Vio ♡** del pannello te lo dice come primo passaggio, "Aggiorna il database"):

1. Supabase → **SQL Editor** → **New query**.
2. Copia tutto `supabase/update.sql` (da GitHub: pulsante "Raw"), incollalo e premi **Run**.
3. Deve comparire "Success". Si può rieseguire senza problemi: non cancella nulla.

Aggiunge: una protezione in più sulle funzioni del database, l'interruttore privacy di Viola ("Adam può vedere quando uso esercizi e giochi") e il **Cuore a distanza**. Senza questo passo quelle funzioni danno un errore gentile, il resto dell'app funziona.

> Su un progetto **nuovo** non serve: `setup.sql` contiene già tutto.

- Per aggiornamenti futuri: `update.sql` contiene sempre tutte le migration successive alla prima versione, ed è sempre sicuro da rieseguire.
- 🔒 **I tuoi dati sono al sicuro**: `update.sql` aggiunge solo colonne, tabelle e funzioni nuove, non cancella né modifica foto, ricordi, dediche o messaggi (c'è un test che lo controlla). `setup.sql`, se per errore lo esegui su un progetto già in uso, si ferma alla prima riga senza toccare niente.
- (Per sviluppatori) con il CLI di Supabase: `supabase link` e poi `supabase db push`.
- Dopo aver modificato migration o seed, rigenera i file con `npm run db:bundle` (aggiorna `setup.sql` e `update.sql`).

## 6. Auth: chiudere le registrazioni

Nessuno oltre a voi due deve potersi registrare.

1. Supabase → **Authentication** → **Sign In / Providers** (o "Providers").
2. **Email** deve essere attivo.
3. Disattiva **"Allow new users to sign up"** (a volte si trova in Authentication → Settings).
4. Dopo il deploy (passo 21) vai in **Authentication → URL Configuration** e imposta **Site URL** con l'indirizzo della tua app (es. `https://vio-xxxx.vercel.app`).

> Anche se qualcuno riuscisse a registrarsi, il suo account resta **"in attesa"** e non vede nulla: i ruoli si assegnano solo come spiegato nei passi 8–9.

## 7. Storage (foto e audio)

Non devi fare niente: il passo 4 ha già creato il bucket **`media`**, **privato**, con limite 10 MB e solo formati ammessi (JPEG/PNG/WEBP e audio).
Per controllare: Supabase → **Storage** → deve esserci `media` con il lucchetto (privato).

Le foto non sono mai pubbliche: l'app crea link temporanei validi poche ore, solo per voi due.

## 8. Creare gli utenti Adam e Viola

Scegli **uno** dei due metodi.

### Metodo A — dalla dashboard (senza computer)

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Inserisci la tua email e una password (almeno 8 caratteri), spunta **Auto Confirm User**, crea.
3. Ripeti per Viola con la sua email e una password che le darai.
4. Poi vai al passo 9 per assegnare i ruoli.

### Metodo B — con lo script (dal computer)

Prima prepara il file `.env.local` (passo 18), poi:

```bash
npm run create-user -- --email tua@email.it --password "PasswordLunga!" --role admin --name Adam
npm run create-user -- --email viola@email.it --password "PasswordDiViola!" --role user --name Viola
```

Lo script crea l'account, conferma l'email e assegna il ruolo. Puoi rilanciarlo per cambiare una password.

## 9. Assegnare il ruolo ADMIN

(Solo se hai usato il Metodo A.) Supabase → **SQL Editor** → New query, cambia le email e premi Run:

```sql
insert into public.profiles (id, role, display_name)
select id, 'admin', 'Adam' from auth.users where email = lower('tua@email.it')
on conflict (id) do update set role = excluded.role;

insert into public.profiles (id, role, display_name)
select id, 'user', 'Viola' from auth.users where email = lower('viola@email.it')
on conflict (id) do update set role = excluded.role;

-- controllo: devono comparire due righe, con i ruoli giusti
select u.email, p.role from auth.users u left join public.profiles p on p.id = u.id;
```

Funziona anche se hai creato gli utenti **prima** di eseguire `setup.sql`.

Ruoli: `admin` = Adam (dashboard `/admin`), `user` = Viola (area `/viola`), `pending` = nessun accesso.

---

## 10. Gemini (Adam AI)

Adam AI usa **Google Gemini** con il **piano gratuito** di Google AI Studio.

- È gratis entro dei limiti giornalieri (che Google cambia nel tempo). L'app ha limiti suoi, più bassi, modificabili in **Admin → Adam AI**.
- Se il limite viene raggiunto, Adam AI dice "ha bisogno di una piccola pausa": **non paghi nulla**, l'app non passa mai a servizi a pagamento.
- ⚠️ **Privacy:** sul piano gratuito Google può usare le conversazioni per migliorare i suoi prodotti. Non scrivete in chat dati sensibili (password, documenti, dati sanitari). Adam AI riceve solo il necessario: le informazioni che scegli tu in "Memoria AI", mai chiavi o password.

## 11. La API key di Gemini

1. Vai su **https://aistudio.google.com/apikey** e accedi con un account Google.
2. **Create API key** (se chiede un progetto, crea "vio").
3. Copia la chiave (inizia con `AIza…`) → sarà `GEMINI_API_KEY`.
4. **Non** attivare la fatturazione ("Set up billing"): resta sul piano gratuito.

Modello: l'app usa di default `gemini-flash-latest` (alias di Google che punta sempre al Flash più recente) e, se non disponibile, `gemini-flash-lite-latest`.
In **Admin → Adam AI → "Quali modelli posso usare?"** vedi la lista dei modelli attivi per la tua chiave e puoi cambiarlo senza toccare codice.

---

## 12. Telegram

Telegram è il modo **gratuito e automatico** con cui ricevi "♡ VIOLA HA BISOGNO DI TE" sul telefono, anche ad app chiusa. Installa Telegram sul tuo telefono se non ce l'hai.

## 13. BotFather: creare il bot

1. Su Telegram cerca **@BotFather** (quello con la spunta blu) e apri la chat.
2. Scrivi `/newbot`.
3. Nome del bot: es. `Vio Avvisi`.
4. Username (deve finire con `bot`): es. `vio_avvisi_adam_bot`.
5. BotFather ti risponde con un **token** tipo `123456789:AAH…` → sarà `TELEGRAM_BOT_TOKEN`.
6. Apri la chat con il tuo nuovo bot (link nel messaggio di BotFather) e premi **Avvia / Start**.
   *Senza questo passo il bot non può scriverti.*

## 14. Trovare il Chat ID

**Metodo facile (consigliato):** dopo il deploy, entra come Adam → **Admin → Notifiche → Collega Telegram → "Trova il mio chat ID"** → **"Usa questa"**. Fatto.

**Metodo manuale:** apri nel browser (sostituisci il token):

```
https://api.telegram.org/bot<IL_TUO_TOKEN>/getUpdates
```

Cerca `"chat":{"id":123456789` → quel numero è `TELEGRAM_ADMIN_CHAT_ID`.
Se vedi `"result":[]`, scrivi prima un messaggio al bot e ricarica la pagina.

---

## 15. Web Push

Web Push manda la notifica direttamente dall'app al telefono (gratis, senza Telegram).

- **iPhone:** funziona solo con iOS 16.4+ **e** con l'app **installata sulla schermata Home** (passo 25). Poi apri l'app dall'icona → **Admin → Notifiche → Abilita notifiche**.
- **Android / computer:** basta aprire l'app e premere **Abilita notifiche**.
- Anche Viola può attivare le notifiche (**Altro → Avvisi quando Adam ti risponde**): riceverà un avviso quando rispondi.

## 16. Chiavi VAPID

Sono le chiavi (gratuite) che firmano le notifiche Web Push. Dal computer:

```bash
npm run vapid
```

Copia le 3 righe che compaiono:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:tua@email.it
```

> **Non hai scaricato il progetto (o non hai git)?** Basta Node: in PowerShell o nel Terminale scrivi
> `npx web-push generate-vapid-keys` (alla domanda "Ok to proceed?" rispondi `y`).
> "Public Key" va in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, "Private Key" va in `VAPID_PRIVATE_KEY`.
>
> Senza computer? Puoi generarle su un generatore online di "VAPID keys", ma è più sicuro sul tuo computer.
> Genera le chiavi **una volta sola**: se le cambi, bisogna riattivare le notifiche su ogni telefono.

## 17. WhatsApp (fallback)

WhatsApp non invia notifiche automatiche (servirebbe l'API a pagamento, che **non** usiamo). Funziona così: se Telegram e Web Push non partono, Viola vede subito i pulsanti **"Scrivi ad Adam su WhatsApp"** (con messaggi già pronti) e **"Chiama Adam"**. Viola non resta mai senza una strada.

- `ADMIN_WHATSAPP_NUMBER` = il tuo numero **con prefisso, solo cifre**, es. `393331234567` (niente `+`, spazi o zeri iniziali).
- In alternativa puoi impostarlo in **Admin → Impostazioni → Contatti** (lì imposti anche il numero per le chiamate e i messaggi pronti).

---

## 18. Il file `.env`

Serve solo per lavorare sul computer. Copia l'esempio:

```bash
cp .env.example .env.local
```

Apri `.env.local` e compila:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
GEMINI_API_KEY=AIza...
TELEGRAM_BOT_TOKEN=123456789:AAH...
TELEGRAM_ADMIN_CHAT_ID=123456789
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:tua@email.it
ADMIN_WHATSAPP_NUMBER=393331234567
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=una-frase-lunga-e-casuale
```

Poi `npm run dev` e apri http://localhost:3000.

> `.env.local` **non** viene mai caricato su GitHub (è nel `.gitignore`). Non committarlo mai.

## 19. GitHub

Il codice è già su GitHub (`ErBagnino/Viola`). Vercel lo prende da lì.
Quando il lavoro è pronto, unisci (merge) il branch nel branch principale `main`: Vercel pubblica automaticamente `main`.

## 20. Vercel

Vercel ospita l'app. Piano **Hobby** (gratis, per uso personale).

1. Vai su **https://vercel.com** → **Sign Up** → **Continue with GitHub**. Scegli il piano **Hobby**.
2. **Add New… → Project** → importa il repository **Viola** (se non lo vedi: "Adjust GitHub App Permissions" e concedi l'accesso al repo).

## 21. Deploy

1. Nella schermata di import, **Framework Preset**: Next.js (automatico). Non cambiare i comandi di build.
2. Apri **Environment Variables** e inserisci **tutte** le variabili del passo 22 **prima** di premere Deploy.
3. Premi **Deploy** e aspetta 1–3 minuti.
4. Vercel ti dà un indirizzo tipo `https://viola-xxxx.vercel.app`: è la tua app!
5. Torna su Supabase → **Authentication → URL Configuration → Site URL** e incolla questo indirizzo.
6. Su Vercel imposta anche `NEXT_PUBLIC_SITE_URL` con lo stesso indirizzo (serve al pulsante "Apri app" di Telegram) e fai **Redeploy**.

## 22. Environment variables su Vercel

Vercel → il tuo progetto → **Settings → Environment Variables**. Aggiungi (per "Production", "Preview" e "Development"):

| Nome | Obbligatoria | Da dove |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | passo 3 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | passo 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | passo 3 (segreta!) |
| `GEMINI_API_KEY` | per Adam AI | passo 11 |
| `TELEGRAM_BOT_TOKEN` | per Telegram | passo 13 |
| `TELEGRAM_ADMIN_CHAT_ID` | per Telegram (o salvalo dall'admin) | passo 14 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | per Web Push | passo 16 |
| `VAPID_PRIVATE_KEY` | per Web Push | passo 16 |
| `VAPID_SUBJECT` | per Web Push | passo 16 |
| `ADMIN_WHATSAPP_NUMBER` | consigliata | passo 17 |
| `NEXT_PUBLIC_SITE_URL` | consigliata | passo 21 |
| `CRON_SECRET` | consigliata | una frase lunga a caso |

> Ogni volta che cambi una variabile che inizia con `NEXT_PUBLIC_`, fai **Deployments → … → Redeploy**.

### Il "keep-alive" (importante)

Supabase Free **mette in pausa** i progetti dopo 7 giorni senza attività: l'app smetterebbe di funzionare proprio quando Viola potrebbe averne bisogno.
Il file `vercel.json` attiva un **Cron gratuito** di Vercel che ogni giorno fa una piccola lettura del database e lo tiene sveglio. Non devi fare nulla: controlla solo in Vercel → **Settings → Cron Jobs** che compaia `/api/cron/keepalive`.
Se il progetto dovesse comunque andare in pausa, Supabase ti manda un'email: basta premere **Restore** nella dashboard (gratis).

---

## 23. Testare le notifiche

1. Apri l'app, entra come **Adam** → **Admin → Notifiche**.
2. Controlla lo stato: Telegram / Web Push / WhatsApp devono essere **CONNECTED**.
3. Premi **Test Notification** su Telegram: ti arriva "♡ Notifica di prova".
4. Abilita Web Push su questo dispositivo e premi il test Web Push.
5. Premi **"Prova la catena completa"**: è esattamente ciò che succede quando Viola preme il pulsante.
6. Test reale: dal telefono di Viola (o da un'altra finestra in incognito) entra come **Viola** → **Ho bisogno di Adam** → premi il cuore.
   Devi ricevere **♡ VIOLA HA BISOGNO DI TE** con ora e messaggio, e la richiesta compare in **Admin → Ho bisogno di Adam** (stato NEW, canali usati, esito). Da lì: *Mark seen*, *Respond*, *Close*.

Se nessun canale funziona, Viola vede comunque "Ho salvato la tua richiesta. Ora scrivigli direttamente. ♡" con WhatsApp e Chiama.

## 24. Backup

- **Contenuti:** Admin → **Import / Export** → **Export JSON** (dediche, ricordi, frasi, impostazioni…). Fallo ogni tanto e conserva il file. Il backup non contiene mai chiavi segrete.
- **Foto:** Supabase → Storage → `media` → puoi scaricare i file.
- **Database completo (avanzato):** Supabase → Database → Backups (sul piano Free le copie automatiche sono limitate), oppure con il CLI `supabase db dump`.
- **Ripristino:** Import / Export → **Import JSON**.

---

## 25. Installare l'app su iPhone e controllare l'icona

1. Sull'iPhone apri **Safari** (deve essere Safari) e vai all'indirizzo dell'app.
2. Tocca il pulsante **Condividi** (quadrato con freccia in su).
3. Scorri e tocca **"Aggiungi alla schermata Home"**.
4. Il nome proposto è quello impostato in Admin (default **"Vio ♡"**) → **Aggiungi**.
5. Sulla Home deve apparire l'icona: **sfondo nero, fiore rosso fatto di cinque cuori, con una stellina bianca**. Aprendola, parte a schermo intero con la schermata di avvio nera.

Se vedi un'icona vecchia o generica: tieni premuta l'icona → Rimuovi app → ripeti i passi (iOS salva l'icona al momento dell'aggiunta).

Su **Android** (Chrome): menu ⋮ → **Installa app** / "Aggiungi a schermata Home".

## 26. Problemi comuni

| Problema | Soluzione |
|---|---|
| "L'app non è ancora configurata" sulla pagina di accesso | Mancano `NEXT_PUBLIC_SUPABASE_URL` / `..._PUBLISHABLE_KEY` su Vercel → aggiungile e fai Redeploy. |
| "Il tuo account esiste ma non è ancora abilitato" | Assegna il ruolo (passo 9). |
| Adam AI dice "momentaneamente offline" | Manca `GEMINI_API_KEY`, oppure Adam AI è disattivato in Admin → Adam AI. |
| Adam AI dice "ha bisogno di una piccola pausa" | Limite giornaliero raggiunto (tuo o di Google). Si sblocca da solo il giorno dopo. Puoi alzare i tuoi limiti in Admin → Adam AI. |
| Telegram: DISCONNECTED | Token sbagliato o chat ID mancante: rifai i passi 13–14 e premi Start nella chat del bot. |
| Web Push su iPhone non si attiva | L'app deve essere aperta dall'icona sulla Home (passo 25), iOS 16.4+. Controlla anche Impostazioni iPhone → Notifiche → Vio. |
| Le foto non si caricano | Max 10 MB, solo JPEG/PNG/WEBP. Le foto dell'iPhone vengono convertite in automatico. |
| L'app non si apre dopo giorni di inattività | Il progetto Supabase è in pausa: Supabase → Restore. Controlla il Cron (passo 22). |
| Accesso: "Email o password non corrette" | Controlla con l'occhio accanto alla password che l'iPhone non abbia cambiato lettere. Se l'utente è stato creato dalla dashboard, deve avere "Auto Confirm User". |
| Accesso: "La chiave di Supabase non è valida" | In `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` va la chiave **publishable** (o anon), non la secret. Poi Redeploy. |
| Accesso: "Non riesco a collegarmi a Supabase" | `NEXT_PUBLIC_SUPABASE_URL` deve essere `https://xxxx.supabase.co`; controlla anche che il progetto non sia in pausa. Poi Redeploy. |
| Accesso: "Il database non è pronto" | Esegui `supabase/setup.sql` (passo 4). |
| "Cuore a distanza", l'interruttore privacy o le spunte di "Completa Vio ♡" danno errore | Esegui `supabase/update.sql` (passo 5). |
| Le impostazioni dicono "salvate" ma dopo aver ricaricato sembrano sparite, oppure nel pannello c'è l'avviso rosso "La chiave segreta di Supabase non funziona" | Su Vercel `SUPABASE_SERVICE_ROLE_KEY` non è la **Secret key** (`sb_secret_…`) di questo progetto (spesso è stata incollata la publishable). Correggila (passo 22) e fai **Redeploy**. Le versioni nuove dell'app leggono comunque le impostazioni con la tua sessione, ma senza la chiave giusta le notifiche a Viola non partono. |
| Adam AI dice che si prende una pausa | Tutti i modelli gratuiti hanno finito la quota di oggi (si riparte verso le 9:00) oppure hai raggiunto i limiti dell'app (Admin → Adam AI). Non si paga mai. |
| Dopo un aggiornamento l'app installata sembra vecchia | Chiudila del tutto e riaprila: ogni deploy installa un nuovo service worker e svuota le cache vecchie. |

Buon lavoro, e buona casa a voi due. ♡
