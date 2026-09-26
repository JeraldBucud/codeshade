import type { LanguageAnalysis } from "../language/models";

export type FrameworkId = "react" | "express" | "django" | "spring-boot";
export type FrameworkRole =
  | "component"
  | "hook"
  | "router"
  | "route-handler"
  | "model"
  | "view"
  | "url-configuration"
  | "controller"
  | "service"
  | "repository"
  | "application-bootstrap";

export interface FrameworkEvidence {
  readonly source: "metadata" | "language" | "text" | "file-structure";
  readonly description: string;
}

export interface FrameworkDetection {
  readonly framework: FrameworkId;
  readonly confidence: "high" | "medium" | "low";
  readonly evidence: readonly FrameworkEvidence[];
  readonly roles: readonly FrameworkRole[];
}

export interface FrameworkInput {
  readonly fileName: string;
  readonly relativePath?: string;
  readonly languageId: string;
  readonly text: string;
  readonly languageAnalysis?: LanguageAnalysis;
  readonly manifestFiles?: readonly string[];
  readonly metadataPackageNames?: readonly string[];
}
