import { describe, expect, it } from "vitest";

import { detectEcosystems, detectTools, parsePackageJson } from "../src/project/projectMetadata";

describe("project metadata", () => {
  it("detects supported ecosystems from manifests and file paths", () => {
    const ecosystems = detectEcosystems([
      "package.json",
      "tsconfig.json",
      "src/app.ts",
      "pyproject.toml",
      "src/main.py",
      "pom.xml",
      "src/main/java/App.java"
    ]);

    expect(ecosystems).toEqual(["javascript", "typescript", "python", "java"]);
  });

  it("detects package managers and build tools only from evidence", () => {
    const tools = detectTools(["pnpm-lock.yaml", "package.json", "pom.xml", "pyproject.toml"]);

    expect(tools.map((tool) => tool.id)).toEqual(["pnpm", "maven", "pyproject"]);
  });

  it("extracts package.json script names without executing them", () => {
    const summary = parsePackageJson(
      JSON.stringify({
        scripts: {
          test: "vitest run",
          build: "tsc",
          "lint:fix": "eslint --fix",
          preview: "vite preview"
        }
      })
    );

    expect(summary?.scripts).toEqual([
      { name: "build", kind: "build" },
      { name: "lint:fix", kind: "lint" },
      { name: "preview", kind: "other" },
      { name: "test", kind: "test" }
    ]);
  });

  it("gracefully handles invalid package.json", () => {
    expect(parsePackageJson("{ nope")).toBeUndefined();
  });
});
