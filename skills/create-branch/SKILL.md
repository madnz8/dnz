---
name: create-branch
description: "Apre un branch di lavoro dal default aggiornato, con un nome che segue le convenzioni del repo (feature/, batch/, fix/), dopo l'ok sul nome. Usala quando inizia un lavoro sul prodotto: una story, un epic, un ticket, un batch di fix o un fix singolo. Non pusha."
argument-hint: "<descrizione del lavoro | ticket>"
---

# dnz:create-branch

Apre il branch su cui si farà un lavoro. È il primo anello della catena: **`create-branch` → lavoro
→ `/dnz:squash-story` → review → `/dnz:merge` → `/dnz:release`**.

Il nome conta più di quanto sembri: finisce nel messaggio del merge commit, cioè nella history
permanente del default. Un nome giusto adesso evita di doverlo correggere nel messaggio dopo.

**Cosa non fa:** non pusha senza il tuo sì, non sovrascrive un branch che esiste, non fa `stash`.

## 0 — Orientati. Rileva, non presumere

```bash
DEF=$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's|^origin/||')   # non darlo per 'main'
git branch --show-current
git status --short
git branch -r --sort=-committerdate | head -30                                  # i nomi già in uso
```

- **Le convenzioni di naming del repo** (`CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`): se ne
  definiscono una, vince sulla tabella del §1. Lo stesso vale se i nomi in uso seguono con
  evidenza uno schema diverso: seguilo e dillo.
- **Il tracker** (Linear, Jira, GitHub Issues, o nessuno). Il ticket si usa se c'è, e il titolo si
  legge da lì. **Non si inventa un ticket** per avere un nome più ricco.
- **Se l'ambiente impone già un branch**, per esempio una sessione cloud a cui l'harness ha
  assegnato il suo: **non crearne un altro.** Dillo all'utente e fermati.

## 1 — Che lavoro è, e quindi come si chiama

Default del plugin:

| Lavoro | Nome |
|---|---|
| story, epic o lavoro completo **con** ticket | `feature/<ticket-minuscolo>-<slug>`, es. `feature/abc-41-action-layer-cleanup` |
| story, epic o lavoro completo **senza** ticket | `feature/<slug>`, es. `feature/checkout-tre-passi` |
| batch di fix rapidi | `batch/AAAA-MM-GG-<tema>`, es. `batch/2026-06-27-bug-fixes` |
| fix singolo | `fix/<slug>` |
| solo documenti (note, sprint, tooling) | **nessun branch** |

- **Solo documenti:** non si apre niente. Si committa sul default (vedi `/dnz:commit` §6), e **non si
  pusha senza una conferma esplicita**. Dillo e fermati.
- **Se il tipo non è chiaro** dalla richiesta, una domanda sola, con le opzioni della tabella.
- **Lo slug:**
  - ricavato dal titolo del ticket o dell'epic, altrimenti dalla descrizione dell'utente;
  - minuscolo e ASCII, diacritici traslitterati (`à` → `a`);
  - solo `[a-z0-9-]`, trattini consecutivi collassati, niente trattino in testa o in coda;
  - al massimo circa 50 caratteri, tagliati su un confine di parola.
- **Il ticket va in minuscolo** (`ABC-41` → `abc-41`).
- **La data del batch è quella locale**, `date +%F`, non UTC: un batch aperto alle 00:30 è di oggi.

**Mostra il nome proposto e aspetta l'ok** prima di crearlo.

## 2 — Precondizioni

- **Il nome è libero**, in locale e su `origin`:
  ```bash
  git fetch origin
  git rev-parse --verify --quiet "refs/heads/<nome>"
  git rev-parse --verify --quiet "refs/remotes/origin/<nome>"
  ```
  Se esiste, chiedi se **riprendere quel branch** o sceglierne un altro. Mai sovrascriverlo.
- **Working tree sporco:**
  - sei sul default e le modifiche sono **l'inizio di questo stesso lavoro**: proponi di portarle sul
    branch nuovo (`git switch -c` le porta con sé);
  - sei su un altro branch, o le modifiche sono d'altro: **fermati e chiedi**;
  - mai uno `stash` silenzioso: è lavoro che sparisce dalla vista.

## 3 — Crea il branch dal default aggiornato

```bash
git switch "$DEF"
git pull --ff-only          # se fallisce per divergenza: fermati e dillo
git switch -c <nome>
```

Il default locale può essere **avanti** rispetto a `origin`: `/dnz:merge` lascia i merge in locale
finché non si pusha o si rilascia. In quel caso il branch nuovo li contiene. Va bene, ma dillo nel
riassunto: `git log --oneline "origin/$DEF..$DEF"` dice quanti sono.

## 4 — Controlli di avvio

Tutti condizionali, nessuno bloccante. Si **propongono**, non si eseguono d'ufficio.

- **Git hook del repo non installati in questo clone.** Se il repo ha un installatore
  (`scripts/install-git-hooks.sh`, husky, lefthook, `.pre-commit-config.yaml`) e `core.hooksPath` o
  `.git/hooks/` dicono che qui non è attivo, proponi di installarlo.
- **Il ticket**, se c'è e ha uno stato «In corso»: proponi di spostarlo.
- **`bmad-loop`.** Se il lavoro partirà con `bmad-loop`, ricorda che lavora in un worktree per story
  e fonde ogni story **nel branch da cui parte la run**: la run va lanciata da questo branch, non dal
  default.

## 5 — Chiudi

Due righe: branch creato, da quale commit del default (con quanti merge non ancora pushati, se ce
ne sono), ticket.

Poi **proponi** il push, senza eseguirlo:

```bash
git push -u origin <nome>
```

Pusha solo se l'utente dice sì. `/dnz:merge` chiederà comunque un branch pushato.
