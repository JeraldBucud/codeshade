# CodeShade Roadmap

This roadmap describes broad direction, not immutable architecture.

## Phase 0 — Extension Foundation

Complete. Established a real VS Code extension with local-first Learning Mode, deterministic context, progressive hints, next-step suggestions, supported language foundations, tests, documentation and CI.

## Phase 1 — Deterministic Project Intelligence

Current phase. Add richer local project understanding: workspace structure, source/test relationships, Git state, package metadata, common scripts, configuration files, diagnostics and project navigation suggestions.

## Phase 2 — Language & Framework Intelligence

Introduce deeper language understanding for JavaScript, TypeScript, Python and Java. Explore AST, Tree-sitter or LSP-assisted analysis when they provide clear value. Add selected framework awareness for React, Node.js/Express, Django and Spring Boot.

## Phase 3 — Learning Engine

Build more sophisticated learning state, hint progression, concept tracking, task awareness, next-file reasoning and better explanations that still encourage learners to write and understand their own code.

## Phase 4 — Embedded Local Intelligence

Add optional embedded lightweight GGUF coding-model support through an in-process local runtime. CodeShade should not require Ollama, LM Studio or a separately running model server.

## Phase 5 — Extended Integrations

Explore optional integration points for external or local agent systems such as Mika and Obsidian while keeping CodeShade standalone and local-first by default.
