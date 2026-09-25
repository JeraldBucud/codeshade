import { describe, expect, it } from "vitest";

import type { LearningDiagnostic } from "../src/core/models";
import { choosePrimaryDiagnostic } from "../src/learning/diagnostics";

function diagnostic(input: {
  readonly message: string;
  readonly severity: LearningDiagnostic["severity"];
  readonly line: number;
}): LearningDiagnostic {
  return {
    message: input.message,
    severity: input.severity,
    range: {
      startLine: input.line,
      startCharacter: 0,
      endLine: input.line,
      endCharacter: 1
    }
  };
}

describe("diagnostic prioritization", () => {
  it("chooses an error over an earlier warning", () => {
    const primary = choosePrimaryDiagnostic([
      diagnostic({ message: "Earlier warning", severity: "warning", line: 1 }),
      diagnostic({ message: "Later error", severity: "error", line: 20 })
    ]);

    expect(primary?.message).toBe("Later error");
  });

  it("uses source order within the same severity", () => {
    const primary = choosePrimaryDiagnostic([
      diagnostic({ message: "Later error", severity: "error", line: 10 }),
      diagnostic({ message: "Earlier error", severity: "error", line: 2 })
    ]);

    expect(primary?.message).toBe("Earlier error");
  });
});
