import { describe, expect, it } from "vitest";

import type { WorkspaceRoot } from "../src/core/models";
import {
  ProjectPersistenceService,
  type ProjectPersistenceAdapter
} from "../src/project/projectPersistence";

const projectId = "2c0df18a-8ac2-4b68-84e3-0b6f2c3d6d41";
const root: WorkspaceRoot = {
  name: "demo",
  uri: "file:///demo",
  path: "/demo"
};

function createMemoryAdapter() {
  const identities = new Map<string, string>();
  const manifests = new Map<string, string>();
  let identityWrites = 0;
  let manifestWrites = 0;

  const adapter: ProjectPersistenceAdapter = {
    readProjectIdentity: (projectRoot) => Promise.resolve(identities.get(projectRoot.uri)),
    writeProjectIdentity: (projectRoot, content) => {
      identityWrites += 1;
      identities.set(projectRoot.uri, content);
      return Promise.resolve();
    },
    writeProjectManifest: (id, content) => {
      manifestWrites += 1;
      manifests.set(id, content);
      return Promise.resolve();
    }
  };

  return {
    adapter,
    identities,
    manifests,
    identityWrites: () => identityWrites,
    manifestWrites: () => manifestWrites
  };
}

describe("project persistence service", () => {
  it("creates a tiny project identity and a local external manifest once", async () => {
    const memory = createMemoryAdapter();
    const service = new ProjectPersistenceService(memory.adapter, {
      createId: () => projectId,
      now: () => new Date("2026-09-26T14:30:00.000Z")
    });

    const first = await service.ensureProject(root);
    const second = await service.ensureProject(root);

    expect(first).toEqual({
      status: "ready",
      projectId,
      identityCreated: true
    });
    expect(second).toEqual(first);
    expect(memory.identityWrites()).toBe(1);
    expect(memory.manifestWrites()).toBe(1);
    expect(JSON.parse(memory.identities.get(root.uri) ?? "{}")).toMatchObject({
      schemaVersion: 1,
      projectId
    });
    expect(JSON.parse(memory.manifests.get(projectId) ?? "{}")).toEqual({
      schemaVersion: 1,
      projectId,
      createdAt: "2026-09-26T14:30:00.000Z",
      lastOpenedAt: "2026-09-26T14:30:00.000Z",
      lastKnownRootUri: root.uri
    });
  });

  it("reuses an existing identity when the same project appears at a new root", async () => {
    const memory = createMemoryAdapter();
    const original = new ProjectPersistenceService(memory.adapter, {
      createId: () => projectId,
      now: () => new Date("2026-09-26T14:30:00.000Z")
    });
    await original.ensureProject(root);

    const movedRoot: WorkspaceRoot = {
      name: "demo-renamed",
      uri: "file:///moved/demo-renamed",
      path: "/moved/demo-renamed"
    };
    memory.identities.set(movedRoot.uri, memory.identities.get(root.uri) ?? "");

    const reopened = new ProjectPersistenceService(memory.adapter, {
      createId: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      now: () => new Date("2026-09-27T01:00:00.000Z")
    });
    const state = await reopened.ensureProject(movedRoot);

    expect(state.projectId).toBe(projectId);
    expect(state.identityCreated).toBe(false);
    expect(JSON.parse(memory.manifests.get(projectId) ?? "{}")).toMatchObject({
      projectId,
      lastOpenedAt: "2026-09-27T01:00:00.000Z",
      lastKnownRootUri: movedRoot.uri
    });
  });

  it("does not overwrite a malformed identity file", async () => {
    const memory = createMemoryAdapter();
    memory.identities.set(root.uri, "{\"schemaVersion\":1,\"projectId\":\"broken\"}");
    const service = new ProjectPersistenceService(memory.adapter, {
      createId: () => projectId
    });

    const state = await service.ensureProject(root);

    expect(state.status).toBe("unavailable");
    expect(state.message).toContain("invalid projectId");
    expect(memory.identityWrites()).toBe(0);
    expect(memory.manifestWrites()).toBe(0);
  });
});
