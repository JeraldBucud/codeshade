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
  if (/from\s+["']react["']|require\(["']react["']\)/.test(input.text))
    evidence.push({ source: "text", description: "imports React" });
  if (/\.(tsx|jsx)$/i.test(input.fileName) && /<[A-Z][A-Za-z0-9_]*/.test(input.text))
    evidence.push({ source: "text", description: "contains JSX component usage" });
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
  return evidence.length >= 2
    ? { framework: "express", confidence: "high", evidence, roles: unique(roles) }
    : undefined;
}

function detectDjango(input: FrameworkInput): FrameworkDetection | undefined {
  const evidence: FrameworkEvidence[] = [];
  const roles: FrameworkRole[] = [];
  if (/\bfrom\s+django\b|\bimport\s+django\b/.test(input.text))
    evidence.push({ source: "text", description: "imports Django" });
  if (input.relativePath?.endsWith("urls.py")) {
    evidence.push({ source: "file-structure", description: "Django URL configuration filename" });
    roles.push("url-configuration");
  }
  if (/models\.Model/.test(input.text)) roles.push("model");
  if (/def\s+\w+\s*\(\s*request\b|class\s+\w+View\b/.test(input.text)) roles.push("view");
  return evidence.length > 0 && roles.length > 0
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
  if (/spring-boot/.test(input.text))
    evidence.push({ source: "metadata", description: "contains Spring Boot metadata text" });
  return evidence.length > 0
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
