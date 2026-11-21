---
name: deferred-sweep-epic
description: "Sweep dei rinvii (deferred-work.md, formato `### DW-<n>:` di bmad-loop) di una sola epic chiusa: trova le voci aperte di quell'epic, comprese quelle nate da altri rinvii, le mostra con il costo atteso e, dopo l'ok, lancia `bmad-loop sweep --only` con quegli id. Usala a fine epic, con il numero dell'epic. Non fa il triage di tutto il registro e non scrive piani (quello è deferred-triage), non scrive nel registro e non serve a rinviare un finding."
---

# dnz:deferred-sweep-epic

`bmad-loop` non sa limitare uno sweep a un'epic: `[sweep] auto = "per-epic"` guarda **tutto** il
registro, e `bmad-loop sweep` sceglie solo per id (`--only`) o per gravità (`--min-severity`). Questa
skill fa la parte che manca: ricava gli id dell'epic e li passa a `--only`. Le voci delle altre epic
non si toccano.

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
  `N-M-slug`, `story N-M`, `epic-N`, `Epic N`, `epica N`). Una voce **nata da un altro rinvio** e
  senza epic sua eredita l'epic della voce da cui viene, anche su più livelli, e lo dice con
  `[via DW-24]`. Il rimando può essere `origin: review di DW-24`, `source_spec: spec-dw-24-…`, oppure
  `spec-dw-<nome-del-gruppo>.md`: quest'ultimo lo script lo risolve con i `triage.json` dei giri
  passati (`--runs`, di default `.bmad-loop/runs`). Sono le sole che entrano nello sweep.
- **`[anche epic M]`**: la voce nomina anche un'altra epic. Entra, ma va detto al §3.
- **`[decision: …]`**: su quella voce una persona ha già scelto (spesso `keep-open`, il non-lavoro
  segnato da `/dnz:deferred-triage`). Entra, ma va detto al §3: l'utente può toglierla.
- **dubbie**: l'epic compare solo in `reason:` o `location:`. Restano fuori, a meno che l'utente le
  aggiunga.
- **Di nessuna epic**: quante voci aperte lo script non sa attribuire a nessuna epic, con gli id.
  Non sono di questo sweep: le prende `/dnz:deferred-triage` o uno sweep a mano con `--only`.
- **Escluse da --exclude**: quante voci ha tolto il filtro sui track.

## 3 — Conferma

Mostra le voci certe (id, gravità, titolo, note), quante dubbie e quante di nessuna epic. Poi il
**costo atteso**, dai giri precedenti dello stesso repo:

```bash
for r in .bmad-loop/runs/*/; do
  [ -f "$r/sweep.json" ] || continue    # solo gli sweep, non i giri delle storie
  echo "$(basename "$r") $(grep -h 'run finished' "$r/ATTENTION" 2>/dev/null | tail -1)"
done | tail -5
```

Il nome della cartella è l'inizio del giro (`AAAAMMGG-hhmmss`), la riga `run finished` ne dà la fine,
le voci chiuse e i token pesati; quante voci aveva il giro lo dice `"only"` in `sweep.json`. Riporta
token e durata. Come ordine di grandezza, da un repo con verifiche complete: un giro
con una o due voci è costato circa 2 milioni di token pesati e 40 minuti; giri da 4 a 34 voci da 8 a
17 milioni, e da 2 a 5 ore. Se il repo non ha giri precedenti, dillo.

**Non lanciare niente senza l'ok dell'utente**, che può togliere id o aggiungerne dalle dubbie. Se
le certe sono zero, dillo e fermati: **non fare uno sweep su tutto il registro come ripiego**.

## 4 — Lancia lo sweep

Un giro dura ore: un comando in primo piano lanciato dall'agente si ferma molto prima. E le
**decisioni** del triage (le voci dove serve una scelta umana) le chiede `bmad-loop` a chi è al
terminale. Quindi due modi, e se l'utente non ha già scelto chiedi quale:

- **Nel terminale dell'utente**, consigliato quando ci si aspettano decisioni. L'utente lancia lui:

  ```bash
  bmad-loop sweep --only DW-a,DW-b,…
  ```

  e risponde alle decisioni man mano. Aspetta che ti dica che è finito.

- **Dall'agente, in background**, con `--no-prompt` (senza, `bmad-loop` aspetterebbe risposte che
  nessuno dà):

  ```bash
  bmad-loop sweep --only DW-a,DW-b,… --no-prompt
  ```

  Il giro è finito quando `bmad-loop ls --project .` lo mostra `finished` o `stopped`: è il segnale
  giusto sia che il comando resti attaccato fino alla fine sia che ritorni prima.

  Le voci che chiedono una decisione **non vengono costruite**: il giro le salta
  (`decision-skipped-unattended` nel `journal.jsonl` del run) e restano aperte. Alla fine
  `bmad-loop decisions --list` le elenca; l'utente risponde con `bmad-loop decisions`, nel suo
  terminale. Una risposta `close` chiude subito la voce; `build` e `keep-open` restano salvate e le
  usa lo sweep successivo, che quindi va rilanciato su quegli id.

Il tetto è `max_bundles` (di default 5 gruppi per giro). Se il triage ne ha trovati di più, il giro
lo dice (`sweep-bundles-truncated` nel journal): le voci in eccesso restano aperte.

## 5 — Dopo

- **Rilancia lo script del §2.** Le certe ancora aperte sono quelle che lo sweep non ha chiuso. Fra
  loro ci possono essere **voci nate durante questo sweep** (le review dei gruppi rinviano a loro
  volta): lo script le riconosce dalla catena, `[via DW-…]`, e sono di questa epic. Se ce ne sono,
  proponi un secondo giro con gli id ancora aperti; ogni giro chiede di nuovo l'ok del §3.
- **Riassumi per l'utente**: chiuse (con la riga `resolution:`), rimaste aperte e perché, decisioni
  prese e decisioni ancora da prendere.
- **I commit dello sweep** hanno i subject di `bmad-loop` e vanno riscritti prima del merge con
  `/dnz:squash-story`.

## Non fare

- **Non scrivere in `deferred-work.md`.** Durante lo sweep lo scrive `bmad-loop`; chiudere una voce a
  mano, fuori da uno sweep, è il lavoro di `/dnz:deferred-triage`.
- Non pushare e non archiviare il registro: `bmad-loop sweep --archive` è un passo di
  `/dnz:deferred-triage`.
- Non toccare `.bmad-loop/policy.toml`: `[sweep] auto` resta com'è.
- Non lanciare uno sweep senza `--only`: guarderebbe tutto il registro.
