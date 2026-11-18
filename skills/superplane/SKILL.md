---
name: superplane
description: "Dice a una sessione di progetto cosa succede in SuperPlane, il sistema che prende i ticket Linear con l'etichetta agents e li porta fino alla PR: stato dei task, check, domande dello sviluppo, esecuzioni dei flussi ed errori, confrontati con Linear per trovare i ticket bloccati. Usala quando l'utente chiede a che punto è un ticket mandato agli agenti, perché non parte, o cosa sta facendo SuperPlane. Sola lettura: non scrive su SuperPlane, non sblocca niente e funziona solo dove c'è il comando sp."
---

# dnz:superplane

Fa sapere a una sessione di progetto **cosa succede in SuperPlane**: quali ticket ha preso, a che
punto sono, cosa chiede lo sviluppo, cosa si è rotto. SuperPlane gira su rings, prende i ticket Linear
con l'etichetta `agents` e li porta fino alla PR.

> **Sola lettura.** La skill legge con `sp` e basta. Non scrive su SuperPlane, non usa altre chiavi o
> API, non rilancia flussi. Per agire ci sono due strade: **Linear** (l'etichetta `agents`, i commenti)
> o **la sessione di `~/admin`**, che gestisce SuperPlane. Un check che dice «rilancia …» è un'istruzione
> per quella sessione, non per questa.

**Linear da solo non basta.** Linear ha la presa in carico, le domande, la ripartenza e il merge, ma
non i check, le esecuzioni dei flussi e gli errori. Lo stato vero è in `sp`; Linear serve a vedere
cosa **dovrebbe** esserci.

## 0 — Orientati

1. **C'è `sp`?** `command -v sp`. Se manca: «Il comando `sp` non c'è su questa macchina: SuperPlane si
   legge solo da rings». Fermati.
2. **Il workspace del repo.** È un fatto del repo: cercalo nel `CLAUDE.md` (la key, tipo `ATALA` o
   `PER`). Se non c'è, `sp ws` elenca key e nomi; se il nome non basta, `sp find <ticket>` su un ticket
   noto del repo dice in quale workspace sta. Dichiara la key che usi.
3. **Il tracker.** Linear è facoltativo, come nelle altre skill `dnz`. Se il connettore c'è, servono il
   team del repo (dal `CLAUDE.md`, altrimenti dal prefisso dei ticket che trova `sp`). Se non c'è, si
   parte dal workspace e il confronto del §2 non si fa: va detto in una riga, altrimenti «nessun ticket
   bloccato» sembra un fatto controllato.

**Ogni errore di `sp` ferma la skill.** Escono tutti su stderr come `sp: …`, con codice 1: chiave
assente, «accesso negato», SuperPlane che non risponde. Riporta la riga così com'è e fermati: si
sistema dalla sessione di `~/admin`. **Niente tentativi con `curl`, browser o credenziali trovate sul
disco**, nemmeno per «vedere se è solo `sp`». L'unico errore che si corregge da qui è un argomento
sbagliato (workspace o ticket scritto male).

## 1 — Leggi SuperPlane

Si parte dal ticket se l'utente ne nomina uno, altrimenti dal workspace.

**Da un ticket** (`RAW-n` o il prefisso del repo):

1. `sp find <ticket>` — elenca **tutti** i task del ticket, in qualunque workspace. Parti da qui e non da
   `sp task <WS> <ticket>`: con più task, `sp task` mostra il più recente e lo dice solo su stderr.
2. `sp task <WS> <n>` sul task che conta (di solito quello aperto o in bozza; uno chiuso solo se è
   l'unico).
3. Se qualcosa è fermo o rosso: `sp events <WS> <n>` per l'ultimo movimento, e `sp runs <WS> "<flusso>"`
   sul flusso coinvolto (il nome del passo in `sp task`, o quello fra parentesi quadre negli eventi). I
   nomi dei flussi possono avere spazi: tra virgolette.

**Dal workspace:**

1. `sp tasks <WS> all`. **Non** `sp tasks <WS>` da solo: mostra solo gli aperti, e i task in bozza
   restano invisibili.
2. `sp task` su ogni task aperto o in bozza.
3. `sp canvases <WS>` e `sp runs` solo se un task punta a un flusso rotto, o se l'utente lo chiede.

`--json` dà l'uscita grezza: usalo solo se il testo non basta, e non riversarlo all'utente.

**Come si leggono:**

- **stato** del task: `draft` = creato dal poller di Linear, non ancora mandato a una linea; `open` = in
  lavorazione; `closed` con un esito (`completed`, `pr_closed`, `archived`, …). Per un `draft` riporta da
  quanto è lì: se è vecchio, chiedi all'utente se è atteso, invece di dire tu cosa significa.
- **linea e passi**: dove è arrivato il lavoro; un `motivo:` accanto a un passo è un errore, va riportato.
- **check**: ognuno ha punteggio e livello (`positive`, `caution`, `critical`) e un testo. Riporta per
  intero quelli non `positive`.
- **la domanda dello sviluppo** sta nel check «Sviluppo». Se lo sviluppo chiede qualcosa, **riportala
  intera**, parola per parola, non riassunta: chi risponde deve vedere esattamente cosa è stato chiesto.
- **PR**: numero, stato, link.
- **note** (`nota (…)`): riportale.

## 2 — Confronta con Linear (se c'è)

Cerca su Linear i ticket **aperti** del team con l'etichetta `agents` (`list_issues` con `label` e
`team`; segui `hasNextPage`). Per ognuno, `sp find`:

| Linear | SuperPlane | verdetto |
|---|---|---|
| aperto, `agents` | un task `open` | in lavorazione: §1 |
| aperto, `agents` | solo un task `draft` | preso, non partito: riporta da quanto |
| aperto, `agents` | **nessun task**, o solo task chiusi/archiviati | **bloccato** |
| chiuso, o senza `agents` | un task `open` o `draft` | disallineato: segnalalo |

**«Nessun task» non vuol dire «in coda».** `sp find` lo dice in modo morbido («il poller non l'ha ancora
preso o qualcosa lo blocca»), ed esce con codice 0: il controllo si fa sul testo. Per questa skill un
ticket aperto con `agents` senza un task vivo è **bloccato**, e va detto all'utente come tale, con una
riga su cosa lo sblocca: la sessione di `~/admin`. Non provare a sbloccarlo da qui, nemmeno togliendo e
rimettendo l'etichetta.

## 3 — Riporta

In questo ordine, solo le parti che hanno qualcosa:

1. **Da fare per l'utente** — i ticket bloccati (§2), le domande aperte dello sviluppo (intere), i check
   `critical`. Per ciascuno, **dove si agisce**:
   - una domanda dello sviluppo → **un commento su Linear, sotto la domanda**, mai in SuperPlane;
   - un ticket bloccato, un flusso rotto, un check che chiede di rilanciare qualcosa → la sessione di
     `~/admin`.
2. **In corso** — una riga per task: ticket, stato, passo, PR, ultimo movimento.
3. **Cosa non è stato controllato** — il lato Linear se manca il connettore, un workspace che non si è
   trovato.

**Scrivere su Linear.** La skill non lo fa di sua iniziativa. Se l'utente detta la risposta a una
domanda, la si può pubblicare come commento sotto la domanda (`save_comment`), dopo avergli mostrato il
testo. L'etichetta `agents` non si tocca: metterla o toglierla fa partire o fermare SuperPlane, ed è un
gesto dell'utente.
