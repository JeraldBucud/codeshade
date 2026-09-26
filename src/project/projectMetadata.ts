import type { PackageTool, ProjectEcosystem, ProjectScript, ProjectTool } from "../core/models";
import { extension, fileName, normalizePath } from "./pathUtils";

export interface PackageJsonSummary {
  readonly scripts: readonly ProjectScript[];
}

export function parsePackageJson(text: string): PackageJsonSummary | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isObject(parsed)) {
      return undefined;
    }

    const scriptsValue = parsed["scripts"];
    if (!isObject(scriptsValue)) {
      return { scripts: [] };
    }

    return {
      scripts: Object.entries(scriptsValue)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([name]) => name)
        .sort()
        .map((name) => ({
          name,
          kind: classifyScript(name)
        }))
    };
  } catch {
    return undefined;
  }
}

export function detectEcosystems(paths: readonly string[]): readonly ProjectEcosystem[] {
  const normalized = paths.map(normalizePath);
  const ecosystems = new Set<ProjectEcosystem>();

  if (
    normalized.some((path) =>
      [
        "package.json",
        "tsconfig.json",
        "jsconfig.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "package-lock.json"
      ].includes(fileName(path))
    ) ||
    normalized.some((path) => [".js", ".jsx", ".mjs", ".cjs"].includes(extension(path)))
  ) {
    ecosystems.add("javascript");
  }

  if (
    normalized.some((path) => ["tsconfig.json"].includes(fileName(path))) ||
    normalized.some((path) => [".ts", ".tsx", ".mts", ".cts"].includes(extension(path)))
  ) {
    ecosystems.add("typescript");
  }

  if (
    normalized.some((path) =>
      ["pyproject.toml", "requirements.txt", "setup.py", "setup.cfg", "pytest.ini"].includes(
        fileName(path)
      )
    ) ||
    normalized.some((path) => [".py", ".pyw"].includes(extension(path)))
  ) {
    ecosystems.add("python");
  }

  if (
    normalized.some((path) =>
      [
        "pom.xml",
        "build.gradle",
        "build.gradle.kts",
        "gradlew",
        "gradlew.bat",
        "mvnw",
        "mvnw.cmd"
      ].includes(fileName(path))
    ) ||
    normalized.some((path) => extension(path) === ".java")
  ) {
    ecosystems.add("java");
  }

  return [...ecosystems];
}

export function detectTools(paths: readonly string[]): readonly ProjectTool[] {
  const names = new Set(paths.map((path) => fileName(path)));
  const tools: ProjectTool[] = [];
  const add = (id: PackageTool, label: string, evidence: readonly string[]): void => {
    const matched = evidence.filter((item) => names.has(item));
    if (matched.length > 0) {
      tools.push({ id, label, evidence: matched });
    }
  };

  add("pnpm", "pnpm", ["pnpm-lock.yaml"]);
  add("npm", "npm", ["package-lock.json"]);
  add("yarn", "Yarn", ["yarn.lock"]);
  add("maven", "Maven", ["pom.xml", "mvnw", "mvnw.cmd"]);
  add("gradle", "Gradle", ["build.gradle", "build.gradle.kts", "gradlew", "gradlew.bat"]);
  add("pyproject", "pyproject", ["pyproject.toml"]);
  add("requirements", "requirements.txt", ["requirements.txt"]);

  return tools;
}

export function classifyScript(name: string): ProjectScript["kind"] {
  const normalized = name.toLowerCase();
  if (normalized === "test" || normalized.includes("test")) {
    return "test";
  }
  if (normalized === "build" || normalized.includes("build")) {
    return "build";
  }
  if (normalized === "lint" || normalized.includes("lint")) {
    return "lint";
  }
  if (["dev", "develop", "watch"].includes(normalized)) {
    return "dev";
  }
  if (normalized === "start") {
    return "start";
  }
  return "other";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
