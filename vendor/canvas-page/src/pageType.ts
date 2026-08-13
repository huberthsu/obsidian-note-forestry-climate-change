import type {
  QuartzPageTypePlugin,
  PageMatcher,
  FullSlug,
  VirtualPage,
} from "@quartz-community/types";
import { slugifyFilePath } from "@quartz-community/utils/path";
import { readFileSync } from "fs";
import { join } from "path";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import CanvasBody from "./components/CanvasBody";
import type { CanvasData, CanvasPageOptions, CanvasTextLink } from "./types";

function renderMarkdown(text: string): string {
  return micromark(text, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });
}

// Matches `[[target]]`, `[[target|alias]]`, `[[target#heading]]`, `[[target#^blockid]]`,
// and their `![[...]]` embed form. Mirrors the syntax Obsidian itself uses.
const WIKILINK_RE = /(!?)\[\[([^\]|#]+)?(#\^?[^\]|]+)?(?:\|([^\]]*))?\]\]/g;

/**
 * Replace every `[[wikilink]]`/`![[embed]]` in `text` with a unique placeholder
 * token (built from Unicode private-use-area characters, so it can't collide with
 * real content or be mangled by Markdown parsing) and return the parsed link info
 * alongside it. The actual link resolution/embedding happens later at render time
 * in CanvasBody.tsx, since only render time has access to the rest of the site's
 * pages (needed to resolve `[[Note Name]]`-style targets and to embed full page
 * content for `![[...]]`).
 */
function extractWikilinks(text: string): { text: string; links: CanvasTextLink[] } {
  const links: CanvasTextLink[] = [];
  let index = 0;

  const replaced = text.replace(WIKILINK_RE, (fullMatch, bang, rawTarget, rawAnchor, rawAlias) => {
    const target = (rawTarget ?? "").trim();
    if (!target) return fullMatch;

    const token = `LINK${index++}`;
    links.push({
      token,
      target,
      alias: rawAlias?.trim() || undefined,
      subpath: rawAnchor?.trim() || undefined,
      isEmbed: bang === "!",
    });
    return token;
  });

  return { text: replaced, links };
}

function preprocessCanvasData(
  data: CanvasData,
): CanvasData & {
  renderedTexts: Record<string, string>;
  textLinks: Record<string, CanvasTextLink[]>;
} {
  const renderedTexts: Record<string, string> = {};
  const textLinks: Record<string, CanvasTextLink[]> = {};

  for (const node of data.nodes ?? []) {
    if (node.type === "text" && node.text) {
      const { text: withPlaceholders, links } = extractWikilinks(node.text);

      if (links.length > 0) {
        textLinks[node.id] = links;
      }

      // A node that's *just* a single embed (the common "drop a note into a
      // canvas box" case) skips Markdown wrapping entirely, so the resolved
      // embed HTML isn't nested inside a <p> at render time.
      const firstLink = links[0];
      if (links.length === 1 && firstLink && withPlaceholders.trim() === firstLink.token) {
        renderedTexts[node.id] = firstLink.token;
      } else {
        renderedTexts[node.id] = renderMarkdown(withPlaceholders);
      }
    }
  }

  return { ...data, renderedTexts, textLinks };
}

const canvasMatcher: PageMatcher = ({ fileData }) => {
  return "canvasData" in fileData;
};

export const CanvasPage: QuartzPageTypePlugin<CanvasPageOptions> = (opts) => ({
  name: "CanvasPage",
  priority: 20,
  fileExtensions: [".canvas"],
  match: canvasMatcher,
  generate({ ctx }) {
    const canvasFiles = ctx.allFiles.filter((fp) => fp.endsWith(".canvas"));

    const virtualPages: VirtualPage[] = [];

    for (const filePath of canvasFiles) {
      const fullPath = join(ctx.argv.directory, filePath);
      let canvasData: CanvasData;

      try {
        const raw = readFileSync(fullPath, "utf-8");
        canvasData = JSON.parse(raw) as CanvasData;
      } catch {
        continue;
      }

      const baseName =
        filePath
          .replace(/\.canvas$/, "")
          .split("/")
          .pop() ?? "Canvas";
      const slug = slugifyFilePath(filePath) as FullSlug;
      const processedData = preprocessCanvasData(canvasData);

      virtualPages.push({
        slug,
        title: baseName,
        data: {
          frontmatter: { title: baseName, tags: [] },
          canvasData: processedData,
          canvasOptions: opts,
        },
      });
    }

    return virtualPages;
  },
  layout: "canvas",
  frame: "canvas",
  body: CanvasBody,
});
