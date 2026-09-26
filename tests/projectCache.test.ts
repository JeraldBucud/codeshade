import { describe, expect, it } from "vitest";

import type { WorkspaceRoot } from "../src/core/models";
import { ProjectIndexCache } from "../src/project/projectCache";
import { buildProjectIndex } from "../src/project/projectScanner";

const root: WorkspaceRoot = {
  name: "demo",
  uri: "file:///demo",
  path: "/demo"
};

function createIndex() {
  return buildProjectIndex({
    root,
    sourceFiles: [{ relativePath: "src/app.ts" }],
    metadataFiles: [{ relativePath: "package.json", content: "{}" }],
    scanLimit: 2500,
    scanTruncated: false
  });
}

describe("project index cache", () => {
  it("invalidates stale structural index generations", () => {
    const cache = new ProjectIndexCache();
    const firstGeneration = cache.begin(root);

    cache.invalidate(root.uri);

    const accepted = cache.setCurrent(root, firstGeneration, createIndex());

    expect(accepted).toBe(false);
    expect(cache.get(root.uri)).toBeUndefined();
  });

  it("stores the root-level index when no invalidation happens", () => {
    const cache = new ProjectIndexCache();
    const generation = cache.begin(root);
    const index = createIndex();

    expect(cache.setCurrent(root, generation, index)).toBe(true);
    expect(cache.get(root.uri)?.index.sourceFiles).toEqual(["src/app.ts"]);
  });
});
