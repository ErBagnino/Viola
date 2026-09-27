-- =====================================================================
-- Viola × Adam — starter content (all editable from the admin dashboard)
-- Safe to run more than once: each block only fills EMPTY tables.
-- Memories and quiz questions are created as DRAFTS (not visible to
-- Viola) because only Adam knows the real ones.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Home modules
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.home_modules) then
  insert into public.home_modules (type, widget, action, title, subtitle, icon, color, size, position) values
    ('widget', 'help_now',       null, 'Aiutami adesso', 'Ti propongo una cosa da fare, subito.', 'sparkles', 'wine', 'lg', 10),
    ('widget', 'mood',           null, 'Come ti senti?', null, 'smile', 'blush', 'lg', 20),
    ('action', null, 'calm',         'Ho bisogno di calmarmi', 'Un posto morbido dove rallentare', 'flower', 'lilac', 'md', 30),
    ('action', null, 'breathe',      'Ho bisogno di respirare', 'Respira con me', 'wind', 'peach', 'md', 40),
    ('action', null, 'fear',         'Ho paura', 'Facciamo una cosa alla volta', 'shield-heart', 'wine', 'md', 50),
    ('action', null, 'need_adam',    'Ho bisogno di Adam', 'Gli arriva subito un avviso', 'heart-handshake', 'red', 'md', 60),
    ('action', null, 'distract',     'Voglio distrarmi', 'Giochi e piccole cose', 'gamepad', 'lilac', 'md', 70),
    ('action', null, 'talk',         'Voglio parlare', 'Scrivimi o parla con Adam AI', 'message-heart', 'blush', 'md', 80),
    ('action', null, 'see_adam',     'Voglio vedere Adam', 'Una foto, subito', 'camera', 'peach', 'md', 90),
    ('action', null, 'memories',     'Voglio ricordarmi di noi', 'Le nostre cose', 'book-heart', 'cream', 'md', 100),
    ('action', null, 'smile',        'Voglio sorridere', 'Una cosa leggera', 'laugh', 'peach', 'md', 110),
    ('action', null, 'ai_chat',      'Chatta con Adam AI', 'Puoi chiedermi qualsiasi cosa', 'bot-heart', 'wine', 'md', 120),
    ('action', null, 'surprise',     'Sorprendimi', 'Non sai cosa uscirà', 'gift', 'red', 'md', 130),
    ('widget', 'daily_surprise', null, 'Una cosa per te ♡', null, 'gift', 'blush', 'lg', 140),
    ('widget', 'countdown',      null, 'Manca poco', null, 'hourglass', 'lilac', 'lg', 150),
    ('widget', 'distance',       null, 'Torino ↔ Rosolina', null, 'map-pin', 'cream', 'lg', 160);
end if;
end $$;

-- ---------------------------------------------------------------------
-- Phrases
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.phrases) then
  insert into public.phrases (kind, text) values
    ('home', 'Respira. Non devi risolvere tutto adesso.'),
    ('home', 'Eccomi.'),
    ('home', 'Un passo alla volta.'),
    ('home', 'Ti ho lasciato questo piccolo posto.'),
    ('home', 'Qui puoi rallentare.'),
    ('home', 'Oggi basta anche solo esserci.'),
    ('home', 'Non devi essere forte per forza, qui.'),
    ('home', 'Ci sono, anche quando non mi vedi.'),

    ('good_morning', 'Buongiorno Vio ♡ Oggi si va un passo alla volta.'),
    ('good_morning', 'Buongiorno amore. Il primo pensiero di oggi era per te.'),
    ('good_morning', 'Sveglia, principessa del letto. Il mondo ti aspetta, ma può aspettare anche cinque minuti.'),
    ('good_morning', 'Buongiorno ♡ Qualsiasi cosa succeda oggi, stasera sarai ancora la mia persona preferita.'),

    ('mission', 'Bevi un bicchiere d''acqua appena puoi.'),
    ('mission', 'Apri la finestra e fai tre respiri d''aria fresca.'),
    ('mission', 'Mandami una foto del tuo cielo di oggi.'),
    ('mission', 'Scegli una canzone che ti mette di buon umore e ascoltala tutta.'),
    ('mission', 'Fai colazione con calma, anche solo cinque minuti.'),
    ('mission', 'Scrivi una cosa bella che vuoi che succeda oggi.'),

    ('good_night', 'Buonanotte Vio ♡ Hai fatto abbastanza per oggi.'),
    ('good_night', 'Chiudi gli occhi. Domani è un altro giorno, e io ci sarò.'),
    ('good_night', 'Lascia qui i pensieri pesanti. Per stanotte li tengo io.'),
    ('good_night', 'Sogna qualcosa di bello. Magari anche me.'),

    ('question', 'Qual è il ricordo più bello che abbiamo insieme?'),
    ('question', 'Dove vorresti andare con me la prossima volta?'),
    ('question', 'Cosa ti ha fatto sorridere oggi?'),
    ('question', 'Qual è la canzone che ti fa pensare a noi?'),
    ('question', 'Come sarebbe la nostra giornata perfetta?'),
    ('question', 'Qual è una cosa piccola che ti rende felice?'),
    ('question', 'Che film guarderemmo stasera sul divano?'),
    ('question', 'Cosa vorresti che facessimo insieme almeno una volta nella vita?'),

    ('roulette', 'Mandami un vocale di 10 secondi ♡'),
    ('roulette', 'Scegli tu il film della prossima serata insieme'),
    ('roulette', 'Scrivi tre cose che ti piacciono di te'),
    ('roulette', 'Fai una foto a qualcosa di bello e mandamela'),
    ('roulette', 'Inventa il nostro prossimo appuntamento'),
    ('roulette', 'Balla la tua canzone preferita per un minuto'),
    ('roulette', 'Chiamami e raccontami una cosa bella della tua giornata'),
    ('roulette', 'Abbraccia un cuscino per venti secondi, vale come mio'),

    ('hug', 'Chiudi gli occhi un secondo.'),
    ('hug', 'Immagina che ti stia abbracciando.'),
    ('hug', 'Stretta stretta. Non ti lascio.'),
    ('hug', 'Sono qui.'),

    ('breathing', 'Respira con me.'),
    ('breathing', 'Eccomi.'),
    ('breathing', 'Un respiro alla volta.'),
    ('breathing', 'Sono qui con te.'),
    ('breathing', 'Piano piano, va tutto bene.'),

    ('smile', 'Lo sapevi che le lontre marine si tengono per la zampa mentre dormono, per non allontanarsi? Un po'' come noi ♡'),
    ('smile', 'Scommetto che adesso stai sorridendo. Ho vinto io.'),
    ('smile', 'Un gruppo di fenicotteri si chiama "flamboyance". Tu da sola sei già una flamboyance.'),
    ('smile', 'Questa app contiene il 100% di amore e lo 0% di conservanti.'),
    ('smile', 'Le mucche hanno una migliore amica. Io ho te, quindi batto le mucche.'),
    ('smile', 'Se fossi un gatto passerei tutte e sette le vite con te.'),

    ('calm_end', 'Brava. Un passo alla volta. ♡'),
    ('calm_end', 'Ce l''hai fatta. Sono fiero di te. ♡'),

    ('da_adam', 'Da Adam ♡'),
    ('da_adam', 'Adam ha lasciato qualcosa per te.'),
    ('da_adam', 'Adam ha preparato questa sorpresa.');
end if;
end $$;

-- ---------------------------------------------------------------------
-- Dedications (10)
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.dedications) then
  insert into public.dedications (title, body, category, position) values
    ('Quando sei triste',
     E'Vio, se stai leggendo questa è perché oggi pesa un po'' di più.\n\nNon devi far finta di stare bene. Puoi essere triste, puoi piangere, puoi stare sotto le coperte. Io non me ne vado.\n\nLa tristezza passa, anche quando sembra di no. E quando passa, io sarò ancora qui.',
     'sad', 10),
    ('Una cosa che non ti dico abbastanza',
     E'Sei una delle cose più belle che mi siano mai successe.\n\nNon per quello che fai, ma per come sei: per come ridi, per come ti preoccupi per gli altri, per come riesci a rendere speciale anche una giornata normale.',
     'love', 20),
    ('Quando hai paura',
     E'Ok. Respira.\n\nLa paura è rumorosa, ma non ha sempre ragione. Non devi risolvere tutto adesso: basta il prossimo respiro, poi quello dopo.\n\nSe vuoi, scrivimi. Anche solo "ci sei?". Io ci sono.',
     'fear', 30),
    ('Quando ti senti sola',
     E'Anche se siamo lontani, non sei sola.\n\nOgni volta che apri questa app, è come se aprissi una porta su casa nostra. L''ho costruita pezzo per pezzo pensando a te.',
     'lonely', 40),
    ('Quando ti manco',
     E'Mi manchi anche tu. Tanto.\n\nConta i giorni con me: ogni giorno che passa è un giorno in meno alla prossima volta che ti abbraccio davvero.',
     'miss_me', 50),
    ('Per farti sorridere',
     E'Piccola lista di cose che mi fanno sorridere:\n\n- la tua voce quando sei appena sveglia\n- quando ridi per una cosa stupida e non riesci a smettere\n- tu, in generale\n\nOra tocca a te sorridere ♡',
     'smile', 60),
    ('Senza nessun motivo',
     E'Nessun motivo speciale.\n\nVolevo solo ricordarti che ti amo. Oggi, adesso, mentre leggi.',
     'no_reason', 70),
    ('Quando hai bisogno di amore',
     E'Ecco una dose di amore, da prendere tutta in una volta:\n\nSei amata. Sei importante. Sei abbastanza. Anche nei giorni storti. Soprattutto nei giorni storti.',
     'love', 80),
    ('Se oggi è stata una giornata no',
     E'Le giornate no esistono, e non sono colpa tua.\n\nStasera fai una cosa gentile per te: una doccia calda, una tisana, una serie che ti piace. Domani ricominciamo, insieme.',
     'sad', 90),
    ('Promemoria',
     E'Promemoria ufficiale, firmato e timbrato:\n\nqualunque cosa succeda, sono dalla tua parte.',
     'no_reason', 100);
end if;
end $$;

-- ---------------------------------------------------------------------
-- Comfort actions (20) for the Random Comfort Engine
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.comfort_actions) then
  insert into public.comfort_actions (title, text, category, duration_seconds, icon, cta_label, cta_action, weight) values
    ('Fai 10 respiri lenti', 'Inspira dal naso, espira piano dalla bocca. Contali uno per uno.', 'breathing', 90, 'wind', 'Respira con me', 'breathe', 9),
    ('Respira con il cuore', 'Segui il cuore che si allarga e si stringe. Solo quello.', 'breathing', 120, 'heart', 'Inizia', 'breathe', 7),
    ('Trova 5 cose blu', 'Guardati intorno e trova cinque cose blu. Dille a voce bassa, una alla volta.', 'grounding', 60, 'eye', null, 'none', 8),
    ('Appoggia i piedi a terra', 'Senti il pavimento sotto i piedi. Premi piano. Sei qui, sei al sicuro.', 'grounding', 45, 'footprints', 'Grounding guidato', 'grounding', 8),
    ('Gioca al 5-4-3-2-1', 'Un piccolo gioco con i tuoi sensi per tornare nel presente.', 'grounding', 180, 'hand', 'Iniziamo', '54321', 8),
    ('Bevi lentamente un bicchiere d''acqua', 'Piccoli sorsi. Senti il fresco che scende.', 'sensory', 60, 'glass-water', null, 'none', 7),
    ('Lavati il viso con acqua fresca', 'L''acqua fresca aiuta il corpo a rallentare. Poi asciugati con calma.', 'sensory', 60, 'droplets', null, 'none', 6),
    ('Abbraccia un cuscino', 'Stringilo forte per venti secondi. Vale come un abbraccio mio.', 'sensory', 20, 'heart-handshake', 'Voglio un abbraccio', 'hug', 7),
    ('Apri la finestra', 'Fai entrare un po'' d''aria. Tre respiri profondi guardando fuori.', 'movement', 60, 'sun', null, 'none', 6),
    ('Stirati come un gatto', 'Braccia in alto, poi giù piano. Muovi le spalle, il collo, le mani.', 'movement', 60, 'cat', null, 'none', 5),
    ('Fai due passi', 'Anche solo per la stanza. Conta dieci passi lenti.', 'movement', 120, 'footprints', null, 'none', 5),
    ('Guarda fuori dalla finestra', 'Scegli una cosa lontana e osservala per un minuto: colori, forme, movimenti.', 'distraction', 60, 'eye', null, 'none', 5),
    ('Fai un mini gioco', 'Distrai la mente per due minuti con un gioco leggero.', 'distraction', 120, 'gamepad', 'Gioca', 'games', 7),
    ('Chiedi qualcosa ad Adam AI', 'Una curiosità, una spiegazione, una chiacchiera. Quello che vuoi.', 'distraction', null, 'bot-heart', 'Apri la chat', 'ai_chat', 5),
    ('Scrivimi tutto quello che stai pensando', 'Non serve che abbia senso. Scrivi e basta, io leggo tutto.', 'writing', null, 'pen', 'Scrivi ad Adam', 'write_adam', 8),
    ('Scrivi nel tuo diario', 'Tiralo fuori dalla testa e mettilo sulla carta. Può restare privato.', 'writing', null, 'notebook', 'Apri il diario', 'journal', 5),
    ('Chiamami', 'Se ti va di sentire la mia voce, chiamami.', 'social', null, 'phone', 'Chiama Adam', 'call', 6),
    ('Apri una nostra foto', 'Guarda una foto di noi e ricordati com''era quel momento.', 'romantic', 30, 'camera', 'Fammi vedere noi', 'random_photo', 8),
    ('Leggi una dedica', 'Ho scritto delle cose per te. Aprine una a caso.', 'romantic', 60, 'mail-heart', 'Leggi', 'random_dedication', 8),
    ('Trova qualcosa che ti ricorda Adam', 'Un oggetto, un colore, una canzone. Tienilo vicino per un po''.', 'romantic', 60, 'sparkles', null, 'none', 6);
end if;
end $$;

-- ---------------------------------------------------------------------
-- Breathing presets (5)
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.breathing_presets) then
  insert into public.breathing_presets
    (name, description, inhale_seconds, hold_seconds, exhale_seconds, hold_after_exhale_seconds, rounds, visual, texts, is_default, position) values
    ('Respiro calmo', 'Il classico: inspira 4, trattieni 4, espira 6.', 4, 4, 6, 0, 8, 'heart', '{"Respira con me.","Eccomi.","Un respiro alla volta."}', true, 10),
    ('Respiro lento', 'Respiro regolare, dolce, senza pause.', 5, 0, 5, 0, 10, 'wave', '{"Piano piano.","Sei qui."}', false, 20),
    ('Respiro a quadrato', 'Quattro tempi uguali: aiuta a mettere ordine.', 4, 4, 4, 4, 6, 'flower', '{"Dentro.","Fermo.","Fuori.","Pausa."}', false, 30),
    ('Respiro lungo', 'Espirazione lunga per rilassarsi di più.', 4, 7, 8, 0, 4, 'sphere', '{"Lascia andare."}', false, 40),
    ('Respiro della buonanotte', 'Per prepararsi a dormire.', 4, 2, 8, 0, 6, 'orb', '{"Buonanotte Vio.","Sei al sicuro."}', false, 50);
end if;
end $$;

-- ---------------------------------------------------------------------
-- Grounding exercises
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.grounding_exercises) then
  insert into public.grounding_exercises (slug, title, description, icon, steps, end_text, position) values
    ('54321', '5-4-3-2-1', 'Un gioco con i sensi per tornare qui e ora.', 'hand',
     '[{"title":"5 cose che vedi","text":"Guardati intorno con calma.","count":5,"emoji":"👀"},
       {"title":"4 cose che senti o tocchi","text":"Il tessuto dei vestiti, il telefono, il pavimento...","count":4,"emoji":"🤲"},
       {"title":"3 suoni","text":"Vicini o lontani, anche piccolissimi.","count":3,"emoji":"👂"},
       {"title":"2 odori","text":"Se non ne senti, pensa ai tuoi odori preferiti.","count":2,"emoji":"🌸"},
       {"title":"1 cosa che ti fa sentire al sicuro","text":"Una persona, un posto, un ricordo.","count":1,"emoji":"💗"}]',
     'Sei qui. Va bene così. ♡', 10),
    ('piedi-a-terra', 'Piedi a terra', 'Radicarsi al pavimento, un passo alla volta.', 'footprints',
     '[{"title":"Siediti o resta in piedi","text":"Come stai più comoda."},
       {"title":"Senti i piedi","text":"Appoggiali bene a terra. Senti il peso che scende."},
       {"title":"Premi piano","text":"Spingi leggermente i piedi verso il pavimento per 5 secondi. Poi rilascia."},
       {"title":"Respira","text":"Tre respiri lenti, sentendo il pavimento che ti sostiene."},
       {"title":"Sei qui","text":"Il pavimento c''è. Tu ci sei."}]',
     'Brava. Sei qui, con i piedi per terra. ♡', 20),
    ('mani', 'Le mani', 'Tornare nel corpo attraverso le mani.', 'hand',
     '[{"title":"Strofina le mani","text":"Strofinale per 10 secondi finché diventano calde."},
       {"title":"Appoggiale","text":"Appoggia le mani calde sul petto o sulla pancia."},
       {"title":"Senti il calore","text":"Resta così per tre respiri."},
       {"title":"Apri e chiudi","text":"Apri e chiudi i pugni lentamente, cinque volte."}]',
     'Le tue mani sono qui. Anche tu. ♡', 30),
    ('stanza', 'La stanza', 'Descrivere lo spazio intorno per calmare la mente.', 'home',
     '[{"title":"Dove sei?","text":"Dì a voce bassa dove ti trovi."},
       {"title":"Che ore sono?","text":"Guarda l''ora e il giorno di oggi."},
       {"title":"Tre colori","text":"Trova tre colori diversi nella stanza."},
       {"title":"Una cosa morbida","text":"Tocca qualcosa di morbido e descrivila."}]',
     'Sei qui, adesso. È tutto ciò che conta. ♡', 40);
end if;
end $$;

-- ---------------------------------------------------------------------
-- Open When cards (6)
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.open_when_cards) then
  insert into public.open_when_cards (title, body, animation, cta_action, icon, color, position) values
    ('Aprimi quando ti senti sola',
     E'Non sei sola, Vio.\n\nMagari adesso non sono lì, ma sto pensando a te più spesso di quanto immagini. Se vuoi, premi il bottone qui sotto e scrivimi: rispondo appena posso.',
     'hearts', 'need_adam', 'heart', 'blush', 10),
    ('Aprimi quando ti manco',
     E'Anche tu mi manchi.\n\nChiudi gli occhi e pensa all''ultima volta che ci siamo abbracciati. Ecco: tienilo lì. Il prossimo arriva presto.',
     'stars', 'random_photo', 'moon', 'lilac', 20),
    ('Aprimi quando hai avuto una giornata terribile',
     E'Ok, oggi è andata male. Succede.\n\nNon devi aggiustare niente stasera. Doccia calda, pigiama, qualcosa di buono. Se vuoi raccontarmela, io sono qui ad ascoltare. Domani è un''altra pagina.',
     'petals', 'write_adam', 'cloud-rain', 'peach', 30),
    ('Aprimi quando vuoi sentirti amata',
     E'Sei amata. Non "un po''", non "a volte": sei amata e basta.\n\nPer come sei, anche nei giorni in cui non ti piaci.',
     'hearts', 'random_dedication', 'heart', 'wine', 40),
    ('Aprimi quando non riesci a dormire',
     E'Ciao nottambula.\n\nMetti giù il telefono tra poco, promesso? Prima però facciamo insieme qualche respiro lento. Buonanotte amore mio.',
     'stars', 'breathe', 'moon-star', 'lilac', 50),
    ('Aprimi quando vuoi sorridere',
     E'Pronta? Immagina me che provo a ballare. Male. Molto male.\n\nEcco, lo sapevo che sorridevi ♡',
     'petals', 'smile', 'laugh', 'peach', 60);
end if;
end $$;

-- ---------------------------------------------------------------------
-- Memories (5) — DRAFTS: Adam fills them with our real story
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.memories) then
  insert into public.memories (title, body, kind, is_published, position) values
    ('Il nostro primo appuntamento', 'Scrivi qui com''è andato il vostro primo appuntamento e aggiungi una foto. Poi pubblicalo.', 'date', false, 10),
    ('Il nostro primo viaggio', 'Dove siete andati? Cosa ricordi di più? Aggiungi data, luogo e foto.', 'trip', false, 20),
    ('Il nostro anniversario', 'La data in cui è iniziato tutto.', 'anniversary', false, 30),
    ('Il compleanno di Viola', 'Un ricordo di un suo compleanno insieme.', 'birthday', false, 40),
    ('Il nostro posto', 'Un luogo che per voi è importante.', 'place', false, 50);
end if;
end $$;

-- ---------------------------------------------------------------------
-- Countdown (1) — draft until Adam sets the real date
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.countdowns) then
  insert into public.countdowns (title, description, kind, target_at, icon, is_published, position)
  values ('Il nostro prossimo incontro', 'Ogni giorno è un giorno in meno.', 'meeting', now() + interval '14 days', 'heart', false, 10);
end if;
end $$;

-- ---------------------------------------------------------------------
-- Daily surprises (5)
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.daily_surprises) then
  insert into public.daily_surprises (kind, title, body, action, weight) values
    ('phrase', 'Una cosa vera', 'Oggi, come ieri e come domani: sono dalla tua parte. ♡', 'none', 5),
    ('question', 'Una domanda per te', 'Qual è la cosa più bella che ti è successa questa settimana? Mandamela.', 'write_adam', 5),
    ('exercise', 'Un minuto per te', 'Un minuto di respiro lento, solo per te.', 'breathe', 5),
    ('mini_game', 'Trova il cuore', 'Un piccolo gioco: riesci a trovare il cuore nascosto?', 'game_heart', 5),
    ('surprise', 'Fammi vedere noi', 'Una nostra foto, pescata a caso.', 'random_photo', 5);
end if;
end $$;

-- ---------------------------------------------------------------------
-- Quiz questions — DRAFT templates (only Adam knows the answers)
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.quiz_questions) then
  insert into public.quiz_questions (question, options, correct_index, explanation, is_active, position) values
    ('Qual è il mio cibo preferito?', '{"Pizza","Sushi","Carbonara","Tiramisù"}', 0, 'Modifica questa domanda con la risposta giusta.', false, 10),
    ('Dove ci siamo visti la prima volta?', '{"Opzione A","Opzione B","Opzione C"}', 0, 'Modifica questa domanda con la risposta giusta.', false, 20),
    ('Qual è la mia canzone preferita?', '{"Opzione A","Opzione B","Opzione C"}', 0, 'Modifica questa domanda con la risposta giusta.', false, 30);
end if;
end $$;

-- ---------------------------------------------------------------------
-- AI memory — one safe starter fact (edit freely)
-- ---------------------------------------------------------------------
do $$ begin
if not exists (select 1 from public.ai_memory) then
  insert into public.ai_memory (category, key, value, enabled, visible_to_viola) values
    ('nickname', 'Soprannome', 'Adam chiama Viola "Vio".', true, true);
end if;
end $$;
