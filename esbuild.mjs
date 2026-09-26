import * as esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const watch = process.argv.includes("--watch");
const projectRoot = dirname(fileURLToPath(import.meta.url));

const context = await esbuild.context({
  absWorkingDir: projectRoot,
  bundle: true,
  entryPoints: [join(projectRoot, "src", "extension.ts")],
  external: ["vscode"],
  format: "cjs",
  logLevel: "info",
  outfile: join(projectRoot, "dist", "extension.js"),
  platform: "node",
  sourcemap: true,
  target: "node20"
});

if (watch) {
  await context.watch();
  console.log("Watching CodingSensei extension sources...");
} else {
  await context.rebuild();
  await context.dispose();
}
