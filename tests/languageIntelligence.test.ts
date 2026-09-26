import { describe, expect, it } from "vitest";

import type { LanguageAnalysis, LanguageDocumentInput } from "../src/language/models";
import {
  DeterministicLanguageAdapter,
  LanguageIntelligenceService,
  type LanguageProviderAdapter
} from "../src/language/languageIntelligence";
import { analyzeDeterministicStructure } from "../src/language/relationships";

function documentInput(overrides: Partial<LanguageDocumentInput> = {}): LanguageDocumentInput {
  return {
    uri: "file:///demo/src/App.tsx",
    fileName: "App.tsx",
    relativePath: "src/App.tsx",
    languageId: "typescriptreact",
    version: 1,
    text: "import React from 'react';\nfunction App() {\n  return <Header />;\n}\n",
    cursor: { line: 1, character: 10 },
    ...overrides
  };
}

function analysisFor(document: LanguageDocumentInput, name = "App"): LanguageAnalysis {
  return {
    status: "available",
    file: document.relativePath,
    languageId: document.languageId,
    source: "vscode-provider",
    symbols: [
      {
        name,
        kind: "function",
        range: { startLine: 0, startCharacter: 0, endLine: 4, endCharacter: 0 },
        selectionRange: { startLine: 1, startCharacter: 9, endLine: 1, endCharacter: 12 }
      }
    ],
    currentSymbol: undefined,
    imports: [],
    relationships: [],
    entryPointSignals: [],
    truncated: false
  };
}

describe("language intelligence", () => {
  it("extracts deterministic symbols, imports, and local relationships", async () => {
    const adapter = new DeterministicLanguageAdapter();
    const analysis = await adapter.analyzeDocument(documentInput());

    expect(analysis.source).toBe("deterministic");
    expect(analysis.symbols.map((symbol) => symbol.name)).toContain("App");
    expect(analysis.imports[0]).toMatchObject({ type: "import", target: "react" });
    expect(analysis.relationships[0]).toMatchObject({ type: "renders", target: "Header" });
  });

  it("detects Java service dependencies and entry points without AST parsing", () => {
    const structure = analyzeDeterministicStructure({
      fileName: "DemoController.java",
      languageId: "java",
      text: "class DemoController {\n private final AccountService accountService;\n public static void main(String[] args) {}\n}"
    });

    expect(structure.relationships[0]).toMatchObject({
      type: "service-dependency",
      target: "AccountService"
    });
    expect(structure.entryPointSignals).toContain("Java main method");
  });

  it("reuses cached provider analysis for cursor movement", async () => {
    let calls = 0;
    const adapter: LanguageProviderAdapter = {
      analyzeDocument: (document) => {
        calls += 1;
        return Promise.resolve(analysisFor(document));
      }
    };
    const service = new LanguageIntelligenceService(adapter);

    await service.analyze(documentInput());
    const cached = service.getCached({
      uri: "file:///demo/src/App.tsx",
      version: 1,
      cursor: { line: 2, character: 5 }
    });

    expect(calls).toBe(1);
    expect(cached.currentSymbol?.name).toBe("App");
  });

  it("does not call the provider again for the same document version", async () => {
    let calls = 0;
    const adapter: LanguageProviderAdapter = {
      analyzeDocument: (document) => {
        calls += 1;
        return Promise.resolve(analysisFor(document));
      }
    };
    const service = new LanguageIntelligenceService(adapter);
    const input = documentInput();

    await service.analyze(input);
    await service.analyze(input);

    expect(calls).toBe(1);
  });

  it("recomputes language structure after the document version changes", async () => {
    let calls = 0;
    const adapter: LanguageProviderAdapter = {
      analyzeDocument: (document) => {
        calls += 1;
        return Promise.resolve(analysisFor(document, `Version${String(document.version)}`));
      }
    };
    const service = new LanguageIntelligenceService(adapter);

    await service.analyze(documentInput({ version: 1 }));
    const second = await service.analyze(documentInput({ version: 2 }));

    expect(calls).toBe(2);
    expect(second.symbols[0]?.name).toBe("Version2");
  });

  it("prevents stale provider results from replacing newer language analysis", async () => {
    let releaseFirst: ((analysis: LanguageAnalysis) => void) | undefined;
    const adapter: LanguageProviderAdapter = {
      analyzeDocument: (document) =>
        document.version === 1
          ? new Promise((resolve) => {
              releaseFirst = resolve;
            })
          : Promise.resolve(analysisFor(document, "Newer"))
    };
    const service = new LanguageIntelligenceService(adapter);

    const first = service.analyze(documentInput({ version: 1 }));
    const second = await service.analyze(documentInput({ version: 2 }));
    releaseFirst?.(analysisFor(documentInput({ version: 1 }), "Older"));
    await first;
    const cached = service.getCached({
      uri: "file:///demo/src/App.tsx",
      version: 2,
      cursor: { line: 1, character: 10 }
    });

    expect(second.symbols[0]?.name).toBe("Newer");
    expect(cached.symbols[0]?.name).toBe("Newer");
  });
});
