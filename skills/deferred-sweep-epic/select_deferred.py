"""Elenca le voci aperte di deferred-work.md (formato `### DW-<n>:` di bmad-loop) di un'epic.

Uso: python3 -I select_deferred.py <epic> [--ledger PERCORSO] [--runs CARTELLA]
                                         [--exclude TESTO ...]

Una voce è dell'epic N quando `source_spec:` o `origin:` nominano una sua storia o l'epic
stessa (`spec-N-…`, `N-M-slug`, `story N-M`, `epic-N`, `Epic N`, `epica N`). Una voce nata da
un altro rinvio e senza epic sua eredita le epic delle voci da cui viene, anche su più livelli:
il rimando è `DW-24` nell'`origin:`, `spec-dw-24-…` nella `source_spec:`, oppure
`spec-dw-<nome-del-gruppo>.md`, che si risolve con i `triage.json` dei giri di bmad-loop
(`--runs`, di default `.bmad-loop/runs`). Le voci che citano l'epic solo in `reason:` o
`location:` sono «dubbie» e non vanno mai nello sweep da sole.

`--exclude` toglie le voci il cui `origin:` contiene quel testo: serve ai repo con track che
hanno numeri di epic omonimi (il repo lo dice nel suo CLAUDE.md).

Il registro può contenere byte NUL: si legge in binario, si decodifica con errors="replace" e i
NUL si tolgono. Esce con 1 se il registro manca, non si legge o non ha voci DW, con 2 per un
errore negli argomenti. Serve Python 3.9 o successivo.
"""
import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from types import MappingProxyType
from typing import Mapping

DEFAULT_LEDGER = "_bmad-output/implementation-artifacts/deferred-work.md"
DEFAULT_RUNS = ".bmad-loop/runs"
MAX_ORPHANS_LISTED = 30
DECISION_NOTE_CHARS = 60

HEADING = re.compile(r"### (DW-\d+):(?:[ \t]+(.*))?$")
ANY_HEADING = re.compile(r"#{1,6}[ \t]")
FIELD = re.compile(r"([a-z_-]+): (.*)")
EPIC_STRUCTURED = [
    re.compile(r"\bspec-(\d+)-\d"),
    re.compile(r"(?<![\w-])(\d+)-\d+-[a-z]"),
    re.compile(r"\bstory (\d+)[-.]\d", re.IGNORECASE),
    re.compile(r"\bepica?[- ](\d+)\b", re.IGNORECASE),
]
EPIC_LOOSE = [
    re.compile(r"\bepica?[- ](\d+)\b", re.IGNORECASE),
    re.compile(r"\bstory (\d+)\.\d", re.IGNORECASE),
]
PARENT_IN_ORIGIN = re.compile(r"\bDW-(\d+)\b")
PARENT_IN_SPEC = re.compile(r"\bdw-(\d+)(?![a-z0-9])", re.IGNORECASE)
BUNDLE_SPEC = re.compile(r"\bspec-dw-([a-z0-9][a-z0-9-]*?)\.md")


@dataclass(frozen=True)
class Entry:
    id: str
    title: str
    fields: Mapping[str, str]

    def get(self, name: str) -> str:
        return self.fields.get(name, "")

    @property
    def is_open(self) -> bool:
        return self.get("status").strip() == "open"


def parse(text: str) -> list[Entry]:
    entries: list[Entry] = []
    current: tuple[str, str, dict[str, str]] | None = None

    def close() -> None:
        if current is not None:
            entries.append(Entry(current[0], current[1], MappingProxyType(current[2])))

    for line in text.replace("\x00", "").split("\n"):
        line = line.rstrip("\r")
        heading = HEADING.match(line)
        if heading:
            close()
            current = (heading.group(1), (heading.group(2) or "").strip(), {})
            continue
        if ANY_HEADING.match(line):
            close()
            current = None
            continue
        found = FIELD.match(line)
        if current is not None and found:
            current[2].setdefault(found.group(1), found.group(2))
    close()
    return entries


def bundles_in(data: object) -> dict[str, list[str]]:
    """I gruppi di un triage.json; quelli senza nome o malformati si saltano."""
    if not isinstance(data, dict):
        return {}
    result = data.get("result", data)
    found = result.get("bundles", []) if isinstance(result, dict) else []
    bundles: dict[str, list[str]] = {}
    for bundle in found if isinstance(found, list) else []:
        if not isinstance(bundle, dict) or not isinstance(bundle.get("name"), str):
            continue
        ids = bundle.get("dw_ids", [])
        bundles.setdefault(bundle["name"], []).extend(
            i for i in (ids if isinstance(ids, list) else []) if isinstance(i, str))
    return bundles


def read_bundles(runs: Path) -> dict[str, list[str]]:
    """Nome del gruppo -> id DW, dai triage.json dei giri in ordine di data: se due giri usano
    lo stesso nome, vale il più recente. Un file illeggibile si salta, e lo si dice su stderr."""
    bundles: dict[str, list[str]] = {}
    for path in sorted(runs.glob("*/triage.json")) if runs.is_dir() else []:
        try:
            data = json.loads(path.read_text(encoding="utf-8-sig"))
        except (OSError, ValueError) as err:
            print(f"triage illeggibile, saltato: {path} ({err})", file=sys.stderr)
            continue
        bundles.update(bundles_in(data))
    return bundles


def numbers(patterns: list[re.Pattern], text: str) -> frozenset[int]:
    return frozenset(int(n) for p in patterns for n in p.findall(text))


def own_epics(entry: Entry) -> frozenset[int]:
    return numbers(EPIC_STRUCTURED, entry.get("source_spec") + " " + entry.get("origin"))


def parents(entry: Entry, bundles: Mapping[str, list[str]]) -> list[str]:
    spec = entry.get("source_spec")
    ids = [f"DW-{n}" for n in PARENT_IN_ORIGIN.findall(entry.get("origin"))]
    ids += [f"DW-{n}" for n in PARENT_IN_SPEC.findall(spec)]
    for name in BUNDLE_SPEC.findall(spec):
        ids += bundles.get(name, [])
    return [i for i in dict.fromkeys(ids) if i != entry.id]


def inherited_epics(entry: Entry, ctx: "Context", seen: frozenset[str] = frozenset()
                    ) -> tuple[frozenset[int], list[str]]:
    """Le epic delle voci da cui la voce è nata, risalendo finché una ne ha di sue, e i
    rimandi diretti che le hanno portate."""
    found: set[int] = set()
    via: list[str] = []
    for parent_id in parents(entry, ctx.bundles):
        parent = ctx.by_id.get(parent_id)
        if parent is None or parent_id in seen or parent_id in ctx.excluded:
            continue
        epics = own_epics(parent) or inherited_epics(parent, ctx, seen | {entry.id})[0]
        if epics:
            found |= epics
            via.append(parent_id)
    return frozenset(found), via


@dataclass(frozen=True)
class Context:
    by_id: Mapping[str, Entry]
    excluded: frozenset[str]
    bundles: Mapping[str, list[str]]


def notes_for(entry: Entry, epic: int, epics: frozenset[int], via: list[str]) -> list[str]:
    notes = []
    if via:
        notes.append("via " + ", ".join(via))
    others = sorted(epics - {epic})
    if others:
        notes.append("anche epic " + ", ".join(map(str, others)))
    decision = entry.get("decision").strip()
    if decision:
        notes.append("decision: " + decision[:DECISION_NOTE_CHARS])
    return notes


def classify(entries: list[Entry], epic: int, exclude: list[str],
             bundles: Mapping[str, list[str]]) -> dict:
    ctx = Context(
        by_id={e.id: e for e in entries},
        excluded=frozenset(e.id for e in entries if any(x in e.get("origin") for x in exclude)),
        bundles=bundles,
    )
    result = {"certe": [], "dubbie": [], "orfane": [], "escluse": 0}
    for e in entries:
        if not e.is_open:
            continue
        if e.id in ctx.excluded:
            result["escluse"] += 1
            continue
        epics, via = own_epics(e), []
        if not epics:
            epics, via = inherited_epics(e, ctx)
        if epic in epics:
            result["certe"].append((e, notes_for(e, epic, epics, via)))
        elif epic in numbers(EPIC_LOOSE, e.get("reason") + " " + e.get("location")):
            result["dubbie"].append((e, notes_for(e, epic, frozenset({epic}), [])))
        if not epics:
            result["orfane"].append(e)
    return result


def line(entry: Entry, notes: list[str]) -> str:
    parts = [entry.id, entry.get("severity") or "?", entry.title]
    parts += [f"[{n}]" for n in notes]
    return "\t".join(p.replace("\t", " ") for p in parts)


def report(path: Path, entries: list[Entry], result: dict) -> str:
    open_count = sum(e.is_open for e in entries)
    out = [f"Registro: {path}: {len(entries)} voci DW, {open_count} aperte",
           f"Escluse da --exclude: {result['escluse']}", ""]
    for kind in ("certe", "dubbie"):
        out.append(f"## {kind} ({len(result[kind])})")
        out += [line(e, notes) for e, notes in result[kind]]
        out.append("")
    orphans = [e.id for e in result["orfane"]]
    listed = ", ".join(orphans[:MAX_ORPHANS_LISTED])
    if len(orphans) > MAX_ORPHANS_LISTED:
        listed += f", … altre {len(orphans) - MAX_ORPHANS_LISTED}"
    out.append(f"Di nessuna epic: {len(orphans)} voci aperte" + (f" ({listed})" if orphans else ""))
    out.append("ids certe: " + ",".join(e.id for e, _ in result["certe"]))
    return "\n".join(out)


def main() -> int:
    parser = argparse.ArgumentParser(description="Voci aperte di deferred-work.md di un'epic.")
    parser.add_argument("epic", type=int, help="numero dell'epic")
    parser.add_argument("--ledger", default=DEFAULT_LEDGER, help="percorso del registro")
    parser.add_argument("--runs", default=DEFAULT_RUNS,
                        help="cartella dei giri di bmad-loop, per i nomi dei gruppi")
    parser.add_argument("--exclude", action="append", default=[],
                        help="testo dell'origin: che toglie la voce (ripetibile)")
    args = parser.parse_args()
    if any(not x for x in args.exclude):
        parser.error("--exclude vuoto escluderebbe ogni voce")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    path = Path(args.ledger)
    if not path.is_file():
        print(f"registro non trovato: {path}", file=sys.stderr)
        return 1
    try:
        raw = path.read_bytes()
    except OSError as err:
        print(f"registro illeggibile: {path} ({err})", file=sys.stderr)
        return 1
    entries = parse(raw.decode("utf-8", errors="replace"))
    if not entries:
        print(f"nessuna voce `### DW-<n>:` in {path}: non è il formato di bmad-loop",
              file=sys.stderr)
        return 1
    result = classify(entries, args.epic, args.exclude, read_bundles(Path(args.runs)))
    print(report(path, entries, result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
