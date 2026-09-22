---
description: "Chiude un branch: merge --no-ff in locale e chiusura del ticket. Non pusha il branch di default, non cancella il branch, non rilascia."
---

# dnz:merge

Chiude un branch: **merge → ticket**. Tutto eseguito dall'agente in locale, via terminale —
niente operazioni dalla UI di GitHub. La PR serve per la review e la preview; il merge è sempre
`git merge --no-ff` in locale, mai il bottone "Merge" della UI, che produce un
`Merge pull request #N` fuori da qualunque convenzione di progetto.

**Cosa non fa:**

- **Non pusha il branch di default.** Il push è il passo irreversibile della giornata e in molti
  repo fa partire un deploy: resta un gesto tuo. A fine corsa il default locale è avanti e non
  pushato, e la skill te lo dice.
- **Non cancella il branch.** Sopravvive al merge; se va tolto, lo togli quando vuoi.
- **Non rilascia.** Il rilascio ha tempi suoi e non è detto che vada fatto adesso: a fine corsa
  questa skill te lo ricorda, e basta.

## 0 — Orientati nel repo

Due cose da sapere prima di toccare qualcosa. **Rileva, non presumere.**

```bash
DEF=$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's|^origin/||')   # non darlo per 'main'
git branch --show-current                                                       # il branch da chiudere
```

- **Convenzioni dei messaggi** — leggi il `CLAUDE.md` del repo (o `AGENTS.md`/`CONTRIBUTING.md`). Se
  definisce un formato per il commit di merge, **quello vince** su quanto scritto qui sotto.
- **Ticket** — c'è un tracker (Linear, Jira, GitHub Issues)? Il ticket si deduce dal nome del
  branch, dai commit o dal corpo della PR? Se non lo trovi, il passo 3 semplicemente **non si fa**:
  non si inventa un ticket per avere qualcosa da chiudere.
- **Il nome del branch** finisce nel messaggio del passo 2, e da lì nella history permanente del
  branch di default. Se è muto o fuorviante, **questo è l'ultimo momento per cambiarlo** — ma non si
  rinomina qui: la procedura, con l'avvertenza sulle PR aperte, sta in `/dnz:squash-story`.

## 1 — Precondizioni

- **Review della PR conclusa.**
- **History già ripulita**, se serviva. Non darlo per fatto: **contala**.
  ```bash
  git log --oneline "$DEF..$(git branch --show-current)" | wc -l
  git log --oneline "$DEF..$(git branch --show-current)" | grep -cE '\(iter [0-9]+\)|start .*pipeline'
  ```
  Oltre una manciata di commit, o con anche un solo subject di impalcatura, **proponi
  `/dnz:squash-story` e fermati**: dopo il merge il branch è ancora lì, ma il suo contenuto è già
  atterrato nel default — riscriverne la history non cambia più quello che la history del progetto
  racconta. Questa è l'ultima occasione.
- Working tree pulito, branch già pushato.
- Nessun artefatto locale finito per sbaglio nei commit (report di review, file temporanei): se
  `git status --short` ne mostra, vanno rimossi o messi in `.gitignore` **prima** del merge, non
  dopo.

## 2 — Merge (locale)

```bash
git status --short                    # deve essere vuoto

git fetch origin
git checkout <branch-di-default>
git pull --ff-only

# sanity check: il merge è lineare (il default è antenato del branch)
git merge-base --is-ancestor origin/<branch-di-default> <branch> && echo "OK: merge lineare"

git merge --no-ff <branch> -m "<messaggio, vedi sotto>"
```

**Mai squash. Mai rebase. Sempre un merge commit.** Il merge commit è il punto in cui la history
dice *«qui è atterrato un lavoro intero, e si chiamava così»*: schiacciarlo perde esattamente
l'informazione per cui il branch esisteva.

### Il messaggio

Formato di default, se il repo non ne impone un altro:

```
merge(<area>): merge branch '<nome-branch>' (<ticket>)
```

- `<area>` è l'**area di dominio** toccata dal lavoro, non il tipo conventional-commit: non
  `fix`/`feat` ma il *dove* (`auth`, `billing`, `ui`, `refactor`, `docs`…). Deve essere una chiave a
  bassa cardinalità che **ricorre nel tempo**: un'area torna per anni, un numero di ticket compare
  in dieci commit e poi mai più.
- `<ticket>` sono i ticket coperti dal branch, separati da virgola. Se non ce ne sono, si omette la
  parentesi — non si inventa.

A questo punto il branch di default **locale** è avanti, ma non ancora pushato. **Resta così**:
questa skill non lo pusha.

## 3 — Chiusura del ticket *(solo se ce n'è uno)*

Salta questo passo senza rumore se al passo 0 non hai trovato né tracker né ticket.

Per ogni ticket del branch, **prima** recuperane lo stato attuale e i criteri di accettazione, e
verifica se il branch lo copre **davvero per intero**. Poi:

1. un commento di tracciabilità — cosa è entrato, con il riferimento al merge (PR, SHA, e la
   versione se è già stata rilasciata);
2. stato → **Done**.

> ⚠️ **Ticket coperto solo in parte** — per esempio un'issue con più sotto-punti, di cui alcuni
> lasciati aperti di proposito: **non chiuderlo d'ufficio. Fermati e chiedi**, presentando le
> opzioni:
>
> - **Done + follow-up** — chiudi e apri una nuova issue per il residuo, collegata;
> - **Tieni aperto** — ri-scoping del ticket sul solo residuo, niente chiusura;
> - **Done senza follow-up** — chiudi accettando il residuo come won't-do.
>
> In ogni caso il commento deve elencare **esplicitamente** cosa è entrato e cosa resta fuori.
> Questo è l'unico passo della skill che non è meccanico, ed è quello che conta: è il punto in cui
> un lavoro incompleto smette di sembrare completo.
>
> Le issue *contenitore* (bucket, epic ancora aperti) non si chiudono mai: solo commento.

## 4 — Dove ti lascia

Il merge non pusha e non rilascia. Chiudi dicendo all'utente dove si trova, senza eseguire nulla
di tutto questo:

> «Fatto: `<branch>` è dentro `<branch-di-default>` **in locale**, e `<ticket>` è chiuso. Il
> default non è pushato e il branch `<branch>` è ancora lì: sono due gesti tuoi. Se vuoi
> rilasciare: `/dnz:release`.»

Se il repo non ha un meccanismo di release (nessun tag, nessun changelog), ometti l'ultima riga:
non suggerire un passo che in questo repo non esiste.
