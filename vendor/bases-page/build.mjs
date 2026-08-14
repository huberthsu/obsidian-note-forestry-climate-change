// Minimal build script for the vendored bases-page plugin.
//
// This vendor copy ships `src/` + `dist/` but (unlike vendor/canvas-page) has
// no tsup.config.ts/tsconfig/node_modules of its own, so `npm run build`
// (tsup) can't run here. This script reproduces the same output using
// esbuild directly, resolved from the repo root's node_modules via Node's
// normal upward module resolution. It mirrors vendor/canvas-page/tsup.config.ts's
// inline-script-loader plugin so `*.inline.ts` and `.scss` imports keep working.
//
// Does NOT regenerate .d.ts files — Quartz imports dist/*.js directly at
// build time and never reads the type declarations, so the existing (now
// slightly stale) .d.ts files are harmless to leave in place.
import { build } from "esbuild"
import { readFile } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const inlineScriptPlugin = {
  name: "inline-script-loader",
  setup(parentBuild) {
    parentBuild.onLoad({ filter: /\.scss$/ }, async (args) => {
      const sass = await import("sass")
      const result = sass.compile(args.path)
      return { contents: result.css, loader: "text" }
    })

    parentBuild.onLoad({ filter: /\.inline\.ts$/ }, async (args) => {
      let text = await readFile(args.path, "utf8")
      text = text.replace(/^export default /gm, "")
      text = text.replace(/^export /gm, "")

      const resolveDir = path.dirname(args.path)
      const sourcefile = path.relative(__dirname, args.path)

      const result = await build({
        stdin: { contents: text, loader: "ts", resolveDir, sourcefile },
        write: false,
        bundle: true,
        minify: true,
        platform: "browser",
        format: "esm",
        target: "es2020",
        sourcemap: false,
        external: ["http://*", "https://*"],
      })

      const js = result.outputFiles?.[0]?.text
      if (!js) throw new Error(`inline-script-loader: no JS output for ${args.path}`)
      return { contents: js, loader: "text" }
    })
  },
}

await build({
  absWorkingDir: __dirname,
  entryPoints: {
    index: "src/index.ts",
    types: "src/types.ts",
    "components/index": "src/components/index.ts",
    registry: "src/registry.ts",
    "compiler/index": "src/compiler/index.ts",
  },
  bundle: true,
  // Splitting + bundled CJS interop (hast-util-from-html's dependency tree)
  // trips an esbuild edge case that emits a broken "Dynamic require of X is
  // not supported" stub for Node builtins like process/buffer. Disabling
  // splitting duplicates some shared code across the 5 output files, which
  // is a fine trade here: this bundle only runs in Node at build time and
  // is never shipped to a browser.
  splitting: false,
  format: "esm",
  target: "es2022",
  platform: "node",
  outdir: "dist",
  // The originally-vendored dist/ never shipped source maps, so don't start now.
  sourcemap: false,
  external: [
    "preact",
    "preact/*",
    "@jackyzha0/quartz",
    "@jackyzha0/quartz/*",
    "vfile",
    "vfile/*",
    "unified",
    // Bundling yaml pulls in its CJS require("process")/require("buffer")
    // shims, which esbuild can't safely convert for ESM output (its __require
    // fallback always throws in a real ESM module, since `require` is never a
    // free variable there). yaml is a real dependency resolvable from the
    // project root, so leave it external and let Node's own loader resolve it.
    "yaml",
  ],
  jsx: "automatic",
  jsxImportSource: "preact",
  logLevel: "info",
  plugins: [inlineScriptPlugin],
})

console.log("bases-page: build complete")
