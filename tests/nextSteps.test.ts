import { describe, expect, it } from "vitest";

import type { LearningContext, ProjectAnalysis } from "../src/core/models";
import type { FrameworkDetection } from "../src/framework/models";
import type { LanguageAnalysis } from "../src/language/models";
import { NextStepService } from "../src/learning/nextSteps";

const workspace = {
  name: "demo",
  folderCount: 1,
  hasWorkspace: true,
  activeWorkspaceRoot: {
    name: "demo",
    uri: "file:///demo",
    path: "/demo"
  }
};

const readyProject: ProjectAnalysis = {
  status: "ready",
  root: workspace.activeWorkspaceRoot,
  snapshot: {
    root: workspace.activeWorkspaceRoot,
    ecosystems: ["typescript"],
    tools: [{ id: "pnpm", label: "pnpm", evidence: ["pnpm-lock.yaml"] }],
    codeFiles: ["src/app.ts", "src/app.test.ts"],
    manifestFiles: ["package.json"],
    configFiles: ["tsconfig.json"],
    sourceRoots: ["src"],
    testRoots: ["src"],
    sourceFileCount: 2,
    testFileCount: 1,
    scanLimit: 2500,
    scanTruncated: false,
    scripts: [{ name: "test", kind: "test" }],
    relatedFiles: [
      {
        path: "src/app.test.ts",
        label: "Related test file",
        relationship: "test",
        confidence: "high",
        exists: true,
        reason: "Matches a common source/test naming convention."
      }
    ],
    metadata: { packageNames: ["react"] },
    git: {
      available: true,
      isRepository: true,
      branch: "feature/demo",
      isDirty: true,
      changedFileCount: 1,
      activeFileStatus: "modified"
    }
  }
};

const languageAnalysis: LanguageAnalysis = {
  status: "available",
  file: "src/app.tsx",
  languageId: "typescriptreact",
  source: "vscode-provider",
  symbols: [
    {
      name: "App",
      kind: "function",
      range: { startLine: 0, startCharacter: 0, endLine: 5, endCharacter: 0 },
      selectionRange: { startLine: 1, startCharacter: 9, endLine: 1, endCharacter: 12 }
    }
  ],
  currentSymbol: {
    name: "App",
    kind: "function",
    range: { startLine: 0, startCharacter: 0, endLine: 5, endCharacter: 0 },
    selectionRange: { startLine: 1, startCharacter: 9, endLine: 1, endCharacter: 12 }
  },
  imports: [],
  relationships: [
    {
      type: "renders",
      target: "Header",
      symbol: "Header",
      confidence: "medium",
      reason: "A JSX element with a component-style name appears in the active file."
    }
  ],
  entryPointSignals: [],
  truncated: false
};

const reactDetection: FrameworkDetection = {
  framework: "react",
  confidence: "high",
  evidence: [
    { source: "text", description: "imports React" },
    { source: "text", description: "contains JSX component usage" }
  ],
  roles: ["component"]
};

describe("next step service", () => {
  it("asks the learner to open a file when no editor is active", () => {
    const service = new NextStepService();
    const step = service.choose({
      status: "no-active-editor",
      workspace,
      project: { activeFileIsTest: false }
    });

    expect(step.id).toBe("open-source-file");
  });

  it("prioritizes errors over lower priority suggestions", () => {
    const service = new NextStepService();
    const context: LearningContext = {
      status: "ready",
      workspace,
      project: { activeFileIsTest: false },
      activeEditor: {
        fileName: "app.ts",
        relativePath: "src/app.ts",
        languageId: "typescript",
        isUntitled: false,
        isDirty: false,
        lineCount: 4,
        todoMarkers: [{ label: "TODO", text: "write tests", line: 2 }],
        diagnostics: [
          {
            message: "Type 'string' is not assignable to type 'number'.",
            severity: "error",
            range: {
              startLine: 1,
              startCharacter: 6,
              endLine: 1,
              endCharacter: 11
            }
          }
        ]
      }
    };

    expect(service.choose(context).id).toBe("investigate-first-diagnostic");
  });

  it("uses the primary diagnostic for next-step guidance", () => {
    const service = new NextStepService();
    const step = service.choose({
      status: "ready",
      workspace,
      project: { activeFileIsTest: false },
      activeEditor: {
        fileName: "app.ts",
        relativePath: "src/app.ts",
        languageId: "typescript",
        isUntitled: false,
        isDirty: false,
        lineCount: 10,
        todoMarkers: [],
        diagnostics: [
          {
            message: "Earlier warning.",
            severity: "warning",
            range: {
              startLine: 0,
              startCharacter: 0,
              endLine: 0,
              endCharacter: 5
            }
          },
          {
            message: "Later error.",
            severity: "error",
            range: {
              startLine: 8,
              startCharacter: 2,
              endLine: 8,
              endCharacter: 7
            }
          }
        ]
      }
    });

    expect(step.id).toBe("investigate-first-diagnostic");
    expect(step.detail).toBe("ERROR: Later error.");
  });

  it("suggests saving dirty files before general review work", () => {
    const service = new NextStepService();
    const step = service.choose({
      status: "ready",
      workspace,
      project: { activeFileIsTest: true },
      activeEditor: {
        fileName: "app.py",
        relativePath: "app.py",
        languageId: "python",
        isUntitled: false,
        isDirty: true,
        lineCount: 5,
        diagnostics: [],
        todoMarkers: []
      }
    });

    expect(step.id).toBe("save-current-file");
  });

  it("uses the active-file test signal without claiming project-wide test discovery", () => {
    const service = new NextStepService();
    const step = service.choose({
      status: "ready",
      workspace,
      project: { activeFileIsTest: false },
      activeEditor: {
        fileName: "app.py",
        relativePath: "app.py",
        languageId: "python",
        isUntitled: false,
        isDirty: false,
        lineCount: 5,
        diagnostics: [],
        todoMarkers: []
      }
    });

    expect(step.id).toBe("look-for-test-path");
    expect(step.detail).toContain("active file");
    expect(step.detail).not.toContain("project");
  });

  it("suggests related tests from project intelligence", () => {
    const service = new NextStepService();
    const step = service.choose(
      {
        status: "ready",
        workspace,
        project: { activeFileIsTest: false },
        activeEditor: {
          fileName: "app.ts",
          relativePath: "src/app.ts",
          languageId: "typescript",
          isUntitled: false,
          isDirty: false,
          lineCount: 5,
          diagnostics: [],
          todoMarkers: []
        }
      },
      readyProject
    );

    expect(step.id).toBe("inspect-related-test");
    expect(step.detail).toContain("src/app.test.ts");
  });

  it("does not let project suggestions outrank active editor errors", () => {
    const service = new NextStepService();
    const step = service.choose(
      {
        status: "ready",
        workspace,
        project: { activeFileIsTest: false },
        activeEditor: {
          fileName: "app.ts",
          relativePath: "src/app.ts",
          languageId: "typescript",
          isUntitled: false,
          isDirty: false,
          lineCount: 5,
          diagnostics: [
            {
              message: "Cannot find name.",
              severity: "error",
              range: {
                startLine: 0,
                startCharacter: 0,
                endLine: 0,
                endCharacter: 4
              }
            }
          ],
          todoMarkers: []
        }
      },
      readyProject
    );

    expect(step.id).toBe("investigate-first-diagnostic");
  });

  it("uses language relationships when higher priority editor signals are absent", () => {
    const service = new NextStepService();
    const step = service.choose(
      {
        status: "ready",
        workspace,
        project: { activeFileIsTest: false },
        activeEditor: {
          fileName: "app.tsx",
          relativePath: "src/app.tsx",
          languageId: "typescriptreact",
          isUntitled: false,
          isDirty: false,
          lineCount: 5,
          diagnostics: [],
          todoMarkers: []
        }
      },
      undefined,
      languageAnalysis,
      [reactDetection]
    );

    expect(step.id).toBe("inspect-renders");
    expect(step.detail).toContain("Header");
  });

  it("keeps active diagnostics above framework and language guidance", () => {
    const service = new NextStepService();
    const step = service.choose(
      {
        status: "ready",
        workspace,
        project: { activeFileIsTest: false },
        activeEditor: {
          fileName: "app.tsx",
          relativePath: "src/app.tsx",
          languageId: "typescriptreact",
          isUntitled: false,
          isDirty: false,
          lineCount: 5,
          diagnostics: [
            {
              message: "Cannot find name Header.",
              severity: "error",
              range: { startLine: 2, startCharacter: 10, endLine: 2, endCharacter: 16 }
            }
          ],
          todoMarkers: []
        }
      },
      undefined,
      languageAnalysis,
      [reactDetection]
    );

    expect(step.id).toBe("investigate-first-diagnostic");
  });

  it("suggests framework evidence when there is no stronger relationship", () => {
    const service = new NextStepService();
    const step = service.choose(
      {
        status: "ready",
        workspace,
        project: { activeFileIsTest: false },
        activeEditor: {
          fileName: "app.tsx",
          relativePath: "src/app.tsx",
          languageId: "typescriptreact",
          isUntitled: false,
          isDirty: false,
          lineCount: 5,
          diagnostics: [],
          todoMarkers: []
        }
      },
      undefined,
      { ...languageAnalysis, relationships: [] },
      [reactDetection]
    );

    expect(step.id).toBe("inspect-react");
    expect(step.detail).toContain("imports React");
  });

  it("does not recommend the active file as its own provider definition", () => {
    const service = new NextStepService();
    const step = service.choose(
      {
        status: "ready",
        workspace,
        project: { activeFileIsTest: false },
        activeEditor: {
          fileName: "app.tsx",
          relativePath: "src/app.tsx",
          languageId: "typescriptreact",
          isUntitled: false,
          isDirty: false,
          lineCount: 5,
          diagnostics: [],
          todoMarkers: []
        }
      },
      undefined,
      {
        ...languageAnalysis,
        relationships: [
          {
            type: "definition",
            target: "App",
            targetFile: "src/app.tsx",
            symbol: "App",
            providerDerived: true,
            confidence: "high",
            reason: "VS Code resolved the local definition for the current symbol."
          },
          ...languageAnalysis.relationships
        ]
      },
      []
    );

    expect(step.id).toBe("inspect-renders");
    expect(step.detail).toContain("Header");
  });
});
