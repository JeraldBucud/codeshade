import type { WorkspaceRoot } from "../core/models";
import type { ProjectIndex } from "./projectScanner";

export interface ProjectCacheEntry {
  readonly root: WorkspaceRoot;
  readonly generation: number;
  readonly index: ProjectIndex;
}

export class ProjectIndexCache {
  private readonly entries = new Map<string, ProjectCacheEntry>();
  private readonly generations = new Map<string, number>();

  get(rootUri: string): ProjectCacheEntry | undefined {
    return this.entries.get(rootUri);
  }

  begin(root: WorkspaceRoot): number {
    const generation = (this.generations.get(root.uri) ?? 0) + 1;
    this.generations.set(root.uri, generation);
    return generation;
  }

  setCurrent(root: WorkspaceRoot, generation: number, index: ProjectIndex): boolean {
    if (this.generations.get(root.uri) !== generation) {
      return false;
    }

    this.entries.set(root.uri, { root, index, generation });
    return true;
  }

  invalidate(rootUri: string): void {
    this.entries.delete(rootUri);
    this.generations.set(rootUri, (this.generations.get(rootUri) ?? 0) + 1);
  }
}
