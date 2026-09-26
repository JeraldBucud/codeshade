import * as vscode from "vscode";

import type { HintSession, LearningContext, NextStep, ProjectAnalysis } from "../core/models";
import type { WorkspaceContextService } from "../context/workspaceContext";
import type { ProgressiveHintEngine } from "../learning/hints";
import type { NextStepService } from "../learning/nextSteps";
import type { ProjectIntelligenceService } from "../project/projectIntelligence";
import { isIgnoredProjectPath } from "../project/projectScanner";
import { LearningModeViewProvider } from "../ui/learningModeView";

type RefreshMode = "fast" | "ensure-project" | "refresh-git" | "force-project";

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
      "**/{package.json,tsconfig.json,jsconfig.json,pyproject.toml,requirements.txt,setup.py,setup.cfg,pytest.ini,pom.xml,build.gradle,build.gradle.kts,pnpm-lock.yaml,package-lock.json,yarn.lock,gradlew,gradlew.bat,mvnw,mvnw.cmd}"
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
        this.refresh("ensure-project");
      }),
      vscode.commands.registerCommand("codeshade.refreshLearningContext", () => {
        this.refresh("force-project");
      }),
      vscode.commands.registerCommand("codeshade.showNextHint", () => {
        this.showNextHint();
      }),
      vscode.commands.registerCommand("codeshade.resetHints", () => {
        this.resetHints();
      }),
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.refresh("ensure-project");
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        if (event.textEditor === vscode.window.activeTextEditor) {
          this.refresh("fast");
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (isActiveDocument(event.document)) {
          this.refresh("fast");
        }
      }),
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (isActiveDocument(document)) {
          this.refresh("refresh-git");
        }
      }),
      projectMetadataWatcher.onDidChange((uri) => {
        this.invalidateChangedProject(uri);
      }),
      projectMetadataWatcher.onDidCreate((uri) => {
        this.invalidateChangedProject(uri);
      }),
      projectMetadataWatcher.onDidDelete((uri) => {
        this.invalidateChangedProject(uri);
      }),
      projectFileWatcher.onDidCreate((uri) => {
        this.invalidateChangedProject(uri);
      }),
      projectFileWatcher.onDidDelete((uri) => {
        this.invalidateChangedProject(uri);
      }),
      vscode.languages.onDidChangeDiagnostics((event) => {
        const activeDocumentUri = vscode.window.activeTextEditor?.document.uri;
        if (
          activeDocumentUri &&
          event.uris.some((uri) => uri.toString() === activeDocumentUri.toString())
        ) {
          this.refresh("fast");
        }
      })
    );

    context.subscriptions.push(this);
    this.refresh("ensure-project");
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private refresh(mode: RefreshMode = "ensure-project"): void {
    const previousHintSession = this.hintSession;
    this.currentContext = this.contextService.collect();
    this.projectAnalysis =
      mode === "force-project"
        ? {
            status: "analyzing",
            root: this.currentContext.workspace.activeWorkspaceRoot,
            message: "Analyzing project context locally."
          }
        : this.projectService.getCached(this.currentContext.activeEditor);
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
    switch (mode) {
      case "fast":
        return;
      case "refresh-git":
        void this.refreshGit();
        return;
      case "force-project":
        void this.refreshProject({ force: true, refreshGit: true });
        return;
      case "ensure-project":
        void this.refreshProject({ force: false, refreshGit: true });
        return;
    }
  }

  private async refreshProject(options: {
    readonly force: boolean;
    readonly refreshGit: boolean;
  }): Promise<void> {
    if (!this.currentContext) {
      return;
    }

    const contextAtStart = this.currentContext;
    const analysis = await this.projectService.analyze(contextAtStart.activeEditor, options);
    if (this.currentContext !== contextAtStart) {
      return;
    }

    this.projectAnalysis = analysis;
    this.nextStep = this.nextStepService.choose(this.currentContext, this.projectAnalysis);
    this.publish();
  }

  private async refreshGit(): Promise<void> {
    if (!this.currentContext) {
      return;
    }

    const contextAtStart = this.currentContext;
    const analysis = await this.projectService.refreshGit(contextAtStart.activeEditor);
    if (this.currentContext !== contextAtStart) {
      return;
    }

    this.projectAnalysis = analysis;
    this.nextStep = this.nextStepService.choose(this.currentContext, this.projectAnalysis);
    this.publish();
  }

  private invalidateChangedProject(uri: vscode.Uri): void {
    const relativePath = vscode.workspace.asRelativePath(uri, false);
    if (isIgnoredProjectPath(relativePath)) {
      return;
    }

    const changedRoot = this.projectService.invalidateUri(uri);
    if (changedRoot?.uri === this.currentContext?.workspace.activeWorkspaceRoot?.uri) {
      this.refresh("force-project");
    }
  }

  private showNextHint(): void {
    if (!this.currentContext) {
      this.refresh("ensure-project");
      return;
    }

    this.hintSession = this.hintEngine.showNext(
      this.hintSession ?? this.hintEngine.createSession(this.currentContext)
    );
    this.publish();
  }

  private resetHints(): void {
    if (!this.currentContext) {
      this.refresh("ensure-project");
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
