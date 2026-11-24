"""Shared portable paths and validation for QA Tester (Python 3.9+)."""
import json
import re
import subprocess
import sys
from pathlib import Path


class QAError(Exception):
    pass


def slug(value):
    reserved = {"CON", "PRN", "AUX", "NUL"} | {
        f"{prefix}{n}" for prefix in ("COM", "LPT") for n in range(1, 10)
    }
    if (not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,99}", value)
            or value.upper() in reserved):
        raise QAError("Use a 1–100 character ID with letters, digits, - or _; avoid Windows reserved names.")
    return value


def roots(args):
    candidate = Path(args.project or Path.cwd()).expanduser().resolve()
    if not candidate.is_dir():
        raise QAError(f"Project directory does not exist: {candidate}")
    try:
        result = subprocess.run(["git", "-C", str(candidate), "rev-parse", "--show-toplevel"],
                                capture_output=True, text=True, encoding="utf-8")
    except FileNotFoundError as exc:
        raise QAError("Git is required for branch discovery; install it and add it to PATH.") from exc
    if result.returncode:
        raise QAError(f"Not a Git working tree: {candidate}. Pass --project with the repository path.")
    project = Path(result.stdout.strip()).resolve()
    qa = Path(args.qa_dir or "build/qa-tester").expanduser()
    return project, (qa if qa.is_absolute() else project / qa).resolve()


def run_dir(args, require=True):
    _, qa = roots(args)
    path = qa / slug(args.run)
    if require and not (path / "run.json").is_file():
        raise QAError(f"Run not initialized: {path}. Use results.py init first.")
    return path


def metadata(args):
    return json.loads((run_dir(args) / "run.json").read_text(encoding="utf-8"))


def target_dir(args):
    slug(args.target)
    if args.target not in metadata(args)["targets"]:
        raise QAError(f"Target {args.target!r} was not selected for this run.")
    return run_dir(args) / args.target


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def global_args(parser):
    parser.add_argument("--project", help="Repository/app path; defaults to current working directory")
    parser.add_argument("--qa-dir", help="Absolute output path or path relative to repository root")


def cli(main):
    # Windows redirected streams may otherwise use a legacy code page.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    try:
        main()
    except (QAError, OSError, ValueError, subprocess.SubprocessError) as exc:
        raise SystemExit(f"error: {exc}") from None
