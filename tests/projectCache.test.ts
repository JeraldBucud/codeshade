import { describe, expect, it } from "vitest";

import type { WorkspaceRoot } from "../src/core/models";
import { ProjectAnalysisCache } from "../src/project/projectCache";

const root: WorkspaceRoot = {
  name: "demo",
  uri: "file:///demo",
  path: "/demo"
};

describe("project analysis cache", () => {
  it("invalidates stale analysis generations", () => {
    const cache = new ProjectAnalysisCache();
    const firstGeneration = cache.begin(root, "src/app.ts", {
      status: "analyzing",
      root
    });

    cache.invalidate(root.uri);

    const accepted = cache.setCurrent(root, "src/app.ts", firstGeneration, {
      status: "ready",
      root
    });

    expect(accepted).toBe(false);
    expect(cache.get(root.uri)).toBeUndefined();
  });

  it("keeps the current generation when no invalidation happens", () => {
    const cache = new ProjectAnalysisCache();
    const generation = cache.begin(root, "src/app.ts", {
      status: "analyzing",
      root
    });

    expect(
      cache.setCurrent(root, "src/app.ts", generation, {
        status: "unavailable",
        root,
        message: "No project metadata."
      })
    ).toBe(true);
    expect(cache.get(root.uri)?.analysis.status).toBe("unavailable");
  });
});
