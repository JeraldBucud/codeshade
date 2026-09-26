import { describe, expect, it } from "vitest";

import { parseGitState, unavailableGitState } from "../src/project/gitState";

describe("git state parsing", () => {
  it("parses branch and dirty state from local git output", () => {
    const git = parseGitState({
      branchOutput: "feature/demo\n",
      statusOutput: " M src/app.ts\n?? tests/app.test.ts\n",
      activeFile: "src/app.ts"
    });

    expect(git).toMatchObject({
      available: true,
      isRepository: true,
      branch: "feature/demo",
      isDirty: true,
      changedFileCount: 2,
      activeFileStatus: "modified"
    });
  });

  it("parses NUL-delimited porcelain status with spaces in paths", () => {
    const git = parseGitState({
      branchOutput: "main\n",
      statusOutput: "?? docs/learning note.md\0 M src/app.ts\0",
      activeFile: "docs/learning note.md"
    });

    expect(git.changedFileCount).toBe(2);
    expect(git.activeFileStatus).toBe("untracked");
  });

  it("parses renamed files from NUL-delimited porcelain status", () => {
    const git = parseGitState({
      branchOutput: "main\n",
      statusOutput: "R  src/new name.ts\0src/old name.ts\0",
      activeFile: "src/new name.ts"
    });

    expect(git.changedFileCount).toBe(1);
    expect(git.activeFileStatus).toBe("renamed");
  });

  it("represents unavailable git without failing project analysis", () => {
    expect(unavailableGitState("Git unavailable")).toMatchObject({
      available: false,
      isRepository: false,
      error: "Git unavailable"
    });
  });
});
