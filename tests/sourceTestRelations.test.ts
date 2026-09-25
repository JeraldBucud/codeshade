import { describe, expect, it } from "vitest";

import { findRelatedFiles } from "../src/project/sourceTestRelations";

describe("source/test relationships", () => {
  it("relates TypeScript source files to existing tests", () => {
    const related = findRelatedFiles("src/auth.ts", ["src/auth.ts", "src/auth.test.ts"]);

    expect(related[0]).toMatchObject({
      path: "src/auth.test.ts",
      relationship: "test",
      exists: true,
      confidence: "high"
    });
  });

  it("relates Python tests back to source files", () => {
    const related = findRelatedFiles("tests/test_auth.py", ["auth.py", "tests/test_auth.py"]);

    expect(related.some((file) => file.path === "auth.py" && file.relationship === "source")).toBe(
      true
    );
  });

  it("relates Java source files to conventional test files", () => {
    const related = findRelatedFiles("src/main/java/app/AuthenticationBean.java", [
      "src/main/java/app/AuthenticationBean.java",
      "src/test/java/app/AuthenticationBeanTest.java"
    ]);

    expect(related[0]).toMatchObject({
      path: "src/test/java/app/AuthenticationBeanTest.java",
      relationship: "test",
      exists: true
    });
  });

  it("suggests but does not claim a missing test file when a convention exists", () => {
    const related = findRelatedFiles("src/auth.ts", ["src/auth.ts", "tests/existing.test.ts"]);

    expect(related[0]).toMatchObject({
      path: "tests/auth.test.ts",
      relationship: "suggested-test",
      exists: false,
      confidence: "suggested"
    });
  });
});
