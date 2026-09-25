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

  it("represents unavailable git without failing project analysis", () => {
    expect(unavailableGitState("Git unavailable")).toMatchObject({
      available: false,
      isRepository: false,
      error: "Git unavailable"
    });
  });
});
