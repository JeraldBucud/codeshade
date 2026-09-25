import { execFile } from "node:child_process";
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

    const [branch, status] = await Promise.all([
      execGit(input.rootPath, ["branch", "--show-current"]),
      execGit(input.rootPath, ["status", "--porcelain=v1", "--untracked-files=normal"])
    ]);

    return parseGitState({
      branchOutput: branch,
      statusOutput: status,
      activeFile: input.activeFile
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
