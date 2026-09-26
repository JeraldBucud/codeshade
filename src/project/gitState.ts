import type { GitProjectState } from "../core/models";
import { normalizePath } from "./pathUtils";

export interface GitStatusParseInput {
  readonly branchOutput: string;
  readonly statusOutput: string;
  readonly activeFile?: string;
}

export function parseGitState(input: GitStatusParseInput): GitProjectState {
  const branch = input.branchOutput.trim() || undefined;
  const changedFiles = parsePorcelainStatus(input.statusOutput);
  const activeFile = input.activeFile ? normalizePath(input.activeFile) : undefined;

  return {
    available: true,
    isRepository: true,
    branch,
    isDirty: changedFiles.length > 0,
    changedFileCount: changedFiles.length,
    activeFileStatus: activeFile ? statusForActiveFile(activeFile, changedFiles) : undefined
  };
}

export function unavailableGitState(error: string): GitProjectState {
  return {
    available: false,
    isRepository: false,
    error
  };
}

interface ChangedFile {
  readonly path: string;
  readonly status: NonNullable<GitProjectState["activeFileStatus"]>;
}

function parsePorcelainStatus(output: string): readonly ChangedFile[] {
  if (output.includes("\0")) {
    return parseNulPorcelainStatus(output);
  }

  return output
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map(parseStatusLine);
}

function parseStatusLine(line: string): ChangedFile {
  const code = line.slice(0, 2);
  const rawPath = line.slice(3);
  const path = normalizePath(rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1)! : rawPath);

  if (code.includes("?")) {
    return { path, status: "untracked" };
  }
  if (code.includes("D")) {
    return { path, status: "deleted" };
  }
  if (code.includes("R")) {
    return { path, status: "renamed" };
  }
  if (code.trim().length > 0) {
    return { path, status: "modified" };
  }
  return { path, status: "unknown" };
}

function parseNulPorcelainStatus(output: string): readonly ChangedFile[] {
  const tokens = output.split("\0").filter((token) => token.length > 0);
  const files: ChangedFile[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const code = token.slice(0, 2);
    const path = normalizePath(token.slice(3));

    if (code.includes("R")) {
      files.push({ path, status: "renamed" });
      index += 1;
      continue;
    }

    if (code.includes("?")) {
      files.push({ path, status: "untracked" });
    } else if (code.includes("D")) {
      files.push({ path, status: "deleted" });
    } else if (code.trim().length > 0) {
      files.push({ path, status: "modified" });
    } else {
      files.push({ path, status: "unknown" });
    }
  }

  return files;
}

function statusForActiveFile(
  activeFile: string,
  changedFiles: readonly ChangedFile[]
): NonNullable<GitProjectState["activeFileStatus"]> {
  return changedFiles.find((file) => file.path === activeFile)?.status ?? "clean";
}
