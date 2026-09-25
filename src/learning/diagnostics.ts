import type { DiagnosticSeverity, LearningDiagnostic } from "../core/models";

const severityRank: Record<DiagnosticSeverity, number> = {
  error: 0,
  warning: 1,
  information: 2,
  hint: 3
};

export function choosePrimaryDiagnostic(
  diagnostics: readonly LearningDiagnostic[]
): LearningDiagnostic | undefined {
  return [...diagnostics].sort(compareDiagnostics)[0];
}

function compareDiagnostics(a: LearningDiagnostic, b: LearningDiagnostic): number {
  return (
    severityRank[a.severity] - severityRank[b.severity] ||
    a.range.startLine - b.range.startLine ||
    a.range.startCharacter - b.range.startCharacter ||
    a.range.endLine - b.range.endLine ||
    a.range.endCharacter - b.range.endCharacter ||
    compareText(a.source, b.source) ||
    compareText(a.code, b.code) ||
    a.message.localeCompare(b.message)
  );
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a ?? "").localeCompare(b ?? "");
}
