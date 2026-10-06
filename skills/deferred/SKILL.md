---
name: deferred
description: "Triage periodico del registro dei rinvii: verifica ogni voce contro il codice reale, marca il finito e il non-lavoro, archivia dove c'è lo strumento per farlo, e riscrive il piano di cosa conviene fare adesso."
---

# dnz:deferred

Triage periodico del **registro dei rinvii**: verifica ogni voce **contro il codice reale**, marca
quelle già fatte e quelle che non sono lavoro, e **riscrive il piano** di cosa conviene fare adesso.

Si lancia **a mano**, ogni tanto. Il momento naturale è **prima di una release**, a epic chiusa: il
registro ha appena ricevuto le voci nuove e non c'è una pipeline in volo.

> **Tre mondi, tre comportamenti.** Il registro (`deferred-work.md`) lo scrive BMAD. Chi lo sa
> *rileggere* dipende dal modulo installato.
>
> - **Mondo C — voci `### DW-<n>:`, il formato di `bmad-loop`.** Il registro ha un formato vero:
>   `status: open` o `status: done <data>`, una riga `resolution:`, id stabili. La skill **parla
>   quel formato**, senza inventare campi, e per archiviare chiama `bmad-loop sweep --archive`.
>   È il formato verso cui si va: vedi `DECISIONI.md`, 2026-10-06.
> - **Mondo A — c'è lo script di `auto-bmad`.** La skill **guida lo script** e rispetta la sua
>   grammatica, perché dall'altra parte c'è un parser: marcatori con le parole inglesi che
>   riconosce, archivio, controllo sha.
> - **Mondo B — non c'è niente.** Il file è una casella di posta in entrata: BMAD ci appende e
>   nessuno lo rilegge. La skill fa il triage **scrivendo nel file con prudenza** — marcatori
>   italiani, niente archivio, niente vocabolario inglese.
>
> Il passo 0 stabilisce in quale sei **prima** di toccare qualsiasi cosa. Senza registro la skill non
> ha niente da fare e si ferma.

## Perché esiste

**Nel mondo A** la pipeline a fine epic fa già la sua passata (`deferred-reconcile` + `archive`). È
reale e fa lavoro vero — su un epic di atala-portal ha verificato 108 voci e ne ha archiviate 11. Ma
ha **due limiti strutturali** che questa skill copre:

1. **Non è esaustiva.** Gira dentro una pipeline che ha appena fatto altre otto fasi, con il budget
   che le resta. La passata del 2026-07-27 ha verificato tutte le voci aperte e **non ha trovato**
   una voce che era chiusa da nove giorni.
2. **Sa fare una cosa sola: archiviare ciò che è finito.** Non ha un canale per «questa non è
   lavoro» — le domande aperte e le decisioni di prodotto le rilegge integralmente a ogni giro, per
   sempre, e nessuna modifica al codice potrà mai chiuderle.

E c'è il difetto storico: per cinque epic ha riportato `"moved": 0`, che si legge come «niente da
archiviare» e invece significava «non ho saputo classificare niente» — il registro è in italiano e
lui cerca parole inglesi. **Un passo che tace è indistinguibile da un passo che non gira.**

Il bisogno è misurato, non ipotetico: su lifehacker l'audit del 2026-08-16 ha trovato **~25 voci
risolte o obsolete senza marcatore**, inclusa una voce marcata rossa chiusa sei settimane prima e
ancora leggibile come difetto vivo di produzione.

**Nel mondo B** non c'è nessuna passata. `bmad-build` e `bmad-code-review` appendono con
l'istruzione *«Do not modify existing entries or look for duplicates»*, e nessun passo rilegge il
file. Misurato su subtxt: **98 voci, zero marcatori** — non perché nessuno le abbia chiuse, ma perché
non è mai esistito un modo per farlo. Qui la skill non integra una pratica: la porta.

⚠️ **Questa skill NON tocca la pipeline.** `auto-bmad` e le skill `bmad-*` sono upstream e vengono
aggiornate: una modifica lì dentro sparisce in silenzio al primo aggiornamento. Nel mondo A i loro
script si **invocano** dall'esterno, mai si modificano.

## Le tre regole ferree

Se una di queste viene violata la skill ha fatto danno, non lavoro.

1. **Non si cancella mai niente.** Una voce si marca — e nel mondo A, poi, si archivia: l'archivio è
   un file, non il cestino. Nessuna voce esce dal repo.
2. **Nel dubbio si tiene.** È l'asimmetria normativa di BMAD: *«a wrongly-KEPT item is merely
   re-folded once (harmless); a wrongly-MARKED item is silently archived and its real follow-up work
   is dropped»*. Evidenza indiretta, voce vaga, solo una parte chiaramente fatta ⇒ **si lascia
   esattamente com'è**.
3. **Si aggiunge, non si riscrive.** Si modificano **solo** le voci che il passo 2 ha confermato, e
   solo nel punto del marcatore; ordine, annidamento, intestazioni e prosa delle altre voci restano
   identici byte per byte. Mai riordinare, mai riformulare, mai aggiungere voci nuove. La ragione
   cambia col mondo, la regola no: nel mondo A lo script ri-parsifica il file con la stessa
   grammatica; nel mondo B è BMAD a dire di non modificare le voci esistenti — marcarle è già al
   limite, riscriverle lo supera.

   **Eccezione ammessa, solo nel mondo C:** il formato di `bmad-loop` prevede proprio questo
   cambio. Su una voce confermata si può portare `status: open` a `status: done <data>`, aggiungere
   una riga `resolution:` o una riga `decision:`. Niente altro: non si toccano `gate:`, `origin:`,
   `source_spec:`, `severity:`, `location:`, `reason:`, né il titolo, né l'id, e le voci non si
   rinumerano mai. Togliere un `gate:` sblocca in silenzio una storia.

## 0 — Orientati nel repo

**Rileva, non presumere.** L'ordine conta: le prime due cose decidono il mondo, e il mondo decide
cosa fanno i passi 1, 3, 4 e 5.

### Il registro

Di norma `_bmad-output/implementation-artifacts/deferred-work.md`. Se non c'è, o è vuoto,
**fermati**: non c'è niente da triare, e non è un errore da sistemare.

### Il formato, prima di tutto

```bash
grep -cE '^### DW-[0-9]+:' <registro>
```

**Se ci sono intestazioni `### DW-<n>:` → mondo C**, qualunque cosa dica il controllo sullo script
qui sotto: è il formato di `bmad-loop` e basta saperlo leggere. Il controllo viene **prima** perché
un repo con `bmad-loop` ma senza `deferred_ledger.py` finirebbe per errore nel mondo B (è successo a
perimetro il 2026-10-05). Salta al resto del passo 0, e nel mondo C chiedi anche:

```bash
command -v bmad-loop          # c'è? serve al passo 5 (archivio) e alla precondizione sui run
grep -cE '^[-*+] ' <registro> # bullet in colonna 0: voci non ancora nel formato DW
```

Un bullet `- source_spec:` o una sezione libera dentro un registro DW **non è una voce DW**: lo
scrivono BMAD vanilla (`bmad-build`, `bmad-code-review`), che appende alla vecchia maniera. Non lo
converti tu (riscriveresti una voce che nessuno ti ha chiesto di riscrivere): **dì quanti sono**, e
che `bmad-loop` li converte con la sua modalità di migrazione.

### Chi lo sa leggere (solo se non è il mondo C)

```bash
git ls-files -co --exclude-standard | grep '/deferred_ledger\.py$'
```

**Se non trovi niente → mondo B.** Salta al resto del passo 0.

**Se lo trovi, non basta averlo trovato: le copie divergono.** Quella di atala ha 1761 righe e
quella di lifehacker 963; la seconda non sa leggere le voci `source_spec` fuori da un'intestazione
`## Deferred from:`, e su un registro fatto così **restituisce zero voci, senza errore** — misurato
contro quello di subtxt, 98 voci. Quindi prima di usarla verifica che veda **questo** file:

```bash
python3 <script> --help | head -1        # sottocomandi: plan, archive[, harvest]
python3 <script> plan --ledger <registro> | python3 -c '
import json, sys
e = json.load(sys.stdin)["entries"]
print(len(e), "voci,", sum("source_spec:" in x["text"].split("\n", 1)[0] for x in e), "source_spec")'
grep -cE '^[-*+] '               <registro>   # bullet in colonna 0
grep -cE '^[-*+] +source_spec:'  <registro>   # di cui source_spec
```

Lo script **vede il file** se:

- le `source_spec` che vede sono **almeno** quante ne conta `grep` (possono essere di più: su atala
  18 contro 17);
- le voci sono **poco sotto** i bullet — lo scarto sono bullet di prosa in sezioni che non sono
  `## Deferred from:`: misurato 6 su 167 in lifehacker, 2 su 219 in atala. **Zero voci, o uno scarto
  di decine, vuol dire che lo script non capisce la forma del file.**

### Il verdetto, dichiarato

| registro | voci `### DW-<n>:` | script | vede il file | mondo |
|---|---|---|---|---|
| no / vuoto | — | — | — | **stop** — niente da fare |
| sì | sì | qualunque | — | **C** |
| sì | no | no | — | **B** |
| sì | no | sì | sì | **A** |
| sì | no | sì | no | **stop** — dichiara i numeri |

Nell'ultimo caso **non si ripiega sul mondo B**: in un repo con `auto-bmad` quel file ha un lettore,
solo che ne gira una copia vecchia. Il rimedio è aggiornare lo script upstream, ed è una decisione
dell'utente, non della skill.

Prima di andare avanti **scrivi il verdetto in una riga**, sempre:

```
Mondo C — formato bmad-loop: 12 voci DW (6 done, 6 open), 0 bullet fuori formato
          bmad-loop presente (sweep --archive), nessun run in corso
Mondo A — .claude/skills/auto-bmad/scripts/deferred_ledger.py (plan, archive; niente harvest)
          vede 161 voci su 167 bullet, 8 source_spec su 8
Mondo B — nessuno script: 98 voci, triage con marcatori italiani, senza archivio
```

Né l'archivio né `_bmad-output/` decidono il mondo: l'archivio (`deferred-work-resolved.md`) lo crea
lo script al primo `archive`, e `_bmad-output/` c'è anche in subtxt, dove lo script no.

### Il resto

- **Il comando di verifica del repo** (`typecheck`, `lint`, `test`, `build`): serve al passo 6 per
  scrivere come si dimostra la non-regressione di ogni batch. ⚠️ **Escludi i test che girano su
  servizi veri** — un DB di produzione, un'API a pagamento: si nominano solo se il batch tocca
  davvero quella superficie, e si lanciano deliberatamente.
- **Come si consegna** in questo repo: commit diretto sul branch di default, oppure branch + PR
  obbligatori? Lo dice il `CLAUDE.md`. Serve al passo 7.
- **La regola sui dati sensibili** del repo — PII, contenuti utente, log-hygiene. Serve al passo 6:
  nel piano non ci finiscono.

## Precondizioni (hard-stop)

**In tutti i mondi:**

- **Working tree pulito** — la skill scrive almeno due file.

**Solo nel mondo A:**

- **Nessuna pipeline in volo** — scriverebbe sul registro sotto di noi.

  ⚠️ **`status: in-progress` negli state non è il segnale.** Resta scritto quando un run viene
  abbandonato: misurato il 2026-09-28, 27 state `in-progress` in atala e 4 in lifehacker, fermi da
  settimane. Presa alla lettera la precondizione fermerebbe la skill sempre. Il segnale è
  un'attività **recente**:

  ```bash
  find _bmad-output/auto-bmad/state -name '*.yaml' -mmin -120
  ```

  Se esce qualcosa, **chiedi** se c'è un run aperto in un'altra sessione. Il controllo sha del passo
  5 resta comunque la rete vera: se qualcuno scrive nel frattempo, `archive` rifiuta.

Nel mondo B non ce n'è una equivalente. Una code review aperta in un'altra sessione può appendere
voci mentre lavori: finiscono in fondo, non toccano le tue modifiche, e le prende il giro dopo.

**Solo nel mondo C:**

- **Nessun run di `bmad-loop` in corso.** Il registro lo possiede il programma: durante un run
  scrive lui (chiude le voci che una story dichiara con `closes_deferred`, aggiunge quelle nuove) e
  due scrittori sullo stesso file si pestano i piedi. Il segnale è la lista dei run, non la data
  dei file:

  ```bash
  bmad-loop ls --project .        # colonna STATUS: serve che siano tutti finished o stopped
  ```

  Se ce n'è uno `running` o in pausa, **chiedi**. Se `bmad-loop` non è installato non c'è niente da
  controllare, e il passo 5 non si fa.

---

## 1 — Leggi il registro

**Mondo A:**

```bash
python3 <script> plan --ledger <registro>
```

Sola lettura. Restituisce ogni voce con un `id` stabile, il testo, l'intestazione di provenienza, il
`ledger_sha256` e un `marker_hint` (`resolved` / `partial` / `open`).

⚠️ **Il `marker_hint` è un aiuto, non una decisione**, e sbaglia **in entrambe le direzioni** — vedi
«Trappole note» in fondo. Serve solo a mettere in cima ciò che vale la pena rileggere per primo.

**Tieni da parte il `ledger_sha256`**: serve al passo 5, e la sua scadenza è la prova che nessuno ha
scritto sul file nel frattempo.

**Mondo C:** leggi il file direttamente. Una voce comincia a `### DW-<n>:` e finisce al titolo
successivo (qualunque `#`..`######`) o a un bullet `- source_spec:`. L'id è `DW-<n>` ed è stabile:
chiama le voci con quello. Leggi `status:` **alla lettera**:

- `status: open` → aperta;
- `status: done <data ISO>` → chiusa: non è lavoro, **saltala** al passo 2 (se ha `archived:` il
  corpo sta in `deferred-work-archive.md`, e ti serve solo se vuoi sapere come è stata risolta);
- **qualunque altra cosa** (`opne`, `Done`, nessuna riga `status:`) → **non vale come chiusa**.
  Non la correggi: la tratti come aperta e la segnali all'utente, perché è un errore del file;
- una voce con `archived-body:` è stata archiviata e **riaperta**: è lavoro vivo, e il corpo che
  aveva prima sta nell'archivio. Leggilo lì prima di giudicarla.

`location:` può essere `n/a`: vuol dire «nessun posto registrato», e allora `reason:` spesso nomina
il file. `gate:` non si legge per giudicare, si **porta nel piano**: una voce con `gate:` blocca
storie, e il piano deve dirlo.

**Mondo B:** leggi il file direttamente. Una voce è un bullet in colonna 0 con tutto ciò che è
indentato sotto, fino al bullet successivo. Non ci sono `id` né hint — e un hint lì direbbe `open`
per tutte, perché nessuna è mai stata marcata. Chiama le voci per `source_spec` più le prime parole
del `summary`, **non per numero di riga**: le righe che aggiungi al passo 3 spostano quelle sotto.

## 2 — Riconcilia contro il codice

È il passo che costa, ed è l'unico che nessuno script può fare.

**Salta subito** ogni voce già marcata come non-lavoro in un giro precedente (passo 4, nella forma
del suo mondo): per costruzione nessuna modifica al codice può chiuderla. È il motivo per cui quel
marcatore esiste.

Per ogni voce restante — non marcata, oppure marcata ma con un residuo aperto — **apri i file che
nomina** (i riferimenti `[path:riga]`, o `file.py:871` nell'`evidence`) e guarda se il difetto c'è
ancora. Non fermarti alla descrizione: le voci invecchiano nei numeri (una che diceva 853 righe oggi
ne ha 864) e capita che il fix sia atterrato da un altro ramo **lo stesso giorno** in cui la review
la registrava.

⚠️ **Mai `grep` semplice.** Un file sorgente con un NUL dentro viene dichiarato binario da GNU grep,
che **non stampa nulla, in silenzio**. Usa `git grep` (annusa solo i primi ~8000 byte) oppure
`grep -a`. Misurato su atala-portal, dove un file di test con due NUL ha prodotto un falso «già
chiuso» **due volte**: nella riconciliazione automatica del 2026-07-27 e nell'audit manuale del
giorno dopo. Altrove il file col NUL può non esistere, ma la regola costa zero.

Verifica anche i **numeri** citati (conteggi di righe, soglie): correggili citando **la soglia
superata**, non il valore — «sopra il tetto di 800», non «a 853», che invecchia al primo commit.

## 3 — Marca le voci chiuse

Solo sulle voci che il passo 2 ha confermato. In ogni mondo le forme sono due — voce finita
tutta, voce finita in parte — e la seconda è quella che evita un danno.

### Mondo C — `status` e `resolution`, come li scrive `bmad-loop`

**Voce interamente finita:** la riga `status: open` diventa `status: done <data ISO>` e **subito
sotto** va una riga `resolution:`, **una riga sola**:

```markdown
status: done 2026-10-06
resolution: `ci.yml` (passo «Schema e migrazioni allineati»), commit 212720b — la CI lancia `pnpm db:generate` e fallisce se `drizzle/` cambia
```

La `resolution:` dice **dove** e **come si è provato** (file, commit, cosa fallisce se si rompe), non
«fatto». È la riga che `bmad-loop` e chi legge l'archivio avranno, e il corpo della voce non c'è più.

- **Mai `esito:`, mai ✅, mai `CHIUSA`.** Quelle sono le forme degli altri due mondi; in un registro
  DW non le legge nessuno.
- **Una riga sola, davvero.** Il formato è a righe: un a-capo dentro il valore diventa contenuto
  nuovo del registro. Un `###` all'inizio di riga crea una voce che nessuno ha aperto; un
  `- source_spec:` all'inizio di riga taglia la voce in due. Se serve spazio, usa le virgole.
- **`status:` si scrive esatto**, `done` minuscolo e la data ISO: uno `status` che il formato non sa
  leggere non vale come chiuso, e un `gate:` sulla voce continuerebbe a bloccare.
- **Data di chiusura:** quella in cui il lavoro è atterrato, se la sai (il commit), altrimenti oggi.

**Voce finita solo in parte:** resta `status: open` — mai `done`. Sotto, una riga `decision:` (la
forma è `decision: <data> <etichetta> — <dettaglio>`, e l'etichetta qui è `keep-open`):

```markdown
status: open
decision: 2026-10-06 keep-open — fatto: il servizio Postgres nella CI; resta: il confronto della versione con quella di produzione
```

Perché `decision:` e non un campo nostro: è già nel formato, `bmad-loop` ne conosce il significato
(la scelta di un umano su una voce che resta aperta) e non cambia lo `status`. Un campo inventato
sarebbe una riga che nessun lettore capisce, in un file che non è nostro.

### Mondo A — la grammatica dello script

**Voce interamente finita** — vocabolario prescritto dal reconcile di BMAD, da usare alla lettera:

```markdown
- [x] ✅ **CHIUSA <data> — resolved in <file/commit/story>** — <titolo originale> — <cosa è cambiato>
```

La spunta `✅` **in testa alla riga** (non in una nota annidata) più le parole inglesi `resolved in`.
La prosa resta italiana: si traduce il **marcatore**, non il contenuto.

⚠️ **I marcatori legacy vanno portati a questa forma** quando li confermi. Un registro vecchio può
avere forme tutte italiane (`[RISOLTO <story> <data>]`): l'euristica non le riconosce, quindi quelle
voci restano `open` per sempre e non sono archiviabili. Si riscrive **solo il marcatore in testa**,
non il resto della voce.

**Voce finita solo in parte** — mai la spunta in testa, e la parola inglese accanto a quella
italiana:

```markdown
- **<titolo>** — … ⚠️ RESTA APERTA (remainder): <cosa resta>
```

⚠️ **Perché il `(remainder)` non è pedanteria.** L'euristica del residuo è **solo inglese**
(`remainder`, `still open`, `portion`, `owned by`, `partial`). Un `RESTA APERTA` italiano non la
attiva. Una voce che apre con `✅ CHIUSA` e dice `RESTA APERTA` tre righe sotto viene classificata
**`resolved`**, archiviata, e il lavoro ancora aperto sparisce — il guasto esatto che la regola 2
esiste per impedire.

### Mondo B — una riga in coda alla voce

Senza parser il marcatore non è un contratto con nessuno: deve solo essere **lo stesso a ogni giro**,
perché il giro dopo lo riconosca. Una riga `esito:`, **aggiunta** in coda alla voce, alla stessa
indentazione di `summary:` — dopo l'ultima riga della voce, non dentro il blocco di `evidence`:

```markdown
- source_spec: `spec-1-7-smoke-test-pywebview-windows.md`
  summary: …
  evidence: >-
    …
  esito: chiusa <data> — <file/commit/story> — <cosa è cambiato>
```

Finita solo in parte:

```markdown
  esito: aperta in parte <data> — fatto: <…>; resta: <…>
```

Una voce in prosa libera, senza campi, riceve la stessa riga come sotto-bullet: `  - esito: …`.

**Niente spunta, niente parole inglesi, niente riscrittura della voce.** Non è solo una questione di
lingua: se un giorno arrivasse `auto-bmad`, il suo script cerca `resolved`/`closed` e una spunta in
testa. `chiusa` non li attiva, quindi quelle voci risulterebbero `open` — un falso negativo, che
costa una rilettura. Un marcatore inglese messo qui senza la regola del `(remainder)` sarebbe invece
archiviato alla cieca.

## 4 — Marca il non-lavoro

Va a ciò che **non può essere chiuso scrivendo codice**: domande aperte verso terzi, decisioni di
prodotto che aspettano una persona, limiti dichiarati, note di processo, finding pinnati da test
anti-marcita.

**Mondo A** — una sola etichetta, in testa al testo del bullet dopo il titolo:

```markdown
- **[Med] [NON-LAVORO: decisione in sospeso] <titolo>** — …
- **[Low] [NON-LAVORO: limite di prodotto dichiarato] <titolo>** — …
- **[Low] [NON-LAVORO: verifica in dry-run — runbook §4] <titolo>** — …
```

**Mondo B** — la stessa riga del passo 3:

```markdown
  esito: non-lavoro — decisione in sospeso: <quale, e chi la prende>
```

**Mondo C** — la voce resta `status: open` e riceve una riga `decision:`, la stessa forma della
chiusura parziale (passo 3), con `non-lavoro:` davanti al dettaglio:

```markdown
status: open
decision: 2026-10-06 keep-open — non-lavoro: decisione in sospeso, la prende il committente (didascalie obbligatorie o no)
```

Il costo, accettato: `bmad-loop sweep` rilegge le voci aperte a ogni giro, quindi rivedrà anche
queste. Non è un danno (le metterà fra le `decisions`, dov'è giusto che stiano), ed è il prezzo di non
inventare un campo che il formato non ha. Il prossimo giro di **questa** skill, invece, le salta
(passo 2).

**Se il repo ha un registro dedicato per una famiglia di rinvii** — per esempio tutto ciò che si
attiva solo a una svolta futura — il marcatore ci **rimanda** invece di duplicarne il contenuto:
`[NON-LAVORO: attivo col SaaS — vedi saas-readiness-ledger]`.

**Chi lo legge.** In entrambi i mondi il prossimo giro di questa skill (passo 2), che la salta. Nel
mondo A anche l'agente di `create-story` — che riceve il registro iniettato come prosa, con
l'istruzione di pescare i rinvii che toccano la sua story — e legge «non è lavoro» invece di provare
a sistemarla: senza etichetta può allargare una costante che in realtà è una domanda aperta.

⚠️ **Le gravità `[Med]`/`[Low]`, dove ci sono, NON si toccano.** Le scrive la macchina: il delegate
di code review copia ogni finding rinviato nel registro con la sua gravità attaccata. Cancellarle
significa ricancellarle a ogni giro, per sempre, per niente. Nessuno script le legge — sono prosa
inerte.

⚠️ **`[INNESCO: …]` non va nel registro.** La condizione che fa maturare un lavoro («quando un CSV
supera le ~2000 righe») serve a chi decide, e chi decide legge il piano. Va nel piano, passo 6.

## 5 — Archivia (mondo C e mondo A)

### Mondo C — lo fa `bmad-loop`, non la skill

Se `bmad-loop` c'è, l'archivio si fa con **il suo comando**: sposta ogni voce `status: done` nel file
fratello `deferred-work-archive.md` (corpo intero, più `archived: <data>`) e lascia nel registro un
segnaposto con `status`, `origin`, `source_spec`, `severity`, `gate` e `archived`. La skill **non
scrive i segnaposto a mano**: è un formato di `bmad-loop`, e imitarlo è il modo di sbagliarlo.

```bash
bmad-loop sweep --project . --archive --dry-run     # elenca cosa si sposterebbe, non scrive
bmad-loop sweep --project . --archive               # lo fa
```

Prima il `--dry-run`, e **controlla l'elenco**: devono esserci le voci che hai chiuso adesso e quelle
già chiuse in passato, mai una `open`. Dopo, il comando stampa `commit both files`: i due file
(registro e archivio) vanno nello stesso commit, altrimenti lo spostamento non è durevole.
`--before <data>` limita l'archivio alle chiusure precedenti a una data, se non vuoi spostare tutto.

**Se `bmad-loop` non è installato, non si archivia.** Le voci chiuse restano dove sono, con il loro
`status: done` e la `resolution:`: il file cresce, e il costo lo assorbe il piano, che parla solo
delle aperte. Non si imita l'archivio.

### Mondo A — lo script di `auto-bmad`

Solo le voci che il passo 2 ha confermato **interamente** finite e che il passo 3 ha marcato.

```bash
python3 <script> archive \
  --ledger  <registro> \
  --archive <archivio> \
  --ids <id,id,id> \
  --expect-sha <ledger_sha256 del passo 1>
```

Scrittura atomica, archivio per primo: se crolla fra le due scritture la voce sta in **due** file,
mai in zero. Un `--expect-sha` scaduto o un id sconosciuto esce con codice 1 **senza scrivere
niente** — allora si rilancia `plan` e si rigiudica, non si forza.

⚠️ **Il tool esegue, non decide.** Se il suo `marker_hint` dice `resolved` ma leggendo la voce c'è
ancora qualcosa di aperto, **non la si archivia**: si marca il residuo (passo 3) o il non-lavoro
(passo 4). Caso reale: una voce con la decisione presa ma anche un *«si scioglie al primo invio
monitorato»* — la decisione è chiusa, la verifica no.

**Mondo B: non si archivia.** Le voci chiuse restano al loro posto con il loro `esito:`. L'archivio
esiste in `auto-bmad` per tenere piccolo il file che il suo script ri-parsifica: senza parser non c'è
niente da proteggere, e spostare voci contraddice l'istruzione di BMAD. Il costo — il file cresce —
lo assorbe il piano, che parla solo delle aperte.

## 6 — Riscrivi il piano

File fisso, **sempre lo stesso**, sovrascritto per intero — di norma `deferred-plan.md` accanto al
registro.

Un piano vecchio letto per sbaglio è peggio di nessun piano: niente file datati, niente storico. Lo
storico è la history di git.

Contenuto, in quest'ordine:

1. **Data del giro, mondo** e una riga di esito: quante voci verificate, quante chiuse, quante
   archiviate (solo A), quante marcate non-lavoro, quante restano.
2. **Cosa è cambiato dal giro precedente** — voci nuove arrivate dalle review, voci chiuse,
   riclassificazioni. È la parte che si legge per prima.
3. **I batch da fare adesso.** Un batch = un branch = una PR. Per ognuno: nome del branch, le voci
   che chiude con il file di ciascuna, cosa fare, **come si dimostra la non-regressione** (il
   comando rilevato al passo 0), effort e dipendenze. Raggruppa per **raggio d'azione condiviso**,
   non per tema: due voci che toccano gli stessi file stanno insieme, due che parlano della stessa
   cosa ma vivono in file diversi no.

   **Ogni batch deve rispondere a «perché adesso e non fra sei mesi».** Se la risposta è «perché è a
   registro» o «perché il file supera una soglia», **non è un batch: è debito che resta.** Le
   risposte che valgono sono: il costo è appena crollato (un altro batch l'ha ridotto a un sito
   solo), il difetto si aggrava da solo (il file cresce a ogni epic che lo tocca), sbagliare non fa
   rumore (nessuno scoprirebbe l'errore), oppure costa dieci righe e ne vale la pena comunque.

4. **Il minimo indispensabile.** Due righe secche: *«se fai una cosa sola, questa, perché …»* e
   *«se ne fai tre, aggiungi …»*. Un piano da nove batch che non dice da dove partire non è un piano
   — è la stessa lista di prima con i titoli.

5. **Cosa ho SCARTATO, e perché.** Non le voci a innesco: **i lavori che sembrano da fare e che
   raccomando di NON fare in questo giro.** Con il motivo, per nome. Le famiglie che ricorrono:
   - **refactor a conteggio** — dividere un file «perché è a 888 righe», senza nessun'altra
     pressione. Sembra produttivo e non lo è: si fa quando qualcuno tocca quel file per un motivo
     vero.
   - **lavoro che va accorpato altrove** — una migrazione a sé quando c'è già un'epic che deve
     migrare comunque; pagare due volte una procedura rischiosa per un problema che oggi non si
     manifesta.
   - **pulizia senza destinatario** — estrarre una primitiva condivisa che non cambia niente per
     nessun utente, mentre resta aperto qualcosa che invece cambia.

   ⚠️ **Questa sezione è obbligatoria e deve essere non vuota**, salvo che il registro sia davvero
   minuscolo. Un triage che promuove tutto a «da fare» non ha triato: ha trascritto.

6. **Ripensamenti sul giro precedente.** Se leggendo il piano vecchio qualcosa non regge più — un
   batch che allora sembrava giusto e oggi è busywork, un ordine sbagliato, una stima presa male —
   **dillo per nome e correggilo qui**, invece di ricopiarlo. È il punto in cui il piano migliora
   invece di accumulare: la seconda passata è più utile della prima proprio perché taglia.

7. **Cosa resta fuori dal piano** — le voci a innesco, con `[INNESCO: <condizione>]` scritto qui e
   non nel registro; le decisioni che aspettano una persona, come lista di domande secche; il debito
   che resta e basta.

⚠️ **Un batch non mescola un refactor puro con un cambio di comportamento.** Un refactor si dimostra
dicendo «le suite esistenti passano senza toccare un'asserzione»; se nello stesso branch è cambiato
anche il comportamento, quella prova non esiste più.

⚠️ **Nessun dato sensibile nel piano.** Vale la regola del repo rilevata al passo 0 — PII, contenuti
utente, valori salvati da qualcuno: nel piano ci vanno riferimenti `file:riga` e conteggi, mai il
contenuto. Se c'è un hook che blocca il commit, la regola viene comunque **prima** dell'hook.

## 7 — Consegna

Come consegna il repo, rilevato al passo 0: commit diretto, oppure branch
`docs/deferred-triage-<data>` + PR. Un commit solo, scope `bmad` — è manutenzione di artefatti della
pipeline, non del modulo:

```
docs(bmad): triage del registro dei rinvii <data>
```

Nel corpo il perché — quante voci chiuse e con quale evidenza — non il riassunto del diff.

**Mondo C:** nello stesso commit vanno il registro, l'archivio (se il passo 5 l'ha scritto) e il
piano. **Prima di consegnare** lancia `bmad-loop validate --project .` (se c'è): deve uscire con 0 e
senza segnalazioni sul registro. Attenzione, vuole l'albero pulito: se l'archivio ha appena scritto
due file, committa **prima** e valida **dopo**, altrimenti dice `git worktree is not clean` e non
vuol dire che hai sbagliato qualcosa.

Se il triage **non ha prodotto nessun cambiamento**, non committare e non aprire la PR: dirlo e
basta.

---

## Trappole note

**Lo script vecchio su un registro senza intestazioni restituisce zero voci, e non protesta.** È il
caso che il controllo del passo 0 esiste per prendere: senza quel controllo il giro finirebbe con
«nessuna voce da triare» su un file che ne ha 98.

**Il `marker_hint` sbaglia in due direzioni** (mondo A). Verificato su `classify_hint`:

| Voce | Hint | Realtà |
|---|---|---|
| `CHIUSA` in italiano, senza spunta | `open` | finita — **falso negativo, innocuo** |
| marcatore legacy tutto italiano (`[RISOLTO …]`) | `open` | finita — **falso negativo, ma pervasivo dove esiste** |
| `[x] ✅ CHIUSA` + `RESTA APERTA` senza `(remainder)` | `resolved` | aperta — **falso positivo, pericoloso** |
| `✅ … resolved in X` | `resolved` | corretto |
| `✅ … remainder owned by Y` | `partial` | corretto |

Il falso negativo costa una rilettura. Il falso positivo archivia lavoro vivo, e lo evita **solo** la
regola del passo 3.

**Le voci vivono in sezioni per *origine*, non per *oggetto*.** Lo stesso difetto può comparire in
tre sezioni diverse (la review della story, quella dell'epic, l'aggiornamento di una story
successiva) — o, nel mondo B, in tre voci con la stessa `source_spec` e `summary` diversi. Prima di
pianificare un batch, raggruppa per **file**, non per sezione — o lo stesso lavoro finisce in due
branch.

**Attenzione ai numeri di epic che collidono.** Se il repo ha due track con numerazioni
indipendenti, «epic N» è ambiguo: stabilisci **quale** track prima di agire — lo sprint file
sbagliato produce lavoro confidentemente sbagliato.

**`bmad-loop sweep` e questa skill non si sostituiscono** (mondo C). Lo sweep verifica le voci
contro il codice e le partiziona (risolta, da costruire, bloccata, da scartare, decisione), poi
**esegue** i gruppi di voci con sessioni di sviluppo sue; gira in automatico e non scrive niente per
una persona. Questa skill fa la parte che lo sweep non fa: il piano per chi decide (il «perché
adesso», i lavori scartati, le domande secche) e il non-lavoro. Non lanciare lo sweep da qui, e non
scrivere nel registro mentre un run è in corso (precondizioni). Se in un repo vuoi che la skill si
limiti al piano e lasci la verifica allo sweep, è una scelta da prendere e scrivere in `DECISIONI.md`,
non da improvvisare in un giro.

**Se GateGuard è attivo**, il primo `Bash` della sessione e la prima modifica di ogni file chiedono
di presentare i fatti. Qui i file sono almeno due (registro e piano): mettine in conto due.
