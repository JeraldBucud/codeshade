import { describe, expect, it } from "vitest";

import type { GitProjectState, WorkspaceRoot } from "../src/core/models";
import { buildProjectIndex, buildProjectSnapshot } from "../src/project/projectScanner";

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
  it("separates source and test counts while preserving related files", () => {
    const index = buildProjectIndex({
      root,
      scanLimit: 3,
      scanTruncated: true,
      sourceFiles: [{ relativePath: "src/app.ts" }, { relativePath: "src/app.test.ts" }],
      metadataFiles: [
        {
          relativePath: "package.json",
          content: JSON.stringify({ scripts: { test: "vitest", build: "tsc" } })
        },
        { relativePath: "pnpm-lock.yaml" },
        { relativePath: "tsconfig.json" }
      ]
    });
    const snapshot = buildProjectSnapshot({ index, activeFile: "src/app.ts", git });

    expect(snapshot.scanTruncated).toBe(true);
    expect(snapshot.ecosystems).toEqual(["javascript", "typescript"]);
    expect(snapshot.tools.map((tool) => tool.id)).toEqual(["pnpm"]);
    expect(snapshot.scripts.map((script) => script.name)).toEqual(["build", "test"]);
    expect(snapshot.sourceFileCount).toBe(1);
    expect(snapshot.testFileCount).toBe(1);
    expect(snapshot.sourceRoots).toEqual(["src"]);
    expect(snapshot.testRoots).toEqual([]);
    expect(snapshot.relatedFiles[0]?.path).toBe("src/app.test.ts");
  });

  it("keeps important metadata even when source scanning is truncated", () => {
    const index = buildProjectIndex({
      root,
      scanLimit: 1,
      scanTruncated: true,
      sourceFiles: [{ relativePath: "src/app.ts" }],
      metadataFiles: [
        { relativePath: "yarn.lock" },
        { relativePath: "pom.xml" },
        { relativePath: "gradlew" }
      ]
    });

    expect(index.scanTruncated).toBe(true);
    expect(index.tools.map((tool) => tool.id)).toEqual(["yarn", "maven", "gradle"]);
    expect(index.manifestFiles).toEqual(["gradlew", "pom.xml", "yarn.lock"]);
  });
});
