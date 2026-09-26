import type { ProjectIndex } from "./projectScanner";

export const projectCatalogSchemaVersion = 1 as const;

export interface PersistentProjectCatalog {
  readonly schemaVersion: typeof projectCatalogSchemaVersion;
  readonly projectId: string;
  readonly savedAt: string;
  readonly scanLimit: number;
  readonly scanTruncated: boolean;
  readonly sourceFileCount: number;
  readonly testFileCount: number;
  readonly codeFiles: readonly string[];
  readonly manifestFiles: readonly string[];
  readonly configFiles: readonly string[];
  readonly sourceRoots: readonly string[];
  readonly testRoots: readonly string[];
  readonly ecosystems: readonly string[];
  readonly tools: readonly string[];
  readonly scripts: readonly string[];
  readonly packageNames: readonly string[];
}

export function createProjectCatalog(
  projectId: string,
  index: ProjectIndex,
  now: () => Date = () => new Date()
): PersistentProjectCatalog {
  return {
    schemaVersion: projectCatalogSchemaVersion,
    projectId,
    savedAt: now().toISOString(),
    scanLimit: index.scanLimit,
    scanTruncated: index.scanTruncated,
    sourceFileCount: index.sourceFileCount,
    testFileCount: index.testFileCount,
    codeFiles: [...index.codeFiles],
    manifestFiles: [...index.manifestFiles],
    configFiles: [...index.configFiles],
    sourceRoots: [...index.sourceRoots],
    testRoots: [...index.testRoots],
    ecosystems: [...index.ecosystems],
    tools: index.tools.map((tool) => tool.id),
    scripts: index.scripts.map((script) => script.name),
    packageNames: [...index.metadata.packageNames]
  };
}

export function parseProjectCatalog(content: string): PersistentProjectCatalog | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    return undefined;
  }

  if (!isRecord(parsed) || parsed.schemaVersion !== projectCatalogSchemaVersion) {
    return undefined;
  }
  if (
    typeof parsed.projectId !== "string" ||
    typeof parsed.savedAt !== "string" ||
    typeof parsed.scanLimit !== "number" ||
    typeof parsed.scanTruncated !== "boolean" ||
    typeof parsed.sourceFileCount !== "number" ||
    typeof parsed.testFileCount !== "number"
  ) {
    return undefined;
  }

  const arrays = [
    "codeFiles",
    "manifestFiles",
    "configFiles",
    "sourceRoots",
    "testRoots",
    "ecosystems",
    "tools",
    "scripts",
    "packageNames"
  ] as const;
  if (arrays.some((key) => !isStringArray(parsed[key]))) {
    return undefined;
  }

  return {
    schemaVersion: projectCatalogSchemaVersion,
    projectId: parsed.projectId,
    savedAt: parsed.savedAt,
    scanLimit: parsed.scanLimit,
    scanTruncated: parsed.scanTruncated,
    sourceFileCount: parsed.sourceFileCount,
    testFileCount: parsed.testFileCount,
    codeFiles: parsed.codeFiles as string[],
    manifestFiles: parsed.manifestFiles as string[],
    configFiles: parsed.configFiles as string[],
    sourceRoots: parsed.sourceRoots as string[],
    testRoots: parsed.testRoots as string[],
    ecosystems: parsed.ecosystems as string[],
    tools: parsed.tools as string[],
    scripts: parsed.scripts as string[],
    packageNames: parsed.packageNames as string[]
  };
}

export function serializeProjectCatalog(catalog: PersistentProjectCatalog): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
