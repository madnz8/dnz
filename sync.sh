#!/usr/bin/env bash
# Allinea i comandi dnz di un repo alla fonte unica (~/workspace/dnz/commands).
#
#   ./sync.sh ~/projects/atala-portal          # scrive
#   ./sync.sh ~/projects/atala-portal --check  # non scrive, dice solo cosa cambierebbe
#
# Non committa: lascia le modifiche nel working tree del repo di destinazione,
# perche' il commit va guardato prima di farlo.
set -euo pipefail

FONTE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${1:-}"
MODO="${2:-}"

if [ -z "$DEST" ]; then
  echo "uso: $0 <percorso-repo> [--check]" >&2
  exit 2
fi
if [ ! -d "$DEST/.git" ]; then
  echo "errore: $DEST non e' un repo git" >&2
  exit 1
fi

TARGET="$DEST/.claude/commands/dnz"
mkdir -p "$TARGET"

nuovi=0; aggiornati=0; invariati=0
for f in "$FONTE"/commands/*.md; do
  nome="$(basename "$f")"
  if [ ! -f "$TARGET/$nome" ]; then
    stato="NUOVO"; nuovi=$((nuovi+1))
  elif ! cmp -s "$f" "$TARGET/$nome"; then
    stato="AGGIORNATO"; aggiornati=$((aggiornati+1))
  else
    stato="invariato"; invariati=$((invariati+1))
  fi
  printf '  %-12s %s\n' "$stato" "$nome"
  [ "$MODO" = "--check" ] || cp "$f" "$TARGET/$nome"
done

# File orfani: presenti nel repo ma non piu' nella fonte. Si segnalano, non si toccano:
# toglierli e' una decisione, e va presa guardando.
for f in "$TARGET"/*.md; do
  nome="$(basename "$f")"
  [ "$nome" = "FONTE.md" ] && continue
  if [ ! -f "$FONTE/commands/$nome" ]; then
    printf '  %-12s %s  <- non esiste piu nella fonte, valuta se toglierlo\n' "ORFANO" "$nome"
  fi
done

if [ "$MODO" != "--check" ]; then
  cat > "$TARGET/FONTE.md" <<'NOTA'
# Questi file sono generati — non modificarli qui

La fonte unica dei comandi `/dnz:*` e' il repo **`dnz`** (su rings: `~/workspace/dnz`).
Questa cartella ne e' una copia allineata con `./sync.sh <questo-repo>`.

I file stanno nel repo, e non a livello utente, per un motivo preciso: **una sessione di
Claude web vede solo cio' che e' committato**. Un plugin locale o un symlink su rings da
qui non si raggiungono.

**Se una skill va corretta**, si corregge nella fonte e si rilancia il sync. Una modifica
fatta qui sopravvive fino al sync successivo, poi sparisce senza dire niente — ed e'
esattamente la divergenza che questa struttura esiste per impedire.

**Se la correzione vale solo per questo repo**, non e' una modifica alla skill: e' un fatto
del progetto, e va nel `CLAUDE.md`. Le skill sono scritte per rilevare i fatti del repo.
NOTA
  echo
  echo "fatto: $nuovi nuovi, $aggiornati aggiornati, $invariati invariati"
  echo "le modifiche sono nel working tree di $DEST — guardale prima di committare"
else
  echo
  echo "--check: nessuna scrittura"
fi
