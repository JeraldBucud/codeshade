import type { ProjectAnalysis, WorkspaceRoot } from "../core/models";

export interface ProjectCacheEntry {
  readonly root: WorkspaceRoot;
  readonly generation: number;
  readonly activeFile?: string;
  readonly analysis: ProjectAnalysis;
}

export class ProjectAnalysisCache {
  private readonly entries = new Map<string, ProjectCacheEntry>();
  private readonly generations = new Map<string, number>();

  get(rootUri: string): ProjectCacheEntry | undefined {
    return this.entries.get(rootUri);
  }

  begin(root: WorkspaceRoot, activeFile: string | undefined, analysis: ProjectAnalysis): number {
    const generation = (this.generations.get(root.uri) ?? 0) + 1;
    this.generations.set(root.uri, generation);
    this.entries.set(root.uri, { root, activeFile, analysis, generation });
    return generation;
  }

  setCurrent(
    root: WorkspaceRoot,
    activeFile: string | undefined,
    generation: number,
    analysis: ProjectAnalysis
  ): boolean {
    if (this.generations.get(root.uri) !== generation) {
      return false;
    }

    this.entries.set(root.uri, { root, activeFile, analysis, generation });
    return true;
  }

  invalidate(rootUri: string): void {
    this.entries.delete(rootUri);
    this.generations.set(rootUri, (this.generations.get(rootUri) ?? 0) + 1);
  }
}
