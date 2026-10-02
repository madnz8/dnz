# dnz

Plugin Claude Code con sette skill `/dnz:*` (`merge`, `release`, `squash-story`, `deferred`,
`audit`, `ui-check`, `journal`), in `skills/<nome>/SKILL.md`. Il repo è anche il marketplace che le
distribuisce: `github.com/madnz8/dnz` (privato). Si lavora **solo da qui**, non più da `~/admin`.

## Prima di fare qualsiasi cosa

Leggi `DECISIONI.md` **per intero**. È il registro di ogni scelta, con il perché, comprese quelle
poi rovesciate (il metodo di `squash-story`, la rinomina del branch, lo script di sync). In fondo,
«Aperti», c'è cosa resta, in ordine di dipendenza. Non rifare una scelta che lì ha già un perché:
se la rovesci, aggiungi una voce datata che dice cosa cambia e perché, senza cancellare la vecchia.

## Come sono scritte le skill

- Sono **generiche**: rilevano i fatti del repo al §0 («Orientati») invece di contenerli. I fatti
  di un singolo repo stanno nel `CLAUDE.md` di quel repo, mai qui.
- Il tracker (Linear, Jira, GitHub Issues) è una casistica, non un prerequisito: il passo che lo usa
  si salta senza rumore e non si inventano ticket. Ogni skill revisionata dichiara in `DECISIONI.md`
  se nomina Linear.
- `disable-model-invocation: true` su `merge`, `release` e `squash-story` (pushano, rilasciano,
  riscrivono la history: partono solo se le digiti). Le altre quattro restano invocabili dal modello.
- Il prefisso `dnz:` lo dà il plugin, non la cartella: una skill copiata in `.claude/skills/merge/`
  si chiamerebbe `/merge`.

## I repo che usano le skill

In `~/projects/`: `atala-portal`, `lifehacker`, `subtxt`, `lead-generation`,
`trasformazione.ai-homepage`. **Da qui si leggono per censire, non ci si scrive.** Ogni modifica a
un altro repo si fa dalla sessione di quel repo, con un prompt che prepara l'utente: quindi qui si
scrive il prompt (`MIGRAZIONE.md`), non la modifica.

`deferred` è l'unica skill con due mondi, e il §0 decide quale:

- **mondo A**: c'è `auto-bmad` con `deferred_ledger.py`. In atala (1761 righe) e lifehacker (963
  righe) le due copie **divergono**: quella di lifehacker non capisce le voci `source_spec`.
  «Ho trovato lo script» non basta, la prova è un conteggio (`plan` contro `grep`).
- **mondo B**: BMAD senza auto-bmad, cioè subtxt. Il registro è una casella di posta, senza
  parser né archivio; il marcatore è una riga `esito:`. **Non ci è ancora stato fatto un giro vero.**

## Installazione e distribuzione

- In `~/admin` il plugin è installato con `scope=project`.
- **Claude web non vede i plugin** (provato il 2026-09-28). Solo i file committati in un repo
  arrivano al web; la scelta fra le tre strade è aperta in `DECISIONI.md`.
- **Pubblicare** = commit, push, poi `/plugin update dnz` nei repo. Alza la versione in
  `.claude-plugin/plugin.json` **e** `.claude-plugin/marketplace.json` (devono coincidere) quando
  cambia il comportamento di una skill; per un ritocco di sola documentazione no.

## GateGuard

È attivo. Il primo `Bash` e la prima modifica di ogni file chiedono di presentare i fatti: scrivili
in chiaro e riprova. Legge **anche dentro gli heredoc**: un file che documenta comandi distruttivi
(`rm -f`, cancellazione di branch) si scrive col tool di scrittura file, non con `cat <<EOF`.

## Convenzioni

- Testo delle skill e commit in italiano. Formato dei commit: `tipo(area): descrizione`
  (`feat(deferred): …`, `docs: …`, `feat!:` per un cambio di formato che rompe).
- Ogni modifica di comportamento a una skill va registrata in `DECISIONI.md` con data e ragione,
  nello stesso commit.
