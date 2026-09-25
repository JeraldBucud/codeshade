# Security Policy

CodeShade is an early-stage local-first VS Code extension.

## Reporting a Vulnerability

Please report security issues through GitHub issues for now, unless the issue contains sensitive exploit details. If sensitive details are involved, contact the repository owner directly through their GitHub profile.

## Local-First Expectations

CodeShade does not include telemetry, analytics, cloud APIs, authentication, API keys, model downloads or background network communication. Reports about accidental data transmission or hidden external dependencies are treated as security issues.

Phase 1 reads local project paths and small known metadata files such as `package.json`. Optional Git awareness reads local branch and working-tree status using bounded `git` subprocess calls with `shell: false`. CodeShade does not run project scripts, tests, builds, Git hooks or package managers automatically.
