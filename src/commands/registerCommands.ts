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
      vscode.window.onDidChangeTextEditorSelection((event) => {
        if (event.textEditor === vscode.window.activeTextEditor) {
          this.refresh();
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (isActiveDocument(event.document)) {
          this.refresh();
        }
      }),
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (isActiveDocument(document)) {
          this.refresh();
        }
      }),
      vscode.languages.onDidChangeDiagnostics((event) => {
        const activeDocumentUri = vscode.window.activeTextEditor?.document.uri;
        if (
          activeDocumentUri &&
          event.uris.some((uri) => uri.toString() === activeDocumentUri.toString())
        ) {
          this.refresh();
        }
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
    const previousHintSession = this.hintSession;
    this.currentContext = this.contextService.collect();
    this.hintSession = this.hintEngine.createSession(this.currentContext);
    if (previousHintSession?.targetKey === this.hintSession.targetKey) {
      this.hintSession = {
        ...this.hintSession,
        currentIndex: Math.min(
          previousHintSession.currentIndex,
          Math.max(this.hintSession.hints.length - 1, 0)
        )
      };
    }
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

function isActiveDocument(document: vscode.TextDocument): boolean {
  return document.uri.toString() === vscode.window.activeTextEditor?.document.uri.toString();
}
