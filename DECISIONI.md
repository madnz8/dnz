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

## Stato

| comando | canonico qui | note |
|---|---|---|
| `merge` | ✅ 2026-09-16 | push del default e cleanup del branch rimossi |
| `release` | — | 3 copie identiche da eliminare, 2 varianti di repo da decidere |
| `deferred` | — | divergenza sostanziale atala ↔ lifehacker |
| `squash-story` | — | divergenza sostanziale atala ↔ lifehacker |
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

## Aperti

- Il messaggio di chiusura nomina ancora il push come passo successivo dell'utente (non lo
  esegue). Se "levare il push" voleva dire non menzionarlo affatto, va tolto anche di lì.
