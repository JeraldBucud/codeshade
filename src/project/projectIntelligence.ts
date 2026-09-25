import * as vscode from "vscode";

import type {
  ActiveEditorContext,
  ProjectAnalysis,
  ProjectSnapshot,
  WorkspaceRoot
} from "../core/models";
import { readGitState } from "./gitAdapter";
import { ProjectAnalysisCache } from "./projectCache";
import { buildProjectSnapshot, type ProjectFileRecord } from "./projectScanner";
import { normalizePath } from "./pathUtils";

const scanLimit = 2500;
const metadataReadLimitBytes = 128 * 1024;
const includePattern =
  "**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py,java,json,toml,txt,ini,cfg,xml,gradle,kts,cmd,bat,yaml,yml}";
const excludePattern =
  "**/{.git,node_modules,dist,build,out,target,coverage,.next,.venv,venv,__pycache__,vendor,generated}/**";

export class ProjectIntelligenceService {
  private readonly cache = new ProjectAnalysisCache();

  getCached(): ProjectAnalysis {
    const root = resolveActiveWorkspaceRoot();
    if (!root) {
      return { status: "no-workspace", message: "Open a workspace to analyze project context." };
    }

    const cached = this.cache.get(root.uri);
    return (
      cached?.analysis ?? {
        status: "analyzing",
        root,
        message: "Analyzing project context locally."
      }
    );
  }

  async analyze(
    activeEditor: ActiveEditorContext | undefined,
    force: boolean
  ): Promise<ProjectAnalysis> {
    const root = resolveActiveWorkspaceRoot();
    if (!root) {
      return { status: "no-workspace", message: "Open a workspace to analyze project context." };
    }

    const activeFile = activeEditor?.relativePath;
    const cached = this.cache.get(root.uri);
    if (!force && cached && cached.activeFile === activeFile) {
      return cached.analysis;
    }

    const generation = this.cache.begin(root, activeFile, {
      status: "analyzing",
      root,
      message: "Analyzing project context locally."
    });

    const analysis = await this.scan(root, activeFile);
    if (!this.cache.setCurrent(root, activeFile, generation, analysis)) {
      return this.cache.get(root.uri)?.analysis ?? analysis;
    }

    return analysis;
  }

  invalidateUri(uri: vscode.Uri): void {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (folder) {
      this.invalidateRoot(folder.uri.toString());
    }
  }

  invalidateRoot(rootUri: string): void {
    this.cache.invalidate(rootUri);
  }

  private async scan(
    root: WorkspaceRoot,
    activeFile: string | undefined
  ): Promise<ProjectAnalysis> {
    try {
      const folderUri = vscode.Uri.parse(root.uri);
      const uris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folderUri, includePattern),
        excludePattern,
        scanLimit + 1
      );
      const scanTruncated = uris.length > scanLimit;
      const boundedUris = uris.slice(0, scanLimit);
      const files = await this.toFileRecords(folderUri, boundedUris);
      const git =
        folderUri.scheme === "file"
          ? await readGitState({ rootPath: folderUri.fsPath, activeFile })
          : {
              available: false,
              isRepository: false,
              error: "Git state is unavailable for non-file workspace roots."
            };
      const snapshot: ProjectSnapshot = buildProjectSnapshot({
        root,
        files,
        activeFile,
        scanLimit,
        scanTruncated,
        git
      });

      return { status: "ready", root, snapshot };
    } catch (error) {
      return {
        status: "unavailable",
        root,
        message: error instanceof Error ? error.message : "Project analysis unavailable."
      };
    }
  }

  private async toFileRecords(
    rootUri: vscode.Uri,
    uris: readonly vscode.Uri[]
  ): Promise<readonly ProjectFileRecord[]> {
    const records = await Promise.all(
      uris.map(async (uri): Promise<ProjectFileRecord> => {
        const relativePath = normalizePath(vscode.workspace.asRelativePath(uri, false));
        if (!isReadableMetadataFile(relativePath)) {
          return { relativePath };
        }

        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.size > metadataReadLimitBytes) {
          return { relativePath };
        }

        const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
        return {
          relativePath: stripRootPrefix(relativePath, rootUri),
          content
        };
      })
    );

    return records.map((record) => ({
      ...record,
      relativePath: stripRootPrefix(record.relativePath, rootUri)
    }));
  }
}

function resolveActiveWorkspaceRoot(): WorkspaceRoot | undefined {
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

function isReadableMetadataFile(path: string): boolean {
  return [
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "setup.py",
    "setup.cfg",
    "pytest.ini"
  ].includes(path.split("/").at(-1) ?? path);
}

function stripRootPrefix(relativePath: string, rootUri: vscode.Uri): string {
  const folderName = rootUri.path.split("/").at(-1);
  if (folderName && relativePath.startsWith(`${folderName}/`)) {
    return relativePath.slice(folderName.length + 1);
  }
  return relativePath;
}
