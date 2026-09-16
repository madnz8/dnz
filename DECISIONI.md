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
| `release` | — | 3 copie identiche da eliminare, 2 varianti di repo da decidere |
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

## Aperti

- Il messaggio di chiusura nomina ancora il push come passo successivo dell'utente (non lo
  esegue). Se "levare il push" voleva dire non menzionarlo affatto, va tolto anche di lì.
