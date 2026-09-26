# Changelog

Notable CodeShade changes are recorded here. CodeShade follows Semantic Versioning.

## [Unreleased]

### Language & Framework Intelligence

Added in-progress Phase 2 foundations:

- Native-first active-document symbol analysis using VS Code language providers when available.
- Focused VS Code definition/reference lookups for bounded local active-symbol relationships.
- Bounded deterministic fallback parsing for simple symbols, imports, entry points and local code relationships.
- Conservative local relationship resolution for project imports and Java service-style dependencies.
- Evidence-based framework signals for React, Express, Django and Spring Boot using active-file signals plus bounded metadata summaries.
- Language and framework signals in Learning Mode and next-step guidance without running project code.
- Cached document-version language analysis with debounced edit refreshes so fast editor events stay cheap.

No version bump or formal release tag has been created for these unreleased changes.

## [0.2.0] - 2026-09-26

### Deterministic Project Intelligence

Phase 1 moved CodeShade from active-editor context into deterministic, local project understanding while preserving the product's local-first learning philosophy.

Added:

- Cached deterministic project intelligence for resolved active project roots.
- Workspace vs nested active project discovery, including location-agnostic project-root detection inside opened VS Code workspaces.
- JavaScript/TypeScript, Python and Java ecosystem detection.
- Package/build tool detection for Node package managers, Python project metadata, Maven and Gradle.
- Project metadata and package script awareness without executing project commands.
- Bounded source scanning with separate critical metadata discovery.
- Source/test relationship heuristics and source/test counts.
- Optional local Git branch and change-state awareness.
- Project-aware next-step suggestions.
- Fast editor context separated from slower structural project analysis.
- Nested Maven, Node and Python project handling.
- Multi-project workspace handling without combining sibling projects into one fake project.

Correctness and performance work included safer cache invalidation, no Git subprocesses on fast editor events, NUL-delimited Git status parsing, Git-root/project-root path handling, and preservation of script-free Learning Mode rendering.

CodeShade remains local-first: no telemetry, cloud API, account, external AI service, LLM, model download or project code execution is required.

## [0.1.0] - 2026-09-25

### Extension Foundation

Phase 0 established CodeShade as a real VS Code extension and created the initial local-first learning experience.

Added:

- Initial VS Code extension foundation.
- CodeShade Activity Bar container.
- Learning Mode view.
- Active workspace, file and language context.
- Active-file diagnostics in the learning context.
- Deterministic next-step guidance.
- Progressive hints designed to avoid giving away complete answers immediately.
- Initial JavaScript, TypeScript, Python and Java language foundations.
- Local-first/privacy architecture with no telemetry, cloud API or model dependency.
- CI, build, test, lint and formatting tooling.

This is a historical project milestone recorded in the changelog. The repository manifest was still `0.0.1` at the Phase 0 merge, so no retroactive `v0.1.0` Git tag or GitHub Release is planned.
