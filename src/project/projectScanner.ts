import type { GitProjectState, ProjectSnapshot, ProjectTool, WorkspaceRoot } from "../core/models";
import { isTestFile } from "../learning/languageProfiles";
import { detectEcosystems, detectTools, parsePackageJson } from "./projectMetadata";
import { findRelatedFiles } from "./sourceTestRelations";
import { dirname, extension, fileName, normalizePath } from "./pathUtils";

export interface ProjectFileRecord {
  readonly relativePath: string;
  readonly content?: string;
}

export interface ProjectScanInput {
  readonly root: WorkspaceRoot;
  readonly files: readonly ProjectFileRecord[];
  readonly activeFile?: string;
  readonly scanLimit: number;
  readonly scanTruncated: boolean;
  readonly git: GitProjectState;
}

const manifestNames = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "setup.py",
  "setup.cfg",
  "pytest.ini",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock"
]);

const configNames = new Set(["tsconfig.json", "jsconfig.json"]);

export function buildProjectSnapshot(input: ProjectScanInput): ProjectSnapshot {
  const paths = input.files.map((file) => normalizePath(file.relativePath)).sort();
  const packageJson = input.files.find((file) => fileName(file.relativePath) === "package.json");
  const packageJsonSummary = packageJson?.content
    ? parsePackageJson(packageJson.content)
    : undefined;
  const manifestFiles = paths.filter((path) => manifestNames.has(fileName(path)));
  const configFiles = paths.filter((path) => configNames.has(fileName(path)));
  const sourceFiles = paths.filter(isSourceFile);
  const testFiles = sourceFiles.filter(isTestFile);

  return {
    root: input.root,
    ecosystems: detectEcosystems(paths),
    tools: sortTools(detectTools(paths)),
    manifestFiles,
    configFiles,
    sourceRoots: findLikelyRoots(sourceFiles, false),
    testRoots: findLikelyRoots(testFiles, true),
    sourceFileCount: sourceFiles.length,
    testFileCount: testFiles.length,
    scanLimit: input.scanLimit,
    scanTruncated: input.scanTruncated,
    scripts: packageJsonSummary?.scripts ?? [],
    relatedFiles: findRelatedFiles(input.activeFile, sourceFiles),
    git: input.git
  };
}

export function isProjectMetadataPath(path: string): boolean {
  const name = fileName(path);
  return manifestNames.has(name) || configNames.has(name);
}

function isSourceFile(path: string): boolean {
  return [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs", ".py", ".java"].includes(
    extension(path)
  );
}

function findLikelyRoots(paths: readonly string[], testOnly: boolean): readonly string[] {
  const roots = new Set<string>();

  for (const path of paths) {
    const normalized = normalizePath(path);
    if (normalized.includes("src/main/java/")) {
      roots.add("src/main/java");
    } else if (normalized.includes("src/test/java/")) {
      roots.add("src/test/java");
    } else if (/(^|\/)(__tests__|tests?|test)\//.test(normalized)) {
      roots.add(dirname(normalized).split("/").slice(0, 2).join("/"));
    } else if (!testOnly && normalized.includes("src/")) {
      roots.add("src");
    }
  }

  return [...roots].filter(Boolean).sort();
}

function sortTools(tools: readonly ProjectTool[]): readonly ProjectTool[] {
  const rank = new Map<string, number>([
    ["pnpm", 0],
    ["npm", 1],
    ["yarn", 2],
    ["maven", 3],
    ["gradle", 4],
    ["pyproject", 5],
    ["requirements", 6]
  ]);
  return [...tools].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
}
