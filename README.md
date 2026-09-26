# CodeShade

**Learn to code by coding.**

CodeShade is an open-source, local-first VS Code learning companion that helps you learn programming while working inside real projects.

It is not intended to be another Copilot-style code generator. CodeShade focuses on contextual guidance, progressive hints, explanations, next-step suggestions and learning-oriented feedback that encourage you to write and understand the code yourself.

## Status

CodeShade is in early development. Phase 0 established the extension foundation, Phase 1 added deterministic project intelligence, and Phase 2 is adding native-first language and framework intelligence without AI.

## Philosophy

- Help learners understand before changing code.
- Prefer progressive hints over complete solutions.
- Keep core functionality local-first and usable without accounts or external services.
- Make deterministic project understanding the foundation before adding optional intelligence.

## Local-First Privacy

CodeShade does not include telemetry, analytics, cloud APIs, authentication, API keys, model downloads or hidden background communication. Code and project context stay inside VS Code.

Future optional intelligence providers must not become required for the core extension to work.

## Initial Features

- CodeShade Activity Bar container.
- Learning Mode view for the active workspace and editor.
- Current project, file and language context.
- Selection summary when code is selected.
- Active-file diagnostics surfaced as learning context.
- Cached local project intelligence for the resolved active project root.
- Ecosystem, package/build tool, script and source/test structure signals.
- Related source/test file suggestions when conventions are clear.
- Optional local Git branch/change-state awareness.
- Native-first code-structure awareness using VS Code symbols, definitions and references when available, with deterministic fallback parsing.
- Evidence-based framework signals for React, Express, Django and Spring Boot using active-file evidence plus bounded project metadata summaries.
- Deterministic next-step suggestions.
- Progressive hints that avoid giving away complete answers.
- Command Palette actions for opening Learning Mode, refreshing context and stepping through hints.

## Supported Language Foundations

Phase 0 includes lightweight detection profiles for:

- JavaScript
- TypeScript
- Python
- Java

Phase 1 detects ecosystems and build/package tools. Phase 2 adds native-first symbol, definition and reference awareness plus deterministic framework signals for common React, Express, Django and Spring Boot patterns. CodeShade still does not perform full AST analysis, add Tree-sitter or require external language servers.

## Project Intelligence

CodeShade starts from the VS Code workspace folder that contains the active file, then resolves the active software project by walking upward from that file to the workspace boundary and looking for strong project markers such as `package.json`, `pyproject.toml`, `pom.xml` or `build.gradle`. The nearest strong marker wins, so nested projects such as `workspace/frontend` or `workspace/EBusinessSystem` are treated as the active project instead of the outer workspace folder.

Project discovery is location-agnostic. It does not depend on whether the workspace lives on Desktop, OneDrive, another drive or a Unix home directory. It also stays inside the folder the user opened in VS Code; CodeShade does not scan the whole computer, mounted drives or unrelated home folders.

Project analysis keeps a structural index cached per resolved project root. Cursor movement, selection changes, diagnostics and ordinary text edits refresh the fast editor context and derive active-file relationships from the cached index without rescanning the project or refreshing Git. Manual refresh and relevant source/metadata file changes invalidate the affected project root. In multi-root workspaces, changes outside the active project do not force the active Learning Mode view to rescan.

CodeShade discovers critical metadata files separately from the bounded source-file scan, so lock files and build wrappers such as `yarn.lock`, `gradlew` and `mvnw` can still be detected when source scanning is truncated. Local Git state is refreshed independently from structural project scanning, and the Git repository root may be above the active project root. CodeShade does not run package scripts, tests, builds, hooks or project code.

## Development Setup

Prerequisites:

- Node.js 22.21.0, matching [.node-version](.node-version). pnpm 11.19.0 requires Node.js 22.13 or newer.
- pnpm 11.19.0, matching the `packageManager` field in [package.json](package.json).

These versions are for development and CI tooling. The extension runtime compatibility is declared separately through the VS Code engine in [package.json](package.json).

Install dependencies:

```bash
pnpm install
```

Build the extension:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

Run linting and formatting checks:

```bash
pnpm lint
pnpm format:check
```

## Launching the Extension

Open this repository in VS Code, press F5 and choose `Run CodeShade Extension`. This starts an Extension Development Host with CodeShade installed from the local workspace.

## Commands

- `CodeShade: Open Learning Mode`
- `CodeShade: Refresh Learning Context`
- `CodeShade: Show Next Hint`
- `CodeShade: Reset Hints`

## Versioning and Releases

CodeShade follows Semantic Versioning. The current development release after Phase 1 is `0.2.0`.

See [CHANGELOG.md](CHANGELOG.md) for milestone history and [docs/RELEASING.md](docs/RELEASING.md) for the release process. Phase 2 work is recorded under `Unreleased` until a future version PR prepares `0.3.0`.

## Project Status

This project is not published to the VS Code Marketplace. The `publisher` value in `package.json` is a conservative placeholder for local extension development and packaging metadata.

## License

CodeShade is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
