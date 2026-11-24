#!/usr/bin/env python3
"""Host/tool inventory and explicitly selected mobile device lifecycle; no framework assumptions."""
import argparse
import fnmatch
import json
import os
import platform
import plistlib
import re
import shutil
import subprocess
import time
from pathlib import Path

from common import QAError, cli, global_args, roots, slug, target_dir, write_json


def execute(command, check=True, binary=False, timeout=60):
    result = subprocess.run([str(x) for x in command], capture_output=True,
                            text=not binary, encoding=None if binary else "utf-8",
                            errors=None if binary else "replace", timeout=timeout)
    if check and result.returncode:
        detail = result.stderr if not binary else result.stderr.decode("utf-8", "replace")
        raise QAError(f"{Path(str(command[0])).name} failed ({result.returncode}): {detail.strip()}")
    return result


def sdk_roots(project):
    values = [os.environ.get("ANDROID_HOME"), os.environ.get("ANDROID_SDK_ROOT")]
    # Java properties escape Windows backslashes and the drive colon.
    for file in (project / "android/local.properties", project / "local.properties"):
        if file.is_file():
            for line in file.read_text(encoding="utf-8").splitlines():
                match = re.match(r"\s*sdk\.dir\s*[=:]\s*(.*)", line)
                if match:
                    values.append(re.sub(r"\\([\\:= ])", r"\1", match[1]))
    if platform.system() == "Windows":
        local = os.environ.get("LOCALAPPDATA")
        if local:
            values.append(str(Path(local) / "Android/Sdk"))
    elif platform.system() == "Darwin":
        values.append(str(Path.home() / "Library/Android/sdk"))
    else:
        values.append(str(Path.home() / "Android/Sdk"))
    return [Path(v).expanduser() if Path(v).expanduser().is_absolute()
            else project / v for v in values if v]


def tool(name, project, required=True):
    found = shutil.which(name)
    if not found and name in ("adb", "emulator"):
        suffix = ".exe" if platform.system() == "Windows" else ""
        subdir = "platform-tools" if name == "adb" else "emulator"
        found = next((str(s / subdir / (name + suffix)) for s in sdk_roots(project)
                      if (s / subdir / (name + suffix)).is_file()), None)
    if required and not found:
        raise QAError(f"{name} not found. Configure PATH or the Android SDK location for Android tools.")
    return found


def ios_host():
    if platform.system() != "Darwin":
        raise QAError("Local iOS builds/simulators require macOS and Xcode. Select another target or a configured remote Mac.")


def inventory(args):
    project, _ = roots(args)
    skip = {".git", "node_modules", ".dart_tool", ".gradle", "Pods", "build", "dist",
            "vendor", ".venv", "venv", ".next", "DerivedData", ".idea"}
    patterns = ("AGENTS.md", "CLAUDE.md", "README*", "pubspec.yaml", ".fvmrc", "fvm_config.json",
                "package.json", "pnpm-workspace.yaml", "*lock*", "*gradle*", "*.xcconfig",
                "*.xcscheme", "project.pbxproj", "*.csproj", "*.sln", "launchSettings.json",
                "appsettings*.json", ".env*", "main*.dart", "Makefile", "*Taskfile*", "tasks.json",
                "launch.json", "eas.json", "app.json", "app.config.*", "*config*", "*.yml", "*.yaml")
    candidates = []
    for parent, dirs, files in os.walk(project):
        dirs[:] = sorted(d for d in dirs if d not in skip and not (Path(parent) / d).is_symlink())
        for name in sorted(files):
            if any(fnmatch.fnmatch(name, pattern) for pattern in patterns):
                candidates.append(str((Path(parent) / name).relative_to(project)))
    branch = execute(["git", "-C", project, "branch", "--show-current"]).stdout.strip()
    commit = execute(["git", "-C", project, "rev-parse", "HEAD"], check=False).stdout.strip()
    print(json.dumps({"project": str(project), "host": platform.system(), "architecture": platform.machine(),
                      "branch": branch or "(detached or unborn)", "commit": commit,
                      "tools": {name: tool(name, project, required=False) for name in
                                ("git", "adb", "emulator", "xcrun", "flutter", "dart", "node", "dotnet")},
                      "configuration_candidates": candidates,
                      "note": "Read applicable files and trace commands to resolve valid environments; no secret values read."},
                     indent=2, ensure_ascii=False))


def form(width, height, density):
    try:
        return "tablet" if min(int(width), int(height)) * 160 / int(density) >= 600 else "phone"
    except (ValueError, ZeroDivisionError):
        return "?"


def android_form(adb, serial):
    size = execute([adb, "-s", serial, "shell", "wm", "size"], check=False).stdout
    density = execute([adb, "-s", serial, "shell", "wm", "density"], check=False).stdout
    sizes = re.findall(r"(?:Physical|Override) size:\s*(\d+)x(\d+)", size)
    densities = re.findall(r"(?:Physical|Override) density:\s*(\d+)", density)
    return form(*sizes[-1], densities[-1]) if sizes and densities else "?"


def android_rows(project):
    adb = tool("adb", project)
    rows, running = [], set()
    for line in execute([adb, "devices"]).stdout.splitlines()[1:]:
        cells = line.split()
        if len(cells) < 2:
            continue
        serial, state = cells[:2]
        kind = "emulator" if serial.startswith("emulator-") else "real"
        name, shape = serial, "?"
        if state == "device":
            shape = android_form(adb, serial)
            if kind == "emulator":
                name = execute([adb, "-s", serial, "emu", "avd", "name"], check=False).stdout.splitlines()[0:1]
                name = name[0].strip() if name else serial
                running.add(name)
            else:
                name = execute([adb, "-s", serial, "shell", "getprop", "ro.product.model"], check=False).stdout.strip() or serial
        rows.append(dict(id=serial, kind=kind, form=shape, state="running" if state == "device" else state, name=name))
    emulator = tool("emulator", project, required=False)
    if emulator:
        for name in execute([emulator, "-list-avds"]).stdout.splitlines():
            name = name.strip()
            if name and name not in running:
                rows.append(dict(id=name, kind="emulator", form="?", state="off", name=name))
    return sorted(rows, key=lambda r: (r["state"] != "running", r["kind"] != "real", r["name"]))


def ios_rows(project):
    ios_host()
    data = json.loads(execute([tool("xcrun", project), "simctl", "list", "devices", "available", "-j"]).stdout)
    rows = []
    for runtime, devices in data["devices"].items():
        if ".iOS-" not in runtime:
            continue
        for d in devices:
            kind = d.get("deviceTypeIdentifier", "")
            shape = "tablet" if "iPad" in kind else "phone" if "iPhone" in kind or "iPod" in kind else "?"
            rows.append(dict(id=d["udid"], kind="simulator", form=shape,
                             state="running" if d["state"] == "Booted" else "off",
                             name=d["name"] + " (" + runtime.rsplit(".", 1)[-1] + ")"))
    return sorted(rows, key=lambda r: (r["state"] != "running", r["name"]))


def rows_for(platform_name, project):
    return android_rows(project) if platform_name == "android" else ios_rows(project)


def preflight(args):
    project, _ = roots(args)
    if args.platform == "ios":
        ios_host()
    rows = rows_for(args.platform, project)
    usable = [r for r in rows if r["state"] in ("running", "off")]
    if not usable:
        hint = ("Connect a device with USB debugging and accept its prompt, or create an AVD in Android Studio."
                if args.platform == "android" else "Add an iOS runtime and simulator in Xcode.")
        raise QAError("No usable devices. " + hint)
    print(f"Device tools ready: {len(usable)} available {args.platform} target(s). Check project build/runtime prerequisites separately.")


def wait_until(check, description, seconds=180):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        if check():
            return
        time.sleep(2)
    raise QAError(f"Timed out waiting for {description}. Run down to clean up this selected target.")


def android_serial(adb, name):
    for line in execute([adb, "devices"]).stdout.splitlines()[1:]:
        cells = line.split()
        if len(cells) > 1 and cells[0].startswith("emulator-") and cells[1] == "device":
            output = execute([adb, "-s", cells[0], "emu", "avd", "name"], check=False).stdout.splitlines()
            if output and output[0].strip() == name:
                return cells[0]
    return None


def up(args):
    project, _ = roots(args)
    directory = target_dir(args)
    state_file = directory / "device.json"
    if state_file.exists():
        raise QAError("Target already managed by this run; use down first.")
    if not re.fullmatch(r"[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+", args.app_id):
        raise QAError("Supply the verified application/bundle ID, without shell syntax.")
    artifact = Path(args.artifact).expanduser().resolve()
    if args.platform == "android" and (not artifact.is_file() or artifact.suffix.lower() != ".apk"):
        raise QAError("Android helper requires an APK; use the project's installer for other artifacts.")
    if args.platform == "ios" and (not artifact.is_dir() or artifact.suffix.lower() != ".app"):
        raise QAError("iOS helper requires a simulator .app directory.")
    selected = next((r for r in rows_for(args.platform, project) if r["id"] == args.device), None)
    if not selected or selected["state"] not in ("running", "off"):
        raise QAError("Device is unavailable; select a ready ID from devices output.")
    for existing in directory.parent.glob("*/device.json"):
        other = json.loads(existing.read_text(encoding="utf-8"))
        if other["platform"] == args.platform and (
                other["id"] == selected["id"] or
                (other["kind"] != "real" and other["name"] == selected["name"])):
            raise QAError("This device already fills another target in this run.")
    directory.mkdir(parents=True, exist_ok=True)
    state = dict(selected, platform=args.platform, app_id=args.app_id, booted_by_run=False)
    write_json(state_file, state)
    if args.platform == "android":
        adb = tool("adb", project)
        if selected["state"] == "off":
            emulator = tool("emulator", project)
            flags = {"creationflags": subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP} if platform.system() == "Windows" else {"start_new_session": True}
            with (directory / "emulator.log").open("ab") as log:
                process = subprocess.Popen([emulator, "-avd", selected["name"], "-no-snapshot-save"],
                                           stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT, **flags)
            state.update(booted_by_run=True, emulator_pid=process.pid)
            write_json(state_file, state)
            wait_until(lambda: android_serial(adb, selected["name"]), "selected emulator appearing")
            state["id"] = android_serial(adb, selected["name"])
            write_json(state_file, state)
        serial = state["id"]
        wait_until(lambda: execute([adb, "-s", serial, "shell", "getprop", "sys.boot_completed"], check=False).stdout.strip() == "1", "Android boot", 300)
        wait_until(lambda: execute([adb, "-s", serial, "shell", "pm", "path", "android"], check=False).stdout.startswith("package:"), "Android package manager", 120)
        if args.fresh:
            uninstall_android(adb, serial, args.app_id)
        execute([adb, "-s", serial, "install", "-r", "-t", artifact], timeout=180)
        execute([adb, "-s", serial, "shell", "monkey", "-p", args.app_id, "-c", "android.intent.category.LAUNCHER", "1"])
    else:
        xcrun = tool("xcrun", project)
        udid = state["id"]
        if selected["state"] == "off":
            execute([xcrun, "simctl", "boot", udid])
            state["booted_by_run"] = True
            write_json(state_file, state)
        execute([xcrun, "simctl", "bootstatus", udid, "-b"], timeout=300)
        if args.fresh:
            installed = plistlib.loads(execute([xcrun, "simctl", "listapps", udid], binary=True).stdout)
            if args.app_id in installed:
                execute([xcrun, "simctl", "uninstall", udid, args.app_id])
        execute([xcrun, "simctl", "install", udid, artifact], timeout=180)
        execute([xcrun, "simctl", "launch", udid, args.app_id])
    print(json.dumps(state, indent=2))


def uninstall_android(adb, serial, app_id):
    installed = execute([adb, "-s", serial, "shell", "pm", "list", "packages", app_id])
    if "package:" + app_id in installed.stdout.splitlines():
        execute([adb, "-s", serial, "uninstall", app_id])


def state_for(args):
    directory = target_dir(args)
    file = directory / "device.json"
    if not file.is_file():
        raise QAError("Target has no device state; use up first or your project's own controls.")
    return directory, file, json.loads(file.read_text(encoding="utf-8"))


def down(args):
    project, _ = roots(args)
    _, file, state = state_for(args)
    if state["booted_by_run"]:
        if state["platform"] == "android":
            adb = tool("adb", project)
            serial = android_serial(adb, state["name"])
            if serial:
                execute([adb, "-s", serial, "emu", "kill"])
            elif state.get("emulator_pid"):
                try:
                    os.kill(state["emulator_pid"], 0)
                except ProcessLookupError:
                    pass
                else:
                    raise QAError("Booted emulator is still starting or not responding; cleanup state retained. Retry down when adb can identify it.")
        else:
            ios_host()
            row = next((r for r in ios_rows(project) if r["id"] == state["id"]), None)
            if row and row["state"] == "running":
                execute([tool("xcrun", project), "simctl", "shutdown", state["id"]])
    file.unlink()
    print("Cleaned up; devices that were already running remain running.")


def shot(args):
    project, _ = roots(args)
    directory, _, state = state_for(args)
    output = directory / "shots" / (slug(args.name) + ".png")
    output.parent.mkdir(parents=True, exist_ok=True)
    if state["platform"] == "android":
        data = execute([tool("adb", project), "-s", state["id"], "exec-out", "screencap", "-p"], binary=True).stdout
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise QAError("Device returned no valid PNG screenshot.")
        output.write_bytes(data)
    else:
        ios_host()
        execute([tool("xcrun", project), "simctl", "io", state["id"], "screenshot", output])
    print(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    global_args(parser)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("inspect").set_defaults(handler=inventory)
    for name, handler in (("devices", None), ("preflight", preflight)):
        p = sub.add_parser(name)
        p.add_argument("platform", choices=("android", "ios"))
        p.set_defaults(handler=handler)
    for name, handler in (("up", up), ("down", down), ("shot", shot)):
        p = sub.add_parser(name)
        p.add_argument("run", type=slug)
        p.add_argument("target", type=slug)
        p.set_defaults(handler=handler)
        if name == "up":
            p.add_argument("--platform", choices=("android", "ios"), required=True)
            p.add_argument("--device", required=True)
            p.add_argument("--artifact", required=True)
            p.add_argument("--app-id", required=True)
            p.add_argument("--fresh", action="store_true", help="Remove this app and local data; requires prior user consent")
        elif name == "shot":
            p.add_argument("name", type=slug)
    args = parser.parse_args()
    if args.command == "devices":
        print(json.dumps(rows_for(args.platform, roots(args)[0]), indent=2, ensure_ascii=False))
    else:
        args.handler(args)


if __name__ == "__main__":
    cli(main)
