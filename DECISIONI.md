# Consolidamento dnz — registro delle decisioni

Staging del consolidamento dei comandi `/dnz:*`, oggi sparsi su 5 sedi (livello utente +
4 repo) in 14 file per 7 comandi distinti. Qui vivono le **versioni canoniche** man mano
che vengono consolidate, e le decisioni prese per arrivarci.

**Il contenitore finale non è ancora deciso.** Le opzioni restano due:

- **plugin locale `dnz`** via marketplace directory (stesso pattern già in uso per ECC in
  `~/.claude/plugins/known_marketplaces.json`) — questo repo diventa il plugin, serve solo
  aggiungere `.claude-plugin/plugin.json` e `marketplace.json`;
- **livello utente** — `commands/*.md` si copia in `~/.claude/commands/dnz/`.

Il layout **piatto** di `commands/` è scelto perché funziona per entrambe: in un plugin
chiamato `dnz`, `commands/merge.md` dà `/dnz:merge`; a livello utente lo stesso file dà
`/dnz:merge` una volta messo in `~/.claude/commands/dnz/`. Una sottocartella `dnz/` qui
dentro romperebbe il caso plugin (`/dnz:dnz:merge`).

## Principi trasversali

Valgono per **tutte** le skill consolidate, non solo per quella in cui sono emersi.

### Ticket: il tracker è una casistica, non un prerequisito

Non tutto il lavoro passa da un ticket Linear. Una skill può **usare** il ticket se c'è, ma
non deve **richiederlo**: niente passi che si bloccano, niente domande all'utente, niente
provenienze inventate quando il tracker non esiste o il lavoro non ha un'issue. Il passo che
dipende dal ticket si salta senza rumore.

Forma corretta: rilevare il tracker al passo di orientamento (Linear, Jira, GitHub Issues — o
nessuno), e rendere condizionale ogni passo che lo usa.

**Per ogni skill revisionata va dichiarato qui sotto se contiene riferimenti a Linear**, e se
sono compatibili con questo principio.

## Stato

| comando | canonico qui | note |
|---|---|---|
| `merge` | ✅ 2026-09-16 | push del default e cleanup del branch rimossi |
| `release` | ✅ 2026-09-16 | assorbe le 2 varianti di repo; ora pusha e pulisce i branch |
| `deferred` | — | divergenza sostanziale atala ↔ lifehacker |
| `squash-story` | — | divergenza sostanziale atala ↔ lifehacker |
| `ui-check` | — | orfano (solo atala): decidere se sale |
| `audit` | — | orfano (solo lifehacker): decidere se sale |
| `journal` | — | solo livello utente, nessun repo lo cita |

## Decisioni

### 2026-09-16 — `merge` non è deprecata

La copia di atala-portal portava frontmatter `"Deprecated: kept in use, no replacement
planned"` e un banner ⚠️ in testa; la copia a livello utente, identica per il resto, non li
aveva. **La skill non è deprecata**: il banner e il frontmatter di deprecazione spariscono.
Resta un `description:` in frontmatter — era l'unico file dei 14 ad averne uno, ed è quello
che fa comparire una descrizione nel picker `/`.

### 2026-09-16 — `merge` non pusha il branch di default

Il §3 (`git push origin <branch-di-default>`, con warning di conferma) **esce dalla skill**.
Il push sul default è il passo irreversibile e in molti repo fa partire un deploy: resta un
gesto dell'utente. La skill lascia il default **locale avanti e non pushato**, e lo dice nel
messaggio di chiusura.

Sparisce anche il bullet "Conseguenze del push" del §0, che esisteva solo per preparare il §3.

### 2026-09-16 — `merge` non cancella il branch di origine

Il §4 (`git branch -d` + `git push origin --delete`) **esce dalla skill**. Il branch
sopravvive al merge; se va cancellato, lo fa l'utente quando vuole.

Conseguenza sul §1: la precondizione su `/dnz:squash-story` diceva *"dopo il merge non c'è
più un branch da riscrivere"*, che ora è falso alla lettera. Riscritta tenendo il motivo
vero: il branch c'è ancora, ma il suo contenuto è già atterrato nel default, quindi
riscriverne la history non cambia più quello che la history del progetto racconta.

### 2026-09-16 — la chiusura del ticket resta, e avviene su un merge non pubblicato

Scelta consapevole: il ticket va a **Done** mentre il merge è ancora solo locale. Il passo 3
(ex 5) è l'unico non meccanico della skill — la logica sul ticket coperto solo in parte — e
si è preferito tenerlo dentro piuttosto che perderlo. Da rivedere se in pratica capita di
chiudere ticket per lavori che poi non vengono pushati.

### 2026-09-16 — `merge`: riferimenti a Linear conformi, nessuna modifica

Un solo riferimento reale, al §0, e Linear compare come **uno di tre esempi** in una lista di
tracker possibili: *"c'è un tracker (Linear, Jira, GitHub Issues)?"*. Le altre occorrenze della
stringa sono la parola italiana "lineare" nel sanity check del merge.

Il passo che dipende dal ticket è già condizionale in tutti i punti dove serve:

- §0: *"Se non lo trovi, il passo 3 semplicemente non si fa: non si inventa un ticket per avere
  qualcosa da chiudere."*
- §3, titolo: *"(solo se ce n'è uno)"*, e prima riga: *"Salta questo passo senza rumore se al
  passo 0 non hai trovato né tracker né ticket."*
- formato del messaggio di merge: *"Se non ce ne sono, si omette la parentesi — non si inventa."*

**Conforme al principio. Nessuna modifica necessaria.**

### 2026-09-16 — audit Linear sui 14 file: il problema è solo in `squash-story`

Linear compare **solo** in `merge` e in `squash-story`. Le altre cinque skill (`release`,
`deferred`, `ui-check`, `audit`, `journal`) non lo nominano mai.

In `squash-story` il riferimento **non** è conforme, in entrambe le varianti:

- **atala-portal**, righe 75 e 77: *"Si usa il ticket Linear dell'epic"* e soprattutto *"vale
  sempre il caso 2: il ticket Linear del lavoro. **Se non esiste nemmeno quello, fermati e
  chiedi**"* — la skill si blocca proprio nel caso da supportare;
- **lifehacker**, riga 79: *"quando una story singola non esiste **ed esiste un ticket
  Linear**"* — più morbido, ma il ramo "nessun ticket" non è scritto.

Entrambe hardcodano anche il prefisso di team `RAW-xx`, che è di Linear e di quei due repo.

### 2026-09-16 — `release`: le tre varianti convergono, la generica le assorbe

Scheletro **identico** nelle tre: precondizioni → diff dall'ultimo tag → bump SemVer → changelog →
dry-run come gate → applica → pulizia. I tre comandi git del passo "leggi cosa è cambiato" sono
letteralmente gli stessi tre, nello stesso ordine, in tutti e tre i file.

Le differenze stanno in due punti soli — **quanti changelog** (1 tecnico in lifehacker, 2 in
trasformazione, rilevato nella generica) e **qual è il comando che applica** — cioè esattamente le
due cose che il §0 della generica sa già scoprire da sé. Tutto il resto sono **fatti del repo**, non
della skill, e vanno nel `CLAUDE.md` del repo: il deploy Vercel sul push, la shape `ReleaseContent`
di `scripts/release-apply.ts`, i report di review tracciati in lifehacker e in `.gitignore` in
trasformazione (precondizioni opposte, e giustamente opposte).

Drift nell'altra direzione, che la consolidazione **recupera**: le due specifiche avevano perso il
§7 sulla release a metà (*"un tag doppio è più fastidioso di una release rimandata di un'ora"*) e
l'avviso sui changelog multipli — che manca proprio a trasformazione, che di changelog ne ha due.

### 2026-09-16 — `release` è il punto dove il lavoro diventa pubblico

Conseguenza diretta della decisione su `merge`: se `merge` non pusha, il default locale accumula
merge e qualcuno deve pubblicarli. È `release`.

- La precondizione "`main` allineato col remoto" era sbagliata nel nuovo assetto: il `pull --ff-only`
  serve a **prendere**, non a pretendere allineamento. Il default locale avanti è la norma, ed è il
  materiale del rilascio.
- Il §2 mostra anche `git log origin/<default>..HEAD`, **con i nomi dei branch**: al passo 5 l'utente
  deve sapere che sta pubblicando lavoro finora esistito solo sulla sua macchina.

### 2026-09-16 — pulizia dei branch morti dentro `release`, dopo il tag

Nuovo §8. Sta **dopo** il passo 6 di proposito: un branch mergiato prima del rilascio è dentro il
rilascio appena fatto, quindi pushato e taggato — cancellarlo non perde niente. Cancellarlo prima
vorrebbe dire cancellarlo mentre esiste solo in locale. Per lo stesso motivo il §7 dice che su una
release a metà il §8 **non si fa**.

Due categorie tenute rigidamente separate:

- **mergiati** — sicuri, `git branch -d` (mai `-D`: il rifiuto di `-d` è la rete di sicurezza), una
  conferma sola per tutto il gruppo;
- **non mergiati fermi da oltre 60 giorni** — non sicuri, `-D`, conferma **branch per branch**, con
  data, numero di commit unici e SHA stampato prima di cancellare.

Soglia **60 giorni** e ambito **locale + remoto con conferme separate** (decisi il 2026-09-16). Il
remoto ha una conferma sua perché il reflog non lo copre: un branch cancellato su `origin` si
recupera solo se qualcuno ha ancora lo SHA.

Mai toccati: default, branch corrente, branch con PR aperta, branch in un worktree, branch di
manutenzione (`release/*`, `hotfix/*`, `v1.x`) — vecchi per costruzione, non morti.

### 2026-09-16 — `release`: nessun riferimento a Linear

Zero occorrenze di Linear o Jira in tutte e tre le varianti. L'unica occorrenza di "ticket" era la
riga *"non tocca branch, non fa merge, non chiude ticket"*, riscritta in *"non fa merge, non chiude
ticket"* perché da adesso i branch li tocca. **Conforme.**

## Aperti

- Il messaggio di chiusura nomina ancora il push come passo successivo dell'utente (non lo
  esegue). Se "levare il push" voleva dire non menzionarlo affatto, va tolto anche di lì.
- Con `merge` che non pusha e `release` che pusha, il lavoro mergiato ma non rilasciato resta sulla
  macchina a tempo indefinito. Va bene se ogni merge finisce in un rilascio ragionevolmente vicino;
  se invece capita di accumulare merge per settimane senza rilasciare, serve un modo per pubblicare
  senza rilasciare — oggi non c'è.
