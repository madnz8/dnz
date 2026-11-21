---
name: deferred-sweep-epic
description: "Sweep dei rinvii (deferred-work.md, formato `### DW-<n>:` di bmad-loop) di una sola epic chiusa: trova le voci aperte di quell'epic, comprese quelle nate da altri rinvii, propone quali valgono un giro, fa emergere e risolvere le decisioni prima di costruire, e dopo l'ok lancia un solo `bmad-loop sweep --only` con quegli id. Usala a fine epic, con il numero dell'epic. Non fa il triage di tutto il registro e non scrive piani (quello è deferred-triage), non scrive nel registro e non serve a rinviare un finding."
---

# dnz:deferred-sweep-epic

`bmad-loop` non sa limitare uno sweep a un'epic: `[sweep] auto = "per-epic"` guarda **tutto** il
registro, e `bmad-loop sweep` sceglie solo per id (`--only`) o per gravità (`--min-severity`). Questa
skill fa la parte che manca: ricava gli id dell'epic, tiene quelli che valgono un giro, porta le
decisioni all'utente **prima** di costruire, e lancia un solo giro con `--only`. Le voci delle altre
epic non si toccano.

Argomento: il numero dell'epic (`/dnz:deferred-sweep-epic 28`).

> **Cosa non è.** Il triage di tutto il registro, con il piano per chi decide e il non-lavoro, è
> `/dnz:deferred-triage`. Rinviare un finding lo fanno BMAD e `bmad-loop`. Questa skill sceglie le
> voci e lancia lo sweep: il registro lo scrive `bmad-loop`, non lei.

## 0 — Orientati

**Rileva, non presumere.** Se una di queste manca, fermati e dillo.

- **Il registro.** Di norma `_bmad-output/implementation-artifacts/deferred-work.md`; se il
  `CLAUDE.md` del repo o la configurazione di BMAD dicono un altro percorso, vale quello.
- **Il formato di `bmad-loop`.** Il registro può contenere byte NUL: mai `grep` semplice.

  ```bash
  grep -caE '^### DW-[0-9]+:' <registro>   # 0: non è il formato DW, qui non c'è sweep da fare
  command -v bmad-loop                      # assente: non c'è chi esegue lo sweep
  ```

- **Track con numeri di epic omonimi.** Se il registro copre due track che numerano le epic da
  capo, «epic N» è ambiguo. Il `CLAUDE.md` del repo dice quale track escludere: il suo testo
  nell'`origin:` diventa un `--exclude` al §2. Se il `CLAUDE.md` tace ma le righe `origin:`
  nominano più track, chiedi:

  ```bash
  grep -aoE 'track [^)",]*' <registro> | sort | uniq -c
  ```

- **Le regole del repo per lo sweep**, se il `CLAUDE.md` le dà: marcature che dicono quando una voce
  va fatta (per esempio «prima del rilascio», «prima del merge»), e **regole di dominio già decise**
  (cose che il prodotto fa o non fa per scelta). Servono al §3 e al §4. Se non ci sono, i default
  del §3 bastano e nessuna domanda si risolve da sola.
- **Il branch di default** (`git symbolic-ref --short refs/remotes/origin/HEAD`, senza `origin/`).

## 1 — Condizioni

Controlla tutto prima di lanciare; se una non regge, fermati e dillo.

- **L'epic è chiusa.** Nello `sprint-status.yaml` `epic-N` e ogni storia `N-*` sono `done`. Se la
  retrospettiva è ancora `optional`, chiedi se procedere comunque. Se il repo non ha uno
  `sprint-status.yaml` (bmad-loop in modalità stories o tickets), dillo e chiedi.
- **`git status` pulito, e il branch non è quello di default**: lo sweep committa nel branch
  corrente.
- **Nessun run in corso.** `bmad-loop ls --project .`: la colonna STATUS deve dire `finished` o
  `stopped` per tutti. Uno `running` o in pausa: chiedi.
- **`bmad-loop validate --project .` esce con 0.** Se fallisce con
  `.claude/skills/bmad-loop-sweep is incomplete`, i triage si bloccano. `bmad-loop init
  --force-skills` lo ripara ma **sovrascrive le modifiche locali a ogni skill `bmad-loop-*`** e
  lascia file modificati nel repo: chiedi il permesso, e dopo falli committare prima di continuare.

## 2 — Trova i rinvii dell'epic

```bash
python3 -I "${CLAUDE_SKILL_DIR}/select_deferred.py" <N> --ledger <registro> [--exclude "<testo>"]…
```

Su Windows, se `python3` non c'è, `py -3` o `python`. Lo script stampa:

- **certe**: voci aperte la cui `source_spec:` o `origin:` nomina una storia dell'epic (`spec-N-…`,
  `N-M-slug`, `story N-M`, `epic-N`, `Epic N`, `epica N`), comprese quelle della retrospettiva. Una
  voce **nata da un altro rinvio** e senza epic sua eredita l'epic della voce da cui viene, anche su
  più livelli, e lo dice con `[via DW-24]`. Il rimando può essere `origin: review di DW-24`,
  `source_spec: spec-dw-24-…`, oppure `spec-dw-<nome-del-gruppo>.md`: quest'ultimo lo script lo
  risolve con i `triage.json` dei giri passati (`--runs`, di default `.bmad-loop/runs`).
- **`[anche epic M]`**: la voce nomina anche un'altra epic. Va detto al §3.
- **`[decision: …]`**: su quella voce una persona ha già scelto (spesso `keep-open`, il non-lavoro
  segnato da `/dnz:deferred-triage`). Va detto al §3.
- **dubbie**: l'epic compare solo in `reason:` o `location:`. Restano fuori, a meno che l'utente le
  aggiunga.
- **Di nessuna epic**: quante voci aperte lo script non sa attribuire a nessuna epic, con gli id.
  Non sono di questo sweep: le prende `/dnz:deferred-triage` o uno sweep a mano con `--only`.
- **Escluse da --exclude**: quante voci ha tolto il filtro sui track.

## 3 — Scegli le voci che valgono un giro, e conferma

Un giro costa ore e milioni di token: non tutte le certe lo valgono. Leggi le certe (titolo,
`severity:`, `reason:`) e proponi due liste. Default, che le regole del `CLAUDE.md` del repo
correggono:

- **dentro**: gravità `medium` o superiore; bug di correttezza (dati sbagliati, blocchi, operazioni
  che falliscono); voci marcate da fare prima del rilascio; voci su cui l'utente ha già deciso di
  costruire.
- **fuori**: rifiniture (log, commenti, rinomine, file da dividere), limiti rari, ottimizzazioni;
  voci che il repo fa al merge del branch e non in uno sweep; voci con una `decision:` `keep-open`;
  voci che spettano a una **storia futura**. Per queste ultime proponi all'utente di farne un
  criterio di quella storia: la modifica ai documenti di pianificazione la decide e la fa lui, la
  voce resta aperta.

Mostra le due liste, **una riga per voce** (id, gravità, titolo, perché), più quante dubbie e quante
di nessuna epic. Poi il **costo atteso**, dai giri precedenti dello stesso repo:

```bash
for r in .bmad-loop/runs/*/; do
  [ -f "$r/sweep.json" ] || continue    # solo gli sweep, non i giri delle storie
  echo "$(basename "$r") $(grep -h 'run finished' "$r/ATTENTION" 2>/dev/null | tail -1)"
done | tail -5
```

Il nome della cartella è l'inizio del giro (`AAAAMMGG-hhmmss`), la riga `run finished` ne dà la fine,
le voci chiuse e i token pesati; quante voci aveva il giro lo dice `"only"` in `sweep.json`. Come
ordine di grandezza, da un repo con verifiche complete: un giro con una o due voci è costato circa 2
milioni di token pesati e 40 minuti; giri da 4 a 34 voci da 8 a 17 milioni, e da 2 a 5 ore. Se il
repo non ha giri precedenti, dillo.

**Non lanciare niente senza l'ok dell'utente**, che sposta voci fra le liste. Se dentro non resta
niente, dillo e fermati: **non fare uno sweep su tutto il registro come ripiego**.

## 4 — Prima le domande

Le **decisioni** del triage (le voci dove serve una scelta umana) si prendono prima di costruire,
così basta un solo giro che costruisce. Un giro di sole domande, in background:

```bash
bmad-loop sweep --decisions-only --no-prompt --only DW-a,DW-b,…
```

Fa il triage e chiude le voci già risolte nel codice, ma **non costruisce niente**; con `--no-prompt`
le decisioni restano in sospeso invece di aspettare una risposta. È finito quando
`bmad-loop ls --project .` lo mostra `finished` o `stopped`. Poi leggi le domande:

```bash
bmad-loop decisions --list --json
```

Il triage riscrive domande e opzioni a ogni giro: leggi sempre la lista di adesso, non quella di
prima. Per ogni domanda:

- **Già coperta da una regola scritta** (una regola di dominio del `CLAUDE.md`, o una `decision:` già
  registrata): rispondi tu, e al §5 dici all'utente cosa hai risposto e con quale regola. Senza una
  regola scritta, non rispondi tu.
- **L'opzione consigliata va contro una regola già decisa**: dillo, e consiglia l'altra.
- **Tutte le altre**: all'utente, **in un messaggio solo**, in parole semplici, con le opzioni e la
  tua raccomandazione.

Registra le risposte **una per volta**. `bmad-loop decisions` pone le domande in sospeso in ordine,
quindi la risposta passata va alla **prima** della lista:

```bash
printf '<chiave dell opzione>\n' | bmad-loop decisions
bmad-loop decisions --list --json      # ricontrolla: è sparita quella giusta?
```

Con più risposte in fila, una domanda che cambia posto prende la risposta di un'altra. Una risposta
`close` chiude subito la voce; `build` e `keep-open` restano salvate e le usa il giro del §5.

## 5 — Un solo giro che costruisce

```bash
bmad-loop sweep --no-prompt --only DW-a,DW-b,…
```

In background, con gli id del §3 **ancora aperti**: `--only` rifiuta l'intero giro se un id non
esiste o è chiuso («--only ids must exist and be open»), e il §4 ne chiude alcuni (le voci già
risolte nel codice, le risposte `close`). Rilancia lo script del §2 e tieni solo gli id scelti che
compaiono ancora fra le certe. Un giro
dura ore: un comando in primo piano lanciato dall'agente si ferma molto prima. È finito quando
`bmad-loop ls --project .` lo mostra `finished` o `stopped`. Se l'utente preferisce lanciarlo lui
nel suo terminale, va bene: aspetta che ti dica che è finito.

Se la costruzione si ferma su un **dubbio nuovo**, che il §4 non aveva fatto emergere, il giro lo
salta (`decision-skipped-unattended` nel `journal.jsonl` del run): rifai il §4 su quelle voci, se
ancora aperte, e solo allora un secondo giro. Altrimenti il giro è uno.

Il tetto è `max_bundles` (di default 5 gruppi per giro). Se il triage ne ha trovati di più, il giro
lo dice (`sweep-bundles-truncated` nel journal): le voci in eccesso restano aperte, e lo dici.

## 6 — Dopo

- **Rilancia lo script del §2.** Le voci scelte ancora aperte sono quelle che il giro non ha chiuso.
  Le **voci nate durante questo giro** (le review dei gruppi rinviano a loro volta) lo script le
  riconosce dalla catena, `[via DW-…]`: non si inseguono con un altro giro. Restano allo sweep della
  prossima epic chiusa o a `/dnz:deferred-triage`, salvo che l'utente chieda altro.
- **Riassumi per l'utente**: chiuse (con la riga `resolution:`), rimaste aperte e perché, decisioni
  prese da lui e quelle che hai risposto tu con la regola usata, voci nuove nate dal giro.
- **I commit dello sweep** hanno i subject di `bmad-loop` e vanno riscritti prima del merge con
  `/dnz:squash-story`.

## Non fare

- **Non scrivere in `deferred-work.md`.** Durante lo sweep e con `bmad-loop decisions` lo scrive
  `bmad-loop`; chiudere una voce a mano, fuori da uno sweep, è il lavoro di `/dnz:deferred-triage`.
- Non scrivere nei documenti di pianificazione (`epics.md`, le storie): proponi, decide l'utente.
- Non pushare e non archiviare il registro: `bmad-loop sweep --archive` è un passo di
  `/dnz:deferred-triage`.
- Non toccare `.bmad-loop/policy.toml`: `[sweep] auto` resta com'è.
- Non lanciare uno sweep senza `--only`: guarderebbe tutto il registro.
