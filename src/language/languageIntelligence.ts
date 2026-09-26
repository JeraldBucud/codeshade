import type { LanguageAnalysis, LanguageDocumentInput } from "./models";
import { emptyLanguageAnalysis } from "./models";
import { analyzeDeterministicStructure } from "./relationships";
import { boundSymbols, findContainingSymbol } from "./symbols";

export interface LanguageProviderAdapter {
  readonly analyzeDocument: (document: LanguageDocumentInput) => Promise<LanguageAnalysis>;
}

export class DeterministicLanguageAdapter implements LanguageProviderAdapter {
  analyzeDocument(document: LanguageDocumentInput): Promise<LanguageAnalysis> {
    const deterministic = analyzeDeterministicStructure({
      text: document.text,
      languageId: document.languageId,
      fileName: document.fileName
    });
    const bounded = boundSymbols(deterministic.symbols);
    return Promise.resolve({
      status: "partial",
      file: document.relativePath ?? document.fileName,
      languageId: document.languageId,
      source: "deterministic",
      symbols: bounded.symbols,
      currentSymbol: findContainingSymbol(bounded.symbols, document.cursor),
      imports: deterministic.imports.slice(0, 40),
      relationships: deterministic.relationships.slice(0, 40),
      entryPointSignals: deterministic.entryPointSignals.slice(0, 10),
      truncated: bounded.truncated
    });
  }
}

export class LanguageIntelligenceService {
  private readonly cache = new Map<
    string,
    { readonly version: number; readonly analysis: LanguageAnalysis }
  >();
  private generation = 0;

  constructor(
    private readonly adapter: LanguageProviderAdapter = new DeterministicLanguageAdapter()
  ) {}

  getCached(
    document: Pick<LanguageDocumentInput, "uri" | "version" | "cursor"> | undefined
  ): LanguageAnalysis {
    if (!document) return emptyLanguageAnalysis;
    const cached = this.cache.get(document.uri);
    if (!cached)
      return {
        ...emptyLanguageAnalysis,
        status: "analyzing",
        message: "Language analysis is starting."
      };
    if (cached.version !== document.version) return { ...cached.analysis, status: "partial" };
    return {
      ...cached.analysis,
      currentSymbol: findContainingSymbol(cached.analysis.symbols, document.cursor)
    };
  }

  async analyze(document: LanguageDocumentInput, force = false): Promise<LanguageAnalysis> {
    const cached = this.cache.get(document.uri);
    if (!force && cached?.version === document.version) {
      return {
        ...cached.analysis,
        currentSymbol: findContainingSymbol(cached.analysis.symbols, document.cursor)
      };
    }

    const generation = this.generation + 1;
    this.generation = generation;
    try {
      const analysis = await this.adapter.analyzeDocument(document);
      if (this.generation === generation) {
        this.cache.set(document.uri, { version: document.version, analysis });
        return analysis;
      }
      return this.getCached(document);
    } catch (error) {
      return {
        ...emptyLanguageAnalysis,
        file: document.relativePath ?? document.fileName,
        languageId: document.languageId,
        message: error instanceof Error ? error.message : "Language analysis unavailable."
      };
    }
  }

  invalidate(uri: string): void {
    this.cache.delete(uri);
  }
}
