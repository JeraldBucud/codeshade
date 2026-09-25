import * as vscode from "vscode";

import type { HintSession, LearningContext, NextStep } from "../core/models";
import type { WorkspaceContextService } from "../context/workspaceContext";
import type { ProgressiveHintEngine } from "../learning/hints";
import type { NextStepService } from "../learning/nextSteps";
import { LearningModeViewProvider } from "../ui/learningModeView";

export class CodeShadeController implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private currentContext: LearningContext | undefined;
  private hintSession: HintSession | undefined;
  private nextStep: NextStep | undefined;

  constructor(
    private readonly contextService: WorkspaceContextService,
    private readonly hintEngine: ProgressiveHintEngine,
    private readonly nextStepService: NextStepService,
    private readonly viewProvider: LearningModeViewProvider
  ) {}

  register(context: vscode.ExtensionContext): void {
    this.disposables.push(
      vscode.window.registerWebviewViewProvider(
        LearningModeViewProvider.viewType,
        this.viewProvider
      ),
      vscode.commands.registerCommand("codeshade.openLearningMode", async () => {
        await vscode.commands.executeCommand("workbench.view.extension.codeshade");
        await vscode.commands.executeCommand(`${LearningModeViewProvider.viewType}.focus`);
        this.refresh();
      }),
      vscode.commands.registerCommand("codeshade.refreshLearningContext", () => {
        this.refresh();
      }),
      vscode.commands.registerCommand("codeshade.showNextHint", () => {
        this.showNextHint();
      }),
      vscode.commands.registerCommand("codeshade.resetHints", () => {
        this.resetHints();
      }),
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.refresh();
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === vscode.window.activeTextEditor?.document) {
          this.refresh();
        }
      }),
      vscode.languages.onDidChangeDiagnostics(() => {
        this.refresh();
      })
    );

    context.subscriptions.push(this);
    this.refresh();
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private refresh(): void {
    this.currentContext = this.contextService.collect();
    this.hintSession = this.hintEngine.createSession(this.currentContext);
    this.nextStep = this.nextStepService.choose(this.currentContext);
    this.publish();
  }

  private showNextHint(): void {
    if (!this.currentContext) {
      this.refresh();
      return;
    }

    this.hintSession = this.hintEngine.showNext(
      this.hintSession ?? this.hintEngine.createSession(this.currentContext)
    );
    this.publish();
  }

  private resetHints(): void {
    if (!this.currentContext) {
      this.refresh();
      return;
    }

    this.hintSession = this.hintEngine.reset(
      this.hintSession ?? this.hintEngine.createSession(this.currentContext)
    );
    this.publish();
  }

  private publish(): void {
    if (!this.currentContext || !this.hintSession || !this.nextStep) {
      return;
    }

    this.viewProvider.update({
      context: this.currentContext,
      hintSession: this.hintSession,
      nextStep: this.nextStep
    });
  }
}
