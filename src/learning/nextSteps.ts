import type { LearningContext, NextStep } from "../core/models";

export class NextStepService {
  choose(context: LearningContext): NextStep {
    const candidates = this.collectCandidates(context);
    return [...candidates].sort((a, b) => b.priority - a.priority)[0] ?? defaultNextStep;
  }

  collectCandidates(context: LearningContext): readonly NextStep[] {
    const steps: NextStep[] = [];

    if (!context.workspace.hasWorkspace) {
      steps.push({
        id: "open-workspace",
        title: "Open a project folder",
        detail:
          "CodeShade works best when it can read the workspace name and current file context.",
        priority: 100
      });
    }

    if (!context.activeEditor) {
      steps.push({
        id: "open-source-file",
        title: "Open a source file",
        detail: "Choose a JavaScript, TypeScript, Python, or Java file to begin Learning Mode.",
        priority: 90
      });
      return steps;
    }

    const editor = context.activeEditor;
    const firstDiagnostic = editor.diagnostics[0];

    if (editor.isUntitled || editor.isDirty) {
      steps.push({
        id: "save-current-file",
        title: "Save the current file",
        detail:
          "Saving lets language tools refresh diagnostics and gives you a stable point to reason from.",
        priority: 85
      });
    }

    if (firstDiagnostic) {
      steps.push({
        id: "investigate-first-diagnostic",
        title: "Investigate the first diagnostic",
        detail: `${firstDiagnostic.severity.toUpperCase()}: ${firstDiagnostic.message}`,
        priority: firstDiagnostic.severity === "error" ? 95 : 80
      });
    }

    if (editor.selection) {
      steps.push({
        id: "review-selection",
        title: "Review the selected code",
        detail: `Explain the selected ${String(editor.selection.lineCount)} line(s) before changing them.`,
        priority: 75
      });
    }

    const todo = editor.todoMarkers[0];
    if (todo) {
      steps.push({
        id: "inspect-todo",
        title: `Inspect a ${todo.label}`,
        detail: `Line ${String(todo.line + 1)}: ${todo.text}`,
        priority: 65
      });
    }

    if (!context.project.hasTests) {
      steps.push({
        id: "look-for-test-path",
        title: "Find a way to verify behavior",
        detail:
          "No obvious test file is open or detected yet. Look for an existing test command or nearby tests.",
        priority: 45
      });
    } else {
      steps.push({
        id: "run-or-read-test",
        title: "Use tests as feedback",
        detail: "Read or run a nearby test so the next change has a clear feedback loop.",
        priority: 55
      });
    }

    steps.push({
      id: "explain-current-file",
      title: "Explain the current file",
      detail: "Summarize this file's purpose and choose one small behavior to understand next.",
      priority: 20
    });

    return steps;
  }
}

const defaultNextStep: NextStep = {
  id: "start-small",
  title: "Start with one small question",
  detail: "Choose a nearby line of code and explain what you expect it to do.",
  priority: 0
};
