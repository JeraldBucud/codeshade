import * as vscode from "vscode";

import type { CodeRange } from "../core/models";
import type {
  LanguageAnalysis,
  LanguageDocumentInput,
  LanguageSymbol,
  LanguageSymbolKind
} from "./models";
import { DeterministicLanguageAdapter, type LanguageProviderAdapter } from "./languageIntelligence";
import { analyzeDeterministicStructure } from "./relationships";
import { boundSymbols, findContainingSymbol } from "./symbols";

export class VsCodeLanguageAdapter implements LanguageProviderAdapter {
  private readonly fallback = new DeterministicLanguageAdapter();

  async analyzeDocument(document: LanguageDocumentInput): Promise<LanguageAnalysis> {
    const uri = vscode.Uri.parse(document.uri);
    const deterministic = analyzeDeterministicStructure({
      text: document.text,
      languageId: document.languageId,
      fileName: document.fileName
    });
    try {
      const providerSymbols = await vscode.commands.executeCommand<
        readonly vscode.DocumentSymbol[] | undefined
      >("vscode.executeDocumentSymbolProvider", uri);
      const symbols = providerSymbols?.flatMap((symbol) => convertSymbol(symbol)) ?? [];
      if (symbols.length === 0) return await this.fallback.analyzeDocument(document);
      const bounded = boundSymbols(symbols);
      return {
        status: "available",
        file: document.relativePath ?? document.fileName,
        languageId: document.languageId,
        source: "vscode-provider",
        symbols: bounded.symbols,
        currentSymbol: findContainingSymbol(bounded.symbols, document.cursor),
        imports: deterministic.imports.slice(0, 40),
        relationships: deterministic.relationships.slice(0, 40),
        entryPointSignals: deterministic.entryPointSignals.slice(0, 10),
        truncated: bounded.truncated
      };
    } catch {
      return await this.fallback.analyzeDocument(document);
    }
  }
}

function convertSymbol(symbol: vscode.DocumentSymbol, containerName?: string): LanguageSymbol[] {
  const converted: LanguageSymbol = {
    name: symbol.name,
    kind: convertKind(symbol.kind),
    range: convertRange(symbol.range),
    selectionRange: convertRange(symbol.selectionRange),
    containerName,
    detail: symbol.detail || undefined
  };
  return [converted, ...symbol.children.flatMap((child) => convertSymbol(child, symbol.name))];
}

function convertRange(range: vscode.Range): CodeRange {
  return {
    startLine: range.start.line,
    startCharacter: range.start.character,
    endLine: range.end.line,
    endCharacter: range.end.character
  };
}

function convertKind(kind: vscode.SymbolKind): LanguageSymbolKind {
  switch (kind) {
    case vscode.SymbolKind.Class:
      return "class";
    case vscode.SymbolKind.Interface:
      return "interface";
    case vscode.SymbolKind.Function:
      return "function";
    case vscode.SymbolKind.Method:
      return "method";
    case vscode.SymbolKind.Constructor:
      return "constructor";
    case vscode.SymbolKind.Field:
      return "field";
    case vscode.SymbolKind.Property:
      return "property";
    case vscode.SymbolKind.Variable:
      return "variable";
    case vscode.SymbolKind.Constant:
      return "constant";
    case vscode.SymbolKind.Enum:
      return "enum";
    case vscode.SymbolKind.Module:
      return "module";
    default:
      return "unknown";
  }
}
