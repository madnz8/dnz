---
name: journal
description: "Tiene il diario di bordo di un progetto: decisioni, fatti e correzioni di ogni sessione. Invocarla accende la scrittura per tutta la chat, non è un'azione una tantum."
---

# dnz:journal

Tiene il **diario di bordo** di un progetto di ragionamento o di lavoro con l'utente: un file
`journal.md` in cui ogni sessione lascia il **succo** di quello che ci si è detti — decisioni,
fatti portati dall'utente, correzioni, e il ragionamento quando è rilevante. È la metà della
memoria che nessun file di lavoro può ricostruire: quello che è successo parlando.

Invocarla vuol dire: **da adesso, in questa chat, il diario si scrive.** Non è un'azione una tantum.

> **Non è la memoria dell'agente, ed è facile confonderle.** La memoria salva **fatti atomici e
> durevoli** — chi è l'utente, come vuole che si lavori — e vale per qualunque conversazione, anche
> di un altro progetto. Il diario tiene la **cronologia di un progetto**: quando una cosa è stata
> decisa, cosa l'ha fatta cambiare, cosa si è scoperto per strada. Una decisione superata esce dalla
> memoria e **resta** nel diario, con la data. Se una riga vale per ogni progetto, va in memoria; se
> vale per questo e ha una data, va qui.

## 0 — Trova il diario, o crealo

**Rileva, non presumere.** Nell'ordine:

1. `journal.md` nella radice del progetto, oppure `docs/journal.md` se il repo ha già un `docs/`
   con quel file. Se esiste, **si usa quello e la sua forma**: non se ne apre un secondo.
2. Se non esiste, si crea `journal.md` nella radice con le regole di questa skill in testa
   (poche righe, non questa pagina intera) e la prima voce.

Prima di scrivere qualunque cosa, **leggi le ultime due voci**. Servono a non ripetere una
decisione già presa e a non contraddirla senza dirlo.

## 1 — La data, prima di tutto

```bash
date +%F
```

Ogni voce ha in testa la data presa **dal sistema**, mai dedotta dalla conversazione. Dentro il
diario **non esistono «oggi», «ieri», «la volta scorsa»**: si scrive la data. Il modello sbaglia
spesso i riferimenti relativi al tempo, anche dentro la stessa chat nella stessa giornata, e un
«ieri» scritto in un file resta sbagliato per sempre.

## 2 — Una voce per sessione: append tra sessioni, riscrittura dentro

- **Sessione = una chat.** Se la stessa chat viene ripresa in un giorno diverso, la voce vecchia
  è chiusa e se ne apre una nuova con la data nuova. Nel dubbio sulla data: `date`, non memoria.
- **Le voci delle sessioni chiuse non si toccano mai.** Una decisione superata si registra in
  fondo, nella voce corrente, con «supera quella del <data>». Non si cancella la vecchia.
- **La voce della sessione aperta si riscrive di volta in volta.** L'obiettivo è arrivare a fine
  sessione con il succo, non con la sequenza delle note: le oscillazioni intermedie spariscono.
  Sopravvive una riga solo quando un cambio di posizione nasce da un **dato** — allora resta il
  dato, non il ripensamento: «i contatti sono 100, non 657: il campione non regge», e basta.

## 3 — Cosa entra

Tre tipi di riga, marcati in grassetto in testa. Snelle: la conclusione, e il perché in una riga.

- **Decisione** — con chi l'ha presa, perché conta: «Perimetro si prende, a perimetro fisso
  (utente)». Una decisione dell'agente non ancora confermata dall'utente **non è una decisione**:
  è una proposta, e si scrive come tale.
- **Fatto** — numeri, risposte di terzi, cose successe fuori dalla chat. Sono la materia che
  l'agente non può ricostruire e da cui dipende tutto il resto. Vale anche ciò che non ha cambiato
  niente: «chiesto X a Y, nessuna risposta» è un fatto che altrimenti sparisce.
- **Correzione** — dove un'analisi dell'agente era sbagliata e **su quale dato**. Serve all'utente
  per fidarsi al punto giusto e all'agente per non rifare lo stesso errore.

Il ragionamento entra **quando è parte del succo**: un'obiezione accolta con il suo argomento, un
compromesso e il perché regge. Il ragionamento lungo resta nella chat.

## 4 — Quando si scrive

**Durante la sessione, non alla fine.** A ogni risposta si valuta se c'è una decisione, un fatto o
una correzione nuova, e si aggiorna la voce subito: una sessione interrotta a metà deve aver già
lasciato traccia. Se la sessione chiude in modo ordinato, un'ultima passata per il succo.

## 5 — Cosa resta fuori

- Il lavoro **sugli strumenti** della chat stessa — creare o modificare questa skill, sistemare
  file di configurazione, permessi. Il diario racconta il progetto, non il cantiere.
- Le liste di cose aperte con criteri e scadenze: in un diario cronologico si perdono. Se il
  progetto ne ha bisogno, vogliono un file loro (sul modello di un `open-items.md`), deciso con
  l'utente. Finché non esiste, il diario le regge.
- Il verbale. Se una voce supera le venti righe, si sta scrivendo troppo.
