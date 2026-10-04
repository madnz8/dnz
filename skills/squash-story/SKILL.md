---
name: squash-story
description: "Collassa un branch in pochi commit funzionali ri-partendo l'albero finale, non aggregando i commit esistenti, e riallinea la PR. Da lanciare prima del merge, a review conclusa."
disable-model-invocation: true
---

# dnz:squash-story

Collassa i commit di un branch in **pochi commit che si leggono** — «ecco le parti di cui è fatto
questo lavoro», non «ecco cosa ho fatto e poi cosa ho corretto» — e **riallinea la PR**. Da lanciare
**prima del merge**, a review conclusa.

## La regola che cambia tutto

**Non si uniscono i commit vicini: si ri-partisce l'albero finale.**

Sono due cose diverse, e la differenza è tutto il punto. Aggregando i commit esistenti, un commit di
correzione **resta visibile come correzione**. Ripartendo l'albero finale, quella modifica rientra
**dentro il pezzo che correggeva**, e chi legge vede il codice com'è invece del ripensamento che lo
ha prodotto.

**Una correzione fatta prima del merge non è mai esistita nel prodotto.** Quel difetto non è stato
rilasciato, nessuno l'ha incontrato: registrarlo come commit a sé è il passo con cui ci si è
arrivati, non cosa è stato fatto. E si paga dove costa di più — `git blame` su una riga corretta in
review deve atterrare sul commit che spiega *cosa fa quel codice*, non su uno che dice che una
review aveva trovato qualcosa.

> **Cosa la review ha trovato non va perso: ha già una casa** — la PR, i commenti, i report di
> review del repo. *Perché questa riga è fatta così* ha solo git.

**Non è uno squash in un commit solo, e non è un commit per modifica.** È una decomposizione del
lavoro finito nelle parti di cui è fatto.

**Cosa non fa:** non merge, non pusha il branch di default, non rilascia. Alla fine il branch è
pronto per `/dnz:merge`.

## Il prezzo, da dire all'utente PRIMA

Questa operazione **sostituisce tutti i commit del branch**. Non li modifica: ne crea di nuovi con
lo stesso albero. Ogni SHA a valle del punto di partenza muore, e gli appunti che li citano
diventano puntatori nel vuoto:

- `baseline_commit:` nel frontmatter delle story → **si scrive giusto durante la ricostruzione**
  (passo 4), non si ripara dopo;
- il corpo della PR → **si riscrive** (passo 7);
- `commits: [...]` negli stati di pipeline e gli SHA nei loro report → **restano orfani**: un report
  è il log di un run avvenuto e non può citare l'SHA del commit che lo contiene. Si dichiara, non si
  finge.

**Non è evitabile**: non è colpa del metodo, è il riscrivere. O history pulita, o SHA vivi. Impatto
reale ≈ zero su un lavoro chiuso, ma **va detto prima, non scoperto dopo**.

## 0 — Orientati nel repo

**Rileva, non presumere.**

```bash
DEF=$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's|^origin/||')   # non darlo per 'main'
BR=$(git branch --show-current)
BASE=$(git merge-base "origin/$DEF" HEAD)
gh repo view --json nameWithOwner -q .nameWithOwner
```

- **Convenzioni dei messaggi** — `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`. Se il repo definisce
  un formato, **quello vince**. Guarda anche quali **aree** ricorrono davvero in `git log`: lo scope
  si sceglie da lì, non a fantasia.
- **Il comando di verifica** — `package.json` → `scripts`, `Makefile`, `justfile`. Serve al passo 5.
- **Il tracker, se c'è** (Linear, Jira, GitHub Issues, o nessuno). Serve al passo 2, e **se non c'è
  non è un problema**.
- **Ci sono file di story con `baseline_commit`?** Serve al passo 4.

## Precondizioni (hard-stop se falliscono)

- **Working tree pulito** (`git status --porcelain` vuoto). Il metodo si basa sull'albero finale: se
  è sporco, non stai ricostruendo quello che pensi. Se non lo è, guarda cosa c'è:
  - **lavoro del branch non ancora committato** — tipicamente le correzioni di review: fai un
    **commit provvisorio** (aggiungi i file a uno a uno, non `git add -A`: gli artefatti locali non
    ci devono entrare). Il metodo lo assorbe, perché riparte dall'albero finale e quel commit non
    sopravvive. **Il tag del passo 3 si mette dopo**, altrimenti il gate del passo 5 confronta con un
    albero senza quelle correzioni. Dillo all'utente prima;
  - **qualunque altra cosa** — file che non c'entrano, artefatti locali: fermati.
- Il branch **non** è quello di default, e **non** è già stato mergiato.
- **Almeno tre commit** da raggruppare, contando l'eventuale commit provvisorio: sotto, non c'è niente
  da fare.
- **Nessun merge dentro il branch:**
  ```bash
  git log --merges "$BASE..HEAD" --oneline    # deve essere vuoto
  ```
  Se il branch di default è stato mergiato dentro, l'albero finale contiene anche modifiche che non
  sono tue: ricostruendo da `$BASE` te le attribuiresti. **Fermati** — prima si fa un rebase, poi si
  collassa.
- **Nessun altro lavora su questo branch.** Riscrivere una history condivisa costringe gli altri a
  ricucire la propria.
- **Nessun lavoro in volo.** Se c'è uno stato di pipeline su disco, dev'essere `done`: i commit di
  fase servono ancora a una pipeline che può riprendere.
  ⚠️ **Gli stati possono divergere:** un `finalize` "caveated" chiude l'epica lasciando le story a
  `review`. **Non correggere il file per far passare il gate** — è un fatto registrato, non un
  ostacolo: chiedi e fermati.
- **Commenti di review su righe specifiche ancora aperti → FERMATI e chiedi.** Il force-push li
  slega dalle righe a cui puntano, e un commento non lavorato è lavoro che sparisce.
  ```bash
  gh api repos/<owner>/<repo>/pulls/<N>/comments --jq 'length'    # 0 = via libera
  ```
  Le review e i commenti **a livello di PR** non si slegano da niente: non sono un hard-stop.

> Sui thread di riga **già risolti** si procede: avvisa che si sganceranno e vai. È il costo normale
> dell'operazione — a review conclusa quei commenti hanno già dato quello che dovevano dare.

## 1 — Leggi cosa c'è da raggruppare

```bash
git diff --name-status "origin/$DEF...HEAD"
```

**Tre puntini, non due**: vuoi il confronto con il punto in cui il branch si è staccato, non con lo
stato attuale del default.

Leggi anche i commit esistenti — non per aggregarli, ma perché i loro messaggi dicono **cosa
intendeva fare** chi li ha scritti, e le decisioni prese in review vanno assorbite nei body nuovi.

### Se i commit sono già i gruppi, non c'è niente da fare

Il metodo serve a togliere le correzioni e l'impalcatura dalla history. Se ogni commit esistente è
già una parte di lavoro per conto suo, ha un messaggio nel formato del repo e **nessuno** è una
correzione, una review integrata o un subject di impalcatura (gli stessi che cerca `/dnz:merge` §1:
`(iter N)`, `start … pipeline`), il raggruppamento che proporresti coincide con quello che c'è già.
Collassare darebbe lo stesso albero con SHA nuovi, e in cambio costa tag, reset, force-push, CI che
riparte e PR da riscrivere.

**Dillo e fermati**: «i commit sono già per argomento, non guadagni niente», con il motivo in una
riga. Se l'utente vuole procedere lo stesso, si procede.

## 2 — Proponi i gruppi, e fermati

**È il passo che conta, ed è l'unica decisione che stai prendendo al posto dell'utente.**

### Come si raggruppa

Per **funzione**, cioè per la domanda: *«di quale parte del lavoro fa parte questo file?»*. Gruppi
che ricorrono: le dipendenze e i confini di piattaforma; una capacità per commit; i documenti; gli
artefatti di pianificazione.

Dove c'è una pipeline con story, **una story è una capacità**: il gruppo coincide con la story, e i
fix di review che la riguardano ci stanno dentro — è esattamente il punto del metodo.

Due vincoli che decidono ordine e forma:

- **Le dipendenze vengono prima.** Se un gruppo importa ciò che un altro introduce, viene dopo. Una
  porta e il suo scrittore prima di chi li usa. Sbagliare l'ordine produce commit che non compilano
  singolarmente — una history che non si può bisecare.
- **L'impalcatura non è un gruppo.** Gli artefatti di processo (stati di pipeline, report di run,
  flip di sprint-status) non descrivono il prodotto: finiscono in **un solo** commit in coda, o
  dentro il gruppo che li ha generati. Mai uno per ciascuno.

### Quando due gruppi toccano lo stesso file

È il caso che rompe la partizione per file. Due strade, in quest'ordine:

1. **Dividi per hunk**: `git add -p <file>` mette in staging i singoli pezzi. È la strada giusta
   quando le due capacità dentro quel file sono davvero separate.
2. **Se non si separano davvero**, il file va **nel primo gruppo che ne ha bisogno** — e **dillo
   nella proposta**, invece di lasciarlo scoprire a chi legge la history.

Non forzare una divisione per hunk che lascia un gruppo non funzionante: l'ordine delle dipendenze
viene prima dell'eleganza.

### I messaggi

Formato: `<type>(<area>): <sintesi> (<provenienza>)`, con l'area presa da quelle che ricorrono nel
repo. **Ignora i template delle pipeline** (`fix(story-6-1)`): mettono la story nello slot dello
scope e perdono l'area.

**Nel body vanno le decisioni prese in review** — cosa ha deciso l'umano, quali deviazioni, quali
deroghe. Assorbendo i fix dentro i gruppi, è l'unica cosa che andrebbe davvero persa.

La provenienza è **la più specifica fra quelle che esistono**:

1. **`(Story N.M)`** — il gruppo corrisponde a una story identificabile;
2. **`(<TICKET>)`** — nessuna story ma un ticket nel tracker rilevato al passo 0;
3. **`(epic N)`** — né story né ticket, ma un'unità di lavoro riconoscibile;
4. **niente** — si omette la parentesi.

⚠️ **Non fermarti a chiedere quando la provenienza non c'è, e non inventarne una.** Non tutti i repo
hanno un tracker: l'assenza è un caso normale. Un messaggio senza parentesi è corretto; una
provenienza inventata è un puntatore falso che qualcuno seguirà.

### Poi fermati

Presenta **l'oggetto di ogni commit e i file che contiene**, e **aspetta la conferma**. Non è una
formalità: il raggruppamento è la decisione che l'utente ti sta delegando, e rifarlo dopo costa più
che chiederlo adesso.

## 3 — Metti in salvo la history attuale

```bash
git tag "pre-collassamento-$(date +%Y%m%d-%H%M)" HEAD
```

Un tag locale, **prima di qualunque reset**. È ciò che rende l'operazione annullabile con un comando,
ed è il riferimento contro cui il passo 5 dimostra che non hai perso niente.

## 4 — Ricostruisci

```bash
git reset --mixed "$BASE"       # l'albero di lavoro NON viene toccato
```

**`--mixed`, mai `--hard`**: azzera l'indice e lascia intatto il lavoro. Da qui i commit non ci sono
più, ma ogni file è esattamente com'era.

Poi, per ogni gruppo nell'ordine deciso:

```bash
git add <i file del gruppo>     # oppure: git add -p <file>
git commit -F - <<'MSG'
feat(<area>): ... (Story N.M)

<decisioni prese in review, deviazioni, deroghe>
MSG
```

L'ultimo gruppo può usare `git add -A` per raccogliere ciò che resta — **solo dopo** aver verificato
con `git status` che ciò che resta è davvero quel gruppo.

### `baseline_commit`, se ci sono file di story

Il frontmatter dichiara `baseline_commit: <sha>` — l'albero **prima** che il codice di quella story
atterrasse. Ricostruendo, **lo scrivi giusto mentre procedi** invece di ripararlo dopo: quando stai
per committare il gruppo di una story, il valore corretto è l'SHA del commit appena fatto (oppure
`$BASE`, se quella story è il primo gruppo).

```bash
git rev-parse HEAD     # <- il baseline_commit della story che stai per committare
```

Scrivilo nel file e mettilo in staging insieme al resto del gruppo. **È il guadagno più grosso di
questo metodo:** niente secondo rebase con fermate `edit`, niente `--amend`, nessun rischio di
scambiare due story adiacenti.

Alla fine verifica che ogni valore sia vivo e sia quello giusto, **uno per uno** — mai con un `grep`
su un glob, perché l'ordine dell'output non è quello che ti aspetti:

```bash
git cat-file -e "$(grep -m1 '^baseline_commit:' <story-file> | awk '{print $2}')^{commit}"
```

## 5 — Il gate che dimostra che non hai perso niente

```bash
git diff <il-tag-del-passo-3> --stat    # deve stampare ZERO righe
git status --porcelain                  # deve essere vuoto
```

**È la verifica che conta, ed è più forte dei test**: dice che l'albero è identico byte per byte a
quello di prima. Se stampa qualcosa, hai perso o duplicato qualcosa — `git reset --hard <il-tag>` e
si ricomincia dal passo 2, **non si "aggiusta" a mano**.

Poi lancia comunque la suite del progetto, perché è ciò che si pusha. ⚠️ **Escludi i test che
scrivono su servizi veri** — un DB di produzione, un'API a pagamento: si lanciano deliberatamente.

## 6 — Push

```bash
git push --force-with-lease
```

`--force-with-lease`, **mai `--force`**: il primo fallisce se qualcuno ha pushato nel frattempo, il
secondo lo cancella.

### Questo push fa ripartire la CI, e non si può evitare pulitamente

Il force-push emette `push` e `pull_request.synchronize`: la pipeline riparte. **Mettilo in conto e
dillo**, invece di farlo scoprire dalle notifiche.

⚠️ **Non usare `[skip ci]`.** Funziona solo nel messaggio del **commit di testa**, che ora è uno dei
tuoi commit definitivi — ci infileresti un'istruzione per la CI, cioè l'archeologia di processo che
questa skill esiste per togliere. E peggio: saltando il run, l'ultimo verde della PR resta agganciato
a commit che non esistono più, e **con status check obbligatori una PR il cui commit di testa non ha
check non si può mergiare**.

Quello che si fa: `concurrency: { group: …, cancel-in-progress: true }` nel workflow, per non pagarlo
due volte. E sapere che il run è **ridondante per costruzione** — il gate ha appena dimostrato che
l'albero è identico: se torna rosso dove prima era verde, è un flake o un passo non deterministico,
non una regressione.

## 7 — Riallinea la PR (se esiste)

Il corpo della PR elenca SHA che ora sono morti. **Va riscritto** — costa zero commit.

```bash
gh pr list --head "$BR"
```

> ⚠️ **Non usare `gh pr edit`.** Misurato su atala-portal con `gh 2.46.0`: fallisce con exit 1
> interrogando il campo GraphQL `projectCards`, deprecato da GitHub, e stampa solo un warning che
> sembra innocuo (`Projects (classic) is being deprecated…`). In una pipe l'errore sparisce e credi
> di aver aggiornato la PR. La REST API funziona:

```bash
gh api --method PATCH repos/<owner>/<repo>/pulls/<N> -F body=@<file> --jq '.number'   # senza slash iniziale: Git Bash su Windows lo riscrive come percorso di file
```

Nel corpo: gli SHA nuovi, e una nota che dichiara il collasso e avverte che gli SHA nei report di
pipeline sono pre-collasso e non risolvono più.

**Verifica che il body sia cambiato davvero** (`gh api … --jq '.body'`) e che ogni SHA citato sia
vivo — un `gh` che fallisce in silenzio ti lascia credere di aver fatto il lavoro.

## 8 — Chiudi dicendo tre cose

- **Come annullare**: `git reset --hard <il-tag>` e di nuovo `git push --force-with-lease`.
- **Il tag lo toglie `/dnz:merge`**, subito dopo il merge, se il suo contenuto è arrivato nel default;
  se resta, lo toglie `/dnz:release` §8. A mano (`git tag -d <il-tag>`) solo se non usi nessuna delle
  due. Non toglierlo se un passo si è fermato a metà: lì è ancora l'undo che serve.
- ⚠️ **La trappola del merge.** Se poi merge dalla UI di GitHub con **«Squash and merge»**, i commit
  raggruppati tornano a essere uno solo e **tutto questo lavoro si perde**. Serve «Merge commit» o
  «Rebase and merge» — oppure `/dnz:merge`, che fa `git merge --no-ff` in locale ed è esattamente il
  motivo per cui esiste.

Gli SHA rimasti orfani (report di pipeline, `commits:` negli stati) vanno **dichiarati**: non sono
riparabili.

Il branch è pronto per `/dnz:merge`.
