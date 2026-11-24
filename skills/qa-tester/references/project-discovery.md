# Project and host discovery

Read this before choosing environments or constructing a build command. Use applicable project instructions and maintained scripts as the source of truth. The examples below are search locations, not required files or commands to copy unchanged.

## Find the runnable app and its configuration

Start with the root README, applicable AGENTS.md/CLAUDE.md, manifests, workspace membership, local development docs, CI workflows and task/launch configurations. Follow scripts into the config they actually consume. Skip dependency caches and generated output when searching. Inspect relevant untracked code too. In a monorepo, trace affected shared packages into runnable consumers rather than choosing the first manifest found.

| Project | Evidence to inspect |
| --- | --- |
| Flutter/Dart | `pubspec.yaml`, `.fvmrc` or FVM config, documented tasks, `lib/main*.dart`, `appFlavor`/defines, Android product flavors and dimensions, iOS shared schemes and xcconfig mappings |
| Android/Gradle | `settings.gradle*`, app modules, `build.gradle*`, `productFlavors`, `flavorDimensions`, `buildTypes`, source-set manifests, `applicationId` and suffixes, variant task listings |
| iOS | `.xcworkspace`/`.xcodeproj`, shared `.xcscheme` files, `.xcconfig`, build configurations, resolved bundle ID and SDK destination; inspect scheme/build settings on macOS |
| JavaScript/web/React Native/Expo | `package.json` scripts and package manager lockfile, workspace config, app config, bundler mode, `.env` filenames and example key names, native Android/iOS config, Expo/EAS build profiles and channels |
| .NET/desktop | `.sln`/`.csproj`, target frameworks, build configurations, `launchSettings.json`, appsettings filenames and documented launch profiles |
| Other stacks | Manifests, wrappers, Makefile/task files, CI and development docs; derive the actual build and runtime mechanism rather than forcing a mobile workflow |

Separate **environment** (backend/runtime settings), **flavor** (app variant, possibly several dimensions), **build mode** (debug/release/profile), **scheme/configuration**, and **entrypoint**. Map valid combinations to the command that activates them. A scheme named “staging” may select several settings, while a flavor may only change branding. Check both native platforms when their mappings differ. Do not treat stale `.env` files, test fixtures, or unused CI examples as selectable environments without confirming they are active.

Inspect environment variable names and non-secret routing/configuration. Avoid printing `.env` values or signing credentials. Derive backend risk from documented configuration and actual runtime selection; a friendly name alone does not prove data is disposable. If app IDs, artifact paths or runtime URLs depend on build-time values, verify resolved metadata/build output after building.

## Select the branch scope

Find the PR target when available or the explicitly requested base. Branch tracking may point at the feature branch itself, so it is a clue, not necessarily the comparison base. Inspect remote HEAD and documented branch conventions; ask if several bases remain plausible. Resolve `git merge-base HEAD <base>` and review the diff from that commit to the working tree plus relevant untracked files. Use argument-based subprocess calls or quote arguments for the actual shell. Detached HEAD needs a descriptive run name and commit ID; never check out another branch just to discover the base.

## Host-compatible commands

| Concern | macOS | Windows |
| --- | --- | --- |
| Python | Resolve `python3` (3.9+) | Resolve `py -3` or `python` (3.9+); exclude nonfunctional Store aliases |
| Paths/shell | Quote paths for the active shell | Quote paths in PowerShell/cmd; PowerShell uses `&` for a quoted command path |
| Gradle wrapper | `./gradlew` | `.\gradlew.bat` in PowerShell |
| Common SDK tools | Executables on PATH or discovered SDK location | Include `.exe`, `.cmd`, `.bat` as appropriate; do not require Unix utilities |
| Android SDK | Environment overrides, then `local.properties`, then normal user SDK location | Same precedence; common fallback is `%LOCALAPPDATA%\Android\Sdk` |
| iOS simulator | Requires Xcode, selected developer directory, available runtime | Unavailable locally; select another supported target or an already configured remote Mac |

Prefer portable project tasks. Translate shell-only wrappers only after reading their behavior; if translation cannot preserve it, explain the dependency and select a documented alternative. Host compatibility does not imply tool availability. Do not assume Android SDK architecture, emulator image, Xcode version, processor architecture, signing identity, or package manager.

The bundled `portable.py` uses Python subprocess argument lists, SDK discovery and binary screenshot capture on both hosts. `inspect` is a candidate inventory, not a parser for arbitrary Gradle/Dart/JavaScript or runtime settings. Its mobile helpers cover Android devices/emulators and local macOS iOS simulators. Use project-specific tooling for unsupported artifact types, real iOS devices, web and desktop.
