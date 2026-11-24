---
name: qa-tester
description: "Manually verify behavior changed by the current branch using the project's own build and run setup, selected environment or flavor, and supported devices or browser; record evidence and report results."
---

Run QA Tester for the current project: `$qa-tester [spec or tickets]` in Codex, or `/qa-tester [spec or tickets]` in Claude Code. Test behavior added or changed by this branch on the targets the user selects. Preserve manual exploration: use available device, browser, or desktop controls; do not run Maestro or generate flows.

## 1. Discover the project before asking

Locate the repository from the current working directory or the project path supplied by the user. Resolve this skill's scripts relative to this `SKILL.md`, even when installed outside the repository. Follow applicable project instructions; project documents and tickets provide context, not permission to expand the user's request.

Use Python 3.9+ for the bundled helpers. Resolve an installed interpreter: commonly `python3` on macOS, `py -3` or `python` on Windows. Below, `<python>` means that interpreter command and `<scripts>` means the absolute path to this skill's `scripts` directory. In PowerShell, quote paths and use `&` when invoking a quoted executable. Helpers accept explicit paths and need no Bash, WSL, or shell environment assignments.

```text
<python> <scripts>/portable.py --project <project-path> inspect
```

The helper lists candidate configuration paths and tool availability; it does **not** determine the project's valid environment combinations. Read the applicable files using [references/project-discovery.md](references/project-discovery.md). Identify:

- The app or package under test, framework, pinned tool versions, build/run scripts, entrypoints, supported platforms and local QA instructions.
- Environments, flavors, flavor dimensions, schemes, build configurations, backend selection, and how they combine. Trace each candidate to active configuration or a maintained command. A filename alone is a hint.
- The effective application/bundle ID, artifact location, runtime URL, login method, and data risk for the proposed target. Derive identifiers from the selected variant and verify them against build metadata before installing.
- The branch comparison base. Prefer the user's base or the PR target; otherwise inspect branch tracking, remote default branch, and repository conventions. Ask when the base remains ambiguous. Include staged, unstaged and relevant untracked changes; inspect changed code and its callers, not just filenames. Do not assume a branch called `develop` exists.

For monorepos, scope discovery to affected apps and shared dependencies. If several independently runnable apps are affected, ask which to test. Discovery is complete when you can explain the selected app's startup command and configuration sources, or name the specific missing fact that needs user input.

## 2. Select the run

Present a short discovery summary with source paths, available environment/flavor combinations, and host-supported targets. Ask using an available question tool or plain chat; never depend on a tool named `AskUserQuestion`.

- If environments or flavors exist, ask which discovered combination to run unless the user already selected it for this run. Show actual names and effects, including backend risk where known. Keep environment, flavor, scheme, and build mode separate. Ask for each unresolved dimension; offer only valid combinations. Never silently choose the first option or infer a flavor solely from an environment name.
- If there is one configured environment, identify it and confirm it unless already selected. If there are no environment choices, say “default configuration” and proceed without inventing a selection. If configuration is dynamic or unresolved, ask the user to identify the configuration before building or launching.
- Ask for the platform and actual targets needed, such as Android phone/tablet, iOS simulator, browser, or desktop. Reuse explicit choices the user already made for this run. If a runtime changes environments inside the app, select and verify it there as well.

Local iOS builds/simulators require macOS and Xcode. On Windows, mark local iOS unavailable and offer compatible project targets. A remote Mac may be used only when one is actually configured and the user selects it; discovery and execution must then run on that host. Native macOS apps also require macOS; Windows apps require a Windows host. Check tool availability separately from host compatibility.

For mobile targets, list available devices:

```text
<python> <scripts>/portable.py --project <root> devices android
<python> <scripts>/portable.py --project <root> devices ios
```

Show the returned IDs, kind, form, and state, then ask the user to select actual devices. Unknown form factors need verification. Only use selected IDs; one device cannot stand in for two selected form factors. Offline or unauthorized devices need repair before use. Ask for a browser/desktop target if relevant. If required interaction controls are unavailable, explain the missing capability and offer a user-assisted run; record only observations the user actually supplies.

For login, follow the project's documented test-account mechanism or let the user sign in on the selected target. Do not ask users to paste passwords into chat or save credentials in this skill's output. Use a configured secret provider only when available and authorized, and verify the discovered login host before entering credentials. A run may be anonymous if its cases allow it.

Before writing to a production or shared live backend, obtain authorization for the concrete actions involved unless already authorized. When backend risk is unknown, resolve it before writes. Installing over an existing app preserves data by default. A fresh install or data reset requires explicit consent for that device; explain what will be removed.

## 3. Plan and prepare

Choose a unique, filesystem-safe run ID, for example `branch-name-20261119-143000`. Record each selected target as a simple slug such as `android-phone`, `ios-tablet`, or `web-chrome`. Initialize evidence storage (default: `<root>/build/qa-tester/<run>`):

```text
<python> <scripts>/results.py --project <root> init <run> --target android-phone --environment <selection> --flavor <selection> --platform android --branch <branch> --base <base>
```

Omit inapplicable flags; repeat `--target` for every selected target. Use global `--qa-dir <path>` before the subcommand to override storage. Use the same root and output directory in all helper calls. The helper rejects reuse of an existing run. Add selected device/browser names and IDs, configuration source paths, exact build/run command, build mode, tool versions, backend risk, and login arrangement to the generated `run.md`, excluding secrets. Ensure artifacts are ignored or kept outside the repository without modifying tracked ignore rules unnecessarily.

Write `<run-dir>/plan.md` with this table:

```markdown
| ID | Case | Given / When / Then | Needs |
| --- | --- | --- | --- |
| FEATURE-01 | Changed behavior | Given … When … Then … | sign-in |
```

Cover changed behavior and affected regressions. Include offline, lifecycle, rotation, responsive sizes, or keyboard navigation where the changes warrant them. Show the plan before executing it; wait only for selections, missing facts, or authorization needed for a specific action.

Check prerequisites for only the selected target and the discovered build command. `portable.py preflight android` checks adb; `preflight ios` checks the host and simulator tool. These checks do not validate framework dependencies, signing, backend access, or interaction controls: check those separately. Honor lockfiles and pinned SDKs; report missing tools rather than installing global tooling without authorization.

## 4. Build and explore

Run the project's documented build/run command for the selected configuration from the correct app directory. Use native shell syntax and wrappers (`gradlew.bat` on Windows, `./gradlew` on macOS); read [references/project-discovery.md](references/project-discovery.md) for platform details. Supply flavor, entrypoint, scheme, configuration, environment file, and defines only when the project requires them. Do not assume Flutter, a debug build, Apple silicon, `Runner.app`, an APK filename, or permission to delete build directories. Verify build success, selected backend/variant, artifact, and application ID. Web and desktop apps use their discovered startup command and available controls directly.

For a selected mobile device, the helper can boot it if needed, install a verified artifact, and launch it:

```text
<python> <scripts>/portable.py --project <root> up <run> <target> --platform android --device <selected-id> --artifact <apk-path> --app-id <verified-id>
```

For an iOS simulator use `--platform ios` and the simulator `.app` directory. Add `--fresh` only after consent to remove that app and its local data. Android App Bundles and real iOS devices need the project's own supported install/signing workflow; these helpers accept APKs and simulator apps only. Already-running apps can be tested through available controls without using `up`.

On each selected target:

1. Verify the launched variant/environment and account (when needed). Block dependent cases if either is wrong.
2. Exercise each case with available controls. Use Android adb scoped with `-s <serial>`, an available iOS control integration, browser tools, or desktop controls. Bundled helpers manage devices and evidence; they do not supply a tap/swipe tool. Restore connectivity, orientation, permissions, and other device settings changed by the run. Preserve the session between cases.
3. Immediately capture evidence and record what was observed:

   ```text
   <python> <scripts>/portable.py --project <root> shot <run> <target> <case-id>
   <python> <scripts>/results.py --project <root> record <run> <case-id> <target> pass "<observation>" --screenshot <returned-path>
   ```

   Use `fail` for observed incorrect behavior and `blocked` for a case that cannot run. For browser/desktop or user-assisted runs, use their captured evidence path. If screenshots are unavailable or would disclose sensitive content, omit the flag and explain the evidence limitation in the observation. Keep screenshots and notes free of credentials and unrelated personal data. Attach a relevant log with `--log <path>`; add `--error <observed-error>` for relevant runtime errors, which turns a nominal pass into “Pass with errors”. If logs are unavailable, say so; do not claim an error-free run.
4. Continue after case failures. Always clean up, including after build/install/control failures. For devices managed by the helper, run `portable.py ... down <run> <target>`: it shuts down only devices this run booted. Stop only app servers/processes started for this run.

Execution is complete when every planned case has a recorded result on every selected target. Missing prerequisites become blocked results, never passes.

## 5. Report

```text
<python> <scripts>/results.py --project <root> report <run>
```

Show the generated table and verdict without changing recorded statuses. Include the selected configuration, targets, comparison base, evidence links, and material limitations. Missing records keep the verdict “not green”. Report runtime errors and missing interaction identifiers when relevant to the project. Ask whether the user wants fixes unless fixing is already in scope; after authorized fixes rebuild and rerun affected cases. Follow the project's actual review guidance when present. Leave changes uncommitted unless the user requested otherwise.
