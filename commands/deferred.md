---
description: "Triage periodico del registro dei rinvii: verifica ogni voce contro il codice reale, archivia il finito, marca il non-lavoro e riscrive il piano di cosa conviene fare adesso."
---

# dnz:deferred

Triage periodico del **registro dei rinvii**: verifica ogni voce **contro il codice reale**, chiude
quelle già fatte, marca quelle che non sono lavoro, archivia il finito e **riscrive il piano** di
cosa conviene fare adesso.

Si lancia **a mano**, ogni tanto. Il momento naturale è **prima di una release**, a epic chiusa: il
registro ha appena ricevuto le voci nuove e non c'è una pipeline in volo.

> **Questa skill presuppone un registro dei rinvii su disco**, prodotto da una pipeline tipo
> `auto-bmad`. In un repo che non ce l'ha non ha niente da fare: le precondizioni la fermano subito,
> ed è il comportamento giusto — non c'è un equivalente da inventare.

## Perché esiste

A fine epic la pipeline fa già la sua passata (`deferred-reconcile` + `archive`). È reale e fa
lavoro vero — su un epic di atala-portal ha verificato 108 voci e ne ha archiviate 11. Ma ha **due
limiti strutturali** che questo comando copre:

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

⚠️ **Questo comando NON tocca la pipeline.** `auto-bmad` e le skill `bmad-*` sono upstream e vengono
aggiornate: una modifica lì dentro sparisce in silenzio al primo aggiornamento. Qui si **invocano**
i loro script dall'esterno, mai si modificano.

## Le tre regole ferree

Se una di queste viene violata il comando ha fatto danno, non lavoro.

1. **Non si cancella mai niente.** Una voce si marca oppure si archivia — e l'archivio è un file,
   non il cestino. Nessuna voce esce dal repo.
2. **Nel dubbio si tiene.** È l'asimmetria normativa di BMAD: *«a wrongly-KEPT item is merely
   re-folded once (harmless); a wrongly-MARKED item is silently archived and its real follow-up work
   is dropped»*. Evidenza indiretta, voce vaga, solo una parte chiaramente fatta ⇒ **si lascia
   esattamente com'è**.
3. **Byte-preservazione sul registro.** Gli script della pipeline ri-parsificano questo file con la
   stessa grammatica. Si modificano **solo** i bullet che il passo 2 ha confermato; intestazioni
   `## Deferred from:`, ordine, annidamento e prosa delle altre voci restano identici. Mai
   riordinare, mai riformulare, mai aggiungere voci nuove.

## 0 — Orientati nel repo

**Rileva, non presumere.** Cinque cose:

- **Il registro e l'archivio** — di norma `_bmad-output/implementation-artifacts/deferred-work.md` e
  `deferred-work-resolved.md`. Se non ci sono, **fermati**: vedi il riquadro in cima.
- **Lo script** che li manipola — di norma `.claude/skills/auto-bmad/scripts/deferred_ledger.py`. Se
  il percorso è diverso, usa quello vero; non reimplementarne il lavoro a mano.
- **Il comando di verifica del repo** (`typecheck`, `lint`, `test`, `build`): serve al passo 6 per
  scrivere come si dimostra la non-regressione di ogni batch. ⚠️ **Escludi i test che girano su
  servizi veri** — un DB di produzione, un'API a pagamento: si nominano solo se il batch tocca
  davvero quella superficie, e si lanciano deliberatamente.
- **Come si consegna** in questo repo: commit diretto sul branch di default, oppure branch + PR
  obbligatori? Lo dice il `CLAUDE.md`. Serve al passo 7.
- **La regola sui dati sensibili** del repo — PII, contenuti utente, log-hygiene. Serve al passo 6:
  nel piano non ci finiscono.

## Precondizioni (hard-stop)

- **Working tree pulito** — il comando scrive due file e ne archivia un terzo.
- **Nessuna pipeline in volo** (`_bmad-output/auto-bmad/state/*.yaml` senza run attivi):
  scriverebbe sul registro sotto di noi e il controllo sha fallirebbe a metà.
- **Il registro esiste e non è vuoto.**

---

## 1 — Leggi il registro

```bash
python3 <script-rilevato-al-passo-0> plan --ledger <registro>
```

Sola lettura. Restituisce ogni voce con un `id` stabile, il testo, l'intestazione di provenienza, il
`ledger_sha256` e un `marker_hint` (`resolved` / `partial` / `open`).

⚠️ **Il `marker_hint` è un aiuto, non una decisione**, e sbaglia **in entrambe le direzioni** — vedi
«Trappole note» in fondo. Serve solo a mettere in cima ciò che vale la pena rileggere per primo.

**Tieni da parte il `ledger_sha256`**: serve al passo 5, e la sua scadenza è la prova che nessuno ha
scritto sul file nel frattempo.

## 2 — Riconcilia contro il codice

È il passo che costa, ed è l'unico che nessuno script può fare.

**Salta subito** ogni voce che porta già `[NON-LAVORO: …]`: è stata triata in un giro precedente e
per costruzione nessuna modifica al codice può chiuderla. È il motivo per cui quell'etichetta
esiste.

Per ogni voce restante — non marcata, oppure marcata ma con un residuo aperto — **apri i file che
nomina** (i riferimenti `[path:riga]`) e guarda se il difetto c'è ancora. Non fermarti alla
descrizione: le voci invecchiano nei numeri (una che diceva 853 righe oggi ne ha 864) e capita che
il fix sia atterrato da un altro ramo **lo stesso giorno** in cui la review la registrava.

⚠️ **Mai `grep` semplice.** Un file sorgente con un NUL dentro viene dichiarato binario da GNU grep,
che **non stampa nulla, in silenzio**. Usa `git grep` (annusa solo i primi ~8000 byte) oppure
`grep -a`. Misurato su atala-portal, dove un file di test con due NUL ha prodotto un falso «già
chiuso» **due volte**: nella riconciliazione automatica del 2026-07-27 e nell'audit manuale del
giorno dopo. Altrove il file col NUL può non esistere, ma la regola costa zero.

Verifica anche i **numeri** citati (conteggi di righe, soglie): correggili citando **la soglia
superata**, non il valore — «sopra il tetto di 800», non «a 853», che invecchia al primo commit.

## 3 — Normalizza i marcatori

Solo sulle voci che il passo 2 ha confermato. Due forme, e la seconda è quella che evita un danno.

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

## 4 — Marca il non-lavoro

Una sola etichetta, in testa al testo del bullet dopo il titolo:

```markdown
- **[Med] [NON-LAVORO: decisione in sospeso] <titolo>** — …
- **[Low] [NON-LAVORO: limite di prodotto dichiarato] <titolo>** — …
- **[Low] [NON-LAVORO: verifica in dry-run — runbook §4] <titolo>** — …
```

Va messa a ciò che **non può essere chiuso scrivendo codice**: domande aperte verso terzi, decisioni
di prodotto che aspettano una persona, limiti dichiarati, note di processo, finding pinnati da test
anti-marcita.

**Se il repo ha un registro dedicato per una famiglia di rinvii** — per esempio tutto ciò che si
attiva solo a una svolta futura — l'etichetta ci **rimanda** invece di duplicarne il contenuto:
`[NON-LAVORO: attivo col SaaS — vedi saas-readiness-ledger]`.

**Due lettori, due benefici.** Il prossimo giro di questo comando le salta (passo 2). E l'agente di
`create-story` — che riceve il registro iniettato come prosa, con l'istruzione di pescare i rinvii
che toccano la sua story — legge «non è lavoro» invece di provare a sistemarla: senza etichetta può
allargare una costante che in realtà è una domanda aperta.

⚠️ **Le gravità `[Med]`/`[Low]` NON si toccano.** Le scrive la macchina: il delegate di code review
copia ogni finding rinviato nel registro con la sua gravità attaccata. Cancellarle significa
ricancellarle a ogni giro, per sempre, per niente. Nessuno script le legge — sono prosa inerte.

⚠️ **`[INNESCO: …]` non va nel registro.** La condizione che fa maturare un lavoro («quando un CSV
supera le ~2000 righe») serve a chi decide, e chi decide legge il piano. Va nel piano, passo 6.

## 5 — Archivia

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

## 6 — Riscrivi il piano

File fisso, **sempre lo stesso**, sovrascritto per intero — di norma
`_bmad-output/implementation-artifacts/deferred-plan.md`.

Un piano vecchio letto per sbaglio è peggio di nessun piano: niente file datati, niente storico. Lo
storico è la history di git.

Contenuto, in quest'ordine:

1. **Data del giro** e una riga di esito: quante voci verificate, quante chiuse, quante archiviate,
   quante marcate non-lavoro, quante restano.
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

Se il triage **non ha prodotto nessun cambiamento**, non committare e non aprire la PR: dirlo e
basta.

---

## Trappole note

**Il `marker_hint` sbaglia in due direzioni.** Verificato su `classify_hint`:

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
successiva). Prima di pianificare un batch, raggruppa per **file**, non per sezione — o lo stesso
lavoro finisce in due branch.

**Attenzione ai numeri di epic che collidono.** Se il repo ha due track con numerazioni
indipendenti, «epic N» è ambiguo: stabilisci **quale** track prima di agire — lo sprint file
sbagliato produce lavoro confidentemente sbagliato.

**Se GateGuard è attivo**, il primo `Bash` della sessione e la prima modifica di ogni file chiedono
di presentare i fatti. Qui i file sono almeno due (registro e piano): mettine in conto due.
