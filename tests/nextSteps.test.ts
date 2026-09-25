import { describe, expect, it } from "vitest";

import type { LearningContext } from "../src/core/models";
import { NextStepService } from "../src/learning/nextSteps";

const workspace = {
  name: "demo",
  folderCount: 1,
  hasWorkspace: true
};

describe("next step service", () => {
  it("asks the learner to open a file when no editor is active", () => {
    const service = new NextStepService();
    const step = service.choose({
      status: "no-active-editor",
      workspace,
      project: { hasTests: false }
    });

    expect(step.id).toBe("open-source-file");
  });

  it("prioritizes errors over lower priority suggestions", () => {
    const service = new NextStepService();
    const context: LearningContext = {
      status: "ready",
      workspace,
      project: { hasTests: false },
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

  it("suggests saving dirty files before general review work", () => {
    const service = new NextStepService();
    const step = service.choose({
      status: "ready",
      workspace,
      project: { hasTests: true },
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
});
