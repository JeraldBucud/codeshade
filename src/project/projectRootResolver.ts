import type { WorkspaceRoot } from "../core/models";
import { dirname, fileName, normalizePath } from "./pathUtils";

export const strongProjectMarkerNames = [
  "package.json",
  "pyproject.toml",
  "setup.py",
  "setup.cfg",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts"
] as const;

export interface ProjectRootResolutionInput {
  readonly workspaceRoot: WorkspaceRoot;
  readonly activeFile?: string;
  readonly markerPaths: readonly string[];
}

export interface ProjectRootResolution {
  readonly workspaceRoot: WorkspaceRoot;
  readonly projectRoot: WorkspaceRoot;
  readonly activeFile?: string;
  readonly workspaceRelativeActiveFile?: string;
}

export function resolveProjectRootFromMarkers(
  input: ProjectRootResolutionInput
): ProjectRootResolution {
  const workspaceRelativeActiveFile = input.activeFile
    ? normalizePath(input.activeFile)
    : undefined;
  const markerDirectories = new Set(
    input.markerPaths
      .map(normalizePath)
      .filter((path) => isStrongProjectMarker(path))
      .map(dirname)
  );
  const projectRelativePath = findNearestProjectDirectory(
    workspaceRelativeActiveFile,
    markerDirectories
  );
  const projectRoot = toProjectRoot(input.workspaceRoot, projectRelativePath);

  return {
    workspaceRoot: input.workspaceRoot,
    projectRoot,
    activeFile: workspaceRelativeActiveFile
      ? stripProjectPrefix(workspaceRelativeActiveFile, projectRelativePath)
      : undefined,
    workspaceRelativeActiveFile
  };
}

export function isStrongProjectMarker(path: string): boolean {
  return strongProjectMarkerNames.includes(
    fileName(path) as (typeof strongProjectMarkerNames)[number]
  );
}

export function stripProjectPrefix(path: string, projectRelativePath: string | undefined): string {
  const normalized = normalizePath(path);
  const projectPath = projectRelativePath ? normalizePath(projectRelativePath) : "";
  if (!projectPath) {
    return normalized;
  }
  return normalized === projectPath
    ? ""
    : normalized.startsWith(`${projectPath}/`)
      ? normalized.slice(projectPath.length + 1)
      : normalized;
}

export function isPathInsideProject(
  workspaceRelativePath: string | undefined,
  projectRoot: WorkspaceRoot
): boolean {
  if (!workspaceRelativePath) {
    return false;
  }
  const projectPath = projectRoot.relativePath ? normalizePath(projectRoot.relativePath) : "";
  const normalized = normalizePath(workspaceRelativePath);
  return !projectPath || normalized === projectPath || normalized.startsWith(`${projectPath}/`);
}

function findNearestProjectDirectory(
  workspaceRelativeActiveFile: string | undefined,
  markerDirectories: ReadonlySet<string>
): string | undefined {
  if (!workspaceRelativeActiveFile) {
    return markerDirectories.has("") ? "" : undefined;
  }

  const directories = ancestorDirectories(dirname(workspaceRelativeActiveFile));
  for (const directory of directories) {
    if (markerDirectories.has(directory)) {
      return directory;
    }
  }

  return undefined;
}

function toProjectRoot(
  workspaceRoot: WorkspaceRoot,
  projectRelativePath: string | undefined
): WorkspaceRoot {
  const relativePath = projectRelativePath ? normalizePath(projectRelativePath) : undefined;
  if (!relativePath) {
    return workspaceRoot;
  }

  return {
    name: fileName(relativePath),
    uri: joinUri(workspaceRoot.uri, relativePath),
    path: joinPath(workspaceRoot.path, relativePath),
    relativePath,
    containingWorkspaceUri: workspaceRoot.uri
  };
}

function joinUri(base: string, relativePath: string): string {
  return `${base.replace(/\/$/, "")}/${relativePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function joinPath(base: string, relativePath: string): string {
  return `${base.replaceAll("\\", "/").replace(/\/$/, "")}/${relativePath}`;
}

function ancestorDirectories(startDirectory: string): readonly string[] {
  const directories: string[] = [];
  let current = normalizePath(startDirectory);

  directories.push(current);
  while (current) {
    current = dirname(current);
    directories.push(current);
  }

  return directories;
}
