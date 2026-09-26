import { describe, expect, it } from "vitest";

import {
  collectMetadataPackageNames,
  detectEcosystems,
  detectTools,
  parsePackageJson
} from "../src/project/projectMetadata";

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
    expect(summary?.packageNames).toEqual([]);
  });

  it("extracts bounded framework package evidence from known metadata", () => {
    const packageNames = collectMetadataPackageNames([
      {
        relativePath: "package.json",
        content: JSON.stringify({
          dependencies: { react: "^19.0.0", express: "^5.0.0" },
          devDependencies: { vite: "^7.0.0" }
        })
      },
      { relativePath: "requirements.txt", content: "Django==5.1\npytest==8.0" },
      {
        relativePath: "pom.xml",
        content: "<artifactId>spring-boot-starter-web</artifactId>"
      }
    ]);

    expect(packageNames).toEqual([
      "django",
      "express",
      "pytest",
      "react",
      "spring-boot",
      "spring-boot-starter",
      "vite"
    ]);
  });

  it("gracefully handles invalid package.json", () => {
    expect(parsePackageJson("{ nope")).toBeUndefined();
  });
});
