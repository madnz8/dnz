---
name: create-ticket-linear
description: "Apre uno o più ticket Linear a partire da un'idea dell'utente: chiarisce l'intent con domande semplici, controlla codice e ticket esistenti, decide quanti ticket servono e in che stato, mostra i testi e li salva solo dopo l'ok. Usala quando l'utente vuole aprire un ticket, chiedere una modifica o mettere in coda un lavoro."
---

# dnz:create-ticket-linear

Trasforma un'idea in ticket Linear che si possono lavorare **senza riaprire la conversazione**. Chi
li prende, una persona o un agente, deve trovarci tutto quello che serve: cosa si vuole, perché, le
regole decise, come si vede che è fatto e cosa non deve cambiare.

Il ticket porta l'**intent**, non l'implementazione: il piano tecnico lo scrive chi lo prende, che
tratta il ticket come un intent da verificare. Quindi niente nomi di funzioni da creare né piani
tecnici. I **fatti** che il codice impone, invece, sì: un runbook da seguire, una decisione passata
che il ticket cambia.

> **Linear è il prerequisito, non una casistica.** Nelle altre skill il tracker è un passo che si salta
> se manca; qui il ticket è lo scopo. Senza il connettore Linear la skill si ferma e lo dice. Jira e
> GitHub Issues non sono scritti: vedi `DECISIONI.md`, 2026-11-02.

## 0 — Orientati

I fatti del tracker stanno nel `CLAUDE.md` del repo, non qui. Leggilo per primo e cerca:

- **team e progetto** Linear su cui si aprono i ticket;
- **etichette**: quali sono di tipo, quali di area, e se una fa partire un'automazione (un agente che
  prende il ticket e lo lavora da solo). Quella si chiama qui **etichetta di via**;
- **assegnatario** di default;
- **stati** e cosa vuol dire ciascuno, compresi quelli in cui non si mette niente a mano (dove un
  altro sistema crea richieste da rivedere);
- **dove vanno le cose che non sono ticket**, per esempio un registro dei rinvii per i finding tecnici
  che nessun utente vede;
- regole sui **dati**: cosa non deve mai finire in un ticket.

Quello che il `CLAUDE.md` non dice, chiedilo a Linear e proponilo: `list_teams`, `list_projects`,
`list_issue_labels`, `list_issue_statuses`, `get_user` con `me` per l'assegnatario. Se un fatto
manca e lo scegli tu, dillo nella proposta del §5, così l'utente può correggerlo e aggiungerlo al
`CLAUDE.md`.

Se gli strumenti di Linear non ci sono, fermati: «Il connettore Linear non è disponibile in questa
sessione». Non scrivere il ticket in un file come ripiego.

## 1 — Ascolta e orientati, prima di chiedere

1. Riformula in una frase cosa ha chiesto l'utente, e procedi.
2. **Guarda cosa esiste già**, così le domande partono dai fatti:
   - il codice e la UI che il ticket tocca. **Verifica che una pagina o una funzione esista prima di
     nominarla**: proporre di «aggiungere un filtro alla pagina X» quando X non esiste fa perdere un
     giro;
   - le note e le decisioni passate: documentazione, spec, changelog, note delle call, dove il repo
     le tiene. Una decisione datata che il ticket rovescia va citata nel ticket;
   - **i ticket aperti sullo stesso tema** (`list_issues` con `query`). Se uno si sovrappone, si
     aggiorna quello invece di aprirne un doppione.
3. Se l'utente porta un documento esterno (un'informativa, un testo di un collega), leggilo e
   distingui due cose: **cosa non torna nel documento**, che corregge chi l'ha scritto, e **le
   domande la cui risposta cambia cosa costruiamo**. All'autore servono le seconde, non istruzioni su
   come riscrivere.

## 2 — Chiarisci con domande semplici

- Parole semplici, niente gergo dei workflow: l'utente deve poter rispondere senza tradurre.
- Domande **numerate**, ciascuna con la **tua proposta**, così si risponde con «ok» o col numero.
- Chiedi solo ciò che cambia il ticket. I default convenzionali li scegli tu e li dichiari.
- Se una risposta apre un dubbio nuovo, spiegalo con un esempio concreto prima di richiedere.
- Una regola che decidi tu, senza che l'utente l'abbia detta, va **segnalata** prima del salvataggio.

## 3 — Decidi quanti ticket, in che stato

- **Il discriminante è il numero di storie**, non la difficoltà né la modifica del database.
- Più lavori in sequenza, ognuno da una storia, **non sono un'epic**: diventano ticket separati, col
  secondo in uno stato di attesa e la relazione «bloccato da» verso il primo. **La relazione è
  obbligatoria**: uno stato di attesa senza «bloccato da» dice che il ticket aspetta, non cosa. L'epic
  serve solo quando le storie vanno pianificate insieme perché condividono decisioni che nessuna
  prende da sola.
- Un ticket che aspetta un documento esterno va in attesa anche se il resto è chiaro: chi lo prende
  metterebbe online un testo sbagliato.
- **Anche un bug minore è un ticket suo**, se un utente lo vede. Un finding tecnico che nessuno vede
  va dove il repo tiene i rinvii, se ne ha uno.
- **L'etichetta di via la mette l'utente**, o tu solo se te lo dice: farla scattare manda il ticket a
  un'automazione. Di default proponi stato ed etichette senza quella, e ricorda quale ticket è pronto
  per riceverla.

## 4 — Scrivi i testi

In italiano semplice, con queste sezioni. Ometti quelle vuote.

```
## In breve              ← sempre: 2-3 righe non tecniche, si capisce al volo aprendo il ticket
## Cosa manca            ← solo se il ticket aspetta qualcosa: cosa lo sblocca; se è un altro
                           ticket, il suo identificativo (ABC-123), mai #N
## Il problema           ← cosa non va oggi, e perché importa
## Cosa vogliamo         ← il risultato, non il come
## Regole                ← le decisioni prese, numerate, casi limite compresi
## Dove si vede          ← in quale schermata, per chi
## Come si vede che è fatto  ← verifiche concrete, «faccio X → succede Y»
## Cosa non deve cambiare
## Note                  ← vincoli del repo (runbook, rilascio), decisioni rovesciate
## Richiesta originale   ← se il ticket nasce da una richiesta di qualcuno, il suo testo
```

- Titolo: `<Area>: <cosa>`, breve, leggibile da chi non era in conversazione.
- **Mai dati personali veri** di utenti o clienti: se serve un esempio, inventalo.
- Nessun `@nome` nel testo, notificherebbe qualcuno. Niente `#N` nudo: Linear lo trasforma in un link
  a una PR, anche di un altro repo.

## 5 — Mostra, poi salva

Ogni ticket ha sempre **assegnatario**, almeno un'**etichetta di tipo** e una **priority**. Le
etichette di tipo e di area sono da 1 a 3, l'etichetta di via non conta nel totale; la seconda e la
terza solo se dicono qualcosa che la prima non dice. Se nessuna etichetta descrive il ticket,
proponi di crearne una invece di ripiegare su quella meno sbagliata. La priority segue la scala di
Linear (1 Urgente, 2 Alta, 3 Media, 4 Bassa), mai «Nessuna priorità»: proponi un valore con una riga
di motivo (cosa si rompe o chi è bloccato se non si fa); se l'utente non ha un'idea, 3.

1. Mostra **tutti** i testi, con stato, etichette, priority, assegnatario e relazioni di ciascuno, più
   i fatti del §0 che hai scelto tu. Non salvare niente prima. Un ticket a cui manca uno dei tre campi,
   o che aspetta un altro ticket senza la relazione «bloccato da», non è pronto per essere mostrato.
2. Dopo l'ok: crea o aggiorna i ticket (`save_issue`) passando **sempre** assegnatario, etichette e
   priority, poi le relazioni (`blockedBy`, `relatedTo`). Su un ticket esistente riscrivi titolo e
   descrizione, conserva la richiesta originale e controlla che i tre campi siano a posto anche lì.
3. Rispondi con l'elenco dei ticket (link, stato, etichette, priority), più una riga su cosa resta da
   fare all'utente: quale ticket è pronto per l'etichetta di via, chi deve mandare cosa per sbloccare
   quelli in attesa.
