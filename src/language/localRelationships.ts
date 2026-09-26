import type { LanguageAnalysis, LanguageDocumentInput, LanguageRelationship } from "./models";
import { dirname, extension, fileName, normalizePath } from "../project/pathUtils";

const scriptExtensions = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"] as const;

export function resolveLocalRelationships(
  analysis: LanguageAnalysis,
  document: Pick<
    LanguageDocumentInput,
    "projectRelativePath" | "knownProjectFiles" | "relativePath" | "fileName"
  >
): LanguageAnalysis {
  const knownFiles = document.knownProjectFiles?.map(normalizePath) ?? [];
  if (knownFiles.length === 0) {
    return analysis;
  }

  const activePath = normalizePath(
    document.projectRelativePath ?? document.relativePath ?? document.fileName
  );
  const resolved: LanguageRelationship[] = [];

  for (const relationship of [...analysis.imports, ...analysis.relationships]) {
    const targetFile = resolveRelationshipTarget(relationship, activePath, knownFiles);
    if (!targetFile) {
      resolved.push(
        relationship.type === "import" && relationship.targetFile?.startsWith(".")
          ? { ...relationship, targetFile: undefined }
          : relationship
      );
      continue;
    }

    resolved.push({
      ...relationship,
      targetFile,
      confidence: "high",
      reason: `${relationship.reason} CodeShade resolved it to a known local project file.`
    });
  }

  return {
    ...analysis,
    imports: resolved.filter((relationship) => relationship.type === "import"),
    relationships: resolved.filter((relationship) => relationship.type !== "import")
  };
}


export function selectLearningRelationship(
  analysis: LanguageAnalysis | undefined,
  activePath?: string
): LanguageRelationship | undefined {
  if (!analysis) {
    return undefined;
  }

  const relationships = analysis.relationships.filter(
    (relationship) => !pointsToActiveFile(relationship.targetFile, activePath)
  );
  const localImports = analysis.imports.filter(
    (relationship) =>
      relationship.targetFile !== undefined &&
      !pointsToActiveFile(relationship.targetFile, activePath)
  );

  return (
    relationships.find((relationship) => relationship.targetFile !== undefined) ??
    localImports[0] ??
    relationships[0]
  );
}

function pointsToActiveFile(targetFile: string | undefined, activePath: string | undefined): boolean {
  if (!targetFile || !activePath) {
    return false;
  }
  const normalizedTarget = normalizePath(targetFile);
  const normalizedActive = normalizePath(activePath);
  return normalizedActive === normalizedTarget || normalizedActive.endsWith(`/${normalizedTarget}`);
}

function resolveRelationshipTarget(
  relationship: LanguageRelationship,
  activePath: string,
  knownFiles: readonly string[]
): string | undefined {
  if (relationship.type === "import" && relationship.targetFile) {
    return resolveLocalScriptImport(activePath, relationship.targetFile, knownFiles);
  }

  if (relationship.type === "renders" && relationship.symbol) {
    return uniqueBasenameMatch(relationship.symbol, knownFiles, scriptExtensions);
  }

  if (relationship.type === "service-dependency" && relationship.symbol) {
    return uniqueBasenameMatch(relationship.symbol, knownFiles, [".java"]);
  }

  return undefined;
}

function resolveLocalScriptImport(
  activePath: string,
  importTarget: string,
  knownFiles: readonly string[]
): string | undefined {
  if (!importTarget.startsWith(".")) {
    return undefined;
  }

  const base = normalizeSegments(`${dirname(activePath)}/${importTarget}`);
  const candidates = [
    ...scriptExtensions.map((ext) => `${base}${ext}`),
    ...scriptExtensions.map((ext) => `${base}/index${ext}`)
  ];

  return uniqueExisting(candidates, knownFiles);
}

function uniqueBasenameMatch(
  symbol: string,
  knownFiles: readonly string[],
  extensions: readonly string[]
): string | undefined {
  const matches = knownFiles.filter(
    (path) =>
      fileName(path).replace(extension(path), "") === symbol && extensions.includes(extension(path))
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function uniqueExisting(
  candidates: readonly string[],
  knownFiles: readonly string[]
): string | undefined {
  const matches = candidates.filter((candidate) => knownFiles.includes(normalizePath(candidate)));
  return matches.length === 1 ? matches[0] : undefined;
}

function normalizeSegments(path: string): string {
  const parts: string[] = [];
  for (const part of normalizePath(path).split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}
