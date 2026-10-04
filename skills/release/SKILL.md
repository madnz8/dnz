---
name: release
description: "Rilascia ciò che è sul branch di default: pubblica i merge accumulati, changelog + bump + tag + push (anche la prima release di un repo nuovo), poi ripulisce i branch morti."
disable-model-invocation: true
---

# dnz:release

Rilascia quello che è **già** sul branch di default: changelog + bump di versione + tag + push.
**Tutto eseguito dall'agente in locale, via terminale.** La parte cognitiva — decidere il bump e
scrivere il changelog — la fa l'agente; la meccanica la fa lo strumento di release del repo, o la
procedura di questa skill (§0b) quando il repo non ne ha ancora una.

È anche **il punto in cui il lavoro diventa pubblico**: `/dnz:merge` non pusha, quindi il branch di
default locale può essere avanti di più merge. Questa skill li pubblica. E, a rilascio fatto,
ripulisce i branch rimasti indietro.

**Cosa non fa:** non fa merge, non chiude ticket. Rilascia ciò che trova.

## 0 — Orientati: come si rilascia in QUESTO repo

Non c'è una risposta universale. **Rileva, non presumere**, in quest'ordine:

1. **La documentazione del repo** — `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`. Se il repo descrive
   la propria procedura di release, quella **vince su tutto il resto di questa skill**.
2. **Gli script** — `package.json` → `scripts` (cerca `release`, `release:*`, `version`), oppure
   `Makefile`, `justfile`, `pyproject.toml`, `Cargo.toml`.
3. **La configurazione** — `.release-it.json`, `.changeset/`, `.versionrc`, `semantic-release`.
4. **I changelog esistenti** — `ls CHANGELOG*` e dintorni: **quanti sono, in che lingua, in che
   formato.** Aprine uno e leggi l'ultima voce: il changelog nuovo va scritto come i precedenti,
   non come piace a te.
5. **I tag** — `git tag --list | tail -5`: schema (`v1.2.3` o `1.2.3`) e da dove si riparte.

Da qui escono **tre casi**, e va detto all'utente quale è:

1. **C'è uno strumento o una procedura scritta** (punti 1-3): si usa quella, e vince su tutto il resto.
2. **Nessuno strumento, ma ci sono release passate** (tag, changelog): la procedura si **ricostruisce
   da quelle** — stesso schema di tag, stessi file, stesso modo di alzare la versione — e si scrive in
   due righe. Non è inventare: è seguire un precedente. Si conferma nell'anteprima del passo 5.
3. **Niente di tutto questo**: nessuno strumento, nessun tag, nessun changelog. È la **prima release**
   del repo, e si fa con la procedura del §0b.

In nessun caso si inventa un `npm version` che il repo non usa: un tag fuori schema o un bump scritto
a mano sporcano una history che poi qualcuno dovrà disfare a mano.

Riassumi all'utente cosa hai trovato — due righe — prima di procedere.

### 0b — La prima release di un repo nuovo

Si sceglie lo schema qui, e si scrive nel repo, così dalla seconda volta il caso 1 lo trova da sé.

- **La prima versione**, con una sola domanda: `v0.1.0` (non lo usa ancora nessuno) o `v1.0.0` (è già
  in uso). La versione è **il tag**: senza `package.json` non c'è nessun altro file da alzare.
- **Il changelog per gli utenti**, `CHANGELOG-NOVITA.md` nella radice, nel formato del §4b. Il
  changelog tecnico **non** si crea.
- **La sezione «Release» nel `CLAUDE.md` del repo** (se manca il file, si crea con quella sola
  sezione), per dire come si rilascia qui:

  ```markdown
  ## Release
  Si rilascia con `/dnz:release`. La versione è il tag annotato `vX.Y.Z` (SemVer), senza file di
  versione. Le novità per gli utenti stanno in `CHANGELOG-NOVITA.md`, la più recente in alto. Se
  arriva un `package.json` o uno strumento di release, aggiorna questa sezione.
  ```

- **I comandi**, dopo l'anteprima e la conferma del passo 5:

  ```bash
  git add CHANGELOG-NOVITA.md CLAUDE.md
  git commit -m "docs: novità vX.Y.Z"          # nel formato dei messaggi del repo, se ne ha uno
  git tag -a vX.Y.Z -m "vX.Y.Z"
  git push origin <branch-di-default> --follow-tags
  ```

  ⚠️ **Mai `git push --tags`**: pubblicherebbe tutti i tag locali, compresi quelli di salvataggio di
  `/dnz:squash-story`. `--follow-tags` manda solo il tag annotato appena creato.

Il bump dalla seconda release in poi segue il §3.

## 1 — Precondizioni

- Sei sul **branch di default**:
  ```bash
  git symbolic-ref --short refs/remotes/origin/HEAD    # il nome vero, non darlo per 'main'
  git fetch origin && git pull --ff-only
  ```
  Il `pull --ff-only` serve a **prendere** quello che c'è sul remoto, non a pretendere che tu sia
  allineato: il tuo default locale **può essere avanti**, ed è normale — sono i merge di
  `/dnz:merge`, che non pusha. Quelli sono il materiale di questo rilascio. Se invece il `pull`
  fallisce perché le history sono divergenti, **fermati**: non è un problema da risolvere di
  passaggio dentro una release.
- **Working tree pulito** sui file tracciati (`git status --short`). Molti strumenti di release
  fanno `git commit -a`: qualunque modifica in giro finirebbe dentro il commit di release.
- Gli artefatti locali (report di review, file temporanei) non vanno committati: rimuovili o
  mettili in `.gitignore` prima. I file *untracked* non sono un problema.

## 2 — Leggi cosa stai rilasciando

```bash
git describe --tags --abbrev=0        # ultimo tag; vuoto = prima release
git log <ultimo-tag>..HEAD --oneline
git diff <ultimo-tag>..HEAD --stat
```

Alla prima release non c'è tag: usa l'intera history.

Guarda anche **cosa sta per diventare pubblico adesso**, che non è la stessa cosa:

```bash
git log origin/<branch-di-default>..HEAD --oneline    # i merge non ancora pushati
```

Se qui c'è roba, dillo all'utente **con i nomi dei branch**: sta per pubblicare del lavoro che
finora esisteva solo sulla sua macchina. È l'informazione che serve per decidere se il momento è
quello giusto.

## 3 — Decidi il bump

SemVer, e **nel dubbio il più basso dei due**:

- `patch` — bugfix, refactor interni, dipendenze, documentazione, modifiche non comportamentali;
- `minor` — funzionalità nuove e visibili, nuovi endpoint o campi, cambi di schema, cambi di
  comportamento retrocompatibili;
- `major` — rotture di compatibilità. **Fermati e chiedi**: non è una decisione da prendere di
  passaggio.

Se il `CLAUDE.md` del repo dà criteri suoi, valgono quelli.

## 4 — Scrivi il changelog

Nel formato rilevato al passo 0: stesso file, stesse sezioni, stessa lingua, stesso livello di
dettaglio dell'ultima voce.

**Il changelog che questa skill dà per scontato è quello «Novità», per gli utenti** (4b): è l'unico che
git non sa produrre. Quello tecnico (4a) si scrive **solo se il repo ce l'ha già o l'utente lo
chiede**: la storia tecnica è già in git — i gruppi di `/dnz:squash-story`, i merge `--no-ff` che
dicono cosa è atterrato, i tag — e un file che nessuno apre invecchia.

⚠️ **Se i changelog sono più d'uno** (tecnico e utente, oppure due lingue) vanno scritti **tutti**.
Dimenticarne uno non fa fallire niente e non lo nota nessuno — fino al rilascio dopo, quando manca
un pezzo di storia che ormai va ricostruito.

Se lo strumento vuole un file di input, salvalo **fuori dal repo** (lo scratchpad di sessione), così
non sporchi il working tree che il passo 1 ti ha chiesto di tenere pulito.

### 4a — Il changelog tecnico, solo se esiste

Racconta **cosa è cambiato**, non l'elenco dei commit. Il lettore è chi lavora al repo: la causa di
un bug, il nome del modulo e il numero della issue qui ci stanno.

### 4b — Il changelog "Novità", se il repo ne ha uno

Lettore diverso, regole diverse. Non è il changelog tecnico tradotto in parole semplici: è un
**annuncio**, e un annuncio è corto.

**Una voce = una riga.** Massimo ~20 parole. Dice **cosa puoi fare adesso** oppure **cosa non ti
succede più**. Mai il perché, mai il come, mai di chi era la colpa.

> ✗ *"L'automatismo delle ricevute non funzionava: era un pezzo di libreria che non era stato
> copiato sul server. Ora funziona."*
> ✓ *"Le ricevute della Questura arrivano da sole ogni mattina: non devi più avviarle a mano."*

**Non entra:**

- ciò che è **spento o non ancora attivo** — si annuncia quando si accende, non prima;
- la **causa tecnica** di un bug;
- le **istruzioni di supporto** (svuotare la cache, forzare il ricaricamento): sono assistenza;
- il **lavoro interno** — refactoring, spostamenti di codice, test, dipendenze;
- qualunque frase che dica **che non è cambiato niente**. Una voce che spiega di non essere una
  novità è il segnale che quella voce non andava scritta.

**Un bugfix entra solo se l'utente aveva visto il problema.** Lo stesso ticket che riappariva
confermato due volte: sì, lo vedeva. Un timeout di un controllo notturno: no.

**Cosa succede se non resta niente.** È l'esito normale di molte release, non un'anomalia. La
versione **compare lo stesso** nell'elenco — numero e data, così la storia non ha buchi — ma
**senza titolo e senza voci**. Non inventare un titolo per riempire lo spazio, e soprattutto non
scriverci che non è cambiato niente.

**Il titolo della versione**, quando c'è, è una frase che dice cosa adesso funziona
(*"Le ricevute della Questura arrivano da sole, ogni mattina"*), non un riassunto del diff.

**Le categorie sono tre: `Nuovo`, `Migliorato`, `Corretto`.** Se nel file ne trovi altre, è drift
accumulato: non aggiungerne, usa queste tre.

**Il formato del file, quando il repo non ne ha uno** — `CHANGELOG-NOVITA.md` nella radice, la
versione più recente in alto, nella lingua del repo (nel dubbio, italiano):

```markdown
# Novità

Cosa è cambiato, in breve.

---

## [X.Y.Z] — AAAA-MM-GG

### <titolo della versione>

**Nuovo**
- ...

**Migliorato**
- ...

**Corretto**
- ...
```

Le categorie vuote non compaiono. Una versione senza voci è solo `## [X.Y.Z] — AAAA-MM-GG`, senza
titolo. Se il repo mostra le novità altrove (un file JSON che alimenta un popup, una pagina), il
formato di quel posto vince: qui si fissa solo quello che manca.

## 5 — Anteprima, poi chiedi

Se lo strumento ha una modalità a vuoto (`--dry-run`, `--no-git`), **usala**: mostra all'utente bump
+ changelog + **i merge del passo 2 che stanno per essere pubblicati**, e **attendi conferma
esplicita**. Senza strumento (§0b o procedura ricostruita) l'anteprima è: il file di changelog come
è scritto, il nome del tag, il commit e il push che seguiranno. È l'ultimo punto di controllo — dopo si scrive e si pusha.

## 6 — Applica

Lancia il comando rilevato al passo 0, o i comandi del §0b.

> ⚠️ Questo passo **pusha sul branch di default**, e con esso tutti i merge accumulati in locale. In
> molti repo quel push fa partire un deploy: se il `CLAUDE.md` lo dice, ripetilo all'utente prima di
> lanciare. Mai senza la conferma del passo 5.

## 7 — Verifica

```bash
git describe --tags --abbrev=0      # il tag nuovo c'è?
git status -sb                      # allineato col remoto?
```

Rimuovi i file temporanei.

Se qualcosa si è fermato a metà (changelog scritto ma tag no, commit fatto ma push rifiutato)
**dillo esplicitamente e fermati**: non rilanciare il comando sperando che vada. Una release a metà
si ripara guardandola; un tag doppio è più fastidioso di una release rimandata di un'ora.

**Se il passo 7 non è pulito, la pulizia dei branch non si fa.** Il passo 8 presuppone che quello
che è mergiato sia anche pubblicato: su una release a metà quel presupposto salta.

## 8 — Pulizia dei branch morti

Qui, e non prima. Un branch mergiato prima del rilascio è dentro il rilascio appena fatto: il suo
contenuto è pushato e taggato, quindi cancellarlo non perde niente. Cancellarlo **prima** del passo
6 vorrebbe dire cancellarlo mentre esiste solo sulla tua macchina.

Due categorie, con due livelli di rischio completamente diversi. **Non confonderle mai.**

### 8a — Prima, allinea i riferimenti

```bash
git fetch --prune origin
DEF=$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's|^origin/||')
```

`--prune` toglie i `origin/<branch>` di rami che sul remoto non esistono più. Non cancella niente di
tuo: rimuove puntatori a cose già sparite. Senza questo, la lista dei passi seguenti è una
fotografia vecchia e proporrai di cancellare roba già cancellata.

### 8b — I tag di salvataggio e i mergiati: sicuri, conferma unica

**Prima i tag `pre-collassamento-*`** di `/dnz:squash-story`, se ne sono rimasti: di solito li toglie
già `/dnz:merge`, ma chi ha scelto «mi fermo» o ha mergiato in altro modo li ha ancora. Si tolgono
se il loro albero compare nella history del default, altrimenti restano e lo dici. Vanno **prima dei
branch**, e non servono né il nome del branch né che esista ancora.

```bash
for T in $(git tag --list 'pre-collassamento-*'); do
  if git log --format=%T "$DEF" | grep -qx "$(git rev-parse "$T^{tree}")"; then
    echo "$T"      # candidato: contenuto già nel default
  fi
done
```

Presentali insieme ai branch mergiati: **una sola conferma per tutto il gruppo**, poi `git tag -d`.

**Poi i branch mergiati.**

```bash
git branch --merged "$DEF"    | grep -vE "^\*|^ *$DEF\$"
git branch -r --merged "$DEF" | grep -vE "origin/HEAD|origin/$DEF\$"
```

Il contenuto di questi branch è già nel default. Presenta la lista e chiedi **una sola conferma per
tutto il gruppo**: qui non c'è niente da valutare caso per caso.

```bash
git branch -d <branch>        # -d, mai -D
```

`-d` **è** la rete di sicurezza: rifiuta di cancellare ciò che non è mergiato. Se git rifiuta,
non insistere e non passare a `-D` — vuol dire che quel branch non era quello che credevi:
fermati e guarda.

### 8c — I vecchi non mergiati: uno per uno

Fermi da **oltre 60 giorni** e con commit che non stanno da nessun'altra parte. Questi **non** sono
sicuri: quello che contengono esiste solo lì.

```bash
git for-each-ref --sort=committerdate \
  --format='%(committerdate:short)  %(refname:short)  %(upstream:track)' refs/heads/

git log "$DEF..<branch>" --oneline | wc -l    # quanto lavoro unico contiene
git log "$DEF..<branch>" --oneline | head -5  # e di che si tratta
```

Per ogni candidato presenta **data dell'ultimo commit, numero di commit unici e una riga su cosa
sono**, e chiedi **branch per branch**. Mai in blocco: è l'unico punto di questa skill in cui un sì
dato di fretta perde lavoro che non è da nessun'altra parte.

Serve `-D`, e solo dopo una conferma che riguarda **quel** branch:

```bash
git rev-parse <branch>        # stampalo PRIMA: è l'appiglio per recuperarlo
git branch -D <branch>
```

Lo SHA stampato prima della cancellazione è quello che permette un `git checkout <sha>` quando il
reflog è già scaduto. Senza, il recupero dipende dalla fortuna.

### 8d — Il remoto: passo a sé, conferma a sé

```bash
git push origin --delete <branch>
```

> ⚠️ **Il sì del passo locale non vale qui.** Elenca di nuovo cosa stai per togliere da `origin` e
> aspetta una conferma che riguardi il remoto. Il reflog non ti copre: un branch cancellato su
> `origin` si recupera solo se qualcuno ha ancora lo SHA da qualche parte.

Se il repo ha l'auto-delete del branch dopo il merge della PR, o protezioni sui branch, **quella
vince**: non rifare a mano un lavoro che la piattaforma fa già, e non litigare con una protezione.

### 8e — Cosa non si tocca mai

- il **branch di default**;
- il **branch su cui sei** (`git branch --show-current`);
- i branch con una **PR aperta**, anche se vecchi:
  ```bash
  gh pr list --head <branch> --state open    # se gh è disponibile
  ```
- i branch **checked out in un worktree** (`git worktree list`): git rifiuterebbe comunque, ma
  proporli è rumore;
- i branch di **manutenzione** (`release/*`, `hotfix/*`, `v1.x` e simili): sono vecchi per
  costruzione, non morti. Se il repo ne ha, escludili dalla ricerca invece di riproporli a ogni
  rilascio.

Se non c'è niente da cancellare, **dillo in una riga e basta**: la pulizia che non serve non merita
un report.

## 9 — Dove ti lascia

> «Rilasciata `vX.Y.Z` (`<n>` merge pubblicati). Cancellati `<n>` branch mergiati, `<n>` anche su
> `origin`, e `<n>` tag di salvataggio dello squash. Restano `<n>` branch non mergiati fermi da oltre 60 giorni: `<elenco>`.»

Se il repo ha un audit periodico o un triage dei rinvii, è questo il momento naturale per
ricordarlo — dopo il rilascio, non prima: si audita ciò che è appena uscito. Se il repo non ce
l'ha, non suggerire un passo che qui non esiste.
