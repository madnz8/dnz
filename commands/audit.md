---
description: "Audit periodico del repo: verifica che codice, tracking e infrastruttura dicano la stessa cosa, e produce un report datato con verdetto, finding per severità e priorità. Delta-first."
---

# dnz:audit

Audit periodico del repo: verifica che **codice, tracking e infrastruttura dicano la stessa cosa**, e
produce un **report datato** con verdetto, finding per severità e priorità di intervento.
**Delta-first**: riparte dall'ultimo audit e giudica ciò che è cambiato.

Si lancia **a mano**, di tanto in tanto. Il momento naturale è **dopo una release**
(`/dnz:release`), oppure **prima di pianificare una nuova iniziativa** — mai a pipeline in volo.

## Perché esiste

Il guasto che previene è misurato, non ipotetico. Un audit su lifehacker ha trovato **41 casi di
drift** tra i file di tracking e la realtà del codice — quasi tutti nella stessa direzione, *"fatto
ma mai marcato"*: una checklist consegnata a luglio e dichiarata mancante da tre retrospettive
consecutive, un'epica mergiata e rilasciata ma ancora `in-progress`.

La causa è strutturale: **gli stati si scrivono in pianificazione e quasi mai al delivery.** Senza
una passata periodica, ogni pianificazione successiva eredita lavoro fantasma — e lo eredita con
fiducia, perché è scritto.

## Precondizioni (hard-stop)

- **Working tree pulito**, sul branch di default aggiornato.
- **Nessuna pipeline in volo**, se il repo ne ha una con uno stato su disco.
- **Esiste almeno un audit precedente.** Se non c'è, si fa un **full audit**, non un delta — e lo si
  dichiara nel report.

## 0 — Orientati e scegli il perimetro

**Rileva, non presumere:**

- **Dove vivono i report** — di norma `.claude/reviews/audit-YYYY-MM-DD.md`, con un indice
  `README.md` accanto. Leggi l'ultimo: la **forma della serie** è quella, e un report che non la
  segue non si confronta con i precedenti.
- **Il comando di verifica** del repo (`typecheck`, `lint`, `build`, `test`).
- **I file di tracking** che il repo usa davvero: stato di sprint o epiche, registro dei rinvii,
  registri tematici, changelog.
- **Le regole del `CLAUDE.md`** che si possono violare in silenzio: sono le lenti del passo 2.
- **Come si consegna**: commit diretto o branch + PR.

Poi scegli il perimetro:

```bash
ls <cartella-report>/audit-*.md | tail -1        # ultimo audit, e la sua baseline
git log --oneline <baseline>..HEAD -- <sorgenti> | wc -l
```

- **Delta-first** è il default: si legge **integralmente** ciò che il delta ha toccato.
- **Full** — si legge tutto — quando sono passati più di ~3 mesi, o il delta tocca più della metà
  dei sorgenti, o l'ultimo audit è precedente a un cambio di architettura.

## 1 — Baseline verificata: mai fidarsi, misurare

```bash
<comando-di-verifica-del-repo>      # ⚠️ mai i test che girano su servizi veri
curl -s <endpoint-health>           # versione live vs versione dichiarata nel repo
npm outdated; npm audit --omit=dev  # o l'equivalente del gestore di pacchetti
```

Il report si apre con **numeri misurati adesso**, non con quelli dell'ultima volta.

⚠️ **Gli advisory di sicurezza si giudicano per applicabilità, non per conteggio.** Per ciascuno,
traccia l'import reale: il pacchetto incriminato è davvero raggiunto dal codice che gira? Precedente
misurato: **5 advisory, 3 di severità alta, 0 applicabili** — nessuno dei moduli vulnerabili era
importato. Un report che ricopia il conteggio dello strumento senza il trace è **rumore**, e peggio:
è rumore che sembra un allarme.

## 2 — Codice

Leggere **integralmente** — non a campione — i sorgenti toccati dal delta, più **ogni migrazione di
database riga per riga**: una tabella rigenerata che perde policy, grant o vincoli è il tipo di
danno che nessun test coglie.

Tre lenti, in quest'ordine:

1. **Conformità al `CLAUDE.md`.** Le regole del repo che si violano senza che niente si rompa: dove
   possono stare le variabili d'ambiente, quali convenzioni di naming, quale versione di una
   libreria, la lingua dei commenti. E soprattutto le regole di **contratto**: un campo tolto o
   ristretto in uno schema già pubblicato è un finding, anche quando sembra innocuo.
2. **Sicurezza**, se il delta tocca autenticazione, autorizzazione o isolamento dei dati: rifai il
   ragionamento del threat model invece di rileggere il codice — un client autenticato che prova a
   leggere i dati di un altro, un attaccante non autenticato sulla superficie HTTP, un valore
   memorizzato ostile rigiocato più tardi, un leak nei log.
3. **Performance**: ogni nuova query ha l'indice che le serve? Precedente reale: un indice rimandato
   *"alla prossima migrazione"* per due migrazioni di fila.

## 3 — Tracking

**È la parte che i repo sbagliano di più**, ed è il motivo principale per cui questa skill esiste.

1. **Registro dei rinvii**: lancia **`/dnz:deferred`** — triage completo, marcatori, archivio,
   piano. È il pezzo grosso, e ha le sue regole.
2. **Stato di story ed epiche**: ogni voce non chiusa e ogni action item aperto si verifica
   **contro git** (`git log`, `gh pr view`), **mai contro un altro file di tracking** — quello
   eredita lo stesso drift e te lo conferma.
3. **Registri tematici**, se il repo ne ha: i banner di stato e i claim sono ancora veri?
4. **Changelog**: quello che dichiara l'ultima release corrisponde al diff reale?

## 4 — Test e configurazione

- **Copertura** dei moduli nuovi.
- **I contratti sono provati sull'SDK o sul servizio reale, o solo su un fake?** Una validazione
  saltata nel fake è una classe di bug che passa tutti i test.
- **Duplicazione dell'harness**: conta le copie degli helper noti. Tre fake server leggermente
  diversi sono tre comportamenti diversi.
- **CI**: cosa gira davvero e cosa no. **Dipendenze**: coerenza del pinning. **Asset di deploy**:
  quello che serve in produzione è dove il deploy lo cerca?

**Parallelismo consigliato quando il delta è grosso**: 3–4 subagent (test / tracking / sicurezza /
configurazione), con un vincolo che non si negozia — **il report finale lo scrive chi ha letto il
codice**, incrociando e verificando i claim degli agenti, mai incollandoli.

## 5 — Report

Nuovo file datato, nella **forma della serie** letta al passo 0:

1. **Intestazione** — modalità (delta-first o full, con la baseline), metodo, e la baseline
   verificata con i numeri del passo 1.
2. **Punteggio, col delta motivato** rispetto all'audit precedente. Un punteggio senza il perché è
   decorazione.
3. **Stato dei finding precedenti** — tabella risolti (con l'evidenza) e ancora aperti. ⚠️ Ogni
   "aperto" va **ri-verificato contro il codice**, non ricopiato dal report vecchio: è esattamente
   il drift che questo audit esiste per trovare.
4. **Finding nuovi**, per severità, con `file:riga` e lo **scenario** — non l'etichetta.
5. **Interventi per priorità**, e i **FALSI ALLARMI**: le cose che sembrano aperte e non lo sono.
   **È la sezione che ripaga il costo dell'audit** — senza, il giro dopo si ri-indaga tutto da capo.
6. **Conformità al `CLAUDE.md`.**

Aggiorna l'indice dei report. Se emergono batch di fix, il piano va in un **file separato**, con le
sue etichette e il suo kickoff — non dentro il report.

## 6 — Consegna

Come consegna il repo, rilevato al passo 0: commit diretto, oppure branch `docs/audit-<data>` + PR,
oppure lasciare i file untracked **e dirlo**.

All'utente: **il verdetto in tre frasi** — com'è messo, cosa è cambiato dal giro prima, la prima
cosa da fare — e poi il puntatore al report. Linguaggio piano, niente gergo di processo.

---

## Trappole note

**I file di stato mentono in una direzione sola**: dicono "aperto" per cose che sono fatte. Quasi
mai il contrario. Verifica contro git e contro il codice, **mai contro un altro file di tracking**.

**Se il registro dei rinvii è in una lingua e il classificatore cerca parole in un'altra**, il suo
suggerimento è inaffidabile: vedi le Trappole di `/dnz:deferred`.

**Gli strumenti di audit delle dipendenze contano anche ciò che non gira.** Sempre il trace
import-per-import prima di scrivere "vulnerabile".

⚠️ **Niente refactor durante l'audit.** L'audit produce **report e piano, mai diff di codice**. È la
tentazione più forte del passo 2 — trovi una cosa da tre righe e la sistemi al volo — ed è il modo
più rapido per trasformare un audit in un branch che nessuno ha chiesto. I fix partono dal piano,
dopo.

**Se GateGuard è attivo**, il primo `Bash` della sessione e la prima scrittura di ogni file chiedono
di presentare i fatti. Un audit scrive almeno due file: mettilo in conto e presenta i fatti in testa
al blocco, invece di scoprirlo a metà.
