import type {
  HintSession,
  LearningContext,
  LearningDiagnostic,
  ProgressiveHint
} from "../core/models";
import { choosePrimaryDiagnostic } from "./diagnostics";

const hintLevels: readonly ProgressiveHint["level"][] = [
  "inspect",
  "concept",
  "direction",
  "explicit"
];

export class ProgressiveHintEngine {
  createSession(context: LearningContext): HintSession {
    return {
      currentIndex: 0,
      hints: this.generateHints(context),
      targetKey: createHintTargetKey(context)
    };
  }

  showNext(session: HintSession): HintSession {
    if (session.hints.length === 0) {
      return session;
    }

    return {
      ...session,
      currentIndex: Math.min(session.currentIndex + 1, session.hints.length - 1)
    };
  }

  reset(session: HintSession): HintSession {
    return {
      ...session,
      currentIndex: 0
    };
  }

  currentHint(session: HintSession): ProgressiveHint | undefined {
    return session.hints[session.currentIndex];
  }

  private generateHints(context: LearningContext): readonly ProgressiveHint[] {
    const diagnostic = context.activeEditor
      ? choosePrimaryDiagnostic(context.activeEditor.diagnostics)
      : undefined;

    if (diagnostic) {
      return createDiagnosticHints(diagnostic);
    }

    if (context.activeEditor?.selection) {
      return hintLevels.map((level, index) => ({
        id: `selection-${level}`,
        level,
        title: selectionHintTitles[index]!,
        message: selectionHintMessages[index]!
      }));
    }

    if (!context.activeEditor) {
      return [
        {
          id: "open-file-inspect",
          level: "inspect",
          title: "Open a file to begin",
          message:\n            "Choose a source file so CodingSensei can describe the immediate learning context."
        }
      ];
    }

    return [
      {
        id: "steady-state-inspect",
        level: "inspect",
        title: "Start with a small question",
        message:
          "Pick one function, variable, or test expectation in the current file and explain what you expect it to do before changing it."
      },
      {
        id: "steady-state-concept",
        level: "concept",
        title: "Connect code to behavior",
        message:
          "Learning is stronger when you can connect a line of code to an observable result, such as a test outcome, console output, or UI change."
      }
    ];
  }
}

function createHintTargetKey(context: LearningContext): string {
  const editor = context.activeEditor;
  if (!editor) {
    return `status:${context.status}`;
  }

  const diagnostic = choosePrimaryDiagnostic(editor.diagnostics);
  if (diagnostic) {
    return [
      "diagnostic",
      editor.relativePath ?? editor.fileName,
      diagnostic.severity,
      diagnostic.range.startLine,
      diagnostic.range.startCharacter,
      diagnostic.range.endLine,
      diagnostic.range.endCharacter,
      diagnostic.source ?? "",
      diagnostic.code ?? "",
      diagnostic.message
    ].join(":");
  }

  if (editor.selection) {
    return [
      "selection",
      editor.relativePath ?? editor.fileName,
      editor.selection.range.startLine,
      editor.selection.range.startCharacter,
      editor.selection.range.endLine,
      editor.selection.range.endCharacter,
      editor.selection.text
    ].join(":");
  }

  return `file:${editor.relativePath ?? editor.fileName}`;
}

function createDiagnosticHints(diagnostic: LearningDiagnostic): readonly ProgressiveHint[] {
  const location = `line ${String(diagnostic.range.startLine + 1)}`;
  return [
    {
      id: "diagnostic-inspect",
      level: "inspect",
      title: "Inspect the first diagnostic",
      message: `Start at ${location}. Read the highlighted expression and the diagnostic message before editing anything.`,
      relatedDiagnostic: diagnostic
    },
    {
      id: "diagnostic-concept",
      level: "concept",
      title: "Name the rule being broken",
      message: `This ${diagnostic.severity} is reported because the editor or language tooling found a mismatch between the code and the rules it understands.`,
      relatedDiagnostic: diagnostic
    },
    {
      id: "diagnostic-direction",
      level: "direction",
      title: "Trace the nearby context",
      message:
        "Look at the symbols immediately before and after the highlighted range. Check names, types, imports, punctuation, and whether the value exists in this scope.",
      relatedDiagnostic: diagnostic
    },
    {
      id: "diagnostic-explicit",
      level: "explicit",
      title: "Make the smallest safe change",
      message:
        "Change only the part needed to satisfy the diagnostic, then re-read the surrounding code to confirm the change matches your intent.",
      relatedDiagnostic: diagnostic
    }
  ];
}

const selectionHintTitles = [
  "Read the selected code",
  "Identify the main concept",
  "Follow inputs and outputs",
  "Explain before editing"
] as const;

const selectionHintMessages = [
  "Start by describing what the selected code does in plain language.",
  "Look for the concept in play: data flow, control flow, types, state, errors, or side effects.",
  "Find what values enter the selection and what values leave it. That usually reveals the next useful question.",
  "Write or say your expected behavior first, then make the smallest change that tests that understanding."
] as const;
