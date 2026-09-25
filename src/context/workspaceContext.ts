import path from "node:path";

import * as vscode from "vscode";

import type {
  ActiveEditorContext,
  CodeRange,
  DiagnosticSeverity,
  LearningContext,
  LearningDiagnostic,
  ProjectSignals,
  SelectionContext,
  TodoMarker,
  WorkspaceRoot,
  WorkspaceContext
} from "../core/models";
import { isTestFile } from "../learning/languageProfiles";

const todoPattern = /\b(TODO|FIXME)\b[:\-\s]*(.*)/gi;

export class WorkspaceContextService {
  collect(): LearningContext {
    const workspace = this.collectWorkspace();
    const activeEditor = this.collectActiveEditor();

    return {
      status: !workspace.hasWorkspace
        ? "no-workspace"
        : activeEditor
          ? "ready"
          : "no-active-editor",
      workspace,
      activeEditor,
      project: this.collectProjectSignals(activeEditor)
    };
  }

  private collectWorkspace(): WorkspaceContext {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const activeRoot = this.collectActiveWorkspaceRoot();
    return {
      name: vscode.workspace.name ?? folders[0]?.name ?? "No workspace",
      folderCount: folders.length,
      hasWorkspace: folders.length > 0,
      activeWorkspaceRoot: activeRoot
    };
  }

  private collectActiveWorkspaceRoot(): WorkspaceRoot | undefined {
    const activeUri = vscode.window.activeTextEditor?.document.uri;
    const folder =
      activeUri && activeUri.scheme !== "untitled"
        ? vscode.workspace.getWorkspaceFolder(activeUri)
        : vscode.workspace.workspaceFolders?.[0];

    if (!folder) {
      return undefined;
    }

    return {
      name: folder.name,
      uri: folder.uri.toString(),
      path: folder.uri.fsPath || folder.uri.path
    };
  }

  private collectActiveEditor(): ActiveEditorContext | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return undefined;
    }

    const document = editor.document;
    const diagnostics = vscode.languages
      .getDiagnostics(document.uri)
      .map((diagnostic) => toLearningDiagnostic(diagnostic));
    const selectedText = document.getText(editor.selection);
    const selection =
      selectedText.trim().length > 0
        ? toSelectionContext(editor.selection, selectedText)
        : undefined;

    return {
      fileName: path.basename(document.fileName),
      relativePath: vscode.workspace.asRelativePath(document.uri, false),
      languageId: document.languageId,
      isUntitled: document.isUntitled,
      isDirty: document.isDirty,
      lineCount: document.lineCount,
      selection,
      diagnostics,
      todoMarkers: findTodoMarkers(document)
    };
  }

  private collectProjectSignals(activeEditor: ActiveEditorContext | undefined): ProjectSignals {
    return {
      activeFileIsTest: activeEditor?.relativePath ? isTestFile(activeEditor.relativePath) : false
    };
  }
}

function toSelectionContext(selection: vscode.Selection, text: string): SelectionContext {
  return {
    text,
    range: toCodeRange(selection),
    lineCount: selection.end.line - selection.start.line + 1,
    characterCount: text.length
  };
}

function toLearningDiagnostic(diagnostic: vscode.Diagnostic): LearningDiagnostic {
  return {
    message: diagnostic.message,
    severity: toSeverity(diagnostic.severity),
    source: diagnostic.source,
    code:
      typeof diagnostic.code === "object"
        ? String(diagnostic.code.value)
        : diagnostic.code?.toString(),
    range: toCodeRange(diagnostic.range)
  };
}

function toSeverity(severity: vscode.DiagnosticSeverity): DiagnosticSeverity {
  switch (severity) {
    case vscode.DiagnosticSeverity.Error:
      return "error";
    case vscode.DiagnosticSeverity.Warning:
      return "warning";
    case vscode.DiagnosticSeverity.Information:
      return "information";
    case vscode.DiagnosticSeverity.Hint:
      return "hint";
  }
}

function toCodeRange(range: vscode.Range): CodeRange {
  return {
    startLine: range.start.line,
    startCharacter: range.start.character,
    endLine: range.end.line,
    endCharacter: range.end.character
  };
}

function findTodoMarkers(document: vscode.TextDocument): readonly TodoMarker[] {
  const markers: TodoMarker[] = [];

  for (let line = 0; line < document.lineCount; line += 1) {
    const text = document.lineAt(line).text;
    for (const match of text.matchAll(todoPattern)) {
      const label = match[1];
      if (label === "TODO" || label === "FIXME") {
        markers.push({
          label,
          text: match[2]?.trim() ? match[2].trim() : text.trim(),
          line
        });
      }
    }
  }

  return markers;
}
