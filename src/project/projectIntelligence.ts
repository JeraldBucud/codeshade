import * as vscode from "vscode";

import type {
  ActiveEditorContext,
  GitProjectState,
  ProjectAnalysis,
  WorkspaceRoot
} from "../core/models";
import { readGitState } from "./gitAdapter";
import { ProjectIndexCache } from "./projectCache";
import {
  buildProjectIndex,
  buildProjectSnapshot,
  isIgnoredProjectPath,
  isKnownMetadataFile,
  metadataFileNames,
  type ProjectFileRecord,
  type ProjectIndex
} from "./projectScanner";
import { normalizePath } from "./pathUtils";

const scanLimit = 2500;
const metadataReadLimitBytes = 128 * 1024;
const sourceIncludePattern = "**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py,java}";
const excludePattern =
  "**/{.git,node_modules,dist,build,out,target,coverage,.next,.venv,venv,__pycache__,vendor,generated}/**";

export interface ProjectWorkspaceAdapter {
  readonly getActiveWorkspaceRoot: () => WorkspaceRoot | undefined;
  readonly findSourceFiles: (
    root: WorkspaceRoot,
    limit: number
  ) => Promise<readonly ProjectFileRecord[]>;
  readonly findMetadataFiles: (root: WorkspaceRoot) => Promise<readonly ProjectFileRecord[]>;
  readonly readGitState: (root: WorkspaceRoot, activeFile?: string) => Promise<GitProjectState>;
  readonly getWorkspaceRootForUri: (uri: vscode.Uri) => WorkspaceRoot | undefined;
}

export class ProjectIntelligenceService {
  private readonly cache = new ProjectIndexCache();
  private readonly adapter: ProjectWorkspaceAdapter;
  private gitCache = new Map<string, GitProjectState>();
  private analyzing = new Set<string>();

  constructor(adapter: ProjectWorkspaceAdapter = createVsCodeProjectAdapter()) {
    this.adapter = adapter;
  }

  getCached(activeEditor?: ActiveEditorContext): ProjectAnalysis {
    const root = this.adapter.getActiveWorkspaceRoot();
    if (!root) {
      return { status: "no-workspace", message: "Open a workspace to analyze project context." };
    }

    const cached = this.cache.get(root.uri);
    if (!cached) {
      return this.analyzing.has(root.uri)
        ? { status: "analyzing", root, message: "Analyzing project context locally." }
        : { status: "analyzing", root, message: "Project context has not been analyzed yet." };
    }

    return this.buildAnalysis(
      cached.index,
      activeEditor?.relativePath,
      this.gitCache.get(root.uri)
    );
  }

  async analyze(
    activeEditor: ActiveEditorContext | undefined,
    force: boolean
  ): Promise<ProjectAnalysis> {
    const root = this.adapter.getActiveWorkspaceRoot();
    if (!root) {
      return { status: "no-workspace", message: "Open a workspace to analyze project context." };
    }

    const activeFile = activeEditor?.relativePath;
    const cached = this.cache.get(root.uri);
    if (!force && cached) {
      const git = await this.refreshGitForRoot(root, activeFile);
      return this.buildAnalysis(cached.index, activeFile, git);
    }

    const generation = this.cache.begin(root);
    this.analyzing.add(root.uri);

    try {
      const index = await this.scanIndex(root);
      if (!this.cache.setCurrent(root, generation, index)) {
        const current = this.cache.get(root.uri);
        return current
          ? this.buildAnalysis(current.index, activeFile, this.gitCache.get(root.uri))
          : { status: "analyzing", root, message: "Analyzing project context locally." };
      }

      const git = await this.refreshGitForRoot(root, activeFile);
      return this.buildAnalysis(index, activeFile, git);
    } catch (error) {
      return {
        status: "unavailable",
        root,
        message: error instanceof Error ? error.message : "Project analysis unavailable."
      };
    } finally {
      this.analyzing.delete(root.uri);
    }
  }

  async refreshGit(activeEditor: ActiveEditorContext | undefined): Promise<ProjectAnalysis> {
    const root = this.adapter.getActiveWorkspaceRoot();
    if (!root) {
      return { status: "no-workspace", message: "Open a workspace to analyze project context." };
    }

    const git = await this.refreshGitForRoot(root, activeEditor?.relativePath);
    const cached = this.cache.get(root.uri);
    return cached
      ? this.buildAnalysis(cached.index, activeEditor?.relativePath, git)
      : { status: "analyzing", root, message: "Project context has not been analyzed yet." };
  }

  invalidateUri(uri: vscode.Uri): WorkspaceRoot | undefined {
    const root = this.adapter.getWorkspaceRootForUri(uri);
    if (!root) {
      return undefined;
    }

    this.invalidateRoot(root.uri);
    return root;
  }

  invalidateRoot(rootUri: string): void {
    this.cache.invalidate(rootUri);
    this.gitCache.delete(rootUri);
  }

  private async scanIndex(root: WorkspaceRoot): Promise<ProjectIndex> {
    const sourceFiles = await this.adapter.findSourceFiles(root, scanLimit + 1);
    const scanTruncated = sourceFiles.length > scanLimit;
    const boundedSourceFiles = sourceFiles.slice(0, scanLimit);
    const metadataFiles = await this.adapter.findMetadataFiles(root);

    return buildProjectIndex({
      root,
      sourceFiles: boundedSourceFiles,
      metadataFiles,
      scanLimit,
      scanTruncated
    });
  }

  private async refreshGitForRoot(
    root: WorkspaceRoot,
    activeFile: string | undefined
  ): Promise<GitProjectState> {
    const git = await this.adapter.readGitState(root, activeFile);
    this.gitCache.set(root.uri, git);
    return git;
  }

  private buildAnalysis(
    index: ProjectIndex,
    activeFile: string | undefined,
    git: GitProjectState | undefined
  ): ProjectAnalysis {
    return {
      status: "ready",
      root: index.root,
      snapshot: buildProjectSnapshot({
        index,
        activeFile,
        git: git ?? {
          available: false,
          isRepository: false,
          error: "Git state has not been refreshed yet."
        }
      })
    };
  }
}

function createVsCodeProjectAdapter(): ProjectWorkspaceAdapter {
  return {
    getActiveWorkspaceRoot: resolveActiveWorkspaceRoot,
    findSourceFiles: findSourceFilesForRoot,
    findMetadataFiles: findMetadataFilesForRoot,
    readGitState: async (root, activeFile) =>
      root.uri.startsWith("file:")
        ? readGitState({ rootPath: vscode.Uri.parse(root.uri).fsPath, activeFile })
        : {
            available: false,
            isRepository: false,
            error: "Git state is unavailable for non-file workspace roots."
          },
    getWorkspaceRootForUri: (uri) => {
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      return folder ? toWorkspaceRoot(folder) : undefined;
    }
  };
}

async function findSourceFilesForRoot(
  root: WorkspaceRoot,
  limit: number
): Promise<readonly ProjectFileRecord[]> {
  const folderUri = vscode.Uri.parse(root.uri);
  const uris = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folderUri, sourceIncludePattern),
    excludePattern,
    limit
  );

  return uris
    .map((uri) => normalizePath(vscode.workspace.asRelativePath(uri, false)))
    .filter((path) => !isIgnoredProjectPath(path))
    .map((relativePath) => ({ relativePath: stripRootPrefix(relativePath, folderUri) }));
}

async function findMetadataFilesForRoot(
  root: WorkspaceRoot
): Promise<readonly ProjectFileRecord[]> {
  const folderUri = vscode.Uri.parse(root.uri);
  const records = await Promise.all(
    metadataFileNames.map(async (name): Promise<ProjectFileRecord | undefined> => {
      const uri = vscode.Uri.joinPath(folderUri, name);
      try {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type === vscode.FileType.Directory) {
          return undefined;
        }

        const relativePath = name;
        if (!isKnownMetadataFile(relativePath) || stat.size > metadataReadLimitBytes) {
          return { relativePath };
        }

        const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
        return { relativePath, content };
      } catch {
        return undefined;
      }
    })
  );

  return records.filter((record): record is ProjectFileRecord => record !== undefined);
}

function resolveActiveWorkspaceRoot(): WorkspaceRoot | undefined {
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  const folder =
    activeUri && activeUri.scheme !== "untitled"
      ? vscode.workspace.getWorkspaceFolder(activeUri)
      : vscode.workspace.workspaceFolders?.[0];

  return folder ? toWorkspaceRoot(folder) : undefined;
}

function toWorkspaceRoot(folder: vscode.WorkspaceFolder): WorkspaceRoot {
  return {
    name: folder.name,
    uri: folder.uri.toString(),
    path: folder.uri.fsPath || folder.uri.path
  };
}

function stripRootPrefix(relativePath: string, rootUri: vscode.Uri): string {
  const folderName = rootUri.path.split("/").at(-1);
  if (folderName && relativePath.startsWith(`${folderName}/`)) {
    return relativePath.slice(folderName.length + 1);
  }
  return relativePath;
}
