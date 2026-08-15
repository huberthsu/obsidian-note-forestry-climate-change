// src/index.ts
var YOUTUBE_ID_REGEX = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
function extractYouTubeId(url) {
  const match = url.match(YOUTUBE_ID_REGEX);
  const id = match?.[1];
  return id && id.length === 11 ? id : void 0;
}
function parseTimeToSeconds(text) {
  const match = text.match(/(\d+):(\d+)(?::(\d+))?/);
  if (!match) return void 0;
  if (match[3] !== void 0) {
    return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
  }
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}
function formatSeconds(total) {
  const h = Math.floor(total / 3600);
  const m = Math.floor(total % 3600 / 60);
  const s = total % 60;
  const pad = (n) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function isElement(node) {
  return node.type === "element";
}
function collectText(node) {
  if (node.type === "text") return node.value;
  if (isElement(node)) return node.children.map(collectText).join("");
  return "";
}
function getLines(codeEl) {
  const lineSpans = codeEl.children.filter(
    (c) => isElement(c) && c.tagName === "span" && "dataLine" in (c.properties ?? {})
  );
  const source = lineSpans.length > 0 ? lineSpans : [codeEl];
  return source.map((line) => collectText(line));
}
function getDataLanguage(el) {
  const val = el.properties?.dataLanguage;
  return typeof val === "string" ? val : void 0;
}
function findCodeBlock(node) {
  const pre = node.tagName === "pre" ? node : node.children.find((c) => isElement(c) && c.tagName === "pre");
  if (!pre) return void 0;
  return pre.children.find((c) => isElement(c) && c.tagName === "code");
}
function makeTimestampButton(seconds, videoId) {
  return {
    type: "element",
    tagName: "button",
    properties: {
      type: "button",
      className: ["timestamp-link"],
      dataSeconds: seconds,
      ...videoId ? { dataVideoId: videoId } : {}
    },
    children: [{ type: "text", value: `\u25B6 ${formatSeconds(seconds)}` }]
  };
}
function walk(nodes, state) {
  const out = [];
  for (const node of nodes) {
    if (!isElement(node)) {
      out.push(node);
      continue;
    }
    if (node.tagName === "figure" || node.tagName === "pre") {
      const code = findCodeBlock(node);
      const lang = code ? getDataLanguage(code) : void 0;
      if (code && lang === "timestamp-url") {
        const url = getLines(code).join(" ").trim();
        state.currentVideoId = extractYouTubeId(url) ?? state.currentVideoId;
        continue;
      }
      if (code && lang === "timestamp") {
        const buttons = getLines(code).map((line) => parseTimeToSeconds(line)).filter((s) => s !== void 0).map((seconds) => makeTimestampButton(seconds, state.currentVideoId));
        out.push(...buttons);
        continue;
      }
    }
    if (node.children) {
      node.children = walk(node.children, state);
    }
    out.push(node);
  }
  return out;
}
function fixYouTubeIframes(nodes) {
  for (const node of nodes) {
    if (!isElement(node)) continue;
    if (node.tagName === "iframe") {
      const classNames = Array.isArray(node.properties?.className) ? node.properties.className : [];
      const src = node.properties?.src;
      if (classNames.includes("youtube") && typeof src === "string") {
        if (!src.includes("enablejsapi=")) {
          node.properties.src = src + (src.includes("?") ? "&" : "?") + "enablejsapi=1";
        }
        const allow = typeof node.properties?.allow === "string" ? node.properties.allow : "";
        const allowed = allow.split(";").map((s) => s.trim()).filter(Boolean);
        if (!allowed.includes("autoplay")) allowed.push("autoplay");
        node.properties.allow = allowed.join("; ");
      }
    }
    if (node.children) {
      fixYouTubeIframes(node.children);
    }
  }
}
var clientCss = `
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
`;
var clientScript = `
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
`;
function TimestampLinks() {
  return {
    name: "TimestampLinks",
    htmlPlugins() {
      return [
        () => (tree) => {
          tree.children = walk(tree.children, { currentVideoId: void 0 });
          fixYouTubeIframes(tree.children);
        }
      ];
    },
    externalResources() {
      return {
        css: [{ content: clientCss, inline: true }],
        js: [
          {
            loadTime: "afterDOMReady",
            contentType: "inline",
            script: clientScript,
            spaPreserve: true
          }
        ]
      };
    }
  };
}
export {
  TimestampLinks as default
};
