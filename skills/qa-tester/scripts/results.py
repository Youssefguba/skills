#!/usr/bin/env python3
"""Initialize QA Tester runs, record manual observations, and report every selected target."""
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from common import QAError, cli, global_args, metadata, roots, run_dir, slug, target_dir, write_json

CASE_ID = re.compile(r"^[A-Z][A-Z0-9]*-\d+$")
SYMBOL = {"pass": "✅ Pass", "errors": "⚠️ Pass with errors", "fail": "❌ Fail",
          "blocked": "⛔ Blocked", None: "— Not run"}


def cell(text):
    return str(text).replace("|", "\\|").replace("\r", " ").replace("\n", " ")


def initialize(args):
    project, _ = roots(args)
    directory = run_dir(args, require=False)
    if len(set(t.casefold() for t in args.target)) != len(args.target):
        raise QAError("Each target must be unique, including on case-insensitive filesystems.")
    directory.mkdir(parents=True, exist_ok=False)
    data = {"project": str(project), "run": args.run, "targets": args.target,
            "environment": args.environment, "flavor": args.flavor,
            "platform": args.platform, "branch": args.branch, "base": args.base,
            "started_utc": datetime.now(timezone.utc).isoformat()}
    write_json(directory / "run.json", data)
    lines = [f"{key.title()}: {value}" for key, value in data.items() if key not in ("targets", "run") and value]
    lines += ["Targets: " + ", ".join(args.target),
              "", "Record device/browser IDs, configuration sources, build/run command, build mode,",
              "tool versions, backend risk, login arrangement and evidence limitations here before testing."]
    (directory / "run.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(directory)


def cases_for(args):
    file = run_dir(args) / "plan.md"
    if not file.is_file():
        raise QAError(f"Write the test-case table first: {file}")
    cases = []
    for line in file.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in re.split(r"(?<!\\)\|", line.strip().strip("|"))]
        if cells and CASE_ID.fullmatch(cells[0]):
            if len(cells) < 3:
                raise QAError(f"Incomplete test-case row: {cells[0]}")
            cases.append((cells[0], cells[1], cells[2], cells[3] if len(cells) > 3 else ""))
    if not cases:
        raise QAError("No cases found in plan.md; use IDs such as FEATURE-01.")
    if len({c[0] for c in cases}) != len(cases):
        raise QAError("Test-case IDs must be unique in plan.md.")
    return cases


def evidence(path):
    if path is None:
        return None
    found = Path(path).expanduser().resolve()
    if not found.is_file():
        raise QAError(f"Evidence file not found: {found}")
    return str(found)


def record(args):
    target_dir(args)  # Verify selection even when no bundled device helper was used.
    cases = {case[0]: case for case in cases_for(args)}
    if args.case not in cases:
        raise QAError(f"{args.case} is not in plan.md.")
    file = run_dir(args) / "exploratory.json"
    results = json.loads(file.read_text(encoding="utf-8")) if file.exists() else []
    results = [r for r in results if (r["case"], r["target"]) != (args.case, args.target)]
    item = {"case": args.case, "target": args.target,
            "definition": list(cases[args.case]),
            "status": "errors" if args.status == "pass" and args.error else args.status,
            "note": args.note, "screenshot": evidence(args.screenshot), "log": evidence(args.log),
            "errors": args.error, "recorded_utc": datetime.now(timezone.utc).isoformat()}
    results.append(item)
    write_json(file, results)
    print(f"{args.case} on {args.target}: {SYMBOL[item['status']]}")


def report(args):
    directory = run_dir(args)
    cases = cases_for(args)
    targets = metadata(args)["targets"]
    file = directory / "exploratory.json"
    records = {(r["case"], r["target"]): r for r in json.loads(file.read_text(encoding="utf-8"))} if file.exists() else {}
    lines = [f"# QA Tester: {args.run}", "", (directory / "run.md").read_text(encoding="utf-8").strip(), "",
             "## Status", "", "| Case | " + " | ".join(targets) + " |", "| --- |" + " --- |" * len(targets)]
    details, green = [], True
    for case_id, title, scenario, needs in cases:
        statuses = []
        for target in targets:
            item = records.get((case_id, target))
            stale = item is not None and item.get("definition") != [case_id, title, scenario, needs]
            status = item["status"] if item and not stale else None
            statuses.append(SYMBOL[status])
            green = green and status == "pass"
            if not item or stale:
                reason = "case changed since its last observation; rerun" if stale else "no observation recorded"
                details.append(f"- **{case_id} on {target}**: Not run; {reason}.")
                continue
            details.append(f"- **{case_id} on {target}**: {SYMBOL[status]}. {cell(item['note'])}")
            for kind in ("screenshot", "log"):
                if item.get(kind):
                    # Angle brackets preserve paths with spaces in Markdown links.
                    path = Path(item[kind]).as_posix().replace("<", "%3C").replace(">", "%3E")
                    details.append(f"  - [{kind.title()}](<{path}>)")
            if item.get("errors"):
                details.append("  - Runtime errors: " + "; ".join(cell(e) for e in item["errors"]))
        lines.append(f"| **{case_id}** {cell(title)} | " + " | ".join(statuses) + " |")
    lines += ["", "## Observations and evidence", "", *details, "",
              "Each status is a recorded manual observation. Log coverage and other limitations are described in the run notes and observations.", "",
              f"**Verdict: {'green' if green else 'not green'}** — " +
              ("every planned case has a passing observation on every selected target."
               if green else "failed, blocked, changed, missing, or runtime-error observations need attention.")]
    output = directory / "report.md"
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"\nSaved to {output}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    global_args(parser)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("init")
    p.add_argument("run", type=slug)
    p.add_argument("--target", action="append", type=slug, required=True)
    for name in ("environment", "flavor", "platform", "branch", "base"):
        p.add_argument("--" + name)
    p.set_defaults(handler=initialize)
    p = sub.add_parser("record")
    p.add_argument("run", type=slug)
    p.add_argument("case")
    p.add_argument("target", type=slug)
    p.add_argument("status", choices=("pass", "fail", "blocked"))
    p.add_argument("note")
    p.add_argument("--screenshot")
    p.add_argument("--log")
    p.add_argument("--error", action="append", default=[])
    p.set_defaults(handler=record)
    p = sub.add_parser("report")
    p.add_argument("run", type=slug)
    p.set_defaults(handler=report)
    args = parser.parse_args()
    args.handler(args)


if __name__ == "__main__":
    cli(main)
