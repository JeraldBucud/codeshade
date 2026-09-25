# CodeShade

**Learn to code by coding.**

CodeShade is an open-source, local-first VS Code learning companion that helps you learn programming while working inside real projects.

It is not intended to be another Copilot-style code generator. CodeShade focuses on contextual guidance, progressive hints, explanations, next-step suggestions and learning-oriented feedback that encourage you to write and understand the code yourself.

## Status

CodeShade is in early development. Phase 0 establishes the extension foundation, Activity Bar presence, deterministic Learning Mode and project structure. The experience is useful but intentionally simple.

## Philosophy

- Help learners understand before changing code.
- Prefer progressive hints over complete solutions.
- Keep core functionality local-first and usable without accounts or external services.
- Make deterministic project understanding the foundation before adding optional intelligence.

## Local-First Privacy

Phase 0 does not include telemetry, analytics, cloud APIs, authentication, API keys, model downloads or hidden background communication. Code and project context stay inside VS Code.

Future optional intelligence providers must not become required for the core extension to work.

## Initial Features

- CodeShade Activity Bar container.
- Learning Mode view for the active workspace and editor.
- Current project, file and language context.
- Selection summary when code is selected.
- Active-file diagnostics surfaced as learning context.
- Deterministic next-step suggestions.
- Progressive hints that avoid giving away complete answers.
- Command Palette actions for opening Learning Mode, refreshing context and stepping through hints.

## Supported Language Foundations

Phase 0 includes lightweight detection profiles for:

- JavaScript
- TypeScript
- Python
- Java

Full AST or framework intelligence is planned for later phases.

## Development Setup

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

## Project Status

This project is not published to the VS Code Marketplace. The `publisher` value in `package.json` is a conservative placeholder for local extension development and packaging metadata.

## License

CodeShade is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
