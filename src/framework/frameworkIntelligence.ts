import type {
  FrameworkDetection,
  FrameworkEvidence,
  FrameworkInput,
  FrameworkRole
} from "./models";

export function detectFrameworks(input: FrameworkInput): readonly FrameworkDetection[] {
  return [
    detectReact(input),
    detectExpress(input),
    detectDjango(input),
    detectSpringBoot(input)
  ].filter((detection): detection is FrameworkDetection => detection !== undefined);
}

function detectReact(input: FrameworkInput): FrameworkDetection | undefined {
  const evidence: FrameworkEvidence[] = [];
  const roles: FrameworkRole[] = [];
  const hasReactDependency = hasPackage(input, "react") || hasPackage(input, "react-dom");
  const hasReactImport = /from\s+["']react["']|require\(["']react["']\)/.test(input.text);
  const hasJsxSyntax =
    /\.(tsx|jsx)$/i.test(input.fileName) && /<[A-Za-z][\w.-]*(\s|>|\/)/.test(input.text);
  const hasComponentJsx = /<[A-Z][A-Za-z0-9_]*/.test(input.text);
  if (hasReactDependency) evidence.push({ source: "metadata", description: "React dependency" });
  if (hasReactImport) evidence.push({ source: "text", description: "imports React" });
  if (hasJsxSyntax && (hasReactDependency || hasReactImport || hasComponentJsx)) {
    evidence.push({
      source: "text",
      description: hasComponentJsx ? "contains JSX component usage" : "contains JSX syntax"
    });
  }
  if (/\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(input.text)) roles.push("hook");
  if (/function\s+[A-Z][A-Za-z0-9_]*|const\s+[A-Z][A-Za-z0-9_]*\s*=/.test(input.text))
    roles.push("component");
  return evidence.length >= 2
    ? { framework: "react", confidence: "high", evidence, roles: unique(roles) }
    : undefined;
}

function detectExpress(input: FrameworkInput): FrameworkDetection | undefined {
  const evidence: FrameworkEvidence[] = [];
  const roles: FrameworkRole[] = [];
  const hasExpressDependency = hasPackage(input, "express");
  if (hasExpressDependency)
    evidence.push({ source: "metadata", description: "Express dependency" });
  if (/from\s+["']express["']|require\(["']express["']\)/.test(input.text))
    evidence.push({ source: "text", description: "imports Express" });
  if (/\bRouter\s*\(|\bexpress\s*\(/.test(input.text)) {
    evidence.push({ source: "text", description: "creates an Express app or router" });
    roles.push("router");
  }
  if (/\b(?:app|router)\.(get|post|put|delete|patch|use)\s*\(/.test(input.text)) {
    evidence.push({ source: "text", description: "declares Express-style route handlers" });
    roles.push("route-handler");
  }
  return evidence.length >= 2 && roles.length > 0
    ? { framework: "express", confidence: "high", evidence, roles: unique(roles) }
    : undefined;
}

function detectDjango(input: FrameworkInput): FrameworkDetection | undefined {
  const evidence: FrameworkEvidence[] = [];
  const roles: FrameworkRole[] = [];
  const hasDjangoDependency = hasPackage(input, "django");
  if (hasDjangoDependency) evidence.push({ source: "metadata", description: "Django dependency" });
  if (/\bfrom\s+django\b|\bimport\s+django\b/.test(input.text))
    evidence.push({ source: "text", description: "imports Django" });
  if (input.relativePath?.endsWith("urls.py")) {
    evidence.push({ source: "file-structure", description: "Django URL configuration filename" });
    roles.push("url-configuration");
  }
  if (/models\.Model/.test(input.text)) roles.push("model");
  if (/def\s+\w+\s*\(\s*request\b|class\s+\w+View\b/.test(input.text)) roles.push("view");
  return evidence.length > 1 && roles.length > 0
    ? {
        framework: "django",
        confidence: evidence.length > 1 ? "high" : "medium",
        evidence,
        roles: unique(roles)
      }
    : undefined;
}

function detectSpringBoot(input: FrameworkInput): FrameworkDetection | undefined {
  const evidence: FrameworkEvidence[] = [];
  const roles: FrameworkRole[] = [];
  const hasSpringBootMetadata =
    hasPackage(input, "spring-boot") ||
    hasPackage(input, "spring-boot-starter") ||
    input.metadataPackageNames?.some((name) => name.startsWith("spring-boot-starter")) === true;
  if (hasSpringBootMetadata)
    evidence.push({ source: "metadata", description: "Spring Boot dependency or plugin" });
  if (/@SpringBootApplication/.test(input.text)) {
    evidence.push({ source: "text", description: "uses @SpringBootApplication" });
    roles.push("application-bootstrap");
  }
  if (/@RestController|@Controller/.test(input.text)) {
    evidence.push({ source: "text", description: "uses Spring controller annotation" });
    roles.push("controller");
  }
  if (/@Service/.test(input.text)) {
    evidence.push({ source: "text", description: "uses @Service" });
    roles.push("service");
  }
  if (/@Repository/.test(input.text)) {
    evidence.push({ source: "text", description: "uses @Repository" });
    roles.push("repository");
  }
  const hasBootEvidence = hasSpringBootMetadata || /@SpringBootApplication/.test(input.text);
  return hasBootEvidence
    ? {
        framework: "spring-boot",
        confidence: evidence.length > 1 ? "high" : "medium",
        evidence,
        roles: unique(roles)
      }
    : undefined;
}

function unique<T>(items: readonly T[]): readonly T[] {
  return [...new Set(items)];
}

function hasPackage(input: FrameworkInput, name: string): boolean {
  return (
    input.metadataPackageNames?.some((packageName) => packageName.toLowerCase() === name) === true
  );
}
