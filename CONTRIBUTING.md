# Contributing to CodingSensei

Thanks for helping with CodingSensei. The project is early and intentionally small, so contributions should keep the foundation easy to understand.

## Principles

- Keep CodingSensei local-first.
- Prefer learning guidance over code generation.
- Keep core behavior useful without cloud APIs, accounts, telemetry or model servers.
- Add dependencies only when they clearly pay for their weight.
- Keep domain logic testable outside the VS Code Extension Development Host.

## Development

Install dependencies:

```bash
pnpm install
```

Run the main checks:

```bash
pnpm build
pnpm lint
pnpm format:check
pnpm test
```

Launch the extension from VS Code by pressing F5 and choosing `Run CodingSensei Extension`.

## Pull Requests

Keep pull requests focused. Include tests for learning logic, language detection, hint behavior or guidance ranking when those areas change.
