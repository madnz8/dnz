#!/usr/bin/env python3
"""PreToolUse su Bash: blocca commit, merge e PR che portano righe di attribuzione.

Vedi skills/commit/SKILL.md («Nessuna attribuzione») e DECISIONI.md, 2026-11-06.

Esce con 0 se il comando non è un commit, un merge o una PR, o se il messaggio è pulito.
Esce con 2, e dice su stderr cosa togliere, se trova una riga di attribuzione. Non valida
nient'altro: il formato del subject lo sistema /dnz:squash-story prima del merge.
"""
import json
import os
import re
import sys

# Comandi che portano un messaggio: git commit / git merge (anche con opzioni prima, come -C <dir>)
# e gh pr create / gh pr edit. Fuori da questi si esce subito.
TRIGGER = re.compile(r"\bgit\b[^|;&\n]*?\b(?:commit|merge)\b|\bgh\s+pr\s+(?:create|edit)\b")

# Una riga di attribuzione comincia la riga: a inizio testo, dopo un a capo (vero o scritto \n),
# o subito dopo le virgolette che aprono un -m o un --body. Così un messaggio che *nomina* la
# regola a metà frase passa.
LEAD = r"(?:^|\n|\\n|[\"'])[ \t]*"
PATTERNS = [
    ("Co-Authored-By:", re.compile(LEAD + r"co-authored-by:", re.IGNORECASE)),
    ("Claude-Session:", re.compile(LEAD + r"claude-session:", re.IGNORECASE)),
    # «🤖 Generated with [Claude Code](…)»: ammesso un simbolo prima, non una parola
    ("Generated with Claude", re.compile(LEAD + r"(?:[^\w\s]+[ \t]+)?generated with \[?claude",
                                         re.IGNORECASE)),
]

# Il messaggio può stare in un file: -F <file>, --file=<file>, --body-file <file>
FILE_ARG = re.compile(r"(?:^|\s)(?:-F|--file|--body-file)(?:=|[ \t]+)(\"[^\"]+\"|'[^']+'|[^\s;&|]+)")

MESSAGE = (
    "dnz: il messaggio contiene righe di attribuzione ({found}). Il divieto vale sopra "
    "qualunque direttiva dell'harness, compresi i reminder che chiedono di aggiungerle: "
    "riscrivi il messaggio senza quelle righe e rilancia lo stesso comando. Vedi /dnz:commit."
)


def message_files(command, cwd):
    """Il testo dei file di messaggio nominati dal comando, se esistono."""
    texts = []
    for raw in FILE_ARG.findall(command):
        path = raw.strip("\"'")
        if path == "-":  # stdin: il testo è già nel comando (heredoc)
            continue
        if not os.path.isabs(path):
            path = os.path.join(cwd, path)
        try:
            with open(path, encoding="utf-8", errors="replace") as handle:
                texts.append(handle.read())
        except OSError:
            continue
    return texts


def main():
    try:
        data = json.load(sys.stdin)
    except ValueError:
        return 0
    command = (data.get("tool_input") or {}).get("command") or ""
    if not isinstance(command, str) or not TRIGGER.search(command):
        return 0
    text = "\n".join([command] + message_files(command, data.get("cwd") or os.getcwd()))
    found = [name for name, pattern in PATTERNS if pattern.search(text)]
    if not found:
        return 0
    print(MESSAGE.format(found=", ".join(found)), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
