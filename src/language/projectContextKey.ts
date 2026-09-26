import type { ProjectSnapshot } from "../core/models";
import type { LanguageDocumentInput } from "./models";

export function createLanguageProjectContextKey(input: {
  readonly document: Pick<LanguageDocumentInput, "uri" | "projectRelativePath"> | undefined;
  readonly snapshot: ProjectSnapshot | undefined;
}): string | undefined {
  if (!input.document) {
    return undefined;
  }

  if (!input.snapshot) {
    return `${input.document.uri}|project:none`;
  }

  return [
    input.document.uri,
    input.document.projectRelativePath ?? "",
    input.snapshot.root.uri,
    input.snapshot.codeFiles.length,
    input.snapshot.metadata.packageNames.join(",")
  ].join("|");
}

export function shouldReconcileLanguageProject(input: {
  readonly previousKey: string | undefined;
  readonly nextKey: string | undefined;
}): boolean {
  return input.nextKey !== undefined && input.previousKey !== input.nextKey;
}
