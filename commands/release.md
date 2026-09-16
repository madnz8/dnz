---
description: "Rilascia ciò che è sul branch di default: pubblica i merge accumulati, changelog + bump + tag + push, poi ripulisce i branch morti."
---

# dnz:release

Rilascia quello che è **già** sul branch di default: changelog + bump di versione + tag + push.
**Tutto eseguito dall'agente in locale, via terminale.** La parte cognitiva — decidere il bump e
scrivere il changelog — la fa l'agente; la meccanica la fa lo strumento di release del repo.

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

**Se non trovi nessun meccanismo, fermati e dillo.** Non inventare un `npm version` che il repo non
usa: un tag fuori schema o un bump scritto a mano sporcano una history che poi qualcuno dovrà
disfare a mano.

Riassumi all'utente cosa hai trovato — due righe — prima di procedere.

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

⚠️ **Se i changelog sono più d'uno** (tecnico e utente, oppure due lingue) vanno scritti **tutti**.
Dimenticarne uno non fa fallire niente e non lo nota nessuno — fino al rilascio dopo, quando manca
un pezzo di storia che ormai va ricostruito.

Il changelog racconta **cosa è cambiato per chi lo usa**, non l'elenco dei commit.

Se lo strumento vuole un file di input, salvalo **fuori dal repo** (lo scratchpad di sessione), così
non sporchi il working tree che il passo 1 ti ha chiesto di tenere pulito.

## 5 — Anteprima, poi chiedi

Se lo strumento ha una modalità a vuoto (`--dry-run`, `--no-git`), **usala**: mostra all'utente bump
+ changelog + **i merge del passo 2 che stanno per essere pubblicati**, e **attendi conferma
esplicita**. È l'ultimo punto di controllo — dopo si scrive e si pusha.

## 6 — Applica

Lancia il comando rilevato al passo 0.

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

### 8b — I mergiati: sicuri, conferma unica

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
> `origin`. Restano `<n>` branch non mergiati fermi da oltre 60 giorni: `<elenco>`.»

Se il repo ha un audit periodico o un triage dei rinvii, è questo il momento naturale per
ricordarlo — dopo il rilascio, non prima: si audita ciò che è appena uscito. Se il repo non ce
l'ha, non suggerire un passo che qui non esiste.
