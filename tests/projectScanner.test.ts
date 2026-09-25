import { describe, expect, it } from "vitest";

import type { GitProjectState, WorkspaceRoot } from "../src/core/models";
import { buildProjectSnapshot } from "../src/project/projectScanner";

const root: WorkspaceRoot = {
  name: "demo",
  uri: "file:///demo",
  path: "/demo"
};

const git: GitProjectState = {
  available: false,
  isRepository: false,
  error: "not available"
};

describe("project scanner", () => {
  it("builds a bounded snapshot from paths and small metadata", () => {
    const snapshot = buildProjectSnapshot({
      root,
      activeFile: "src/app.ts",
      scanLimit: 3,
      scanTruncated: true,
      git,
      files: [
        {
          relativePath: "package.json",
          content: JSON.stringify({ scripts: { test: "vitest", build: "tsc" } })
        },
        { relativePath: "pnpm-lock.yaml" },
        { relativePath: "tsconfig.json" },
        { relativePath: "src/app.ts" },
        { relativePath: "src/app.test.ts" }
      ]
    });

    expect(snapshot.scanTruncated).toBe(true);
    expect(snapshot.ecosystems).toEqual(["javascript", "typescript"]);
    expect(snapshot.tools.map((tool) => tool.id)).toEqual(["pnpm"]);
    expect(snapshot.scripts.map((script) => script.name)).toEqual(["build", "test"]);
    expect(snapshot.sourceFileCount).toBe(2);
    expect(snapshot.testFileCount).toBe(1);
    expect(snapshot.relatedFiles[0]?.path).toBe("src/app.test.ts");
  });
});
