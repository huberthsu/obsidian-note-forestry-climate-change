export { classNames } from "@quartz-community/utils/lang";

/**
 * Wrap each script in its own IIFE (matching Quartz's own componentResources
 * joinScripts behavior) so top-level declarations from different view scripts
 * can't collide when concatenated into one <script> tag, then escape any
 * literal "</script" so it can't prematurely close the tag it's embedded in.
 */
export function wrapScripts(scripts: string[]): string {
  return scripts
    .map((s) => `(function () {${s}})();`)
    .join("\n")
    .replace(/<\/script/gi, "<\\/script");
}
