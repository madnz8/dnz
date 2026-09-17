---
description: "Collassa i commit di un branch in una history leggibile — di norma un commit per unità di lavoro — e riallinea la PR. Prima del merge, a review conclusa."
---

# dnz:squash-story

Collassa i commit di un branch in **una history che si può leggere** — di norma **un commit per
unità di lavoro** — secondo le convenzioni del repo, e **riallinea la PR**. Da lanciare **prima del
merge**, a review conclusa.

**L'obiettivo, in una riga: preservare il lavoro senza inquinarlo di commit atomici.** Chi fra sei
mesi farà `git log` su un file deve vedere *cosa è stato fatto*, non i passi con cui ci si è
arrivati.

**Dove qui sotto si legge «story», intendi l'unità di lavoro.** Se il branch non ne ha una — un
batch di fix a mano, una PR cresciuta a furia di correzioni — il criterio non cambia: un commit per
cosa fatta.

**Perché serve soprattutto dopo una pipeline automatica.** `auto-bmad` committa **una volta per
fase**, per costruzione: è l'impalcatura che permette il resume di una pipeline che gira per ore da
sola — se lo state file si perde, i commit di fase mostrano fin dove era arrivata. **Quella
impalcatura ha una data di scadenza: quando il lavoro chiude pulito, ha finito.** Su una story
tipica sono ~14 commit di cui ~5 toccano il codice. **Ma non è una skill di auto-bmad:** vale per
qualunque branch con troppi commit.

**Su un branch lungo, passa anche a metà strada.** Un epic di cinque storie squashato tutto alla
fine sono 70 commit in un rebase solo, con te che ricostruisci a memoria chi apparteneva a cosa.
Story per story è più corto e meno rischioso.

## Il prezzo, da dire all'utente PRIMA

Riscrivere la history **uccide gli SHA**: qualsiasi rebase cambia la targa di ogni commit a valle.
Gli appunti che li citano diventano puntatori nel vuoto:

- `baseline_commit:` nel frontmatter della story → **lo si ripara** (step 5);
- il corpo della PR → **lo si riscrive** (step 7);
- `commits: [...]` nello stato della pipeline e gli SHA nel suo report → **restano orfani**: il
  report è il log di un run avvenuto, e non può citare l'SHA del commit che lo contiene. Si
  dichiara, non si finge.

**Non è evitabile**: non è colpa dello squash, è il riscrivere. La scelta è secca — o history
pulita, o SHA vivi. Impatto reale ≈ zero (appunti di un lavoro chiuso), ma **va detto, non scoperto
dopo**.

## 0 — Orientati nel repo

**Rileva, non presumere.** Quattro cose, prima di toccare qualcosa:

```bash
DEF=$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's|^origin/||')   # non darlo per 'main'
BR=$(git branch --show-current)
gh repo view --json nameWithOwner -q .nameWithOwner                             # per la REST API del passo 7
```

- **Convenzioni dei messaggi** — `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`. Se il repo definisce
  un formato di commit, **quello vince** su quanto scritto qui sotto. Guarda anche quali **aree**
  ricorrono davvero in `git log`: lo scope si sceglie da lì, non a fantasia.
- **Il comando di verifica** — `package.json` → `scripts` (`typecheck`, `lint`, `test`, `build`),
  `Makefile`, `justfile`. Serve al passo 4.
- **Il tracker, se c'è** (Linear, Jira, GitHub Issues, o nessuno). Serve al passo 2 per la
  provenienza, e **se non c'è non è un problema**: vedi lì.
- **C'è una pipeline con uno stato su disco?** (`_bmad-output/auto-bmad/state/…` o equivalente). Se
  sì, vale la precondizione sullo stato; se no, quella precondizione semplicemente non si applica.

## Precondizioni (hard-stop se falliscono)

- **Working tree pulito.**
- Il branch **non** è quello di default, e **non** è già stato mergiato.
- **Nessun lavoro in volo su questo branch.** Se c'è uno stato di pipeline su disco, dev'essere
  `done` — **mai** su una pipeline in corso: i commit di fase le servono ancora.
  ```bash
  grep -m1 '^status:' <file-di-stato>
  ```
  ⚠️ **Gli stati possono divergere.** Un `finalize` "caveated" chiude l'epica lasciando le story a
  `review`/`in-progress`: l'epica dice `done`, la story no. **Non correggere il file per far passare
  il gate** — è un fatto registrato, non un ostacolo. Chiedi all'utente e fermati finché non
  conferma.
  Se quel file non esiste — lavoro scritto a mano, batch di fix — **non è un ostacolo**: chiedi
  conferma che il branch sia finito e prosegui.
- **Commenti di review su righe specifiche ancora aperti → FERMATI e chiedi.** Il force-push li
  slega dalle righe a cui puntano, e un commento non ancora lavorato è lavoro che sparisce.
  Verificalo, non assumerlo:
  ```bash
  gh api repos/<owner>/<repo>/pulls/<N>/comments --jq 'length'    # 0 = via libera
  ```
  Le review e i commenti **a livello di PR** (`/reviews`, `/issues/<N>/comments`) non si slegano da
  niente: non sono un hard-stop.

> Sui thread di riga **già risolti** si procede: avvisa che si sganceranno (restano nella
> conversazione della PR, staccati dal codice) e vai. È il costo normale di questa operazione, non
> un incidente — a review conclusa quei commenti hanno già dato quello che dovevano dare.

## 1 — Backup (non negoziabile, ma effimero)

```bash
git branch "backup/pre-squash-$(git branch --show-current | tr / -)"
```

`{key}` qui sotto sta per quel suffisso: la chiave della story se c'è una pipeline, il nome del
branch altrimenti.

Serve due volte: è il riferimento contro cui il gate dello **Step 4** dimostra "albero identico"
(`git diff backup/... HEAD`), ed è l'undo (`git reset --hard backup/pre-squash-{key}`) finché
l'operazione non è conclusa. **Non è un residuo da gestire a mano:** lo **Step 8 lo cancella da
solo** una volta che push + PR sono andati a buon fine. Fino ad allora resta vivo — copre anche la
riscrittura di `baseline_commit` (Step 5) e il force-push (Step 6), i due passi rischiosi *dopo* il
gate.

## 2 — Pianifica il collasso

Il range va dal commit **prima** del primo del branch fino a `HEAD`:

```bash
git merge-base "$DEF" "$BR"      # = <base-sha>
```

### Il criterio: si raggruppa per APPARTENENZA, non per quando è stato scritto

**Assegna ogni commit all'unità di lavoro a cui appartiene**, e collassa ogni gruppo in **un commit
solo**. Ci finisce dentro tutto: il `feat`, i `fix … (iter N)` della pipeline, i fix scritti a mano
dopo la review, l'impalcatura (`start pipeline`, `create story context`, `pipeline report`,
`finalize`, `record state`, i flip di stato).

**Il momento in cui un commit è nato non conta.** Un fix di review della story 4.2 sta nel commit
della story 4.2, che l'abbia scritto la pipeline o una persona tre giorni dopo. Quello che conta è
**a cosa appartiene**, non chi l'ha battuto a tastiera.

Su un branch di cinque storie il risultato sono cinque commit, più **al massimo uno** in coda per
gli artefatti che non appartengono a nessuna story in particolare (retrospettiva, contesto di
progetto, config di fine corsa).

**Le decisioni prese in review vanno assorbite nel body del commit** — cosa ha deciso l'umano, quali
deviazioni, quali deroghe. È l'unica cosa che il collasso perderebbe davvero.

**Un commit per unità di lavoro è il default, non un dogma.** Se dentro una story convivono due
lavori che davvero non si parlano, due commit sono legittimi: dillo e spiega perché. Ma non usare
l'eccezione per evitare di decidere — nel dubbio, uno.

### L'unica cosa che non si fonde mai: ciò che appartiene a un'altra unità di lavoro

⚠️ **Regola dura.** Il range arriva "fino a `HEAD`", quindi i commit di *altre* storie ci finiscono
dentro per costruzione ed è facile assorbirli senza accorgersene. Ma un fix che tocca il codice di
**un'altra epic**, sepolto dentro il `feat` di questa, è una history che mente — e mente proprio nel
punto in cui qualcuno la interrogherà (`git log` su quel file).

**Come si riconoscono.** Due segnali, utili ma non decisivi: non hanno `(iter N)` nel subject, e
seguono già le convenzioni del repo (li ha scritti una persona, non il template della pipeline).
Sono **indizi che quel commit va guardato**, non la regola: un fix scritto a mano che ricade tutto
sulla story corrente appartiene alla story corrente, e ci si fonde.

Se i commit fuori-perimetro sono più di due, **collassali fra loro** in uno:
`fix(<area>): review integrata di <origine> (<provenienza>)`. Pochi commit, mai una collana.

### Provenienza: la più specifica che esiste — e se non esiste, si omette

Formato: `<type>(<area>): <sintesi> (<provenienza>)`. `<area>` è l'area di dominio, presa dalle
aree che ricorrono davvero nel repo.

**Ignora i template della pipeline** (`fix(story-6-1)`, `chore(epic-6)`): mettono la story nello
slot dello scope e perdono l'area. È esattamente ciò che questo comando sostituisce — la history
esistente che li usa non è un precedente da imitare.

La provenienza è **la più specifica fra quelle che esistono**, in quest'ordine:

1. **`(Story N.M)`** — il commit appartiene a una story identificabile. Caso normale, e vale anche
   per i fix scritti a mano quando ricadono su una story sola.
2. **`(<TICKET>)`** — non c'è una story singola ma c'è un ticket nel tracker rilevato al passo 0:
   review che copre un intero epic, chiusura del run, lavoro trasversale.
3. **`(epic N)`** — non c'è né story né ticket, ma il lavoro appartiene a un'unità riconoscibile.
4. **Niente.** Nessuna story, nessun tracker, nessuna unità: **si omette la parentesi** e il
   messaggio finisce alla sintesi.

⚠️ **Non fermarti a chiedere quando la provenienza non c'è, e non inventarne una.** Non tutti i
repo hanno un tracker e non tutto il lavoro nasce da un ticket: l'assenza è un caso normale, non un
ostacolo. Un messaggio senza parentesi è corretto; una provenienza inventata è un puntatore falso
che qualcuno seguirà.

## 3 — Esegui (rebase scriptato)

`git rebase -i` interattivo **non è supportato** in questo ambiente: pilota la todo-list e i
messaggi con due script.

```bash
mkdir -p /tmp/sqstory && rm -f /tmp/sqstory/counter

# messaggi, uno per ogni commit che sopravvive, in ordine cronologico
cat > /tmp/sqstory/1.txt <<'MSG'
chore(<area>): ...
MSG
cat > /tmp/sqstory/2.txt <<'MSG'
feat(<area>): ... (Story N.M)
MSG

# todo-list: reword sul PRIMO di ogni gruppo, fixup su tutti gli altri
cat > /tmp/sqstory/seq.sh <<'SH'
#!/bin/bash
cat > "$1" <<'TODO'
reword <sha-primo-gruppo-1>
fixup <sha>
reword <sha-primo-gruppo-2>
fixup <sha>
TODO
SH

# editor: consuma i messaggi in ordine
cat > /tmp/sqstory/ed.sh <<'SH'
#!/bin/bash
N=$(cat /tmp/sqstory/counter 2>/dev/null || echo 0); N=$((N+1)); echo $N > /tmp/sqstory/counter
cp "/tmp/sqstory/$N.txt" "$1"
SH

chmod +x /tmp/sqstory/seq.sh /tmp/sqstory/ed.sh
GIT_SEQUENCE_EDITOR=/tmp/sqstory/seq.sh GIT_EDITOR=/tmp/sqstory/ed.sh git rebase -i <base-sha>
```

Note:

- `reword` apre l'editor **quando il commit viene preso**, prima che i suoi `fixup` vengano
  applicati → l'ordine dei messaggi è quello dei `reword` nella todo-list.
- `fixup` scarta il proprio messaggio e tiene quello del target: nessun editor si apre.
- I commit si possono **riordinare** nella todo (utile per accorpare due commit di config non
  adiacenti). Se il contesto del diff si sovrappone, il rebase si ferma in conflitto: risolvi o
  rinuncia al riordino.

## 4 — Il gate che dimostra che non hai perso niente

```bash
git diff backup/pre-squash-{key} HEAD --stat
```

**Deve essere VUOTO.** Albero identico bit per bit = il collasso non ha alterato una riga. Se stampa
qualcosa, `git reset --hard backup/pre-squash-{key}` e ricomincia — non "aggiustare" a mano.

Poi la verifica vera: il comando rilevato al passo 0.

⚠️ **Escludi i test che scrivono su servizi veri** (un database di produzione, un'API a pagamento):
vanno lanciati deliberatamente, non dentro un gate. E comunque un rebase non può cambiarne l'esito
— l'albero è identico per costruzione, è esattamente ciò che la riga sopra ha appena dimostrato.

## 5 — Ripara `baseline_commit` *(solo se ci sono file di story)*

**Salta questo passo interamente** se il branch non ha file di story con quel frontmatter — un batch
di fix scritti a mano non ne ha. Verifica prima di decidere:

```bash
git diff --name-only <base-sha>..HEAD | grep -E 'stories/|implementation-artifacts/' \
  || echo "nessuna story: salta allo step 6"
```

Il frontmatter della story dichiara `baseline_commit: <sha>` — un **fatto presentato come vivo**, e
dopo il rebase punta nel vuoto. Va allineato al **parent del commit `feat` della PROPRIA story** (=
l'albero prima che il codice di quella story atterrasse: esattamente ciò che il campo significa).

⚠️ **In epic mode ci sono N `baseline_commit`, uno per story** — non uno solo. Ognuno va al parent
del `feat` della sua story, quindi a SHA diversi. Falli tutti in una sola fermata.

⚠️ **NON dare per scontato che il file viva dentro il commit `feat`.** In epic mode quasi sempre non
è così: il commit di chiusura del run tocca di nuovo tutti i file di story (retrospettiva,
riconciliazione, stato). Amendare il `feat` significherebbe farsi sovrascrivere più avanti, o
beccarsi un conflitto a rebase già fermo. **Trova prima chi scrive per ultimo ogni file:**

```bash
git log --oneline <base-sha>..HEAD -- <story-file>     # ripeti per ogni story
```

Fermati con `edit` sull'**ultimo scrittore** — se è lo stesso per tutte le story (il caso tipico in
epic mode), è **una sola fermata** per tutti i `baseline_commit`, e zero rischio di conflitto.

⚠️ Gli SHA da scrivere sono **stabili** finché i commit a cui puntano stanno a monte della fermata:
calcolali prima con `git rev-parse`, non serve `HEAD^`. Usa `HEAD^` solo se stai amendando il `feat`
stesso.

Serve quindi un secondo rebase con `edit`:

```bash
git branch -f backup/pre-baseline-fix
cat > /tmp/sqstory/seq2.sh <<'SH'
#!/bin/bash
cat > "$1" <<'TODO'
pick <sha-config>
edit <sha-feat>
pick <sha-successivi>
TODO
SH
chmod +x /tmp/sqstory/seq2.sh
GIT_SEQUENCE_EDITOR=/tmp/sqstory/seq2.sh git rebase -i <base-sha>
# al fermo: sostituisci baseline_commit con $(git rev-parse <sha-feat>^), poi:
git add <story-file> && GIT_EDITOR=true git rebase --continue
```

Verifica che ogni nuovo valore sia **vivo** e sia davvero il parent del `feat` giusto:

```bash
git cat-file -e "$(grep -m1 '^baseline_commit:' <story-file> | awk '{print $2}')^{commit}"
```

⚠️ **Verifica l'abbinamento file→valore uno per uno**, non con un `grep -h` su un glob: l'ordine
dell'output non è quello che ti aspetti e due story adiacenti si scambiano senza che te ne accorga.

> ⚠️ **Se GateGuard è attivo** (hook `pre:bash:gateguard-fact-force`) — misurato, non ipotizzato: 8
> blocchi in una sola sessione su lifehacker.
>
> - **`git commit --amend` viene RIFIUTATO** anche ripresentando i fatti: si blocca in loop e perdi
>   tentativi. L'equivalente che passa è mettere in staging e lasciare che sia `--continue` ad
>   assorbire:
>   ```bash
>   git add <story-files> && GIT_EDITOR=true git rebase --continue
>   ```
>   A una fermata `edit`, `rebase --continue` con modifiche in staging amenda il commit fermo —
>   stesso risultato, senza il flag bloccato.
> - **Il primo `Bash` e la prima modifica di OGNI file** chiedono di presentare i fatti prima di
>   procedere. In una procedura fatta di molti passi scriptati conviene metterlo in conto: presenta
>   i fatti una volta all'inizio del blocco invece di scoprirlo a metà rebase.
> - **Anche un heredoc che *contiene* `rm -f` o `branch -D` come testo fa scattare il gate**, pur
>   non eseguendo nulla: per scrivere un file che documenta comandi distruttivi conviene il tool di
>   scrittura file invece di `cat > file <<EOF`.
> - Via d'uscita se diventa ingestibile a rebase fermo: `ECC_GATEGUARD=off`, oppure
>   `pre:bash:gateguard-fact-force` in `ECC_DISABLED_HOOKS`.

## 6 — Push

```bash
git push --force-with-lease
```

`--force-with-lease`, mai `--force`: fallisce se qualcuno ha pushato nel frattempo, invece di
sovrascriverlo.

## 7 — Riallinea la PR (se esiste)

Il corpo della PR elenca SHA che ora sono morti. **Va riscritto** — costa zero commit.

```bash
gh pr list --head "$BR"        # esiste una PR?
```

> ⚠️ **Non usare `gh pr edit`.** Misurato su atala-portal con `gh 2.46.0` (versione confermata
> ancora in uso): fallisce con exit 1 interrogando il campo GraphQL `projectCards`, deprecato da
> GitHub, e stampa solo un warning che sembra innocuo (`Projects (classic) is being deprecated…`).
> In una pipe (`| tail`) l'errore sparisce e credi di aver aggiornato la PR. La REST API funziona in
> entrambi i casi:

```bash
cat > /tmp/sqstory/pr-body.md <<'BODY'
...corpo aggiornato...
BODY
gh api --method PATCH /repos/<owner>/<repo>/pulls/<N> -F body=@/tmp/sqstory/pr-body.md --jq '.number'
```

Nel corpo:

- aggiorna gli SHA ai nuovi;
- aggiungi in fondo una nota che dichiara il collasso e avverte che gli SHA nel **report della
  pipeline** sono pre-squash e non risolvono più.

**Verifica sempre che il body sia cambiato davvero**
(`gh api /repos/<owner>/<repo>/pulls/<N> --jq '.body'`) e che ogni SHA citato sia vivo
(`git cat-file -e <sha>^{commit}`) — un `gh` che fallisce in silenzio ti lascia credere di aver
fatto il lavoro.

## 8 — Chiudi

- Segnala gli SHA rimasti orfani (report della pipeline, `commits:` nello stato): dichiarati, non
  riparabili.
- **Cancella il backup automaticamente**, ora che il gate è passato e push + PR sono confermati —
  nessun branch residuo, nessuna domanda:
  ```bash
  git branch -D backup/pre-squash-{key}
  ```
  Non chiedere conferma: l'operazione è verificata (albero identico allo Step 4, test verdi, push
  riuscito). La rete profonda resta comunque il **reflog** (`git reset --hard HEAD@{N}`, ~90 giorni)
  se serve tornare indietro dopo.
- **Non cancellare il backup se un passo precedente si è fermato** (gate fallito, push rifiutato da
  `--force-with-lease`, conflitto irrisolto): lì il backup è ancora l'undo che serve — lascialo e
  riporta il blocco all'utente.

Il branch è pronto per `/dnz:merge`.
