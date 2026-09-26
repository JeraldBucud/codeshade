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
      const currentSymbol = findContainingSymbol(bounded.symbols, document.cursor);
      const providerRelationships = await collectProviderRelationships(document, currentSymbol);
      return {
        status: "available",
        file: document.relativePath ?? document.fileName,
        languageId: document.languageId,
        source: "vscode-provider",
        symbols: bounded.symbols,
        currentSymbol,
        imports: deterministic.imports.slice(0, 40),
        relationships: [...providerRelationships, ...deterministic.relationships].slice(0, 40),
        entryPointSignals: deterministic.entryPointSignals.slice(0, 10),
        truncated: bounded.truncated
      };
    } catch {
      return await this.fallback.analyzeDocument(document);
    }
  }
}

async function collectProviderRelationships(
  document: LanguageDocumentInput,
  currentSymbol: LanguageSymbol | undefined
): Promise<readonly LanguageAnalysis["relationships"][number][]> {
  if (!currentSymbol || !document.projectRootUri || !document.knownProjectFiles) {
    return [];
  }

  const uri = vscode.Uri.parse(document.uri);
  const position = new vscode.Position(
    currentSymbol.selectionRange.startLine,
    currentSymbol.selectionRange.startCharacter
  );
  const relationships: LanguageAnalysis["relationships"][number][] = [];

  try {
    const definitions = await vscode.commands.executeCommand<
      readonly (vscode.Location | vscode.LocationLink)[] | undefined
    >("vscode.executeDefinitionProvider", uri, position);
    for (const target of (definitions ?? []).slice(0, 5)) {
      const targetUri = "uri" in target ? target.uri : target.targetUri;
      const targetFile = projectRelativeUri(targetUri, document);
      if (targetFile) {
        relationships.push({
          type: "definition",
          target: currentSymbol.name,
          targetFile,
          symbol: currentSymbol.name,
          confidence: "high",
          reason: "VS Code resolved the local definition for the current symbol."
        });
      }
    }
  } catch {
    // Definition providers are optional.
  }

  try {
    const references = await vscode.commands.executeCommand<readonly vscode.Location[] | undefined>(
      "vscode.executeReferenceProvider",
      uri,
      position
    );
    for (const reference of (references ?? []).slice(0, 8)) {
      const targetFile = projectRelativeUri(reference.uri, document);
      if (targetFile && targetFile !== document.projectRelativePath) {
        relationships.push({
          type: "reference",
          target: currentSymbol.name,
          targetFile,
          symbol: currentSymbol.name,
          confidence: "medium",
          reason: "VS Code found a local project reference for the current symbol."
        });
      }
    }
  } catch {
    // Reference providers are optional.
  }

  return uniqueRelationships(relationships).slice(0, 10);
}

function projectRelativeUri(
  uri: vscode.Uri,
  document: Pick<LanguageDocumentInput, "projectRootUri" | "knownProjectFiles">
): string | undefined {
  if (!document.projectRootUri || !document.knownProjectFiles) {
    return undefined;
  }
  const root = vscode.Uri.parse(document.projectRootUri);
  const rootPath = normalizeUriPath(root.path);
  const targetPath = normalizeUriPath(uri.path);
  const relativePath =
    targetPath === rootPath
      ? ""
      : targetPath.startsWith(`${rootPath}/`)
        ? decodeURIComponent(targetPath.slice(rootPath.length + 1))
        : undefined;

  if (!relativePath || !document.knownProjectFiles.includes(relativePath)) {
    return undefined;
  }

  return relativePath;
}

function normalizeUriPath(path: string): string {
  return path.replace(/\/+$/, "").replaceAll("\\", "/");
}

function uniqueRelationships(
  relationships: readonly LanguageAnalysis["relationships"][number][]
): readonly LanguageAnalysis["relationships"][number][] {
  const seen = new Set<string>();
  return relationships.filter((relationship) => {
    const key = `${relationship.type}:${relationship.targetFile ?? ""}:${relationship.symbol ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
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
