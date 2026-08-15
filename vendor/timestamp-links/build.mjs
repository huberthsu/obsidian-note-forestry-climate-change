// Minimal build script for the vendored timestamp-links plugin.
//
// Mirrors vendor/bases-page/build.mjs: no tsup/local node_modules, just a
// direct esbuild bundle resolved from the repo root's node_modules. The
// plugin has no runtime dependencies (only `import type` from hast /
// @quartz-community/types, which esbuild erases), so this is a plain
// single-entry bundle with no externals to configure.
import { build } from "esbuild"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await build({
  absWorkingDir: __dirname,
  entryPoints: { index: "src/index.ts" },
  bundle: true,
  format: "esm",
  target: "es2022",
  platform: "node",
  outdir: "dist",
  sourcemap: false,
  logLevel: "info",
})

console.log("timestamp-links: build complete")
