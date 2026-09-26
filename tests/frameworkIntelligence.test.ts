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
      text: "import React from 'react';\nexport function Button() { return <Icon />; }"
    });

    expect(detections[0]).toMatchObject({ framework: "react", confidence: "high" });
    expect(detections[0]?.roles).toContain("component");
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

  it("detects Express routers and route handlers", () => {
    const detections = detectFrameworks({
      fileName: "routes.ts",
      relativePath: "src/routes.ts",
      languageId: "typescript",
      text: "import express from 'express';\nconst router = express.Router();\nrouter.get('/users', handler);"
    });

    expect(detections[0]).toMatchObject({ framework: "express", confidence: "high" });
    expect(detections[0]?.roles).toEqual(["router", "route-handler"]);
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

  it("detects Spring Boot annotations and roles", () => {
    const detections = detectFrameworks({
      fileName: "GreetingController.java",
      relativePath: "src/main/java/app/GreetingController.java",
      languageId: "java",
      text: '@RestController\nclass GreetingController { @GetMapping String hello() { return "hi"; } }'
    });

    expect(detections[0]).toMatchObject({ framework: "spring-boot", confidence: "medium" });
    expect(detections[0]?.roles).toContain("controller");
  });
});
