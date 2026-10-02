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
| `release` | ✅ 2026-09-16 | assorbe le 2 varianti; pusha, pulisce i branch, §4b sulle Novità |
| `deferred` | ✅ 2026-09-28 | due mondi: con lo script di auto-bmad lo guida, senza fa il triage sul posto |
| `squash-story` | ✅ 2026-09-16 | criterio unificato sull'appartenenza; provenienza opzionale |
| `ui-check` | ✅ 2026-09-22 | sale; il §1 era conoscenza di macchina, non di repo |
| `audit` | ✅ 2026-09-22 | sale; metodologia separata dai fatti di lifehacker |
| `journal` | ✅ 2026-09-22 | sale invariato; la più generale delle sette |

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

### 2026-09-16 — il changelog "Novità" ha regole sue, e può restare vuoto

Misurato su `docs/changelog/changelog.json` di atala: 150 voci, **media 41 parole a voce**, mediana
32, massimo 136, il **30% sopra le 50 parole**. Una voce di annuncio dovrebbe essere una riga.

La causa non sono le parole: quel file fa **quattro lavori insieme** — annuncio, spiegazione
tecnica (*"era un pezzo di libreria non copiato sul server"*), nota di supporto (*"basta un
Ctrl+Shift+R"*) e giustificazione del lavoro svolto (v0.49.0 si intitola *"Nessun cambiamento nel
portale"*). Solo il primo è una novità. Caso limite: v0.50.0 annuncia in 100 parole un automatismo
**spento**, v0.50.1 dice che non funzionava, v0.51.0 che è acceso — tre versioni della stessa cosa
prima che esista.

Regole scritte nel §4b: una riga, ~20 parole, cosa puoi fare adesso o cosa non ti succede più;
fuori lo spento, la causa tecnica, il supporto, il lavoro interno e le frasi che dicono che non è
cambiato niente; un bugfix entra solo se l'utente aveva visto il problema; categorie ridotte a tre
(`Nuovo`/`Migliorato`/`Corretto`, oggi sono dieci con `Aggiunto`/`Nuovo` e
`Miglioramento`/`Migliorato` doppioni).

**Quando non resta niente, la versione compare lo stesso** — numero e data, senza titolo e senza
voci — così l'elenco non ha buchi. Verificato che non serve toccare `changelog.ts`: l'API di atala
valida `title: z.string()`, e la stringa vuota passa. Resta da vedere come il popup renderizza un
titolo vuoto: è lavoro della sessione di atala.

### 2026-09-16 — `squash-story`: le due varianti erano in conflitto, non solo adattate

A differenza di `release`, qui c'è un **conflitto di regola**, non un adattamento:

- **atala** raggruppa **per appartenenza**: un fix di review della story 4.2 va nel commit della
  story 4.2, *"che l'abbia scritto la pipeline o una persona tre giorni dopo"*;
- **lifehacker** ha una regola dura opposta: *"i fix scritti a mano DOPO la chiusura non si fondono
  mai"*, perché **spesso** toccano un'altra epica.

Vince **l'appartenenza**. La regola di lifehacker è una *proxy* di quella di atala — "scritto a mano
dopo" ≈ "probabilmente appartiene ad altro" — e la proxy sbaglia proprio nel caso che atala
prevede: un fix a mano che ricade tutto sulla story corrente. I due segnali di lifehacker (assenza
di `(iter N)` nel subject, convenzioni del repo già rispettate) restano, **declassati a euristica di
riconoscimento**: indizi che quel commit va guardato, non la regola che decide.

**Tenuto da lifehacker** perché più preciso: la misura dei commenti di riga
(`gh api …/pulls/<N>/comments --jq 'length'`) con la distinzione fra commenti di riga e commenti a
livello di PR — solo i primi sono hard-stop; l'avvertenza sulla divergenza story/epica dopo un
`finalize` caveated; la nota GateGuard completa (8 blocchi misurati in una sessione); l'esclusione
dei test che scrivono su servizi veri, generalizzata da `test:rls`.

**Tenuto da atala:** lo skip esplicito del passo 5 quando non ci sono file di story, la derivazione
di `{key}` dal nome del branch, e la formulazione generale dell'intro.

**Generalizzato:** nuovo §0 "Orientati" come in `merge` e `release` (branch di default, comando di
verifica, tracker, presenza di una pipeline); `main` non più hardcoded nel `merge-base`;
`madnz8/lifehacker` sostituito da `gh repo view --json nameWithOwner`.

Verificato oggi: `gh 2.46.0` è ancora la versione in uso, quindi l'avvertenza su `gh pr edit` regge.

### 2026-09-16 — `squash-story`: la provenienza diventa opzionale (fix Linear)

Era il punto non conforme al principio trasversale. atala si **fermava e chiedeva** quando non
trovava un ticket Linear; lifehacker aveva già un terzo livello `(epic N)` ma nessun ramo per
"niente di niente".

Ora i livelli sono quattro, in ordine di specificità: `(Story N.M)` → `(<TICKET>)` dal tracker
rilevato al passo 0, qualunque esso sia → `(epic N)` → **niente, e si omette la parentesi**. Con il
divieto esplicito di fermarsi a chiedere e di inventare: *"un messaggio senza parentesi è corretto;
una provenienza inventata è un puntatore falso che qualcuno seguirà"*. Stessa forma della regola già
presente in `merge` per il ticket.

### 2026-09-16 — scoperta in corso d'opera: GateGuard legge dentro gli heredoc

Scrivere questo file con `cat > file <<EOF` è stato bloccato due volte: il contenuto documenta
comandi distruttivi (`rm -f`, cancellazione di branch) e il gate li intercetta **come testo**, pur
non eseguendoli. La via che passa è il tool di scrittura file. Annotato nella nota GateGuard del §5,
perché capita esattamente a chi sta scrivendo procedure come questa.

### 2026-09-22 — i fix di review restano separati, e la ragione non è quella che sembrava

Correzione della decisione del 2026-09-16: vince la regola di **lifehacker**, non quella di atala. I
fix scritti dopo la chiusura non si fondono nel `feat` — si collassano **fra loro**, in uno o due
commit: uno di default, due quando si dividono nettamente per area o natura.

La ragione decisiva non è "la review è la cosa più interessante", ma un'asimmetria: **la vista a
grana grossa esiste già gratis, quella fine no.** `/dnz:merge` fa `git merge --no-ff`, quindi
`git log --first-parent` sul default mostra già un nodo per branch, fix inclusi e invisibili — e il
revert avviene sul merge commit (`git revert -m 1`), non sui singoli. Tenere separati non costa
niente nella vista di sintesi, mentre fondere distrugge per sempre l'altra. **Fondere dopo si può,
sfondere mai.**

Prezzo accettato consapevolmente: `git blame` su una riga corretta in review atterra sul commit di
fix, non sul `feat`. Mitigato dalla provenienza nel messaggio, che diventa funzionale e non
decorativa.

### 2026-09-22 — `merge` e `squash-story` restano due skill, con un rilevamento

Non si fondono. `squash-story` è l'operazione pericolosa (riscrive la history, force-push, gate, due
rebase), `merge` no: unirle darebbe una skill di 13 passi in cui la parte rischiosa non si può né
saltare né lanciare da sola, e un conflitto a metà rebase lascerebbe un merge in sospeso. In più
`squash-story` gira legittimamente **a metà branch**, story per story su un epic lungo — caso che
una skill unica perderebbe, ed è quello in cui vale di più.

Il costo della separazione è ricordarsi di lanciarla, e si paga con un controllo: `merge` §1 ora
**conta** i commit e cerca i subject di impalcatura invece di dare per fatta la pulizia, e se trova
roba propone `/dnz:squash-story` e si ferma. Col nuovo `merge` quella è davvero l'ultima occasione.

### 2026-09-22 — il rename del branch entra in `squash-story`

Il nome finisce nella history permanente: `merge branch '<nome>'` nel commit di merge, sul default.
La sua scadenza è quindi il merge, e la sede naturale è la skill che gira subito prima ed è già
quella che rende leggibile la history. In `merge` resta solo un rimando.

Passo **opzionale**, da proporre solo se il nome è muto o fuorviante, e da eseguire **prima del
backup** del passo 1, così il branch di backup nasce già col nome nuovo.

⚠️ Con una PR aperta non si rinomina con git: rinominare in locale, togliere il vecchio branch dal
remoto e pushare il nuovo **chiude la PR**. Si usa l'API di rename di GitHub, che ritargheta le PR
aperte. **Non misurato** — a differenza dell'avvertenza su `gh pr edit`, è documentazione GitHub, e
nella skill è marcato come da verificare alla prima esecuzione.

### 2026-09-22 — `deferred`: convergono, ma è l'unica skill non universale

lifehacker è un adattamento dichiarato di atala, con la tabella dei delta in fondo: procedura,
regole ferree e trappole sono le stesse parola per parola. Le differenze sono tutte **fatti del
repo** — marcatore legacy `[RISOLTO …]` presente solo in lifehacker, consegna (commit diretto in
atala, branch+PR obbligatori in lifehacker), regola sui dati sensibili (PII con hook vs
log-hygiene), comando di non-regressione, famiglie di non-lavoro ricorrenti. Tutte rilevabili, e
infatti il nuovo §0 le rileva.

**Recuperato contenuto che lifehacker aveva compresso via:** le tre famiglie di lavori da scartare
nel piano (refactor a conteggio, lavoro da accorpare altrove, pulizia senza destinatario), il
difetto storico `"moved": 0` — *"un passo che tace è indistinguibile da un passo che non gira"* — e
il caso reale del tool che vorrebbe archiviare una voce con la decisione chiusa ma la verifica no.

**La differenza di natura rispetto alle altre tre.** `merge`, `release` e `squash-story` sono
operazioni git: esistono ovunque. `deferred` fa triage di un **artefatto di auto-bmad**: in un repo
senza `_bmad-output/` non ha niente da fare. Consolidarla ha senso lo stesso (un file invece di due
che divergono), ma va scritto in faccia — c'è un riquadro in cima che lo dice, e le precondizioni la
fermano da sole. Riguarda 2 repo su 7, non tutti.

Generalizzati anche i percorsi: registro, archivio e script si rilevano al passo 0 invece di essere
scritti dentro i comandi. Numerazione dei passi allineata alle altre skill (§0 Orientati, poi 1-7).

### 2026-09-22 — `deferred`: nessun riferimento a Linear

Zero occorrenze di Linear, Jira o ticket in entrambe le varianti. La skill lavora su voci di
registro con id propri, non su issue di un tracker. **Conforme, nessuna modifica.**

### 2026-09-22 — i tre orfani salgono tutti, per ragioni diverse

**`journal`** sale invariato: è la più generale delle sette e l'unica che serve anche **fuori** da un
repo di codice. Unica aggiunta, un riquadro sul rapporto con la memoria dell'agente — si somigliano e
non sono la stessa cosa: la memoria tiene fatti atomici e durevoli validi per ogni progetto, il
diario tiene la cronologia di questo. Una decisione superata esce dalla memoria e **resta** nel
diario, con la data.

**`ui-check`** sale, e guadagna più di tutte, perché **il suo §1 non era conoscenza di atala: era
conoscenza di questa macchina.** Chromium installato via Playwright, wrapper in `~/.local/bin/`,
symlink su `/opt/google/chrome/chrome`, e il fatto che `chmod +x` e `sudo ln` vengano bloccati
quando li esegue l'agente e vadano passati all'utente col prefisso `!`. Setup fatto una volta su
rings il 2026-08-26 e sepolto nel repo di un progetto, dove nessun altro repo l'avrebbe mai trovato.
Generale anche il §5: mai allegare binari a un commento PR via `gh` (l'endpoint non esiste), mai
pushare screenshot in un branch vero per ottenere un link raw. Spostati nel §0 i fatti di atala:
porta 3001, `AUTH_URL` hardcoded sulla 3000 che manda l'autenticazione in loop di redirect,
dev-login, regole sui dati dei meditatori — generalizzati come "la variabile che dichiara l'URL
dell'app", che è la trappola vera e vale per qualunque framework.

**`audit`** sale col lavoro più grosso: scheletro generale (delta-first, baseline misurata invece che
assunta, finding precedenti ri-verificati uno per uno, sezione **FALSI ALLARMI** — *"è la sezione che
ripaga il costo dell'audit"*, divieto di refactor durante l'audit) separato dalla carne di lifehacker
(`npm run typecheck`, l'endpoint health, `zod/v4`, RLS/GUC/consent, `saas-readiness-ledger.md`).
L'argomento decisivo lo diceva il file stesso: *"In atala-portal non esiste un comando
equivalente"* — eppure atala ha già 15+ report in `.claude/reviews/`, quindi l'audit lo fa a mano,
senza metodo scritto.

### 2026-09-22 — i tre orfani: nessun riferimento a Linear

Zero occorrenze di Linear, Jira, ticket o issue in tutti e tre i file. **Conformi.** Con questo
l'audit Linear copre tutte e sette le skill: il problema era solo in `squash-story`, ed è risolto.

### 2026-09-22 — consolidamento completo: come si divide la collezione

Sette skill, tre fasce per presupposti:

- **universali (4)** — `merge`, `release`, `squash-story`, `journal`: funzionano in qualunque repo, e
  `journal` anche fuori da un repo;
- **richiedono una pipeline con registro su disco (2)** — `deferred`, `audit`: oggi 2 repo su 7;
- **richiede un'app con interfaccia (1)** — `ui-check`.

Questo risolve anche il dubbio sul contenitore: **una sede unica va bene per tutte**, perché le tre
della seconda e terza fascia si fermano da sole quando i presupposti mancano. Non serve installare
sottoinsiemi diversi per repo diversi.

### 2026-09-25 — `audit`: il piano è uno solo, quello di `deferred`

Difetto introdotto consolidandole separatamente: `audit` lancia `deferred` al §3, che scrive il suo
piano; poi `audit` scriveva la propria sezione "interventi per priorità". **Due documenti che dicono
cosa fare, prodotti a dieci minuti di distanza**, destinati a divergere al primo aggiornamento — e
da lì in poi nessuno sa quale vale.

Risolto: il report di `audit` **rimanda** al piano dei rinvii e contiene solo ciò che quel piano non
può sapere (finding di codice, test, configurazione, infrastruttura). Se quei finding meritano batch
loro, si aggiungono al piano dei rinvii, non a un secondo elenco.

### 2026-09-25 — `audit` §2: il diff si delega, la lettura integrale no

Prima formulazione mia, sbagliata a metà e corretta dall'utente: non si presume che ci sia stata una
code review prima dell'audit. Il §2 ora fa **due letture diverse e non ridondanti**:

- **il diff**, delegato a `/code-review` sul range del delta — meglio di quanto questa pagina possa
  descrivere, e senza presupporre niente su cosa sia successo alla PR;
- **la lettura integrale dei file**, che un diff strutturalmente non può dare: una regola violata in
  un file che nessuno tocca da mesi, un indice mai aggiunto, una convenzione scivolata via un commit
  alla volta. *"Chi salta la lettura integrale ha fatto una code review in ritardo, non un audit."*

### 2026-09-25 — `merge` chiede come chiudere, e questo risolve due punti aperti

Il §4 non è più un messaggio di commiato ma **una domanda con tre opzioni**: pusho adesso / lancio
`/dnz:release` / mi fermo. La skill non pusha di propria iniziativa — pusha solo se viene scelta
l'opzione 1.

Chiude entrambi i punti che erano in sospeso: il push non è più "menzionato" ma una scelta
esplicita, e **l'opzione 1 è il modo di pubblicare senza rilasciare**, che era esattamente quello che
mancava quando si accumulano più merge prima di un rilascio.

### 2026-09-25 — via la rinomina del branch: il messaggio di merge la rende inutile

Revoca della decisione del 2026-09-22, dopo la domanda dell'utente. Il conto non torna: **il nome
del branch lascia un segno permanente in un posto solo, il subject del merge commit — e quel
messaggio lo scriviamo noi.** Il formato ora rende il nome **facoltativo**: quando è muto, al suo
posto va una descrizione di cosa è atterrato (`merge(alloggiati): ricevute di deposito dalla
Questura`). Costo zero, rischio zero.

Rinominare invece cancella e ricrea il ref, quindi rompe tutto ciò che è agganciato al nome — filtri
di branch in CI, regole di protezione, preview di deploy — e l'API che ritargheta le PR non era mai
stata misurata. Sezione rimossa da `squash-story` (32 righe), rimando rimosso da `merge`.

### 2026-09-25 — la CI riparte dopo lo squash, e `[skip ci]` non è la risposta

Il force-push emette `push` e `pull_request.synchronize`: la pipeline riparte, e non si evita
pulitamente.

`[skip ci]` funziona solo nel messaggio del **commit di testa**, che dopo lo squash è il commit di
story — quello che resta per sempre: ci si infilerebbe un'istruzione per la CI, cioè l'archeologia
di processo che la skill esiste per togliere. Peggio: saltando il run, l'ultimo verde della PR resta
agganciato ai commit pre-squash che non esistono più, e **su un repo con status check obbligatori
una PR il cui commit di testa non ha check non si può mergiare**.

Quello che si fa: `concurrency: cancel-in-progress` per non pagarlo due volte, e sapere che il run è
**ridondante per costruzione** — il gate ha appena dimostrato che l'albero è identico, quindi un
rosso lì è un flake, non una regressione.

### 2026-09-25 — il contenitore è un plugin via marketplace, non copie nei repo

Prima ho sbagliato strada e va scritto perché, così non ci si ricasca. Quando l'utente ha detto
"le voglio sul progetto per usarle anche da Claude web", **ho dato per scontato che una sessione web
non veda i plugin installati** — non l'ho verificato né chiesto — e ho riprogettato la distribuzione
come copie generate nei repo da uno script di sync. Quella soluzione ha un difetto che l'ipotesi non
vedeva: **non si installa su un'altra macchina.** Dipende da una cartella che esiste solo su rings.

Il repo `dnz` è ora **esso stesso un marketplace**: `.claude-plugin/marketplace.json` più
`.claude-plugin/plugin.json`, sullo schema del marketplace ECC già funzionante su questa macchina.
Installazione su qualunque macchina:

```
/plugin marketplace add <owner>/dnz
/plugin install dnz@dnz
```

I nomi dei comandi non cambiano — un plugin `dnz` con `commands/merge.md` dà `/dnz:merge`, identico
a prima. Versione `1.0.0`, aggiornamenti con `/plugin update dnz`.

`sync.sh` rimosso: resta nella history se dovesse servire. **Non si mantengono due canali di
distribuzione in parallelo per coprire un dubbio** — è il modo più rapido per tornare ad avere due
versioni che divergono, cioè il problema da cui siamo partiti.

**Resta da verificare** se Claude web veda i plugin installati. Se non li vedesse, lì i comandi non
comparirebbero e servirebbe un secondo canale — ma si prova prima di costruirlo.

**Prerequisito non ancora fatto:** `~/workspace/dnz` non ha un remoto. Perché il marketplace sia
raggiungibile da altre macchine il repo va pubblicato su GitHub (privato), ed è una decisione
dell'utente.

### 2026-09-25 — formato skill, non comandi

Verificato sulla documentazione: *"Custom commands have been merged into skills. A file at
`.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy`
and work the same way."* Non deprecati, **assorbiti** — e per il lavoro nuovo la raccomandazione è
esplicita: *"Prefer a skill for new work, since skills also support supporting files."*

Confermato dagli altri: **ECC** ha 281 skill contro 94 comandi, e il suo manifesto li chiama *"94
legacy command shims"* — quelli rimasti sono dispatcher di tre righe con `agent:` e `subtask: true`,
non procedure. **BMAD** ha 57 skill e zero comandi in quella forma, e le sue skill sono **cartelle**:
`bmad-quick-dev/` ha `SKILL.md` più nove file di supporto.

Convertite tutte e sette in `skills/<nome>/SKILL.md`, con `name` nel frontmatter (mancava; ECC e
BMAD ce l'hanno sempre). `plugin.json` passa da `commands` a `skills`, versione **2.0.0**. I nomi
non cambiano: `/dnz:merge` resta `/dnz:merge`.

**Politica di invocazione, decisa una per skill** — è la cosa che cambia davvero il comportamento:
`disable-model-invocation: true` su `merge`, `release` e `squash-story`, che pushano, rilasciano o
riscrivono history e devono partire solo se le digiti. Default aperto su `journal`, `audit`,
`deferred`, `ui-check` — `journal` in particolare per sua natura vuole accendersi quando la
conversazione lo merita, non solo quando te lo ricordi.

### 2026-09-25 — `squash-story` adotta il metodo di `dnz-squash`: si ri-partisce l'albero finale

**Rovescia la decisione del 22 sui fix separati.** Scoperta `dnz-squash` in `subtxt` — una skill che
il censimento iniziale aveva mancato perché cercava solo dentro `commands/` — e il suo metodo è
diverso: invece di aggregare i commit esistenti con un rebase, fa `git reset --mixed <base>` e
ricostruisce committando **gruppi di file**.

Ho detto a prima vista che era "probabilmente migliore su branch senza story": era un'ipotesi
inventata per spiegare perché esistesse, e falsa — subtxt usa BMAD come gli altri. Erano due metodi
per la stessa situazione.

**Vince ri-partire l'albero finale**, e l'argomento decisivo è che `squash-story` enunciava già quel
principio nella propria riga d'apertura — *"deve vedere cosa è stato fatto, non i passi con cui ci
si è arrivati"* — e poi non lo applicava ai fix. Una correzione fatta prima del merge **non è mai
esistita nel prodotto**: registrarla come commit a sé è archeologia di processo. E si paga su
`git blame`, la query più frequente e l'unica che ha solo git come fonte: su una riga corretta in
review si atterrava su `fix(area): review integrata`, che parla del processo invece che del codice.

Il mio argomento del 22 — "i commit di fix dicono cosa la review ha trovato" — era più debole di
come l'avevo presentato: **quell'informazione ha già una casa** (la PR, i commenti, i report in
`.claude/reviews/`), mentre *perché questa riga è fatta così* ha solo git. Avevo difeso la fonte
ridondante a spese di quella unica.

**Portato dentro da `squash-story` ciò che `dnz-squash` non aveva:** il gate sui commenti di riga
aperti, la precondizione sui merge dentro il branch (ricostruendo da `$BASE` ti attribuiresti le
modifiche del default), la tassonomia della provenienza con il livello "niente", il riallineamento
della PR con l'avvertenza su `gh pr edit`, la nota sulla CI e `[skip ci]`.

**Portato da `dnz-squash`:** il metodo, il gate sul raggruppamento (*"il raggruppamento è la
decisione che l'utente ti sta delegando"*), e la trappola dello «Squash and merge» dalla UI di
GitHub, che rimette tutto in un commit solo e vanifica il lavoro.

**Aggiunto, che nessuna delle due aveva:** `git add -p` per dividere un file fra due gruppi — la
regola *"un file non si divide"* di `dnz-squash` era una semplificazione, non un limite di git.

**Semplificazione grossa che il metodo nuovo regala:** `baseline_commit` non si ripara più dopo con
un secondo rebase a fermate `edit` — si **scrive giusto** mentre si ricostruisce. Via ~70 righe,
incluso il workaround per `--amend` bloccato da GateGuard.

**Da fare:** ritirare `dnz-squash` da subtxt.

### 2026-09-28 — il plugin non si vede da Claude web

Provato: **no.** Quindi plugin e file nel repo non sono alternative ma canali per posti diversi — il
plugin copre le macchine, solo i file committati arrivano al web. Tre strade, nessuna ancora scelta:
copiare le skill nei repo generandole dalla fonte; dichiarare marketplace e plugin nel
`settings.json` di progetto (da provare, e il repo e' privato: il web dovrebbe poterlo clonare);
oppure accettare che da web non ci siano.

⚠️ Se si copiano nei repo: **il prefisso `dnz:` lo da' il plugin, non la cartella.** Una skill in
`.claude/skills/merge/` si chiama `/merge`. Le uscite sono chiamarle `dnz-merge` eccetera, o restare
su `.claude/commands/dnz/*.md` che il prefisso lo da' ma e' il formato vecchio.

### 2026-09-28 — `deferred`: due mondi, non due formati — e niente script

Partiti dal feedback di subtxt («la skill presume auto-bmad, qui non c'e'»). Il censimento ha
mostrato che il quadro e' diverso da come il feedback lo descriveva:

| | atala | lifehacker | subtxt |
|---|---|---|---|
| script `deferred_ledger.py` | 1761 righe | **963 righe** | assente |
| capisce le voci `source_spec` | si | **no** | — |
| voci ricche nel registro | 18 | 8 | 98 |
| marcatori di chiusura | 25 | 18 | **0** |

**Le due copie dello script upstream divergono**: "ho trovato `deferred_ledger.py`" non dice cosa sa
fare. Quella di lifehacker non ha `SOURCE_SPEC_BULLET_RE` ne' `extract_fields` ne' `harvest`.

**Il rischio di perdita dati non c'e'**: il ciclo che delimita le voci lavora sull'indentazione, non
sui nomi dei campi, quindi una voce multi-riga resta intera anche dove lo script non la
*interpreta*. E' degrado (quelle voci risultano sempre `open`), non corruzione.

**Verificato di chi sono le cose**, ed e' il punto che cambia il disegno:

- `deferred-work.md` e' di **BMAD**: in subtxt lo scrivono `bmad-build` e `bmad-code-review`, con
  l'istruzione testuale *"append one new entry … Do not modify existing entries or look for
  duplicates"*. **Nessun passo lo rilegge.**
- `deferred-work-resolved.md` — l'archivio — e' **solo di auto-bmad**: nessuna skill `bmad-*` lo
  nomina, e in subtxt non esiste.

Quindi **in subtxt quel file e' una casella di posta in entrata, non un registro**: 98 voci e zero
marcatori non perche' nessuno le abbia chiuse, ma perche' non e' mai esistito un meccanismo per
farlo. Portarci il triage non e' "adattarsi a un secondo formato": e' **portare una pratica dove non
c'era**.

Due conseguenze che semplificano:

1. **I marcatori li' non sono un contratto con nessuno.** La spunta in testa, il `(remainder)` in
   inglese: servono a far funzionare `classify_hint`. Senza parser sono cargo cult — basta essere
   coerenti per la passata dopo.
2. **L'archivio li' sarebbe una nostra invenzione.** Esiste in auto-bmad per tenere piccolo il file
   che il suo script ri-parsifica. Senza parser, tenere le voci chiuse al loro posto e' legittimo —
   e probabilmente giusto, visto che BMAD dice di non toccare le voci esistenti: marcarle e' gia' al
   limite, spostarle lo supera.

**Niente script nel plugin.** Non per ripensamento: **cade il lavoro che avrebbe dovuto fare** —
niente archivio da riempire, nessun parser da proteggere. Resta il triage vero, che non dipende da
nessuno strumento.

**Da fare (punto 2, non ancora iniziato):** il §0 di `deferred` deve capire **in quale dei due mondi
si trova**, perche' sono due comportamenti diversi e non due percorsi per lo stesso. Le precondizioni
vanno separate — "il registro esiste" non implica "esiste qualcosa che lo sa leggere", ed e' per
questo che oggi in subtxt la skill parte verso il nulla. E la skill deve dichiarare **quale copia
dello strumento ha trovato e cosa sa fare**.

### 2026-09-28 — `deferred`: il §0 decide il mondo, e lo dichiara

Fatto il punto rimasto aperto qui sopra. Il §0 ora risponde a due domande in ordine — **c'è un
registro?** e **c'è qualcosa che lo sa leggere?** — e da lì esce un verdetto fra quattro: stop
(niente registro), **mondo B** (registro senza script), **mondo A** (script che vede il file), stop
(script che non lo vede). Il verdetto si scrive in una riga prima di toccare niente.

**Correzione di quanto scritto sopra.** *"Il rischio di perdita dati non c'e' … e' degrado, non
corruzione"* vale per lifehacker, non in generale. Misurato oggi con lo script di lifehacker sul
registro di subtxt, che non ha intestazioni `## Deferred from:`: **0 voci su 98, codice di uscita 0,
nessun errore.** Per quello script un bullet `source_spec` fuori da un'intestazione è prosa. In
lifehacker non si vede solo perche' le sue 8 voci `source_spec` stanno sotto un'intestazione. Non e'
corruzione — `plan` non scrive — ma e' il `"moved": 0` di nuovo: un passo che tace.

Quindi **"ho trovato lo script" non basta**, e nemmeno `--help`: la prova e' un conteggio. `plan`
contro `grep` sul file, voci totali e voci `source_spec`. Criterio, tarato sui tre registri reali:
`source_spec` viste **almeno** quante `grep` (atala: 18 contro 17, il parser ne vede una che la regex
semplice no); voci **poco sotto** i bullet (6 su 167 in lifehacker, 2 su 219 in atala — bullet di
prosa in sezioni come `## Notes`). Zero, o uno scarto di decine, vuol dire che lo script non capisce
la forma.

**Script che non vede il file → stop, non ripiego sul mondo B.** In quel repo il file un lettore ce
l'ha; il rimedio e' aggiornare lo script upstream, decisione dell'utente.

**La precondizione "nessuna pipeline in volo" era inservibile.** Diceva *state senza run attivi*, ma
`status: in-progress` resta scritto quando un run si abbandona: oggi 27 in atala e 4 in lifehacker,
fermi da settimane. Presa alla lettera avrebbe fermato la skill sempre — o, piu' probabilmente, veniva
ignorata. Ora il segnale e' la **modifica recente** (`find … -mmin -120`), e se c'e' si chiede. La rete
vera resta `--expect-sha`. Nel mondo B la precondizione non esiste: non ci sono state.

**Il marcatore del mondo B e' una riga `esito:`** aggiunta in coda alla voce, all'indentazione dei
campi — `chiusa`, `aperta in parte`, `non-lavoro`. Scelta perche' e' il gesto piu' piccolo che la
regola di BMAD (*"Do not modify existing entries"*) tollera: si aggiunge una riga, non si tocca
quello che c'e'. Verificato che lo script nuovo la tiene dentro la voce giusta e non cambia il
conteggio. **L'italiano qui e' anche la scelta sicura, non solo quella libera:** se un giorno arriva
auto-bmad, `chiusa` non attiva `RESOLUTION_RE` e la voce risulta `open` — falso negativo, costa una
rilettura. Una parola inglese scritta senza la disciplina del `(remainder)` verrebbe archiviata alla
cieca.

**Rilevamento:** `git ls-files -co --exclude-standard`, non `find` — salta `node_modules` e simili
senza doverli elencare. Verificato che trova lo script in atala e lifehacker, dove `.claude/skills/`
non e' ignorato. Se un repo ignorasse `auto-bmad`, finirebbe nel mondo B per errore: da tenere a
mente, oggi non capita.

Versione del plugin **2.1.0**.

## Aperti — stato alla pausa del 2026-09-28

**Fatto:** sette skill consolidate, formato `skills/<nome>/SKILL.md`, plugin `dnz` v2.0.0 pubblicato
su `github.com/madnz8/dnz` (privato) e installato in `~/admin` con **scope=project**.

**Aperto, in ordine di dipendenza:**

1. ~~**`deferred`, punto 2**~~ — **fatto il 2026-09-28**, vedi la decisione omonima. Resta da
   provarla davvero: un giro vero in subtxt (mondo B) è il primo uso della forma `esito:`.
2. **Le copie vecchie nei repo** — atala (5), lifehacker (4), lead-generation (1), trasformazione (1),
   piu' le 3 a livello utente. **`MIGRAZIONE.md` allineato il 2026-09-29** (skill invece di comandi,
   v2.1.0, esito della prova su Claude web, e la regola sui fix di review di lifehacker, che era
   rimasta quella rovesciata il 25/9). **I prompt non sono ancora stati eseguiti**: le copie vecchie
   sono ancora tutte al loro posto. Da qui in avanti tocca all'utente incollarli, un repo per volta.
   Ostacoli trovati dal censimento: `CLAUDE.md` di trasformazione ha una modifica non committata, e
   lifehacker una cartella non tracciata in `_bmad-output/`.
3. **`dnz-squash` in subtxt** — da ritirare, il suo metodo e' dentro `squash-story`.
4. **Claude web** — scegliere fra le tre strade qui sopra, dopo aver provato quella del
   `settings.json`.
5. **`DECISIONI.md` e `MIGRAZIONE.md` viaggiano dentro il plugin** perche' stanno nella radice del
   repo. Non fanno danno, ma sono documenti interni distribuiti a ogni installazione: valutare se
   spostarli in `docs/`.
6. **Mai valutate:** una `dnz:pr` per aprire la PR (primo anello mancante della catena) e una
   `dnz:review-pr` sottile sopra il `/code-review` built-in, che aggiunga dove va il report e la
   tassonomia di severita'.
