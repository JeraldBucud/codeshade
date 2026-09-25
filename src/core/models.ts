export type DiagnosticSeverity = "error" | "warning" | "information" | "hint";

export interface CodeRange {
  readonly startLine: number;
  readonly startCharacter: number;
  readonly endLine: number;
  readonly endCharacter: number;
}

export interface LearningDiagnostic {
  readonly message: string;
  readonly severity: DiagnosticSeverity;
  readonly source?: string;
  readonly code?: string;
  readonly range: CodeRange;
}

export interface SelectionContext {
  readonly text: string;
  readonly range: CodeRange;
  readonly lineCount: number;
  readonly characterCount: number;
}

export interface ActiveEditorContext {
  readonly fileName: string;
  readonly relativePath?: string;
  readonly languageId: string;
  readonly isUntitled: boolean;
  readonly isDirty: boolean;
  readonly lineCount: number;
  readonly selection?: SelectionContext;
  readonly diagnostics: readonly LearningDiagnostic[];
  readonly todoMarkers: readonly TodoMarker[];
}

export interface TodoMarker {
  readonly label: "TODO" | "FIXME";
  readonly text: string;
  readonly line: number;
}

export interface WorkspaceContext {
  readonly name: string;
  readonly folderCount: number;
  readonly hasWorkspace: boolean;
}

export interface ProjectSignals {
  readonly activeFileIsTest: boolean;
}

export interface LearningContext {
  readonly status: "ready" | "no-workspace" | "no-active-editor";
  readonly workspace: WorkspaceContext;
  readonly activeEditor?: ActiveEditorContext;
  readonly project: ProjectSignals;
}

export interface LanguageProfile {
  readonly id: string;
  readonly displayName: string;
  readonly fileExtensions: readonly string[];
  readonly testFilePatterns: readonly RegExp[];
  readonly sourceFilePatterns: readonly RegExp[];
}

export type HintLevel = "inspect" | "concept" | "direction" | "explicit";

export interface ProgressiveHint {
  readonly id: string;
  readonly level: HintLevel;
  readonly title: string;
  readonly message: string;
  readonly relatedDiagnostic?: LearningDiagnostic;
}

export interface HintSession {
  readonly currentIndex: number;
  readonly hints: readonly ProgressiveHint[];
  readonly targetKey: string;
}

export interface NextStep {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly priority: number;
}

export interface IntelligenceProvider {
  readonly id: string;
  readonly mode: "deterministic" | "embedded-local" | "optional-integration";
  readonly required: false;
}
