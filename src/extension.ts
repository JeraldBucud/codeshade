import type * as vscode from "vscode";

import { CodeShadeController } from "./commands/registerCommands";
import { WorkspaceContextService } from "./context/workspaceContext";
import { ProgressiveHintEngine } from "./learning/hints";
import { NextStepService } from "./learning/nextSteps";
import { LearningModeViewProvider } from "./ui/learningModeView";

export function activate(context: vscode.ExtensionContext): void {
  const controller = new CodeShadeController(
    new WorkspaceContextService(),
    new ProgressiveHintEngine(),
    new NextStepService(),
    new LearningModeViewProvider(context.extensionUri)
  );

  controller.register(context);
}

export function deactivate(): void {
  // No background services are started in Phase 0.
}
