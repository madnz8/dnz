# Migrazione dei repo alla fonte unica

Le sette skill `/dnz:*` sono state consolidate in `~/workspace/dnz/skills/` a partire dalle 14
copie divergenti sparse su quattro repo e sul livello utente. Questo documento serve a portarle nei
repo: sono **prompt da incollare nella sessione di ciascun repo**, perché da qui gli altri repo si
leggono ma non si scrivono.

Censimento aggiornato al 2026-09-29: le copie vecchie sono ancora tutte al loro posto (atala 5,
lifehacker 4, lead-generation 1, trasformazione 1, più le 3 a livello utente) e nessun prompt qui
sotto è stato ancora eseguito.

## Come si installa

Il repo `dnz` **è** un marketplace: `.claude-plugin/marketplace.json` lo dichiara, e
`.claude-plugin/plugin.json` descrive il plugin. Una volta che il repo è su GitHub, su qualunque
macchina:

```
/plugin marketplace add madnz8/dnz
/plugin install dnz@dnz
```

Le sette skill compaiono come `/dnz:merge`, `/dnz:release` e così via — gli stessi nomi di prima,
quindi niente da reimparare (da `commands/` a `skills/` cambia il formato, non il nome). Gli
aggiornamenti si prendono con `/plugin update dnz`.

**Perché il marketplace e non una copia nei repo.** Perché così si installa su qualunque macchina
con due righe, invece di dipendere da una cartella che esiste solo su rings. È anche l'unica forma
che ha una versione: `2.1.0` oggi, e un `/plugin update` quando cambia.

> ⚠️ **Claude web non vede i plugin** (provato il 2026-09-28). Il plugin copre le macchine, non il
> web: come arrivarci è un punto aperto in `DECISIONI.md`, e **non cambia niente per questi prompt**.

## Cosa resta da fare nei repo

Installare il plugin **non basta**: finché nei repo restano le copie vecchie in
`.claude/commands/dnz/`, sono quelle a vincere, e continueresti a usare le versioni divergenti
senza accorgertene.

Quindi in ogni repo servono due cose:

1. **Togliere le copie vecchie.** Prima verifica con `/plugin` che `dnz` sia installato *in quel
   repo*: togliere le copie senza plugin lascia il repo senza comandi.
2. **Salvare nel `CLAUDE.md` i fatti del progetto che le versioni consolidate non contengono più.**

Verificato il 2026-09-29: quasi nessuno di quei fatti è già nei `CLAUDE.md` (in atala mancano
`AUTH_URL`, la trappola di `CHANGELOG.md` e i byte NUL; in lifehacker `RISOLTO` e
`saas-readiness`; in trasformazione `CHANGELOG-NOVITA` e `release:apply`), quindi i prompt sotto
restano necessari. Le eccezioni sono segnalate nel prompt del repo.

Il secondo punto è quello che conta. Le skill nuove sono generiche: i fatti del singolo repo sono
stati tolti e sostituiti da un passo "orientati" che li rileva. **Se quei fatti non sono scritti da
nessuna parte, il rilevamento non trova niente** — e l'informazione si perde insieme al file che la
conteneva.

Sotto, un prompt per repo con l'elenco esatto.

---

## atala-portal

Aveva 5 comandi: `deferred`, `merge`, `release`, `squash-story`, `ui-check`. Ne riceve 7.

> Allinea i comandi `/dnz:*` di questo repo alla fonte unica e salva i fatti del progetto che le
> versioni consolidate non contengono più.
>
> **1.** Rimuovi la cartella `.claude/commands/dnz/` di questo repo: i comandi ora arrivano dal
> plugin `dnz`, e le copie locali avrebbero la precedenza su di esso. Prima di cancellarle, apri
> ogni file e confrontalo con la versione del plugin: quello che la versione nuova **non dice più**
> è ciò che va salvato al punto 2.
>
> **2.** Le versioni nuove sono generiche: rilevano i fatti del repo invece di contenerli. Verifica
> che questi fatti siano scritti nel `CLAUDE.md` — e scrivili dove mancano, perché finora vivevano
> solo dentro i comandi:
>
> - **Release.** Il comando è `npm run release:apply` e la meccanica sta in
>   `scripts/release-apply.ts` (shape `ReleaseContent`: `devIt`, `devEn`, `userTitle`). Le
>   destinazioni del changelog sono **tre**: `docs/changelog/changelog.it.md`,
>   `docs/changelog/changelog.en.md` e `docs/changelog/changelog.json`, che alimenta il popup
>   "Novità" nel portale. ⚠️ **Il `CHANGELOG.md` nella root non viene mai scritto dallo script** — i
>   percorsi veri sono in `scripts/lib/changelog.ts` — ed è il primo file che un agente aprirebbe: va
>   detto esplicitamente, è una trappola.
> - **Verifica.** Il gate è `npx vitest run && npx tsc --noEmit`.
> - **ui-check.** L'app si avvia con `npm run dev` sulla porta fissa **3001**, ma `AUTH_URL` in
>   `.env` è hardcoded su `http://localhost:3000`: senza sovrascriverlo, NextAuth reindirizza alla
>   porta sbagliata e il login entra in un loop silenzioso. Va lanciata come
>   `AUTH_URL=http://localhost:3001 AUTH_TRUST_HOST=true npm run dev`, con lo stesso host nel
>   browser. Annota anche qual è il dev-login e la regola sui dati: mai screenshot di viste con dati
>   reali di meditatori, mai fixture da `.local-data/`.
> - **deferred.** Il repo ha **due track BMAD con numeri di epic che collidono** (esiste un'epic 5
>   legacy e un'epic 5 Alloggiati): prima di agire su "epic N" va stabilito quale. E
>   `src/lib/services/alloggiati/__tests__/real-data.test.ts` contiene due byte NUL, quindi GNU grep
>   lo dichiara binario e **non stampa nulla in silenzio** — ha già prodotto due falsi "già chiuso":
>   si usa `git grep` o `grep -a`.
> - **Consegna del triage:** commit diretto, e il `CLAUDE.md` vieta `Co-Authored-By`.
>
> **3.** Due cose cambiate in questa revisione, da verificare qui:
>
> - **`dnz:merge` non è più marcata deprecata.** Il banner e il frontmatter `"Deprecated"` erano solo
>   nella copia di questo repo. Inoltre ora **non pusha più il branch di default e non cancella più
>   il branch**: a fine merge chiede se pushare, rilasciare o fermarsi.
> - **Nuova regola per il changelog "Novità"** (`release`, §4b): una voce entra **solo se un utente
>   se ne accorgerebbe usando il portale**. Fuori ciò che è spento o non ancora attivo, la causa
>   tecnica di un bug, le istruzioni di supporto, il lavoro interno, e ogni frase che dica che non è
>   cambiato niente. Un bugfix entra solo se l'utente vedeva il problema. Categorie ridotte a tre:
>   `Nuovo` / `Migliorato` / `Corretto`. **Quando non resta niente, la versione compare lo stesso
>   nell'elenco — numero e data — ma senza titolo e senza voci.** L'API valida `title: z.string()`,
>   quindi la stringa vuota passa senza modifiche allo schema: **da verificare è come il popup
>   renderizza un titolo vuoto.** Se non regge, è una modifica a `scripts/lib/changelog.ts` e al
>   componente, da fare qui.
>
> **4.** Un commit solo, e la PR se serve. ⚠️ Il `CLAUDE.md` cita due percorsi di copie che non
> esisteranno più: `.claude/commands/dnz/merge.md` (riga 278) e
> `.claude/commands/dnz/squash-story.md` (riga 286). Vanno sostituiti con il solo nome del comando,
> `/dnz:merge` e `/dnz:squash-story`.
>
> **5.** Il registro dei rinvii è del **mondo A** (c'è `auto-bmad` con `deferred_ledger.py`). Il §0
> di `deferred` lo verifica con un conteggio prima di agire: se dice che lo script non vede il file,
> non è un guasto della skill, è la risposta giusta — riferiscilo, non aggirarlo.

---

## lifehacker

Aveva 4 comandi: `audit`, `deferred`, `release`, `squash-story`. Ne riceve 7.

> Allinea i comandi `/dnz:*` di questo repo alla fonte unica e salva i fatti del progetto che le
> versioni consolidate non contengono più.
>
> **1.** Rimuovi la cartella `.claude/commands/dnz/` di questo repo: i comandi ora arrivano dal
> plugin `dnz`, e le copie locali avrebbero la precedenza su di esso. Prima di cancellarle, apri
> ogni file e confrontalo con la versione del plugin: quello che la versione nuova **non dice più**
> è ciò che va salvato al punto 2.
>
> **2.** Verifica che questi fatti stiano nel `CLAUDE.md`, e scrivili dove mancano — finora vivevano
> solo dentro i comandi:
>
> - **Release.** `npm run release:apply`, shape `ReleaseContent` con il solo campo `body`, un unico
>   `CHANGELOG.md` tecnico in formato Keep a Changelog. `release-it` è configurato in
>   `.release-it.json`. I report in `.claude/reviews/` sono **tracciati** e non vanno rimossi prima
>   di una release: la precondizione vera è che non ci siano file *modificati* nel working tree,
>   perché `git commit -a` se li inghiottirebbe. Escape consapevole: `--allow-dirty`.
> - **Verifica.** Il gate è `npm run typecheck && npm run lint && npm run build && npm test`. ⚠️
>   **`npm run test:rls` non fa parte del gate**: gira contro il database Supabase di **produzione**
>   e si lancia solo deliberatamente.
> - **deferred.** Circa 30 voci storiche usano il marcatore legacy italiano `[RISOLTO <story>
>   <data>]`, che l'euristica inglese non riconosce: le classifica `open` per sempre e non sono
>   archiviabili finché non si portano alla forma canonica. Le voci il cui innesco è "quando si va
>   multi-utente" hanno già una casa, `saas-readiness-ledger.md`, e si marcano con un rimando invece
>   di ricomparire nel piano a ogni giro. Vale la disciplina log-hygiene: nel piano mai label, testi
>   di memoria o valori salvati da un utente.
> - **Consegna:** **mai su main** — branch + PR obbligatori, per la regola Git del `CLAUDE.md`.
> - **audit.** L'endpoint di salute è `https://lifehacker.madnz.uk/health`. Le aree in uso negli
>   scope dei commit sono `tools`, `db`, `validation`, `core`, `server`, `bmad`. Le regole che si
>   violano in silenzio — `process.env` solo in `config/env.ts`, `zod/v4`, estensioni `.js`, tool in
>   snake_case, **additive-only sul contratto client** — devono stare nel `CLAUDE.md`, perché il §2
>   dell'audit le cerca lì.
>
> **3.** Cambiamenti di questa revisione che toccano questo repo:
>
> - **Il piano è uno solo.** `audit` non scrive più una propria sezione "interventi": rimanda al
>   piano che `/dnz:deferred` ha appena riscritto, e tiene solo i finding che quel piano non può
>   sapere. Se hai report vecchi con due piani, il piano dei rinvii è quello buono.
> - **`squash-story` cambia metodo, e cambia rispetto alla regola di questo repo.** Non aggrega più i
>   commit esistenti con un rebase: fa `git reset --mixed <base>` e **ricostruisce l'albero finale**
>   committando gruppi di file. I fix di review scritti prima del merge **non sono più commit a
>   sé**: finiscono nel commit di story a cui appartengono, perché una correzione fatta prima del
>   merge non è mai esistita nel prodotto. La vecchia regola («i fix a mano dopo la chiusura non si
>   fondono mai») è stata rovesciata il 2026-09-25; il perché è in `DECISIONI.md`. Se il `CLAUDE.md`
>   la ripete, va aggiornato. La provenienza è opzionale: se non c'è né story né ticket né epica, si
>   omette la parentesi e non ci si ferma a chiedere.
> - **`deferred` è del mondo A, ma con lo script più corto.** `deferred_ledger.py` qui è di 963
>   righe contro le 1761 di atala e **non capisce le voci `source_spec`**. Le tue 8 stanno sotto
>   un'intestazione `## Deferred from:`, quindi il conteggio del §0 torna e la skill parte. Non
>   aggiornare lo script per questo: è una decisione a parte, dell'utente.
> - **Nessuna rinomina di branch**: era stata proposta e poi tolta.
>
> **4.** Branch + PR, un commit solo. `git status` mostra una cartella non tracciata,
> `_bmad-output/planning-artifacts/briefs/brief-lifehacker-2026-09-15/`: non è di questa migrazione,
> quindi `git add` solo dei percorsi toccati, mai `-A`.

---

## lead-generation

Aveva solo `release`. Ne riceve 7.

> Allinea i comandi `/dnz:*` di questo repo alla fonte unica e salva i fatti del progetto.
>
> **1.** Rimuovi la cartella `.claude/commands/dnz/` di questo repo: i comandi ora arrivano dal
> plugin `dnz`, e le copie locali avrebbero la precedenza su di esso.
>
> **2.** ⚠️ **Qui c'è una cosa da scoprire, non da ricopiare.** La copia vecchia di `dnz:release` era
> la versione generica, identica a quella di altri repo, e questo repo **non ha uno
> `scripts/release-apply.ts`**. Il `CLAUDE.md` alle righe 234-235 dice già che il meccanismo è
> **manuale** (niente release-it, semantic-release o conventional-commits), guidato dall'agente via
> `/dnz:release`, e che il campo `version` di `package.json` segue il tag (oggi `0.9.0`, ultimo tag
> `v0.9.0`). Manca la **procedura**: quali file si toccano, in che ordine, cosa fa da gate.
>
> Guarda `package.json` → `scripts`, i file di configurazione (`.release-it.json`, `.changeset/`,
> `.versionrc`), l'ultima voce di `CHANGELOG.md` e `git tag --list | tail -5`. Poi **scrivi nel
> `CLAUDE.md` la procedura vera**, perché il §0 della skill nuova la cerca lì. Se non esiste un
> meccanismo, scrivilo comunque: "qui il rilascio si fa così" vale anche quando la risposta è "a
> mano".
>
> **3.** Il plugin porta tutti e sette i comandi. `deferred` e `audit` si fermeranno da soli se non
> c'è un registro dei rinvii; `ui-check` serve solo se il repo ha un'interfaccia. Non è un problema:
> meglio una skill che dice "qui non ho niente da fare" di una skill che manca quando serve.
>
> **4.** Un commit solo.

---

## trasformazione.ai-homepage

Aveva solo `release`. Ne riceve 7.

> Allinea i comandi `/dnz:*` di questo repo alla fonte unica e salva i fatti del progetto che la
> versione consolidata non contiene più.
>
> **1.** Rimuovi la cartella `.claude/commands/dnz/` di questo repo: i comandi ora arrivano dal
> plugin `dnz`, e le copie locali avrebbero la precedenza su di esso. Prima di cancellarle, apri
> ogni file e confrontalo con la versione del plugin: quello che la versione nuova **non dice più**
> è ciò che va salvato al punto 2.
>
> **2.** Questi fatti vanno nel `CLAUDE.md` — finora vivevano solo dentro `dnz:release`:
>
> - `npm run release:apply`, con la shape `ReleaseContent` di `scripts/release-apply.ts`: `devIt`,
>   `userTitle`, `userEntries`.
> - **Due changelog**: `CHANGELOG.md` tecnico (`### Aggiunto` / `### Corretto` / `### Modificato` /
>   `### Rimosso`) e `CHANGELOG-NOVITA.md` in linguaggio semplice. Solo italiano: il sito non ha
>   contenuti in altre lingue.
> - ⚠️ **Il push su `origin/main` fa partire il deploy di produzione su Vercel.** Va ripetuto
>   all'utente prima di eseguire, ogni volta.
> - `.claude/reviews/` è in `.gitignore`: gli artefatti di review non si committano.
> - Prima release: nessun tag, `getCurrentVersion()` legge `0.1.0` da `package.json`.
>
> **3.** ⚠️ **La regola del changelog "Novità" è cambiata** (`release`, §4b), e questo repo è quello
> che ne risente di più. Una voce entra **solo se un visitatore se ne accorgerebbe usando il sito**.
> Restano fuori: la causa tecnica di un bug, le istruzioni di supporto, il lavoro interno, e ogni
> frase che dica che non è cambiato niente. Un bugfix entra solo se l'utente vedeva il problema.
>
> Guardando le voci esistenti: cose come la sitemap che dichiarava date di modifica sbagliate, la
> copertina scaricata dieci volte più grande del necessario, o il refuso "priorita" senza accento
> **non sarebbero entrate** — sono vere e ben scritte, ma interessano a chi gestisce il sito, non a
> chi lo visita. Se quel file serve al titolare e non al visitatore, è una cosa che vale la pena
> decidere adesso e scrivere nel `CLAUDE.md`. Le voci già pubblicate **non si riscrivono**: la regola
> vale da adesso.
>
> Categorie ridotte a tre: `Nuovo` / `Migliorato` / `Corretto`. E quando non resta niente da dire, la
> versione compare comunque nell'elenco con numero e data, senza titolo e senza voci.
>
> **4.** Un commit solo. ⚠️ Il `CLAUDE.md` di questo repo ha **già una modifica non committata** (una
> riga, `git diff CLAUDE.md`): non è di questa migrazione. Guardala prima, chiedi all'utente se va
> dentro o fuori, e non farla finire per sbaglio nel commit.

---

## Le tre copie a livello utente

`~/.claude/commands/dnz/` contiene ancora `journal.md`, `merge.md` e `release.md`, non versionate.
Dopo il sync dei repo **vanno tolte**: sono le uniche copie che non hanno né una fonte né una
history, e se restano continueranno a vincere nei repo che non hanno una copia propria — mostrando
la versione vecchia senza dirlo.

Stanno fuori da ogni repo, quindi non c'è un prompt da incollare: la cancellazione si fa una volta
sola, con l'utente presente, dopo che i quattro repo sopra sono migrati.

## subtxt

Non ha un prompt qui. La sua copia vecchia è `dnz-squash`, una **skill** in
`.claude/skills/dnz-squash/` (non in `commands/`: per questo il primo censimento l'aveva mancata), e
il suo ritiro è il punto 3 degli aperti in `DECISIONI.md`. Subtxt è anche il «mondo B» di
`deferred`, dove non è ancora stato fatto un giro vero.
