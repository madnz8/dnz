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
| `deferred` | — | divergenza sostanziale atala ↔ lifehacker |
| `squash-story` | ✅ 2026-09-16 | criterio unificato sull'appartenenza; provenienza opzionale |
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

## Aperti

- Il messaggio di chiusura nomina ancora il push come passo successivo dell'utente (non lo
  esegue). Se "levare il push" voleva dire non menzionarlo affatto, va tolto anche di lì.
- Con `merge` che non pusha e `release` che pusha, il lavoro mergiato ma non rilasciato resta sulla
  macchina a tempo indefinito. Va bene se ogni merge finisce in un rilascio ragionevolmente vicino;
  se invece capita di accumulare merge per settimane senza rilasciare, serve un modo per pubblicare
  senza rilasciare — oggi non c'è.
