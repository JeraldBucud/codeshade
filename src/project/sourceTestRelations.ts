import type { RelatedFileCandidate } from "../core/models";
import { dirname, extension, fileName, normalizePath, withoutExtension } from "./pathUtils";

export function findRelatedFiles(
  activePath: string | undefined,
  allPaths: readonly string[]
): readonly RelatedFileCandidate[] {
  if (!activePath) {
    return [];
  }

  const normalizedActive = normalizePath(activePath);
  const normalizedPaths = [...new Set(allPaths.map(normalizePath))].sort();
  const pathSet = new Set(normalizedPaths);
  const candidates: RelatedFileCandidate[] = [];

  for (const target of buildExistingCandidates(normalizedActive)) {
    if (pathSet.has(target.path)) {
      candidates.push(target);
    }
  }

  if (!isLikelyTestPath(normalizedActive)) {
    const suggestion = suggestTestPath(normalizedActive, normalizedPaths);
    if (suggestion && !pathSet.has(suggestion.path)) {
      candidates.push(suggestion);
    }
  }

  return dedupeCandidates(candidates);
}

export function isLikelyTestPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  const name = fileName(normalized);
  return (
    /(^|\/)(__tests__|tests?|src\/test)\//.test(normalized) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(name) ||
    /^test_.+\.py$/.test(name) ||
    /_test\.py$/.test(name) ||
    /Test\.java$/.test(name)
  );
}

function buildExistingCandidates(activePath: string): readonly RelatedFileCandidate[] {
  const ext = extension(activePath);
  if ([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"].includes(ext)) {
    return buildScriptCandidates(activePath);
  }
  if (ext === ".py") {
    return buildPythonCandidates(activePath);
  }
  if (ext === ".java") {
    return buildJavaCandidates(activePath);
  }
  return [];
}

function buildScriptCandidates(activePath: string): readonly RelatedFileCandidate[] {
  const dir = dirname(activePath);
  const base = withoutExtension(fileName(activePath)).replace(/\.(test|spec)$/, "");
  const ext = extension(activePath);
  const sourceExt = ext.replace(/^\.m/, ".").replace(/^\.c/, ".");
  const relation = isLikelyTestPath(activePath) ? "source" : "test";

  if (relation === "source") {
    return [
      candidate(`${dir}/${base}${sourceExt}`, "Related source file", "source", "high"),
      candidate(`${dir}/${base}${ext}`, "Related source file", "source", "medium")
    ];
  }

  const testNames = [
    `${dir}/${base}.test${ext}`,
    `${dir}/${base}.spec${ext}`,
    `${dir}/__tests__/${base}.test${ext}`,
    `tests/${base}.test${ext}`,
    `test/${base}.test${ext}`
  ];
  return testNames.map((path, index) =>
    candidate(path, "Related test file", "test", index < 2 ? "high" : "medium")
  );
}

function buildPythonCandidates(activePath: string): readonly RelatedFileCandidate[] {
  const dir = dirname(activePath);
  const base = withoutExtension(fileName(activePath))
    .replace(/^test_/, "")
    .replace(/_test$/, "");

  if (isLikelyTestPath(activePath)) {
    return [
      candidate(`${dir}/${base}.py`, "Related source file", "source", "medium"),
      candidate(
        activePath.replace(/(^|\/)tests?\//, "$1").replace(/test_/, ""),
        "Related source file",
        "source",
        "medium"
      )
    ];
  }

  return [
    candidate(`${dir}/test_${base}.py`, "Related test file", "test", "high"),
    candidate(`${dir}/${base}_test.py`, "Related test file", "test", "high"),
    candidate(`tests/test_${base}.py`, "Related test file", "test", "medium"),
    candidate(`test/test_${base}.py`, "Related test file", "test", "medium")
  ];
}

function buildJavaCandidates(activePath: string): readonly RelatedFileCandidate[] {
  const base = withoutExtension(fileName(activePath)).replace(/Test$/, "");
  if (isLikelyTestPath(activePath)) {
    return [
      candidate(
        activePath.replace("src/test/java/", "src/main/java/").replace(/Test\.java$/, ".java"),
        "Related source file",
        "source",
        "high"
      )
    ];
  }

  return [
    candidate(
      activePath.replace("src/main/java/", "src/test/java/").replace(/\.java$/, "Test.java"),
      "Related test file",
      "test",
      "high"
    ),
    candidate(`${dirname(activePath)}/${base}Test.java`, "Related test file", "test", "medium")
  ];
}

function suggestTestPath(
  activePath: string,
  allPaths: readonly string[]
): RelatedFileCandidate | undefined {
  const ext = extension(activePath);
  const base = withoutExtension(fileName(activePath));

  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext) && hasAnyTestRoot(allPaths)) {
    return candidate(
      `${firstTestRoot(allPaths)}/${base}.test${ext}`,
      "Suggested test location",
      "suggested-test",
      "suggested",
      false
    );
  }

  if (ext === ".py" && hasAnyTestRoot(allPaths)) {
    return candidate(
      `${firstTestRoot(allPaths)}/test_${base}.py`,
      "Suggested test location",
      "suggested-test",
      "suggested",
      false
    );
  }

  if (ext === ".java" && allPaths.some((path) => normalizePath(path).includes("src/test/java/"))) {
    return candidate(
      activePath.replace("src/main/java/", "src/test/java/").replace(/\.java$/, "Test.java"),
      "Suggested test location",
      "suggested-test",
      "suggested",
      false
    );
  }

  return undefined;
}

function hasAnyTestRoot(paths: readonly string[]): boolean {
  return paths.some((path) => /(^|\/)(__tests__|tests?|src\/test)\//.test(normalizePath(path)));
}

function firstTestRoot(paths: readonly string[]): string {
  const matched = paths.map(normalizePath).find((path) => /(^|\/)(tests?|__tests__)\//.test(path));
  if (!matched) {
    return "tests";
  }
  const parts = matched.split("/");
  const index = parts.findIndex((part) => ["test", "tests", "__tests__"].includes(part));
  return parts.slice(0, index + 1).join("/");
}

function candidate(
  path: string,
  label: string,
  relationship: RelatedFileCandidate["relationship"],
  confidence: RelatedFileCandidate["confidence"],
  exists = true
): RelatedFileCandidate {
  return {
    path: normalizePath(path),
    label,
    relationship,
    confidence,
    exists,
    reason:
      relationship === "suggested-test"
        ? "Matches an existing project test convention."
        : "Matches a common source/test naming convention."
  };
}

function dedupeCandidates(
  candidates: readonly RelatedFileCandidate[]
): readonly RelatedFileCandidate[] {
  const seen = new Set<string>();
  return candidates
    .filter((candidate) => {
      const key = `${candidate.relationship}:${candidate.path}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        confidenceRank(a.confidence) - confidenceRank(b.confidence) || a.path.localeCompare(b.path)
    );
}

function confidenceRank(confidence: RelatedFileCandidate["confidence"]): number {
  switch (confidence) {
    case "high":
      return 0;
    case "medium":
      return 1;
    case "suggested":
      return 2;
  }
}
