# Security Policy

CodeShade is an early-stage local-first VS Code extension.

## Reporting a Vulnerability

Please report security issues through GitHub issues for now, unless the issue contains sensitive exploit details. If sensitive details are involved, contact the repository owner directly through their GitHub profile.

## Local-First Expectations

CodeShade does not include telemetry, analytics, cloud APIs, authentication, API keys, model downloads or background network communication. Reports about accidental data transmission or hidden external dependencies are treated as security issues.

Phase 1 reads local project paths and small known metadata files such as `package.json` inside the VS Code workspace the user opened. It may resolve a nested active project root inside that workspace, but it does not scan the entire computer, mounted drives, home directory, Desktop, Documents, Downloads or unrelated OneDrive folders. It discovers root metadata such as lock files and build wrappers separately from the bounded source scan, but it does not execute those files. Optional Git awareness reads local branch and NUL-delimited working-tree status using bounded `git` subprocess calls with `shell: false`. Phase 2 may ask VS Code language providers for symbols for the active document and may inspect the active document text with bounded deterministic heuristics to identify simple code-structure and framework evidence. CodeShade does not run project scripts, tests, builds, Git hooks, package managers or framework code automatically.
