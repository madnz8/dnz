#!/usr/bin/env bash
# Test di check-entry.sh: `bash skills/journal/check-entry.test.sh`. Diari finti in una
# cartella temporanea, con la data di oggi presa come la prende lo script.
set -u

here=$(cd "$(dirname "$0")" && pwd)
script="$here/check-entry.sh"
tmp=$(mktemp -d)
trap 'rm -r "$tmp"' EXIT

today=$(date +%F)
failed=0

# n righe di testo, ciascuna di w parole
body() {
  local n=$1 w=${2:-5} i
  for ((i = 1; i <= n; i++)); do
    printf -- '- riga %d' "$i"
    printf ' parola%.0s' $(seq 3 "$w")
    printf '\n'
  done
}

run() { # $1 = file, $2 = tool; stampa l'additionalContext, vuoto se lo script tace
  jq -n --arg f "$1" --arg t "${2:-Edit}" '{tool_name: $t, tool_input: {file_path: $f}}' |
    bash "$script" | jq -r '.hookSpecificOutput.additionalContext // empty'
}

check() { # $1 = nome, $2 = output, $3 = atteso: "" per silenzio, altrimenti una sottostringa
  if [ -z "$3" ] && [ -z "$2" ]; then
    echo "ok   $1"
  elif [ -n "$3" ] && [[ "$2" == *"$3"* ]]; then
    echo "ok   $1"
  else
    echo "FAIL $1: atteso «$3», avuto «$2»"
    failed=1
  fi
}

j="$tmp/journal.md"

{ echo "## $today"; body 30; } >"$tmp/note.md"
check "un file che non è journal.md non si guarda" "$(run "$tmp/note.md")" ""

check "un journal.md che non esiste non si guarda" "$(run "$tmp/altro/journal.md")" ""

{ echo "# Diario"; echo; echo "## $today"; body 5; } >"$j"
check "voce corta: silenzio" "$(run "$j")" ""

{ echo "## $today"; body 25; } >"$j"
check "voce lunga: chiede di riscriverla" "$(run "$j" Write)" "ha 25 righe, il tetto è 20"

{ echo "## $today"; body 20; printf '\n\n\n\n\n'; } >"$j"
check "le righe vuote non contano" "$(run "$j")" ""

{ echo "## 2020-01-01"; body 40; } >"$j"
check "una voce vecchia lunga non si tocca" "$(run "$j")" ""

{ echo "## $today"; body 22; echo; echo "## 2020-01-01"; body 40; } >"$j"
check "voce nuova in cima: si misura quella" "$(run "$j")" "ha 22 righe"

{ echo "## 2020-01-01"; body 40; echo "## $today"; body 3; } >"$j"
check "voce vecchia sopra, nuova corta sotto: silenzio" "$(run "$j")" ""

{ echo "### $today — tema"; body 21; } >"$j"
check "intestazione di terzo livello" "$(run "$j")" "«$today — tema»"

{ echo "## $today"; body 10; echo "### dettaglio"; body 11; } >"$j"
check "una sottosezione non chiude la voce" "$(run "$j")" "ha 22 righe"

{ echo "## $today"; body 5; echo '```bash'; echo '# un commento'; echo '## non è una voce'; echo '```'; body 15; } >"$j"
check "un blocco di codice non chiude la voce" "$(run "$j")" "ha 24 righe"

{ echo "## $today"; body 10 40; } >"$j"
check "righe lunghe: scatta il tetto in parole" "$(run "$j")" "410 parole in 10 righe"

# Senza jq: un PATH con gli strumenti che servono, meno jq.
bin="$tmp/bin"
mkdir "$bin"
for t in bash cat date awk basename; do ln -s "$(command -v "$t")" "$bin/$t"; done
{ echo "## $today"; body 25; } >"$j"
out=$(printf '{"tool_input":{"file_path":"%s"}}' "$j" | PATH="$bin" bash "$script")
check "senza jq lo dice, non tace" "$out" "manca jq"
out=$(printf '{"tool_input":{"file_path":"%s"}}' "$tmp/note.md" | PATH="$bin" bash "$script")
check "senza jq, su un altro file tace" "$out" ""

exit $failed
