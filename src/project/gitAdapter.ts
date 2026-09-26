import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import type { GitProjectState } from "../core/models";
import { parseGitState, unavailableGitState } from "./gitState";

const execFileAsync = promisify(execFile);
const timeoutMs = 1500;
const maxBuffer = 128 * 1024;

export async function readGitState(input: {
  readonly rootPath: string;
  readonly activeFile?: string;
}): Promise<GitProjectState> {
  try {
    const inside = await execGit(input.rootPath, ["rev-parse", "--is-inside-work-tree"]);
    if (inside.trim() !== "true") {
      return unavailableGitState("Not a Git repository.");
    }

    const gitRoot = (await execGit(input.rootPath, ["rev-parse", "--show-toplevel"])).trim();
    const gitRelativeActiveFile = toGitRelativePath({
      gitRoot,
      projectRoot: input.rootPath,
      activeFile: input.activeFile
    });
    const [branch, status] = await Promise.all([
      execGit(gitRoot, ["branch", "--show-current"]),
      execGit(gitRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=normal"])
    ]);

    return parseGitState({
      branchOutput: branch,
      statusOutput: status,
      activeFile: gitRelativeActiveFile
    });
  } catch (error) {
    return unavailableGitState(error instanceof Error ? error.message : "Git unavailable.");
  }
}

async function execGit(cwd: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd,
    shell: false,
    timeout: timeoutMs,
    maxBuffer,
    windowsHide: true
  });
  return stdout;
}

export function toGitRelativePath(input: {
  readonly gitRoot: string;
  readonly projectRoot: string;
  readonly activeFile?: string;
}): string | undefined {
  if (!input.activeFile) {
    return undefined;
  }

  const absoluteActiveFile = path.resolve(input.projectRoot, ...input.activeFile.split("/"));
  return path.relative(input.gitRoot, absoluteActiveFile).replaceAll(path.sep, "/");
}
