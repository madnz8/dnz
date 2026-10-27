#!/usr/bin/env bash
# PostToolUse di dnz:journal. Dopo ogni Write/Edit su un journal.md misura la voce
# aperta, cioè quella che ha la data di oggi nell'intestazione, e oltre il tetto chiede
# di riscriverla. Su ogni altro file tace. Il perché è in SKILL.md, §2.
set -u

MAX_LINES=20
MAX_WORDS=300

input=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  # Senza jq non si legge il percorso; ci si accontenta di sapere se c'entra un diario,
  # e lo si dice invece di tacere.
  case "$input" in
    *'journal.md"'*)
      printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"dnz:journal: manca jq, il controllo sulla lunghezza della voce non gira. Contala tu: il tetto è 20 righe non vuote."}}'
      ;;
  esac
  exit 0
fi

file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
[ "$(basename -- "$file")" = journal.md ] && [ -f "$file" ] || exit 0

today=$(date +%F)

# Una riga per voce con la data di oggi: righe non vuote, parole, titolo.
# La voce va dalla sua intestazione alla prossima di livello uguale o superiore, così
# regge sia l'ordine cronologico sia quello con la voce nuova in cima. I blocchi di
# codice non chiudono la voce: un `# commento` lì dentro non è un'intestazione.
measure() {
  awk -v day="$today" '
    function report() { print lines "\t" words "\t" title }
    /^(```|~~~)/ { fence = !fence }
    !fence && /^#+[ \t]/ {
      match($0, /^#+/); level = RLENGTH
      if (level <= 6) {
        if (open && level <= open_level) { report(); open = 0 }
        if (!open && index($0, day)) {
          open = 1; open_level = level; lines = 0; words = 0
          title = $0; sub(/^#+[ \t]*/, "", title)
          next
        }
      }
    }
    open && NF { lines++; words += NF }
    END { if (open) report() }
  ' "$file"
}

msg=""
while IFS=$'\t' read -r lines words title; do
  if [ "$lines" -gt "$MAX_LINES" ]; then
    msg+="La voce aperta «$title» in $file ha $lines righe, il tetto è $MAX_LINES: riscrivila ora tenendo il succo. "
  elif [ "$words" -gt "$MAX_WORDS" ]; then
    msg+="La voce aperta «$title» in $file ha $words parole in $lines righe, il tetto è $MAX_WORDS: riscrivila ora tenendo il succo (allungare le righe non la accorcia). "
  fi
done < <(measure)

[ -n "$msg" ] || exit 0
jq -n --arg ctx "${msg% }" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'
