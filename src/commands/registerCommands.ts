import * as vscode from "vscode";

import type { HintSession, LearningContext, NextStep, ProjectAnalysis } from "../core/models";
import type { WorkspaceContextService } from "../context/workspaceContext";
import type { ProgressiveHintEngine } from "../learning/hints";
import type { NextStepService } from "../learning/nextSteps";
import type { ProjectIntelligenceService } from "../project/projectIntelligence";
import { LearningModeViewProvider } from "../ui/learningModeView";

export class CodeShadeController implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private currentContext: LearningContext | undefined;
  private hintSession: HintSession | undefined;
  private nextStep: NextStep | undefined;
  private projectAnalysis: ProjectAnalysis | undefined;

  constructor(
    private readonly contextService: WorkspaceContextService,
    private readonly projectService: ProjectIntelligenceService,
    private readonly hintEngine: ProgressiveHintEngine,
    private readonly nextStepService: NextStepService,
    private readonly viewProvider: LearningModeViewProvider
  ) {}

  register(context: vscode.ExtensionContext): void {
    const projectMetadataWatcher = vscode.workspace.createFileSystemWatcher(
      "**/{package.json,tsconfig.json,jsconfig.json,pyproject.toml,requirements.txt,setup.py,setup.cfg,pytest.ini,pom.xml,build.gradle,build.gradle.kts,pnpm-lock.yaml,package-lock.json,yarn.lock}"
    );
    const projectFileWatcher = vscode.workspace.createFileSystemWatcher(
      "**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py,java}"
    );

    this.disposables.push(
      projectMetadataWatcher,
      projectFileWatcher,
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
        this.refresh({ forceProject: true });
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
      projectMetadataWatcher.onDidChange((uri) => {
        this.projectService.invalidateUri(uri);
        this.refresh({ forceProject: true });
      }),
      projectMetadataWatcher.onDidCreate((uri) => {
        this.projectService.invalidateUri(uri);
        this.refresh({ forceProject: true });
      }),
      projectMetadataWatcher.onDidDelete((uri) => {
        this.projectService.invalidateUri(uri);
        this.refresh({ forceProject: true });
      }),
      projectFileWatcher.onDidCreate((uri) => {
        this.projectService.invalidateUri(uri);
        this.refresh({ forceProject: true });
      }),
      projectFileWatcher.onDidDelete((uri) => {
        this.projectService.invalidateUri(uri);
        this.refresh({ forceProject: true });
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

  private refresh(options: { readonly forceProject?: boolean } = {}): void {
    const previousHintSession = this.hintSession;
    this.currentContext = this.contextService.collect();
    this.projectAnalysis = options.forceProject
      ? {
          status: "analyzing",
          root: this.currentContext.workspace.activeWorkspaceRoot,
          message: "Analyzing project context locally."
        }
      : this.projectService.getCached();
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
    this.nextStep = this.nextStepService.choose(this.currentContext, this.projectAnalysis);
    this.publish();
    void this.refreshProject(options.forceProject ?? false);
  }

  private async refreshProject(force: boolean): Promise<void> {
    if (!this.currentContext) {
      return;
    }

    const contextAtStart = this.currentContext;
    const analysis = await this.projectService.analyze(contextAtStart.activeEditor, force);
    if (this.currentContext !== contextAtStart) {
      return;
    }

    this.projectAnalysis = analysis;
    this.nextStep = this.nextStepService.choose(this.currentContext, this.projectAnalysis);
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
      nextStep: this.nextStep,
      projectAnalysis: this.projectAnalysis
    });
  }
}

function isActiveDocument(document: vscode.TextDocument): boolean {
  return document.uri.toString() === vscode.window.activeTextEditor?.document.uri.toString();
}
