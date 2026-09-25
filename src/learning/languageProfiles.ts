import path from "node:path";

import type { LanguageProfile } from "../core/models";

export const languageProfiles: readonly LanguageProfile[] = [
  {
    id: "javascript",
    displayName: "JavaScript",
    fileExtensions: [".js", ".mjs", ".cjs", ".jsx"],
    sourceFilePatterns: [/\.(?:mjs|cjs|jsx?)$/i],
    testFilePatterns: [
      /(?:^|[\\/])__tests__[\\/].+\.(?:mjs|cjs|jsx?)$/i,
      /(?:\.test|\.spec)\.(?:mjs|cjs|jsx?)$/i
    ]
  },
  {
    id: "typescript",
    displayName: "TypeScript",
    fileExtensions: [".ts", ".tsx", ".mts", ".cts"],
    sourceFilePatterns: [/\.(?:mts|cts|tsx?)$/i],
    testFilePatterns: [
      /(?:^|[\\/])__tests__[\\/].+\.(?:mts|cts|tsx?)$/i,
      /(?:\.test|\.spec)\.(?:mts|cts|tsx?)$/i
    ]
  },
  {
    id: "python",
    displayName: "Python",
    fileExtensions: [".py", ".pyw"],
    sourceFilePatterns: [/\.pyw?$/i],
    testFilePatterns: [/(?:^|[\\/])tests?[\\/].+\.py$/i, /(?:^|[\\/])test_.+\.py$/i, /_test\.py$/i]
  },
  {
    id: "java",
    displayName: "Java",
    fileExtensions: [".java"],
    sourceFilePatterns: [/\.java$/i],
    testFilePatterns: [/(?:^|[\\/])src[\\/]test[\\/].+\.java$/i, /Test\.java$/i]
  }
];

export function detectLanguage(input: {
  readonly languageId?: string;
  readonly fileName?: string;
}): LanguageProfile | undefined {
  const normalizedLanguageId = input.languageId?.toLowerCase();
  const byLanguageId = languageProfiles.find((profile) => profile.id === normalizedLanguageId);

  if (byLanguageId) {
    return byLanguageId;
  }

  if (!input.fileName) {
    return undefined;
  }

  const extension = path.extname(input.fileName).toLowerCase();
  return languageProfiles.find((profile) => profile.fileExtensions.includes(extension));
}

export function getLanguageDisplayName(input: {
  readonly languageId?: string;
  readonly fileName?: string;
}): string {
  return detectLanguage(input)?.displayName ?? input.languageId ?? "Unknown";
}

export function isSupportedLanguage(input: {
  readonly languageId?: string;
  readonly fileName?: string;
}): boolean {
  return detectLanguage(input) !== undefined;
}

export function isTestFile(filePath: string): boolean {
  const normalized = filePath.replaceAll(path.sep, "/");
  return languageProfiles.some((profile) =>
    profile.testFilePatterns.some((pattern) => pattern.test(normalized))
  );
}
