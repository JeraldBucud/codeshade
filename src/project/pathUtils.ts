export function normalizePath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^\/+/, "");
}

export function fileName(filePath: string): string {
  const normalized = normalizePath(filePath);
  return normalized.split("/").at(-1) ?? normalized;
}

export function dirname(filePath: string): string {
  const normalized = normalizePath(filePath);
  const parts = normalized.split("/");
  parts.pop();
  return parts.join("/");
}

export function withoutExtension(filePath: string): string {
  return normalizePath(filePath).replace(/\.[^./]+$/, "");
}

export function extension(filePath: string): string {
  const name = fileName(filePath);
  const match = /\.[^.]+$/.exec(name);
  return match?.[0].toLowerCase() ?? "";
}
