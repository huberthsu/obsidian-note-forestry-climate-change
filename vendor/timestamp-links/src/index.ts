import type { Element, ElementContent, Root as HastRoot } from "hast"
import type { QuartzTransformerPluginInstance } from "@quartz-community/types"

// Matches the Obsidian "Timestamp Notes" plugin's own regex for parsing a
// timestamp code block: MM:SS or HH:MM:SS.
const YOUTUBE_ID_REGEX = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/

function extractYouTubeId(url: string): string | undefined {
  const match = url.match(YOUTUBE_ID_REGEX)
  const id = match?.[1]
  return id && id.length === 11 ? id : undefined
}

function parseTimeToSeconds(text: string): number | undefined {
  const match = text.match(/(\d+):(\d+)(?::(\d+))?/)
  if (!match) return undefined
  if (match[3] !== undefined) {
    return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10)
  }
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

function isElement(node: ElementContent): node is Element {
  return node.type === "element"
}

function collectText(node: ElementContent): string {
  if (node.type === "text") return node.value
  if (isElement(node)) return node.children.map(collectText).join("")
  return ""
}

// rehype-pretty-code wraps each source line in <span data-line>...</span>;
// fall back to the whole block if that structure isn't present.
function getLines(codeEl: Element): string[] {
  const lineSpans = codeEl.children.filter(
    (c): c is Element => isElement(c) && c.tagName === "span" && "dataLine" in (c.properties ?? {}),
  )
  const source = lineSpans.length > 0 ? lineSpans : [codeEl]
  return source.map((line) => collectText(line))
}

function getDataLanguage(el: Element): string | undefined {
  const val = el.properties?.dataLanguage
  return typeof val === "string" ? val : undefined
}

// rehype-pretty-code emits <figure data-rehype-pretty-code-figure><pre><code data-language="...">
function findCodeBlock(node: Element): Element | undefined {
  const pre = node.tagName === "pre" ? node : node.children.find((c): c is Element => isElement(c) && c.tagName === "pre")
  if (!pre) return undefined
  return pre.children.find((c): c is Element => isElement(c) && c.tagName === "code")
}

interface WalkState {
  currentVideoId: string | undefined
}

function makeTimestampButton(seconds: number, videoId: string | undefined): Element {
  return {
    type: "element",
    tagName: "button",
    properties: {
      type: "button",
      className: ["timestamp-link"],
      dataSeconds: seconds,
      ...(videoId ? { dataVideoId: videoId } : {}),
    },
    children: [{ type: "text", value: `▶ ${formatSeconds(seconds)}` }],
  }
}

function walk(nodes: ElementContent[], state: WalkState): ElementContent[] {
  const out: ElementContent[] = []
  for (const node of nodes) {
    if (!isElement(node)) {
      out.push(node)
      continue
    }

    if (node.tagName === "figure" || node.tagName === "pre") {
      const code = findCodeBlock(node)
      const lang = code ? getDataLanguage(code) : undefined

      if (code && lang === "timestamp-url") {
        const url = getLines(code).join(" ").trim()
        state.currentVideoId = extractYouTubeId(url) ?? state.currentVideoId
        continue // drop this block — the video URL is redundant with the visible embed
      }

      if (code && lang === "timestamp") {
        const buttons = getLines(code)
          .map((line) => parseTimeToSeconds(line))
          .filter((s): s is number => s !== undefined)
          .map((seconds) => makeTimestampButton(seconds, state.currentVideoId))
        out.push(...buttons) // drops the block entirely if empty
        continue
      }
    }

    if (node.children) {
      node.children = walk(node.children as ElementContent[], state)
    }
    out.push(node)
  }
  return out
}

function fixYouTubeIframes(nodes: ElementContent[]): void {
  for (const node of nodes) {
    if (!isElement(node)) continue
    if (node.tagName === "iframe") {
      const classNames = Array.isArray(node.properties?.className)
        ? (node.properties!.className as unknown[])
        : []
      const src = node.properties?.src
      if (classNames.includes("youtube") && typeof src === "string") {
        if (!src.includes("enablejsapi=")) {
          node.properties!.src = src + (src.includes("?") ? "&" : "?") + "enablejsapi=1"
        }
        // Without "autoplay" in the permission policy, Chrome silently drops
        // postMessage playVideo commands even though seekTo still succeeds.
        const allow = typeof node.properties?.allow === "string" ? node.properties.allow : ""
        const allowed = allow.split(";").map((s) => s.trim()).filter(Boolean)
        if (!allowed.includes("autoplay")) allowed.push("autoplay")
        node.properties!.allow = allowed.join("; ")
      }
    }
    if (node.children) {
      fixYouTubeIframes(node.children as ElementContent[])
    }
  }
}

const clientCss = `
.timestamp-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  margin: 0.15em 0.3em 0.15em 0;
  padding: 0.15em 0.65em;
  border: none;
  border-radius: 999px;
  background: var(--highlight);
  color: var(--secondary);
  font: inherit;
  font-size: 0.85em;
  font-family: var(--codeFont, monospace);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.timestamp-link:hover,
.timestamp-link:focus-visible {
  background: var(--secondary);
  color: var(--light);
}
`

const clientScript = `
document.addEventListener("click", (ev) => {
  const button = ev.target.closest && ev.target.closest(".timestamp-link")
  if (!button) return

  const seconds = parseInt(button.getAttribute("data-seconds"), 10)
  if (isNaN(seconds)) return

  const scope = button.closest("article") || document
  const videoId = button.getAttribute("data-video-id")
  const iframe =
    (videoId && scope.querySelector('iframe.youtube[src*="' + videoId + '"]')) ||
    scope.querySelector("iframe.youtube")
  if (!iframe || !iframe.contentWindow) return

  const post = (func, args) => {
    iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: args || [] }), "*")
  }
  post("seekTo", [seconds, true])
  post("playVideo")
  iframe.scrollIntoView({ behavior: "smooth", block: "center" })
})
`

export default function TimestampLinks(): QuartzTransformerPluginInstance {
  return {
    name: "TimestampLinks",
    htmlPlugins() {
      return [
        () => (tree: HastRoot) => {
          tree.children = walk(tree.children as ElementContent[], { currentVideoId: undefined })
          fixYouTubeIframes(tree.children as ElementContent[])
        },
      ]
    },
    externalResources() {
      return {
        css: [{ content: clientCss, inline: true }],
        js: [
          {
            loadTime: "afterDOMReady",
            contentType: "inline",
            script: clientScript,
            spaPreserve: true,
          },
        ],
      }
    },
  }
}
