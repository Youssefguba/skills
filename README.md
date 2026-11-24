# Skills

Reusable skills for coding agents.

## Install QA Tester

Install globally and choose your coding agent:

```sh
npx skills add Youssefguba/skills --skill qa-tester --global
```

For Codex:

```sh
npx skills add Youssefguba/skills --skill qa-tester --global --agent codex
```

For Claude Code:

```sh
npx skills add Youssefguba/skills --skill qa-tester --global --agent claude-code
```

Omit `--global` to install into the current project. Add `--copy` if you prefer copied files over symlinks.

## Use

In Codex:

```text
$qa-tester
```

In Claude Code:

```text
/qa-tester
```

You can include a feature specification, ticket, or comparison branch in your request.

## What QA Tester does

- Reads the project and changed code to identify the app, framework, build commands, and branch comparison base.
- Discovers active environments, flavors, schemes, and entrypoints, then asks which configuration and targets to test.
- Performs manual QA using available device, browser, or desktop controls; it does not run Maestro flows.
- Records observations, screenshots, relevant logs, and a status table for each selected target.
- Keeps incomplete, blocked, failed, or runtime-error results visible in the report.

Reports default to `build/qa-tester/<run>/` in the project being tested. The bundled helpers use Python's standard library and resolve the project independently of where the skill is installed.

## Requirements and platform support

- Node.js 22.20+ for the Skills installer.
- Python 3.9+ and Git for the bundled QA helpers.
- The project's own SDKs and runtime dependencies for builds and launches.
- Android: Android SDK tools and a selected device or emulator, on Windows or macOS.
- Local iOS simulators: macOS and Xcode. The helper accepts simulator `.app` builds; real iOS devices need project-specific tooling.
- Web and desktop: the project's supported host/runtime and available interaction tools.

Installing the skill does not install SDKs or supply device interaction tools. It identifies missing capabilities and reports cases as blocked when they cannot be exercised.

## Updates

```sh
npx skills update qa-tester --global
```

## Files

The skill is in [`skills/qa-tester`](skills/qa-tester). Start with [`SKILL.md`](skills/qa-tester/SKILL.md).

Installer documentation: [Skills CLI](https://github.com/vercel-labs/skills/blob/main/docs/commands.md).
