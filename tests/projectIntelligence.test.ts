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
    languageId: "typescript",
    isUntitled: false,
    isDirty: false,
    lineCount: 10,
    diagnostics: [],
    todoMarkers: []
  };
}

function gitState(activeFile: string | undefined): GitProjectState {
  return {
    available: true,
    isRepository: true,
    branch: "main",
    isDirty: activeFile === "src/auth.ts",
    changedFileCount: activeFile === "src/auth.ts" ? 1 : 0,
    activeFileStatus: activeFile === "src/auth.ts" ? "modified" : "clean"
  };
}

function createCountingAdapter(): {
  readonly adapter: ProjectWorkspaceAdapter;
  readonly counts: {
    readonly sourceScans: () => number;
    readonly metadataScans: () => number;
    readonly gitReads: () => number;
  };
} {
  let sourceScans = 0;
  let metadataScans = 0;
  let gitReads = 0;

  return {
    adapter: {
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
        return Promise.resolve(gitState(activeFile));
      },
      getWorkspaceRootForUri: () => root
    },
    counts: {
      sourceScans: () => sourceScans,
      metadataScans: () => metadataScans,
      gitReads: () => gitReads
    }
  };
}

describe("project intelligence service", () => {
  it("uses cached structural analysis for fast context without rescanning or reading Git", async () => {
    const { adapter, counts } = createCountingAdapter();
    const service = new ProjectIntelligenceService(adapter);

    await service.analyze(editor("src/auth.ts"), { force: false, refreshGit: true });
    const firstFast = service.getCached(editor("src/auth.ts"));
    const secondFast = service.getCached(editor("src/auth.ts"));

    expect(counts.sourceScans()).toBe(1);
    expect(counts.metadataScans()).toBe(1);
    expect(counts.gitReads()).toBe(1);
    expect(firstFast.snapshot?.relatedFiles[0]).toMatchObject({
      path: "src/auth.test.ts",
      relationship: "test"
    });
    expect(secondFast.snapshot?.git.activeFileStatus).toBe("modified");
  });

  it("switches active files from the cached index while refreshing Git for the new file", async () => {
    const { adapter, counts } = createCountingAdapter();
    const service = new ProjectIntelligenceService(adapter);

    await service.analyze(editor("src/auth.ts"), { force: false, refreshGit: true });
    const testAnalysis = await service.analyze(editor("src/auth.test.ts"), {
      force: false,
      refreshGit: true
    });

    expect(counts.sourceScans()).toBe(1);
    expect(counts.metadataScans()).toBe(1);
    expect(counts.gitReads()).toBe(2);
    expect(testAnalysis.snapshot?.relatedFiles[0]).toMatchObject({
      path: "src/auth.ts",
      relationship: "source"
    });
    expect(testAnalysis.snapshot?.git.activeFileStatus).toBe("clean");
  });

  it("refreshes Git on save without structurally rescanning", async () => {
    const { adapter, counts } = createCountingAdapter();
    const service = new ProjectIntelligenceService(adapter);

    await service.analyze(editor("src/auth.ts"), { force: false, refreshGit: true });
    const saved = await service.refreshGit(editor("src/other.ts"));

    expect(counts.sourceScans()).toBe(1);
    expect(counts.metadataScans()).toBe(1);
    expect(counts.gitReads()).toBe(2);
    expect(saved.snapshot?.git.activeFileStatus).toBe("clean");
  });

  it("manual forced refresh structurally rescans and refreshes Git", async () => {
    const { adapter, counts } = createCountingAdapter();
    const service = new ProjectIntelligenceService(adapter);

    await service.analyze(editor("src/auth.ts"), { force: false, refreshGit: true });
    await service.analyze(editor("src/auth.ts"), { force: true, refreshGit: true });

    expect(counts.sourceScans()).toBe(2);
    expect(counts.metadataScans()).toBe(2);
    expect(counts.gitReads()).toBe(2);
  });

  it("does not let a stale Git refresh overwrite newer active-file state", async () => {
    const pending = new Map<string, (state: GitProjectState) => void>();
    let gitReads = 0;
    const adapter: ProjectWorkspaceAdapter = {
      ...createCountingAdapter().adapter,
      readGitState: (_root, activeFile): Promise<GitProjectState> => {
        gitReads += 1;
        return new Promise((resolve) => {
          pending.set(activeFile ?? "", resolve);
        });
      }
    };
    const service = new ProjectIntelligenceService(adapter);

    await service.analyze(editor("src/auth.ts"), { force: false, refreshGit: false });
    const first = service.refreshGit(editor("src/auth.ts"));
    const second = service.refreshGit(editor("src/other.ts"));

    pending.get("src/other.ts")?.(gitState("src/other.ts"));
    const secondAnalysis = await second;
    pending.get("src/auth.ts")?.(gitState("src/auth.ts"));
    const firstAnalysis = await first;
    const cached = service.getCached(editor("src/other.ts"));

    expect(gitReads).toBe(2);
    expect(secondAnalysis.snapshot?.git.activeFileStatus).toBe("clean");
    expect(firstAnalysis.snapshot?.git.activeFileStatus).toBe("clean");
    expect(cached.snapshot?.git.activeFileStatus).toBe("clean");
  });
});
