import type { ProjectPersistenceSummary, WorkspaceRoot } from "../core/models";
import {
  createProjectIdentity,
  parseProjectIdentity,
  serializeProjectIdentity,
  type ProjectIdentity,
  type ProjectIdentityFactory
} from "./projectIdentity";

export const projectStorageSchemaVersion = 1 as const;

export interface ProjectPersistenceAdapter {
  readonly readProjectIdentity: (root: WorkspaceRoot) => Promise<string | undefined>;
  readonly writeProjectIdentity: (root: WorkspaceRoot, content: string) => Promise<void>;
  readonly writeProjectManifest: (projectId: string, content: string) => Promise<void>;
}

export interface PersistentProjectManifest {
  readonly schemaVersion: typeof projectStorageSchemaVersion;
  readonly projectId: string;
  readonly createdAt: string;
  readonly lastOpenedAt: string;
  readonly lastKnownRootUri: string;
}

export interface ProjectPersistenceDependencies extends ProjectIdentityFactory {}

export class ProjectPersistenceService {
  private readonly stateByRoot = new Map<string, ProjectPersistenceSummary>();
  private readonly pendingByRoot = new Map<string, Promise<ProjectPersistenceSummary>>();

  constructor(
    private readonly adapter: ProjectPersistenceAdapter,
    private readonly dependencies: ProjectPersistenceDependencies = {}
  ) {}

  getState(rootUri: string): ProjectPersistenceSummary | undefined {
    return this.stateByRoot.get(rootUri);
  }

  async ensureProject(root: WorkspaceRoot): Promise<ProjectPersistenceSummary> {
    const cached = this.stateByRoot.get(root.uri);
    if (cached?.status === "ready") {
      return cached;
    }

    const pending = this.pendingByRoot.get(root.uri);
    if (pending) {
      return pending;
    }

    const next = this.ensureProjectInternal(root).finally(() => {
      this.pendingByRoot.delete(root.uri);
    });
    this.pendingByRoot.set(root.uri, next);
    return next;
  }

  clearCachedState(rootUri: string): void {
    this.stateByRoot.delete(rootUri);
  }

  private async ensureProjectInternal(root: WorkspaceRoot): Promise<ProjectPersistenceSummary> {
    try {
      const existing = await this.adapter.readProjectIdentity(root);
      const identity = existing
        ? parseProjectIdentity(existing)
        : createProjectIdentity(this.dependencies);
      const identityCreated = existing === undefined;

      if (identityCreated) {
        await this.adapter.writeProjectIdentity(root, serializeProjectIdentity(identity));
      }

      const manifest = createPersistentManifest(identity, root, this.dependencies.now);
      await this.adapter.writeProjectManifest(
        identity.projectId,
        `${JSON.stringify(manifest, null, 2)}\n`
      );

      const state: ProjectPersistenceSummary = {
        status: "ready",
        projectId: identity.projectId,
        identityCreated
      };
      this.stateByRoot.set(root.uri, state);
      return state;
    } catch (error) {
      const state: ProjectPersistenceSummary = {
        status: "unavailable",
        message: error instanceof Error ? error.message : "Project persistence is unavailable."
      };
      this.stateByRoot.set(root.uri, state);
      return state;
    }
  }
}

function createPersistentManifest(
  identity: ProjectIdentity,
  root: WorkspaceRoot,
  nowFactory: (() => Date) | undefined
): PersistentProjectManifest {
  const now = nowFactory ?? (() => new Date());
  return {
    schemaVersion: projectStorageSchemaVersion,
    projectId: identity.projectId,
    createdAt: identity.createdAt,
    lastOpenedAt: now().toISOString(),
    lastKnownRootUri: root.uri
  };
}
