import { describe, expect, it } from "vitest";

import type { ProjectSnapshot, WorkspaceRoot } from "../src/core/models";
import {
  createLanguageProjectContextKey,
  shouldReconcileLanguageProject
} from "../src/language/projectContextKey";

const root: WorkspaceRoot = {
  name: "app",
  uri: "file:///workspace/app",
  path: "/workspace/app",
  relativePath: "app",
  containingWorkspaceUri: "file:///workspace"
};

function snapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return {
    root,
    ecosystems: ["typescript"],
    tools: [],
    codeFiles: ["src/App.tsx", "src/LoginForm.tsx"],
    manifestFiles: ["package.json"],
    configFiles: [],
    sourceRoots: ["src"],
    testRoots: [],
    sourceFileCount: 2,
    testFileCount: 0,
    scanLimit: 2500,
    scanTruncated: false,
    scripts: [],
    metadata: { packageNames: ["react"] },
    relatedFiles: [],
    git: { available: false, isRepository: false },
    ...overrides
  };
}

describe("language/project reconciliation", () => {
  it("requests reconciliation when a project snapshot becomes ready after language analysis", () => {
    const document = {
      uri: "file:///workspace/app/src/App.tsx",
      projectRelativePath: "src/App.tsx"
    };
    const beforeProject = createLanguageProjectContextKey({ document, snapshot: undefined });
    const afterProject = createLanguageProjectContextKey({ document, snapshot: snapshot() });

    expect(
      shouldReconcileLanguageProject({ previousKey: beforeProject, nextKey: afterProject })
    ).toBe(true);
  });

  it("does not request another refresh when the active document project context is unchanged", () => {
    const document = {
      uri: "file:///workspace/app/src/App.tsx",
      projectRelativePath: "src/App.tsx"
    };
    const key = createLanguageProjectContextKey({ document, snapshot: snapshot() });

    expect(shouldReconcileLanguageProject({ previousKey: key, nextKey: key })).toBe(false);
  });

  it("switching to an uncached sibling project produces a different reconciliation key", () => {
    const frontendDocument = {
      uri: "file:///workspace/frontend/src/App.tsx",
      projectRelativePath: "src/App.tsx"
    };
    const backendDocument = {
      uri: "file:///workspace/backend/src/main.py",
      projectRelativePath: "src/main.py"
    };
    const frontendKey = createLanguageProjectContextKey({
      document: frontendDocument,
      snapshot: snapshot()
    });
    const backendKey = createLanguageProjectContextKey({
      document: backendDocument,
      snapshot: snapshot({
        root: { name: "backend", uri: "file:///workspace/backend", path: "/workspace/backend" },
        ecosystems: ["python"],
        codeFiles: ["src/main.py"],
        metadata: { packageNames: ["django"] }
      })
    });

    expect(shouldReconcileLanguageProject({ previousKey: frontendKey, nextKey: backendKey })).toBe(
      true
    );
  });
});
