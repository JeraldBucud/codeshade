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
    const tools = detectTools([
      "yarn.lock",
      "mvnw",
      "gradlew.bat",
      "package.json",
      "pyproject.toml"
    ]);

    expect(tools.map((tool) => tool.id)).toEqual(["yarn", "maven", "gradle", "pyproject"]);
  });

  it("extracts package.json string script names without executing them", () => {
    const summary = parsePackageJson(
      JSON.stringify({
        scripts: {
          test: "vitest run",
          build: "tsc",
          "lint:fix": "eslint --fix",
          preview: "vite preview",
          invalid: false,
          nested: { command: "nope" }
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
