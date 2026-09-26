import { describe, expect, it } from "vitest";

import { detectFrameworks } from "../src/framework/frameworkIntelligence";

function names(input: Parameters<typeof detectFrameworks>[0]) {
  return detectFrameworks(input).map((detection) => detection.framework);
}

describe("framework intelligence", () => {
  it("detects React only when JSX and React evidence are both present", () => {
    const detections = detectFrameworks({
      fileName: "Button.tsx",
      relativePath: "src/Button.tsx",
      languageId: "typescriptreact",
      text: "import React from 'react';\nexport function Button() { return <Icon />; }",
      metadataPackageNames: []
    });

    expect(detections[0]).toMatchObject({ framework: "react", confidence: "high" });
    expect(detections[0]?.roles).toContain("component");
  });

  it("detects modern React JSX runtime from metadata and JSX without a React import", () => {
    const detections = detectFrameworks({
      fileName: "Button.tsx",
      relativePath: "src/Button.tsx",
      languageId: "typescriptreact",
      text: "export function Button() { return <Icon />; }",
      metadataPackageNames: ["react", "react-dom"]
    });

    expect(detections[0]).toMatchObject({ framework: "react", confidence: "high" });
  });

  it("detects React metadata with lowercase DOM JSX", () => {
    const detections = detectFrameworks({
      fileName: "Button.tsx",
      relativePath: "src/Button.tsx",
      languageId: "typescriptreact",
      text: "export function Button() { return <button>Save</button>; }",
      metadataPackageNames: ["react"]
    });

    expect(detections[0]).toMatchObject({ framework: "react", confidence: "high" });
  });

  it("does not overclaim React from TSX syntax alone", () => {
    expect(
      names({
        fileName: "Icon.tsx",
        relativePath: "src/Icon.tsx",
        languageId: "typescriptreact",
        text: "export const Icon = () => <svg />;"
      })
    ).not.toContain("react");
  });

  it("does not overclaim lowercase DOM JSX without React metadata or import", () => {
    expect(
      names({
        fileName: "Button.tsx",
        relativePath: "src/Button.tsx",
        languageId: "typescriptreact",
        text: "export function Button() { return <button>Save</button>; }"
      })
    ).not.toContain("react");
  });

  it("detects explicit React import with lowercase JSX", () => {
    const detections = detectFrameworks({
      fileName: "Button.tsx",
      relativePath: "src/Button.tsx",
      languageId: "typescriptreact",
      text: "import React from 'react';\nexport function Button() { return <button>Save</button>; }"
    });

    expect(detections[0]).toMatchObject({ framework: "react", confidence: "high" });
  });

  it("detects Express routers and route handlers", () => {
    const detections = detectFrameworks({
      fileName: "routes.ts",
      relativePath: "src/routes.ts",
      languageId: "typescript",
      text: "import express from 'express';\nconst router = express.Router();\nrouter.get('/users', handler);",
      metadataPackageNames: []
    });

    expect(detections[0]).toMatchObject({ framework: "express", confidence: "high" });
    expect(detections[0]?.roles).toEqual(["router", "route-handler"]);
  });

  it("detects Express route modules from metadata and router evidence", () => {
    const detections = detectFrameworks({
      fileName: "routes.ts",
      relativePath: "src/routes.ts",
      languageId: "typescript",
      text: "const router = Router();\nrouter.get('/users', handler);",
      metadataPackageNames: ["express"]
    });

    expect(detections[0]).toMatchObject({ framework: "express", confidence: "high" });
  });

  it("does not overclaim generic app.get without Express evidence", () => {
    expect(
      names({
        fileName: "server.ts",
        relativePath: "src/server.ts",
        languageId: "typescript",
        text: "app.get('/health', handler);"
      })
    ).not.toContain("express");
  });

  it("detects Django roles from imports and conventional files", () => {
    const detections = detectFrameworks({
      fileName: "urls.py",
      relativePath: "app/urls.py",
      languageId: "python",
      text: "from django.urls import path\nfrom . import views\ndef home(request): pass"
    });

    expect(detections[0]).toMatchObject({ framework: "django", confidence: "high" });
    expect(detections[0]?.roles).toContain("url-configuration");
    expect(detections[0]?.roles).toContain("view");
  });

  it("rejects weak Django filename evidence alone", () => {
    expect(
      names({
        fileName: "urls.py",
        relativePath: "app/urls.py",
        languageId: "python",
        text: "urlpatterns = []"
      })
    ).not.toContain("django");
  });

  it("does not label Spring annotations alone as Spring Boot", () => {
    expect(
      names({
        fileName: "GreetingController.java",
        relativePath: "src/main/java/app/GreetingController.java",
        languageId: "java",
        text: '@RestController\nclass GreetingController { @GetMapping String hello() { return "hi"; } }'
      })
    ).not.toContain("spring-boot");
  });

  it("detects Spring Boot metadata plus annotations and roles", () => {
    const detections = detectFrameworks({
      fileName: "GreetingController.java",
      relativePath: "src/main/java/app/GreetingController.java",
      languageId: "java",
      text: '@RestController\nclass GreetingController { @GetMapping String hello() { return "hi"; } }',
      metadataPackageNames: ["spring-boot-starter-web"]
    });

    expect(detections[0]).toMatchObject({ framework: "spring-boot", confidence: "high" });
    expect(detections[0]?.roles).toContain("controller");
  });
});
