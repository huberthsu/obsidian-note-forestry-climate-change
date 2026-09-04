import type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
  QuartzPluginData,
  FilePath,
  FullSlug,
} from "@quartz-community/types";
import {
  resolveRelative,
  slugifyFilePath,
  transformInternalLink,
  stripSlashes,
  normalizeHastElement,
} from "@quartz-community/utils/path";
import { toHtml } from "hast-util-to-html";
import type { Element as HastElement, Root as HastRoot } from "hast";
import type {
  CanvasData,
  CanvasNode,
  CanvasFileNode,
  CanvasEdge,
  CanvasPageOptions,
  CanvasTextLink,
} from "../types";
import { CANVAS_PRESET_COLORS } from "../types";
import style from "./styles/canvas.scss";
// @ts-expect-error inline script import handled by bundler
import script from "./scripts/canvas.inline.ts";

function resolveColor(color?: string): string | undefined {
  if (!color) return undefined;
  if (color.startsWith("#")) return color;
  return CANVAS_PRESET_COLORS[color] ?? undefined;
}

function getEdgeAnchor(node: CanvasNode, side: string | undefined): { x: number; y: number } {
  const border = node.type === "group" ? 2 : 2;
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;

  switch (side) {
    case "top":
      return { x: cx, y: node.y - border };
    case "bottom":
      return { x: cx, y: node.y + node.height + border };
    case "left":
      return { x: node.x - border, y: cy };
    case "right":
      return { x: node.x + node.width + border, y: cy };
    default:
      return { x: cx, y: cy };
  }
}

const headerRegex = /^h[1-6]$/;

function findPage(fileSlug: FullSlug, allFiles: QuartzPluginData[]): QuartzPluginData | undefined {
  let page = allFiles.find((f) => f.slug === fileSlug);
  if (!page) {
    // Virtual pages from pageType plugins have slugs without extensions
    const dotIdx = fileSlug.lastIndexOf(".");
    const slashIdx = fileSlug.lastIndexOf("/");
    if (dotIdx > slashIdx + 1) {
      const stripped = fileSlug.slice(0, dotIdx) as FullSlug;
      page = allFiles.find((f) => f.slug === stripped);
    }
  }
  return page;
}

/**
 * Extract a subset of a HAST tree based on a subpath reference.
 *
 * - `#^blockid`  → block transclude from page.blocks
 * - `#view-name` on a .base page → filter to the named bases view
 * - `#heading`   on other pages  → extract the heading section
 */
function applySubpath(
  htmlAst: HastRoot,
  page: QuartzPluginData,
  subpath: string,
  isBasePage: boolean,
): HastRoot | undefined {
  if (subpath.startsWith("#^")) {
    const blockId = subpath.slice(2);
    const blocks = (page as Record<string, unknown>).blocks as
      Record<string, HastElement> | undefined;
    const blockNode = blocks?.[blockId];
    if (!blockNode) return undefined;
    const wrapped =
      blockNode.tagName === "li"
        ? { type: "element" as const, tagName: "ul", properties: {}, children: [blockNode] }
        : blockNode;
    return { type: "root", children: [wrapped] };
  }

  const ref = subpath.startsWith("#") ? subpath.slice(1) : subpath;
  if (!ref) return htmlAst;

  if (isBasePage) {
    // For .base files, #view-name selects a specific view. The rendered
    // markup only ever exposes each view's TYPE on the view div itself
    // (`data-view-type`, e.g. "table"/"calendar") — the view's actual NAME
    // (what the user typed in Obsidian, and what a #subpath is) only shows
    // up as the label text of its tab button in `.bases-view-tabs`, sharing
    // a `data-view-index` with the corresponding view div. Resolve by name
    // via that tab first; fall back to matching by type for refs like
    // `#table`/`#calendar`, or bases files with a single (tab-less) view.
    const refLower = ref.toLowerCase();
    for (const child of htmlAst.children) {
      if (child.type !== "element") continue;
      const tabs = findViewTabs(child as HastElement);
      if (!tabs) continue;
      for (const tab of tabs.children) {
        if (tab.type !== "element") continue;
        const label = hastTextContent(tab as HastElement).trim().toLowerCase();
        if (label !== refLower) continue;
        const index = String((tab as HastElement).properties?.dataViewIndex ?? "");
        const found = findBasesViewByIndex(child as HastElement, index);
        if (found) return { type: "root", children: [markViewActive(found)] };
      }
    }
    for (const child of htmlAst.children) {
      if (child.type !== "element") continue;
      const found = findBasesView(child as HastElement, refLower);
      if (found) return { type: "root", children: [markViewActive(found)] };
    }
    return undefined;
  }

  // Header transclude: find the heading whose id matches, take content until
  // the next heading of equal or lesser depth.
  let startIdx: number | undefined;
  let startDepth: number | undefined;
  let endIdx: number | undefined;
  for (const [i, el] of htmlAst.children.entries()) {
    if (el.type !== "element" || !headerRegex.test((el as HastElement).tagName)) continue;
    const depth = Number((el as HastElement).tagName.substring(1));
    if (startIdx === undefined || startDepth === undefined) {
      if ((el as HastElement).properties?.id === ref) {
        startIdx = i;
        startDepth = depth;
      }
    } else if (depth <= startDepth) {
      endIdx = i;
      break;
    }
  }
  if (startIdx === undefined) return undefined;
  return { type: "root", children: htmlAst.children.slice(startIdx, endIdx) };
}

/**
 * A `.bases-view` div that isn't the base page's own initially-active view
 * carries `display: none` (bases.scss toggles visibility via `.is-active`,
 * normally flipped by the tab-click script). Extracting a single view for
 * an isolated embed leaves that class behind, so the view renders but stays
 * invisible. Returns a shallow-cloned copy with `is-active` added — cloned
 * rather than mutated in place, since the source element lives on the
 * shared `page.htmlAst` object other embeds of the same file also read.
 */
function markViewActive(el: HastElement): HastElement {
  const classes = new Set(((el.properties?.className ?? []) as string[]).map(String));
  classes.add("is-active");
  return {
    ...el,
    properties: { ...el.properties, className: Array.from(classes) },
  };
}

function findBasesView(el: HastElement, viewName: string): HastElement | undefined {
  const classes = ((el.properties?.className ?? []) as string[]).join(" ");
  if (classes.includes("bases-view") && !classes.includes("bases-view-container")) {
    const viewType = (el.properties?.dataViewType as string) ?? "";
    if (viewType.toLowerCase() === viewName) return el;
  }
  for (const child of el.children) {
    if (child.type !== "element") continue;
    const found = findBasesView(child as HastElement, viewName);
    if (found) return found;
  }
  return undefined;
}

function findBasesViewByIndex(el: HastElement, index: string): HastElement | undefined {
  const classes = ((el.properties?.className ?? []) as string[]).join(" ");
  if (classes.includes("bases-view") && !classes.includes("bases-view-container")) {
    if (String(el.properties?.dataViewIndex ?? "") === index) return el;
  }
  for (const child of el.children) {
    if (child.type !== "element") continue;
    const found = findBasesViewByIndex(child as HastElement, index);
    if (found) return found;
  }
  return undefined;
}

function findViewTabs(el: HastElement): HastElement | undefined {
  const classes = ((el.properties?.className ?? []) as string[]).join(" ");
  if (classes.includes("bases-view-tabs")) return el;
  for (const child of el.children) {
    if (child.type !== "element") continue;
    const found = findViewTabs(child as HastElement);
    if (found) return found;
  }
  return undefined;
}

function hastTextContent(el: HastElement): string {
  let text = "";
  for (const child of el.children) {
    if (child.type === "text") text += (child as { value: string }).value;
    else if (child.type === "element") text += hastTextContent(child as HastElement);
  }
  return text;
}

export function resolveEmbeddedHtml(
  fileSlug: FullSlug,
  canvasSlug: FullSlug,
  allFiles: QuartzPluginData[],
  subpath?: string,
  visited?: Set<string>,
): string | undefined {
  const resolvedSlug = fileSlug as string;
  if (visited?.has(resolvedSlug)) return undefined;

  const page = findPage(fileSlug, allFiles);
  if (!page) return undefined;

  const htmlAst = (page as Record<string, unknown>).htmlAst as HastRoot | undefined;
  if (!htmlAst) return undefined;

  const sourceSlug = page.slug as FullSlug | undefined;
  if (!sourceSlug) return undefined;

  let tree = htmlAst;
  if (subpath) {
    const isBasePage = "basesData" in (page as Record<string, unknown>);
    const sub = applySubpath(htmlAst, page, subpath, isBasePage);
    if (!sub) return undefined;
    tree = sub;
  }

  const rebased: HastRoot = {
    ...tree,
    children: tree.children.map((child) =>
      child.type === "element"
        ? (normalizeHastElement(child as HastElement, canvasSlug, sourceSlug) as typeof child)
        : child,
    ),
  };

  return toHtml(rebased as Parameters<typeof toHtml>[0], { allowDangerousHtml: true });
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)$/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Resolve a raw `[[wikilink]]` target (a note name or path, as typed by hand)
 * to an actual page slug, using the same "shortest path" matching the rest of
 * the site uses (`markdownLinkResolution: shortest` in quartz.config.yaml):
 * if the target is just a filename, match it uniquely by basename across
 * every page; if that's ambiguous or the target includes folders, fall back
 * to exact/suffix slug matching.
 */
function resolveWikilinkTarget(rawTarget: string, allSlugs: FullSlug[]): FullSlug | undefined {
  // Mirrors how @quartz-community/crawl-links resolves a wikilink target under
  // the site's `markdownLinkResolution: shortest` strategy: derive a canonical
  // relative path via transformInternalLink, then match by basename (or by
  // full/suffix path when the target includes folders).
  const targetRelative = transformInternalLink(rawTarget) as string;
  const canonical = stripSlashes(targetRelative.slice(1));

  if (canonical.includes("/")) {
    return allSlugs.find((s) => s === canonical || s.endsWith("/" + canonical));
  }

  const matches = allSlugs.filter((s) => s.split("/").pop() === canonical);
  if (matches.length === 1) return matches[0];
  return allSlugs.find((s) => s === canonical);
}

/** Render a single parsed wikilink/embed into its final HTML fragment. */
function renderTextLink(
  link: CanvasTextLink,
  slug: FullSlug,
  allFiles: QuartzPluginData[],
  allSlugs: FullSlug[],
  visited: Set<string>,
): string {
  const targetSlug = resolveWikilinkTarget(link.target, allSlugs);
  const alias = link.alias ?? link.target;

  if (!targetSlug) {
    return `<a class="internal internal-link broken">${escapeHtml(alias)}</a>`;
  }

  const href = resolveRelative(slug, targetSlug);

  if (!link.isEmbed) {
    return `<a href="${href}" class="internal internal-link" data-slug="${targetSlug}">${escapeHtml(alias)}</a>`;
  }

  if (IMAGE_EXT_RE.test(targetSlug)) {
    return `<img src="${href}" alt="${escapeHtml(alias)}" loading="lazy" />`;
  }

  const embedded = resolveEmbeddedHtml(targetSlug, slug, allFiles, link.subpath, visited);
  if (embedded) {
    return (
      `<div class="canvas-text-embed">` +
      `<div class="canvas-text-embed-toolbar">` +
      `<a href="${href}" class="canvas-text-embed-open" data-slug="${targetSlug}" aria-label="${escapeHtml(alias)}" title="${escapeHtml(alias)}">` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>` +
      `</a>` +
      `</div>` +
      `<div class="canvas-embed-content">${embedded}</div>` +
      `</div>`
    );
  }

  // Target has no renderable HTML (e.g. non-markdown file) — fall back to a link.
  return `<a href="${href}" class="internal internal-link" data-slug="${targetSlug}">${escapeHtml(alias)}</a>`;
}

function renderNode(
  node: CanvasNode,
  renderedTexts: Record<string, string>,
  textLinks: Record<string, CanvasTextLink[]>,
  slug: FullSlug,
  allFiles: QuartzPluginData[],
  allSlugs: FullSlug[],
  visited: Set<string>,
): unknown {
  const color = resolveColor(node.color);
  const baseStyle: Record<string, string> = {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    height: `${node.height}px`,
  };
  if (color) {
    baseStyle["--canvas-node-color"] = color;
    // Obsidian shows a per-node color as a pastel wash over the card, not just
    // an outline — mix a little of the raw color into the card/group base so
    // each colored block is visibly distinct from its neighbors, not just
    // from the empty canvas behind them.
    baseStyle["--canvas-node-color-bg"] = `color-mix(in srgb, ${color} 20%, var(--light))`;
    baseStyle["--canvas-node-color-bg-subtle"] =
      `color-mix(in srgb, ${color} 10%, var(--light))`;
  }

  const styleStr = Object.entries(baseStyle)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

  switch (node.type) {
    case "text": {
      let html = renderedTexts[node.id];
      const links = textLinks[node.id];
      if (html && links) {
        for (const link of links) {
          const fragment = renderTextLink(link, slug, allFiles, allSlugs, visited);
          html = html.split(link.token).join(fragment);
        }
      }
      return (
        <div class="canvas-node canvas-node-text" data-node-id={node.id} style={styleStr}>
          {html ? (
            <div class="canvas-node-content" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div class="canvas-node-content">{node.text}</div>
          )}
        </div>
      );
    }

    case "file": {
      const filename = node.file.split("/").pop()?.replace(/\.md$/, "") ?? node.file;
      const fileSlug = slugifyFilePath(node.file as FilePath) as FullSlug;
      const isImage = /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)$/i.test(node.file);

      if (isImage) {
        return (
          <div
            class="canvas-node canvas-node-file canvas-node-image"
            data-node-id={node.id}
            style={styleStr}
          >
            <img src={resolveRelative(slug, fileSlug)} alt={filename} loading="lazy" />
          </div>
        );
      }

      const embedded = resolveEmbeddedHtml(fileSlug, slug, allFiles, node.subpath, visited);

      return (
        <div class="canvas-node canvas-node-file" data-node-id={node.id} style={styleStr}>
          <div class="canvas-file-label">
            <a
              href={resolveRelative(slug, fileSlug)}
              class="canvas-file-link internal internal-link"
              data-slug={fileSlug}
            >
              {filename}
            </a>
            {node.subpath && <span class="canvas-file-subpath">{node.subpath}</span>}
          </div>
          <div class="canvas-node-content">
            {embedded ? (
              <div class="canvas-embed-content" dangerouslySetInnerHTML={{ __html: embedded }} />
            ) : (
              <a
                href={resolveRelative(slug, fileSlug)}
                class="canvas-file-link internal internal-link"
                data-slug={fileSlug}
              >
                {filename}
              </a>
            )}
          </div>
        </div>
      );
    }

    case "link": {
      let hostname: string;
      try {
        hostname = new URL(node.url).hostname;
      } catch {
        hostname = node.url;
      }
      return (
        <div class="canvas-node canvas-node-link" data-node-id={node.id} style={styleStr}>
          <div class="canvas-link-label">
            <a
              href={node.url}
              class="canvas-link external external-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {hostname}
            </a>
          </div>
          <div class="canvas-node-content canvas-iframe-wrapper">
            <iframe
              src={node.url}
              title={hostname}
              sandbox="allow-scripts allow-same-origin allow-popups"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
            <div class="canvas-iframe-fallback">
              <a href={node.url} target="_blank" rel="noopener noreferrer">
                Open {hostname} in new tab
              </a>
            </div>
          </div>
        </div>
      );
    }

    case "group":
      return (
        <div class="canvas-node canvas-node-group" data-node-id={node.id} style={styleStr}>
          {node.label && <div class="canvas-group-label">{node.label}</div>}
        </div>
      );

    default:
      return null;
  }
}

/**
 * `acportal||<portalNodeId>||<innerNodeId>` → `<portalNodeId>`.
 * Obsidian uses this composite id for an edge endpoint that's a node
 * *inside* a portal's embedded canvas, which this renderer has no
 * independent coordinate space to anchor to (the portal's inner nodes only
 * exist inside its own nested, separately-scaled canvas). Anchoring to the
 * portal card itself loses that inner-node precision but is otherwise a
 * normal edge — better than the edge silently not rendering at all.
 */
function resolvePortalNodeRef(ref: string): string {
  if (!ref.startsWith("acportal||")) return ref;
  const parts = ref.split("||");
  return parts[1] ?? ref;
}

/** Gather every node's `interdimensionalEdges`, remapped to plain node ids. */
function collectInterdimensionalEdges(nodes: CanvasNode[]): CanvasEdge[] {
  const result: CanvasEdge[] = [];
  for (const node of nodes) {
    const portalEdges = (node as CanvasFileNode).interdimensionalEdges;
    if (!portalEdges) continue;
    for (const edge of portalEdges) {
      result.push({
        ...edge,
        fromNode: resolvePortalNodeRef(edge.fromNode),
        toNode: resolvePortalNodeRef(edge.toNode),
      });
    }
  }
  return result;
}

function renderEdge(edge: CanvasEdge, nodeMap: Map<string, CanvasNode>): unknown {
  const fromNode = nodeMap.get(edge.fromNode);
  const toNode = nodeMap.get(edge.toNode);
  if (!fromNode || !toNode) return null;

  const from = getEdgeAnchor(fromNode, edge.fromSide);
  const to = getEdgeAnchor(toNode, edge.toSide);

  const color = resolveColor(edge.color);
  const hasFromArrow = edge.fromEnd === "arrow";
  const hasToArrow = (edge.toEnd ?? "arrow") === "arrow";

  const markerId = `arrow-${edge.id}`;
  const markerStartId = `arrow-start-${edge.id}`;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const midX = from.x + dx / 2;
  const midY = from.y + dy / 2;
  const pathD = `M ${from.x} ${from.y} Q ${midX} ${from.y}, ${midX} ${midY} T ${to.x} ${to.y}`;

  return (
    <g class="canvas-edge" data-edge-id={edge.id}>
      <defs>
        {hasToArrow && (
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color ?? "var(--darkgray)"} />
          </marker>
        )}
        {hasFromArrow && (
          <marker
            id={markerStartId}
            viewBox="0 0 10 10"
            refX="1"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 10 0 L 0 5 L 10 10 z" fill={color ?? "var(--darkgray)"} />
          </marker>
        )}
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke={color ?? "var(--darkgray)"}
        stroke-width="2"
        marker-end={hasToArrow ? `url(#${markerId})` : undefined}
        marker-start={hasFromArrow ? `url(#${markerStartId})` : undefined}
      />
      {edge.label && (
        <g class="canvas-edge-label-group">
          <rect
            x={midX - edge.label.length * 3.5 - 4}
            y={midY - 20}
            width={edge.label.length * 7 + 8}
            height={16}
            rx="3"
            class="canvas-edge-label-bg"
          />
          <text x={midX} y={midY} class="canvas-edge-label" text-anchor="middle" dy="-8">
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
}

export default ((userOpts?: CanvasPageOptions) => {
  const Component: QuartzComponent = (props: QuartzComponentProps) => {
    const fileData = props.fileData as Record<string, unknown>;
    const slug = (props.fileData.slug ?? "") as FullSlug;
    const canvasData = fileData.canvasData as
      | (CanvasData & {
          renderedTexts?: Record<string, string>;
          textLinks?: Record<string, CanvasTextLink[]>;
        })
      | undefined;

    if (!canvasData) {
      return (
        <article class="canvas-page popover-hint">
          <p>No canvas data found.</p>
        </article>
      );
    }

    const nodes = canvasData.nodes ?? [];
    const edges = [...(canvasData.edges ?? []), ...collectInterdimensionalEdges(nodes)];
    const renderedTexts = canvasData.renderedTexts ?? {};
    const textLinks = canvasData.textLinks ?? {};
    const allFiles = props.allFiles;
    const allSlugs = allFiles.map((f) => f.slug as FullSlug);
    const visited = new Set<string>([slug]);

    const nodeMap = new Map<string, CanvasNode>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    if (nodes.length === 0) {
      minX = minY = 0;
      maxX = maxY = 100;
    }

    const padding = 50;
    const viewWidth = maxX - minX + padding * 2;
    const viewHeight = maxY - minY + padding * 2;

    const opts = userOpts ?? {};
    const enableInteraction = opts.enableInteraction ?? true;
    const initialZoom = opts.initialZoom ?? 1;
    const minZoom = opts.minZoom ?? 0.1;
    const maxZoom = opts.maxZoom ?? 5;
    return (
      <article class="canvas-page popover-hint">
        <div
          class="canvas-container"
          data-enable-interaction={enableInteraction.toString()}
          data-initial-zoom={initialZoom.toString()}
          data-min-zoom={minZoom.toString()}
          data-max-zoom={maxZoom.toString()}
        >
          <div class="canvas-controls">
            <div class="canvas-zoom-group">
              <button class="canvas-zoom-in" type="button" aria-label="Zoom in">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>
              <button class="canvas-zoom-out" type="button" aria-label="Zoom out">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </button>
            </div>
            <button
              class="canvas-reset-view"
              type="button"
              aria-label="Reset view"
              style="display:none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            <button class="canvas-fullscreen-toggle" type="button" aria-label="Toggle fullscreen">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="canvas-fullscreen-enter"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="canvas-fullscreen-exit"
                style="display:none"
              >
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            </button>
          </div>
          <div class="canvas-viewport" style={`width:${viewWidth}px;height:${viewHeight}px`}>
            <div
              class="canvas-nodes"
              style={`transform:translate(${-minX + padding}px,${-minY + padding}px)`}
            >
              {nodes.map((node) =>
                renderNode(node, renderedTexts, textLinks, slug, allFiles, allSlugs, visited),
              )}
            </div>
            <svg
              class="canvas-edges"
              width={viewWidth}
              height={viewHeight}
              viewBox={`${minX - padding} ${minY - padding} ${viewWidth} ${viewHeight}`}
            >
              {edges.map((edge) => renderEdge(edge, nodeMap))}
            </svg>
          </div>
        </div>
      </article>
    );
  };

  Component.css = style;
  Component.afterDOMLoaded = script;

  return Component;
}) satisfies QuartzComponentConstructor;
