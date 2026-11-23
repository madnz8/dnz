---
name: resolve-epic-retro
description: "Chiude la retrospettiva di un'epic finita, prima dello sweep dei rinvii: legge il report della retro, ti fa in un messaggio solo le domande ancora aperte, porta i consigli per le storie future in epics.md con bmad-correct-course e dice cosa resta allo sweep e cosa resta a te. Usala a fine epic, con il numero dell'epic, prima di /dnz:deferred-sweep-epic. Decisioni di prodotto, non codice: non scrive codice, non scrive nel registro dei rinvii e non scrive epics.md a mano."
---

# dnz:resolve-epic-retro

Il report della retro (`epic-N-retro-*.md`) lo legge solo chi lo apre. Nel registro dei rinvii
`bmad-loop` copia le **azioni con un `id`** della board, e di quelle si occupa
`/dnz:deferred-sweep-epic`. Il resto del report resta lì: le domande aperte, i finding rinviati che
nessuna azione nomina, i consigli per una storia futura. Questa skill prende **solo quel resto**, e
va lanciata prima dello sweep.

Argomento: il numero dell'epic (`/dnz:resolve-epic-retro 36`).

## 0 — Orientati

**Rileva, non presumere.** Se una di queste manca, fermati e dillo.

- **Il report.** `_bmad-output/implementation-artifacts/epic-N-retro-*.md`, o la cartella che il
  `CLAUDE.md` del repo o la configurazione di BMAD indicano. Se ce n'è più d'uno (track diversi,
  retro rifatta), chiedi quale.
- **La board**, `sprint-status.yaml` nella stessa cartella: la sua lista `action_items:` dice quali
  azioni hanno un `id`.
- **`bmad-correct-course`** fra le skill del repo (`.claude/skills/bmad-correct-course/`). Se manca,
  al §3 non si porta niente in `epics.md`: lo dici e lo lasci all'utente.
- **Le regole del repo**: il `CLAUDE.md` e le decisioni già scritte (per esempio un `DECISIONI.md`, o
  una riga `decision:` nel registro). Servono al §2.

## 1 — Leggi il report e separa

Leggi il report per intero; le sezioni hanno nomi in inglese o in italiano: «Open questions» /
«Domande aperte», «Action items» / «Azioni», «Findings» / «Rilievi», «Acceptance verdict» /
«Verdetto di accettazione».

- **Allo sweep, non qui:** ogni azione che nella board ha un `id` (`epic-N-retro-item-…`). E ogni
  domanda aperta che coincide con una di quelle azioni: ti arriverà dallo sweep, non due volte.
- **Qui:**
  - le **domande aperte** che nessuna azione con `id` copre;
  - i **finding rinviati** (marcati «rinviare», «da registrare») che nessuna azione nomina;
  - i **consigli per una storia futura** («nella 37.1 fai attenzione a X», «rinviare all'Epic 15»);
  - le **azioni senza `id`** nella board (`bmad-loop` non le copia mai nel registro).

## 2 — Le domande, in un messaggio solo

Prima togli quelle che hanno già una risposta scritta: una regola del `CLAUDE.md`, una decisione
già presa, un criterio che `epics.md` contiene già. Per quelle rispondi tu, e al §4 dici con quale
regola. Senza una regola scritta, non rispondi tu.

Le altre all'utente, **in un messaggio solo**, in parole semplici: per ciascuna cosa si decide, le
opzioni, e il tuo consiglio con il perché.

## 3 — Le storie future, con `bmad-correct-course`

I consigli per una storia futura, e le risposte del §2 che cambiano un criterio di una storia,
entrano in `epics.md` come criteri di accettazione **solo** con `bmad-correct-course`. Lancialo
**nella conversazione principale**, mai in un subagent: è interattivo, e un subagent non può
rispondere ai suoi menu. Dagli l'elenco delle modifiche (storia, criterio, da dove viene nel report)
e lascia all'utente le sue domande.

## 4 — Riassunto

- **Deciso:** le risposte dell'utente, e quelle date da te con la regola usata.
- **Entrato in `epics.md`:** storia e criterio, per ciascuna modifica.
- **Allo sweep:** le azioni con `id`, e il comando dopo: `/dnz:deferred-sweep-epic N`.
- **A te:** i passi che nessuna skill fa, come le impostazioni del loop (`.bmad-loop/policy.toml`) e
  i passi prima del merge (CI, prove sul sistema vero), più le azioni senza `id` che non sono
  domande né storie future.

## Non fare

- Non scrivere codice e non lanciare giri di `bmad-loop`.
- Non scrivere in `deferred-work.md`, nella board né negli altri artefatti di BMAD. `epics.md` cambia
  solo con `bmad-correct-course`, mai a mano.
- Non toccare `.bmad-loop/policy.toml`: lo dici all'utente.
- Non usare `bmad-customize`.
