# CodeShade Architecture

CodeShade is a local-first VS Code extension for learning by working inside real projects. Phase 2 builds on the cached project-intelligence foundation with native-first language and framework intelligence.

## Extension Shape

The extension activates through the CodeShade Activity Bar view and CodeShade commands. `src/extension.ts` wires together services, while the actual behavior lives in focused modules:

- `src/context` adapts VS Code workspace, editor, selection, diagnostics and TODO data into plain domain models.
- `src/learning` contains progressive hints, next-step selection and the future intelligence-provider boundary.
- `src/project` scans bounded project metadata, detects ecosystems and tools, relates source/test files, and reads optional local Git state.
- `src/language` analyzes the active document through VS Code language providers when available and falls back to bounded deterministic text heuristics.
- `src/framework` detects evidence-based framework signals from the active file and already-known project metadata.
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
- concise code-structure and framework signals when evidence exists

This phase does not send project data anywhere and does not depend on any model or external service.

## Fast Context And Cached Project Intelligence

Fast editor context updates on selection changes, ordinary active document edits and active-file diagnostic changes. These events keep Learning Mode accurate using cached project data without structural scanning or Git subprocess refreshes. Active editor changes may refresh Git because active-file status can change, and save events refresh only volatile Git state.

Project intelligence is split into project-root resolution, a structural index and an active-file projection. The containing VS Code workspace root defines the discovery boundary. From the active file, CodeShade walks upward through ancestors to that workspace boundary and inspects only known strong project-root markers. The nearest strong marker wins; if no marker is found, the workspace root is used as a safe fallback. The structural index is cached by the resolved project-root URI and contains paths, manifests, tool evidence, roots, counts and scripts. Active-file relationships are derived from that cached index, so switching between files in the same resolved project root does not call `findFiles` again.

Structural analysis runs on first project load, manual refresh, active project changes, and relevant metadata/source file create/delete/change events. Cursor movement, selection changes, diagnostics and ordinary source edits use cached project intelligence without refreshing Git. Switching between sibling projects resolves a different project root and uses a separate cache entry.

Async analysis uses generation checks so stale scans cannot overwrite a newer active-project result. File watcher invalidation is rooted: changes in ignored heavy directories are skipped, and changes in a non-active workspace root invalidate that root without forcing the active Learning Mode view to rescan.

## Project Scanning Boundaries

Project scanning uses VS Code workspace APIs such as `findFiles`, `RelativePattern` and `workspace.fs` so it can work in local and remote extension hosts. Scans are scoped to the resolved active project root, not blindly to the outer workspace folder. CodeShade never walks above the containing workspace root and does not search the user's whole machine. It ignores heavy folders such as `.git`, `node_modules`, `dist`, `build`, `out`, `target`, `coverage`, `.next`, virtualenv folders, vendor and generated folders.

The source scanner is bounded to 2,500 relevant source files and marks the snapshot as truncated when the limit is exceeded. Critical root metadata is discovered separately from this source limit, including extensionless lock and wrapper files such as `yarn.lock`, `gradlew` and `mvnw`. The scanner primarily uses paths, filenames and known metadata files. It reads only small known metadata files such as `package.json`, and it does not load arbitrary source contents.

## Language Intelligence

The language layer is scoped to the active document. CodeShade asks VS Code for document symbols through the built-in command API when a language provider is available. If no provider responds, it uses deterministic local heuristics to identify simple imports, classes, functions, methods, route handlers, JSX component usage, service-like dependencies and entry-point signals.

Language analysis is cached by document URI and version. Cursor movement and selection changes derive the current containing symbol from cached symbols and do not ask providers to recompute. Active editor changes, saves and manual refreshes may refresh language analysis. Generation checks prevent stale provider results from replacing newer active-file analysis. The fallback parser is intentionally shallow and bounded; it does not pretend to be a full AST.

## Framework Intelligence

Framework detection is evidence-based and advisory. Phase 2 detects React, Express, Django and Spring Boot only when recognizable file/text/project signals exist. Detections include confidence, evidence and roles such as component, hook, router, route handler, Django URL configuration, model, view, Spring controller, service, repository or application bootstrap.

CodeShade does not execute framework code, run project scripts or infer framework behavior from weak evidence. Framework signals feed the Learning Mode Project section and next-step ranking as learning guidance, not automation.

## Source/Test Relationships

The project layer uses deterministic naming and folder heuristics for JavaScript, TypeScript, Python and Java. It can identify likely existing related files, such as `foo.test.ts`, `src/__tests__/foo.spec.ts`, `test_foo.py`, or `src/test/java/.../FooTest.java`. If a test convention exists but no counterpart is found, CodeShade may suggest a possible test location while clearly marking it as a suggestion rather than an existing file.

## Local Git Adapter

Git awareness is optional and local. The Git repository root may differ from the active project root, such as a repository containing several nested projects. When the active project is file-backed, CodeShade may run bounded `git` commands through `execFile` with `shell: false`, a timeout and bounded output to read the local top-level, branch and working tree state. Active-file status is compared using a Git-relative path so nested project files still match porcelain output. Status is requested with NUL-delimited porcelain output so paths with spaces and renames can be parsed safely. It does not fetch, pull, push, inspect remotes, run project scripts or modify Git state. If Git is unavailable, Learning Mode continues without Git data.

## Deterministic Guidance

Guidance remains deterministic. The next-step service ranks local editor signals such as diagnostics, dirty files, selected code and TODO markers above generic project suggestions. Project intelligence can add guidance such as inspecting a related test, reading a related source file, using a known test script as a feedback loop, or reviewing local Git changes.

## Progressive Hints

Progressive hints are modeled separately from their generation and presentation. The current deterministic hint engine uses editor diagnostics or selections to produce a learning-oriented sequence:

1. Inspect the relevant area.
2. Understand the concept.
3. Follow a stronger direction.
4. Make a small explicit move.

Hints avoid generating complete replacement code because CodeShade should help the learner think and act, not bypass the learning step.

## Future Analysis Layer

Richer deterministic analysis can be added behind the existing context, project, language and framework boundaries. Future work can deepen language and framework understanding without rewriting the Activity Bar UI.

## Future Local Intelligence Layer

`src/learning/intelligenceProvider.ts` establishes the concept of optional providers. Core CodeShade functionality must remain usable through deterministic local logic. A later embedded local model can supplement the learning engine, but it must not become a silent requirement for the extension to work.

Future provider types may include:

- deterministic local engines
- embedded local models
- optional integrations explicitly enabled by the user

Phase 2 does not implement model providers, API clients, telemetry, authentication or network communication.

## Why Core Must Work Without AI

CodeShade is meant to be a dependable local-first learning companion. Learners should be able to install the extension, open a project and receive useful guidance without creating an account, configuring a model server, downloading a model or sharing code. Optional intelligence can deepen the experience later, but the foundation should stay useful on its own.
