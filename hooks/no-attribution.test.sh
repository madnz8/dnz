#!/usr/bin/env bash
# Test di no-attribution.py: `bash hooks/no-attribution.test.sh`. Ogni caso costruisce l'input
# di un PreToolUse su Bash e controlla il codice di uscita: 0 passa, 2 blocca.
set -u

here=$(cd "$(dirname "$0")" && pwd)
script="$here/no-attribution.py"
tmp=$(mktemp -d)
trap 'rm -r "$tmp"' EXIT
failed=0

run() { # $1 = comando; stampa il codice di uscita dello script
  jq -n --arg c "$1" --arg d "$tmp" \
    '{hook_event_name: "PreToolUse", tool_name: "Bash", cwd: $d, tool_input: {command: $c}}' |
    python3 "$script" 2>"$tmp/stderr"
  echo $?
}

check() { # $1 = nome, $2 = comando, $3 = codice atteso
  local got
  got=$(run "$2")
  if [ "$got" = "$3" ]; then
    echo "ok   $1"
  else
    echo "FAIL $1: atteso $3, avuto $got"
    failed=1
  fi
}

nl=$'\n'

# Passano
check "comando qualunque" 'ls -la' 0
check "git log" 'git log --oneline -5' 0
check "git log che cerca il trailer" 'git log --grep "Co-Authored-By:"' 0
check "commit pulito" 'git commit -m "feat(rbac): estrai il layer condiviso (Story 2.3)"' 0
check "commit che cita la regola" \
  'git commit -m "docs(commit): vieta le righe `Co-Authored-By:` e «Generated with Claude Code»"' 0
check "commit con soggetto che nomina Generated with" \
  'git commit -m "docs: Generated with Claude spiegato nel README"' 0
check "heredoc pulito" "git commit -F - <<'MSG'${nl}feat(ui): nuova scheda${nl}${nl}Il perché.${nl}MSG" 0
check "JSON non valido" '' 0

# Bloccano
check "-m ripetuto con trailer" \
  'git commit -m "feat: x" -m "Co-Authored-By: Claude <noreply@anthropic.com>"' 2
check "trailer minuscolo" 'git commit -m "feat: x" -m "co-authored-by: qualcuno <a@b.c>"' 2
check "heredoc su stdin" \
  "git commit -F - <<'MSG'${nl}feat(ui): x${nl}${nl}Co-Authored-By: Claude <noreply@anthropic.com>${nl}MSG" 2
check "heredoc dentro -m" \
  "git commit -m \"\$(cat <<'EOF'${nl}feat(ui): x${nl}${nl}Co-Authored-By: Claude <noreply@anthropic.com>${nl}EOF${nl})\"" 2
check "riga Generated with con emoji" \
  "git commit -F - <<'MSG'${nl}feat: x${nl}${nl}🤖 Generated with [Claude Code](https://claude.com/claude-code)${nl}MSG" 2
check "link di sessione" \
  "git -C /tmp/repo commit -F - <<'MSG'${nl}feat: x${nl}${nl}Claude-Session: https://claude.ai/code/session_x${nl}MSG" 2
check "merge con trailer" \
  "git merge --no-ff feature/x -m \"merge(ui): x${nl}${nl}Co-Authored-By: Claude <noreply@anthropic.com>\"" 2
check "\\n letterale nel -m" 'git commit -m "feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>"' 2
check "PR con Generated with" \
  "gh pr create --title x --body \"Riassunto${nl}${nl}🤖 Generated with [Claude Code](https://claude.com/claude-code)\"" 2

# -F e --body-file: il messaggio sta in un file
printf 'feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n' >"$tmp/msg-sporco.txt"
printf 'feat: x\n\nIl perché.\n' >"$tmp/msg-pulito.txt"
check "-F file con trailer, percorso relativo" 'git commit -F msg-sporco.txt' 2
check "--file= file con trailer" "git commit --file=$tmp/msg-sporco.txt" 2
check "-F file pulito" "git commit -F \"$tmp/msg-pulito.txt\"" 0
check "-F file che non esiste" 'git commit -F manca.txt' 0
check "--body-file con trailer" "gh pr create --title x --body-file $tmp/msg-sporco.txt" 2

# Il messaggio di blocco dice cosa togliere
run 'git commit -m "feat: x" -m "Co-Authored-By: Claude <noreply@anthropic.com>"' >/dev/null
if grep -q 'Co-Authored-By:' "$tmp/stderr" && grep -q 'harness' "$tmp/stderr"; then
  echo "ok   messaggio di blocco"
else
  echo "FAIL messaggio di blocco: $(cat "$tmp/stderr")"
  failed=1
fi

exit $failed
