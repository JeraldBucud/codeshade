import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeCommand } = vi.hoisted(() => ({ executeCommand: vi.fn() }));

vi.mock("vscode", () => ({
  Uri: {
    parse: (value: string) => {
      const url = new URL(value);
      return {
        toString: () => value,
        path: decodeURIComponent(url.pathname),
        fsPath: decodeURIComponent(url.pathname)
      };
    }
  },
  Position: class Position {
    constructor(
      readonly line: number,
      readonly character: number
    ) {}
  },
  SymbolKind: {
    Class: 4,
    Interface: 10,
    Function: 11,
    Method: 5,
    Constructor: 8,
    Field: 7,
    Property: 6,
    Variable: 12,
    Constant: 13,
    Enum: 9,
    Module: 2
  },
  commands: { executeCommand }
}));

import { VsCodeLanguageAdapter } from "../src/language/vscodeLanguageAdapter";
import type { LanguageDocumentInput } from "../src/language/models";

function documentInput(overrides: Partial<LanguageDocumentInput> = {}): LanguageDocumentInput {
  return {
    uri: "file:///demo/src/App.ts",
    fileName: "App.ts",
    relativePath: "src/App.ts",
    projectRootUri: "file:///demo",
    projectRelativePath: "src/App.ts",
    knownProjectFiles: ["src/App.ts", "src/LoginForm.ts", "src/Usage.ts"],
    languageId: "typescript",
    version: 1,
    text: "function LoginForm() { return null; }",
    cursor: { line: 0, character: 10 },
    ...overrides
  };
}

function symbol(name: string) {
  return {
    name,
    detail: "",
    kind: 11,
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 38 } },
    selectionRange: { start: { line: 0, character: 9 }, end: { line: 0, character: 18 } },
    children: []
  };
}

describe("VS Code language adapter", () => {
  beforeEach(() => {
    executeCommand.mockReset();
  });

  it("adds local definition relationships from provider output", async () => {
    executeCommand
      .mockResolvedValueOnce([symbol("LoginForm")])
      .mockResolvedValueOnce([{ uri: { path: "/demo/src/LoginForm.ts" } }])
      .mockResolvedValueOnce([]);

    const analysis = await new VsCodeLanguageAdapter().analyzeDocument(documentInput());

    expect(analysis.relationships[0]).toMatchObject({
      type: "definition",
      targetFile: "src/LoginForm.ts",
      symbol: "LoginForm"
    });
    expect(analysis.relationships[0]?.providerDerived).toBe(true);
  });

  it("ignores same-file definition provider results", async () => {
    executeCommand
      .mockResolvedValueOnce([symbol("LoginForm")])
      .mockResolvedValueOnce([{ uri: { path: "/demo/src/App.ts" } }])
      .mockResolvedValueOnce([]);

    const analysis = await new VsCodeLanguageAdapter().analyzeDocument(documentInput());

    expect(analysis.relationships.some((relationship) => relationship.type === "definition")).toBe(
      false
    );
  });

  it("bounds reference provider relationships", async () => {
    executeCommand
      .mockResolvedValueOnce([symbol("LoginForm")])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(
        Array.from({ length: 12 }, (_, index) => ({
          uri: { path: index % 2 === 0 ? "/demo/src/Usage.ts" : "/demo/src/App.ts" }
        }))
      );

    const analysis = await new VsCodeLanguageAdapter().analyzeDocument(documentInput());

    expect(
      analysis.relationships.filter((relationship) => relationship.type === "reference")
    ).toHaveLength(1);
    expect(analysis.relationships[0]?.targetFile).toBe("src/Usage.ts");
    expect(analysis.relationships[0]?.providerDerived).toBe(true);
  });

  it("ignores external definitions outside known project files", async () => {
    executeCommand
      .mockResolvedValueOnce([symbol("LoginForm")])
      .mockResolvedValueOnce([{ uri: { path: "/demo/node_modules/pkg/index.d.ts" } }])
      .mockResolvedValueOnce([]);

    const analysis = await new VsCodeLanguageAdapter().analyzeDocument(documentInput());

    expect(analysis.relationships.some((relationship) => relationship.type === "definition")).toBe(
      false
    );
  });
});
