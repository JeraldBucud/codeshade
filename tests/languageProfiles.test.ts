import { describe, expect, it } from "vitest";

import {
  detectLanguage,
  getLanguageDisplayName,
  isSupportedLanguage,
  isTestFile
} from "../src/learning/languageProfiles";

describe("language profiles", () => {
  it("detects supported languages by VS Code language id", () => {
    expect(detectLanguage({ languageId: "typescript" })?.displayName).toBe("TypeScript");
    expect(detectLanguage({ languageId: "python" })?.displayName).toBe("Python");
  });

  it("detects supported languages by extension when language id is unknown", () => {
    expect(detectLanguage({ languageId: "plaintext", fileName: "Example.java" })?.id).toBe("java");
    expect(detectLanguage({ fileName: "script.mjs" })?.id).toBe("javascript");
  });

  it("returns a readable fallback for unsupported files", () => {
    expect(isSupportedLanguage({ fileName: "README.md" })).toBe(false);
    expect(getLanguageDisplayName({ languageId: "markdown", fileName: "README.md" })).toBe(
      "markdown"
    );
  });

  it("identifies common test file paths", () => {
    expect(isTestFile("src/example.test.ts")).toBe(true);
    expect(isTestFile("tests/test_example.py")).toBe(true);
    expect(isTestFile("src/test/java/AppTest.java")).toBe(true);
    expect(isTestFile("src/main/java/App.java")).toBe(false);
  });
});
