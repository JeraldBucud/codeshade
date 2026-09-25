import { describe, expect, it } from "vitest";

import type { LearningContext } from "../src/core/models";
import { ProgressiveHintEngine } from "../src/learning/hints";

const baseContext: LearningContext = {
  status: "ready",
  workspace: {
    name: "demo",
    folderCount: 1,
    hasWorkspace: true
  },
  project: {
    activeFileIsTest: false
  },
  activeEditor: {
    fileName: "index.ts",
    relativePath: "src/index.ts",
    languageId: "typescript",
    isDirty: false,
    isUntitled: false,
    lineCount: 10,
    diagnostics: [],
    todoMarkers: []
  }
};

describe("progressive hints", () => {
  it("creates diagnostic hints without replacement code", () => {
    const engine = new ProgressiveHintEngine();
    const session = engine.createSession({
      ...baseContext,
      activeEditor: {
        ...baseContext.activeEditor!,
        diagnostics: [
          {
            message: "Cannot find name 'userName'.",
            severity: "error",
            range: {
              startLine: 4,
              startCharacter: 10,
              endLine: 4,
              endCharacter: 18
            }
          }
        ]
      }
    });

    expect(session.hints).toHaveLength(4);
    expect(session.hints.map((hint) => hint.level)).toEqual([
      "inspect",
      "concept",
      "direction",
      "explicit"
    ]);
    expect(session.hints.map((hint) => hint.message).join(" ")).not.toContain("replace");
  });

  it("uses the primary diagnostic rather than the first diagnostic", () => {
    const engine = new ProgressiveHintEngine();
    const session = engine.createSession({
      ...baseContext,
      activeEditor: {
        ...baseContext.activeEditor!,
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

    expect(engine.currentHint(session)?.relatedDiagnostic?.message).toBe("Later error.");
  });

  it("progresses through hints and stops at the final level", () => {
    const engine = new ProgressiveHintEngine();
    const session = engine.createSession({
      ...baseContext,
      activeEditor: {
        ...baseContext.activeEditor!,
        selection: {
          text: "const answer = 42;",
          lineCount: 1,
          characterCount: 18,
          range: {
            startLine: 1,
            startCharacter: 0,
            endLine: 1,
            endCharacter: 18
          }
        }
      }
    });

    const finalSession = engine.showNext(
      engine.showNext(engine.showNext(engine.showNext(session)))
    );

    expect(finalSession.currentIndex).toBe(3);
    expect(engine.currentHint(finalSession)?.level).toBe("explicit");
  });

  it("resets hint progression", () => {
    const engine = new ProgressiveHintEngine();
    const session = engine.showNext(engine.createSession(baseContext));

    expect(engine.reset(session).currentIndex).toBe(0);
  });
});
