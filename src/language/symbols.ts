import type { CodeRange } from "../core/models";
import type { LanguageSymbol } from "./models";

export const maxSymbols = 80;

export function rangeContainsPosition(
  range: CodeRange,
  position: { readonly line: number; readonly character: number }
): boolean {
  if (position.line < range.startLine || position.line > range.endLine) return false;
  if (position.line === range.startLine && position.character < range.startCharacter) return false;
  if (position.line === range.endLine && position.character > range.endCharacter) return false;
  return true;
}

export function findContainingSymbol(
  symbols: readonly LanguageSymbol[],
  position: { readonly line: number; readonly character: number } | undefined
): LanguageSymbol | undefined {
  if (!position) return undefined;
  return [...symbols]
    .filter((symbol) => rangeContainsPosition(symbol.range, position))
    .sort((a, b) => rangeSize(a.range) - rangeSize(b.range))[0];
}

export function boundSymbols(symbols: readonly LanguageSymbol[]): {
  readonly symbols: readonly LanguageSymbol[];
  readonly truncated: boolean;
} {
  return { symbols: symbols.slice(0, maxSymbols), truncated: symbols.length > maxSymbols };
}

function rangeSize(range: CodeRange): number {
  return (range.endLine - range.startLine) * 10000 + (range.endCharacter - range.startCharacter);
}
