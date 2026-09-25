# CodeShade Architecture

CodeShade is a local-first VS Code extension for learning by working inside real projects. Phase 0 establishes a small, testable extension foundation rather than a final intelligence system.

## Extension Shape

The extension activates through the CodeShade Activity Bar view and CodeShade commands. `src/extension.ts` wires together services, while the actual behavior lives in focused modules:

- `src/context` adapts VS Code workspace, editor, selection, diagnostics and TODO data into plain domain models.
- `src/learning` contains deterministic language awareness, progressive hints, next-step selection and the future intelligence-provider boundary.
- `src/ui` renders Learning Mode using a VS Code Webview View.
- `src/commands` connects command palette actions to the same services used by the UI.
- `src/core` defines shared domain models.

The UI receives already-computed learning context, hints and suggestions. It does not inspect documents directly or decide learning behavior.

## Learning Mode

Learning Mode presents immediate context from the active VS Code session:

- workspace name
- current file
- detected language
- selected code summary
- active-file diagnostics
- a deterministic next-step suggestion
- a progressive hint

This phase does not send project data anywhere and does not depend on any model or external service.

## Deterministic Guidance

Phase 0 guidance is intentionally simple. The next-step service ranks local signals such as diagnostics, dirty files, selected code, TODO markers, missing editors and test-file signals. It is designed as replaceable domain logic, not UI code.

## Progressive Hints

Progressive hints are modeled separately from their generation and presentation. The current deterministic hint engine uses editor diagnostics or selections to produce a learning-oriented sequence:

1. Inspect the relevant area.
2. Understand the concept.
3. Follow a stronger direction.
4. Make a small explicit move.

Hints avoid generating complete replacement code because CodeShade should help the learner think and act, not bypass the learning step.

## Future Analysis Layer

Richer deterministic project intelligence can be added behind the existing context and learning boundaries. Phase 1 can expand workspace structure analysis, source/test relationships, Git state, package metadata and language-tool signals without rewriting the Activity Bar UI.

## Future Local Intelligence Layer

`src/learning/intelligenceProvider.ts` establishes the concept of optional providers. Core CodeShade functionality must remain usable through deterministic local logic. A later embedded local model can supplement the learning engine, but it must not become a silent requirement for the extension to work.

Future provider types may include:

- deterministic local engines
- embedded local models
- optional integrations explicitly enabled by the user

Phase 0 does not implement model providers, API clients, telemetry, authentication or network communication.

## Why Core Must Work Without AI

CodeShade is meant to be a dependable local-first learning companion. Learners should be able to install the extension, open a project and receive useful guidance without creating an account, configuring a model server, downloading a model or sharing code. Optional intelligence can deepen the experience later, but the foundation should stay useful on its own.
