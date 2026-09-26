import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  FileType: { Directory: 2 },
  RelativePattern: class RelativePattern {
    constructor(
      readonly base: unknown,
      readonly pattern: string
    ) {}
  },
  Uri: {
    parse: (value: string) => ({
      toString: () => value,
      fsPath: value.replace("file://", ""),
      path: value.replace("file://", "")
    }),
    joinPath: (base: { toString: () => string }, name: string) => ({
      toString: () => `${base.toString().replace(/\/$/, "")}/${name}`,
      fsPath: name,
      path: name
    })
  },
  window: {},
  workspace: {
    asRelativePath: vi.fn(),
    findFiles: vi.fn(),
    getWorkspaceFolder: vi.fn(),
    fs: {
      stat: vi.fn(),
      readFile: vi.fn()
    }
  }
}));

import type { ActiveEditorContext, GitProjectState, WorkspaceRoot } from "../src/core/models";
import {
  ProjectIntelligenceService,
  type ProjectWorkspaceAdapter
} from "../src/project/projectIntelligence";

const root: WorkspaceRoot = {
  name: "demo",
  uri: "file:///demo",
  path: "/demo"
};

function editor(relativePath: string): ActiveEditorContext {
  return {
    fileName: relativePath.split("/").at(-1) ?? relativePath,
    relativePath,
    languageId: relativePath.endsWith(".test.ts") ? "typescript" : "typescript",
    isUntitled: false,
    isDirty: false,
    lineCount: 10,
    diagnostics: [],
    todoMarkers: []
  };
}

describe("project intelligence service", () => {
  it("reuses the root-level structural scan while deriving active-file relationships", async () => {
    let sourceScans = 0;
    let metadataScans = 0;
    let gitReads = 0;

    const adapter: ProjectWorkspaceAdapter = {
      getActiveWorkspaceRoot: () => root,
      findSourceFiles: () => {
        sourceScans += 1;
        return Promise.resolve([
          { relativePath: "src/auth.ts" },
          { relativePath: "src/auth.test.ts" },
          { relativePath: "src/other.ts" }
        ]);
      },
      findMetadataFiles: () => {
        metadataScans += 1;
        return Promise.resolve([
          { relativePath: "package.json", content: JSON.stringify({ scripts: { test: "vitest" } }) }
        ]);
      },
      readGitState: (_root, activeFile): Promise<GitProjectState> => {
        gitReads += 1;
        return Promise.resolve({
          available: true,
          isRepository: true,
          branch: "main",
          isDirty: activeFile === "src/auth.ts",
          changedFileCount: activeFile === "src/auth.ts" ? 1 : 0,
          activeFileStatus: activeFile === "src/auth.ts" ? "modified" : "clean"
        });
      },
      getWorkspaceRootForUri: () => root
    };

    const service = new ProjectIntelligenceService(adapter);

    const sourceAnalysis = await service.analyze(editor("src/auth.ts"), false);
    const testAnalysis = await service.analyze(editor("src/auth.test.ts"), false);
    const gitOnlyAnalysis = await service.refreshGit(editor("src/other.ts"));

    expect(sourceScans).toBe(1);
    expect(metadataScans).toBe(1);
    expect(gitReads).toBe(3);
    expect(sourceAnalysis.snapshot?.relatedFiles[0]).toMatchObject({
      path: "src/auth.test.ts",
      relationship: "test"
    });
    expect(testAnalysis.snapshot?.relatedFiles[0]).toMatchObject({
      path: "src/auth.ts",
      relationship: "source"
    });
    expect(gitOnlyAnalysis.snapshot?.git.activeFileStatus).toBe("clean");
  });
});
