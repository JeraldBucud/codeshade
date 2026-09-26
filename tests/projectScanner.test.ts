import { describe, expect, it } from "vitest";

import type { GitProjectState, WorkspaceRoot } from "../src/core/models";
import { detectFrameworks } from "../src/framework/frameworkIntelligence";
import { buildProjectIndex, buildProjectSnapshot } from "../src/project/projectScanner";

const root: WorkspaceRoot = {
  name: "demo",
  uri: "file:///demo",
  path: "/demo"
};

const git: GitProjectState = {
  available: false,
  isRepository: false,
  error: "not available"
};

describe("project scanner", () => {
  it("separates source and test counts while preserving related files", () => {
    const index = buildProjectIndex({
      root,
      scanLimit: 3,
      scanTruncated: true,
      sourceFiles: [{ relativePath: "src/app.ts" }, { relativePath: "src/app.test.ts" }],
      metadataFiles: [
        {
          relativePath: "package.json",
          content: JSON.stringify({ scripts: { test: "vitest", build: "tsc" } })
        },
        { relativePath: "pnpm-lock.yaml" },
        { relativePath: "tsconfig.json" }
      ]
    });
    const snapshot = buildProjectSnapshot({ index, activeFile: "src/app.ts", git });

    expect(snapshot.scanTruncated).toBe(true);
    expect(snapshot.ecosystems).toEqual(["javascript", "typescript"]);
    expect(snapshot.tools.map((tool) => tool.id)).toEqual(["pnpm"]);
    expect(snapshot.scripts.map((script) => script.name)).toEqual(["build", "test"]);
    expect(snapshot.sourceFileCount).toBe(1);
    expect(snapshot.testFileCount).toBe(1);
    expect(snapshot.sourceRoots).toEqual(["src"]);
    expect(snapshot.testRoots).toEqual([]);
    expect(snapshot.relatedFiles[0]?.path).toBe("src/app.test.ts");
  });

  it("preserves Spring Boot Maven metadata through the project snapshot", () => {
    const index = buildProjectIndex({
      root,
      scanLimit: 10,
      scanTruncated: false,
      sourceFiles: [{ relativePath: "src/main/java/app/ReportService.java" }],
      metadataFiles: [
        {
          relativePath: "pom.xml",
          content:
            "<parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId></parent><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>"
        }
      ]
    });
    const snapshot = buildProjectSnapshot({
      index,
      activeFile: "src/main/java/app/ReportService.java",
      git
    });
    const frameworks = detectFrameworks({
      fileName: "ReportService.java",
      relativePath: "src/main/java/app/ReportService.java",
      languageId: "java",
      text: "import org.springframework.stereotype.Service;\n@Service\npublic class ReportService {}",
      metadataPackageNames: snapshot.metadata.packageNames
    });

    expect(snapshot.metadata.packageNames).toContain("spring-boot");
    expect(snapshot.metadata.packageNames).toContain("spring-boot-starter-web");
    expect(frameworks[0]).toMatchObject({
      framework: "spring-boot",
      confidence: "high",
      roles: ["service"]
    });
  });

  it("keeps important metadata even when source scanning is truncated", () => {
    const index = buildProjectIndex({
      root,
      scanLimit: 1,
      scanTruncated: true,
      sourceFiles: [{ relativePath: "src/app.ts" }],
      metadataFiles: [
        { relativePath: "yarn.lock" },
        { relativePath: "pom.xml" },
        { relativePath: "gradlew" }
      ]
    });

    expect(index.scanTruncated).toBe(true);
    expect(index.tools.map((tool) => tool.id)).toEqual(["yarn", "maven", "gradle"]);
    expect(index.manifestFiles).toEqual(["gradlew", "pom.xml", "yarn.lock"]);
  });
});
