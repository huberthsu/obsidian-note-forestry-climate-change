let overlay: HTMLDivElement | null = null
let img: HTMLImageElement | null = null
let zoom = 1
let panX = 0
let panY = 0
let isPanning = false
let startX = 0
let startY = 0

const MIN_ZOOM = 0.5
const MAX_ZOOM = 8

function applyTransform() {
  if (!img) return
  img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`
}

// Keep the image from being panned past its own edges — once its scaled
// size no longer exceeds the viewport in a dimension, panning in that
// dimension clamps to 0 (centered), matching how Obsidian's own image
// viewer bounds panning. offsetWidth/offsetHeight are the object-fit:
// contain "fitted" box (unaffected by the transform's scale), so they're
// the right base size to scale by zoom here.
function clampPan(el: HTMLElement) {
  if (!img) return
  const rect = el.getBoundingClientRect()
  const scaledWidth = img.offsetWidth * zoom
  const scaledHeight = img.offsetHeight * zoom
  const maxPanX = Math.max(0, (scaledWidth - rect.width) / 2)
  const maxPanY = Math.max(0, (scaledHeight - rect.height) / 2)
  panX = Math.max(-maxPanX, Math.min(maxPanX, panX))
  panY = Math.max(-maxPanY, Math.min(maxPanY, panY))
}

function ensureOverlay(): HTMLDivElement {
  if (overlay) return overlay

  const el = document.createElement("div")
  el.className = "lightbox-overlay"

  const image = document.createElement("img")
  image.className = "lightbox-image"
  image.alt = ""
  image.draggable = false

  const closeBtn = document.createElement("button")
  closeBtn.className = "lightbox-close"
  closeBtn.type = "button"
  closeBtn.setAttribute("aria-label", "Close")
  closeBtn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'

  el.appendChild(image)
  el.appendChild(closeBtn)
  document.body.appendChild(el)

  overlay = el
  img = image

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    closeLightbox()
  })

  el.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left - rect.width / 2
      const mouseY = e.clientY - rect.top - rect.height / 2

      const prevZoom = zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta))

      panX = mouseX - (mouseX - panX) * (zoom / prevZoom)
      panY = mouseY - (mouseY - panY) * (zoom / prevZoom)
      clampPan(el)
      applyTransform()
    },
    { passive: false },
  )

  // setPointerCapture() is needed for a reliable drag: once the pan hits
  // clampPan()'s limit, the image stops moving but the cursor keeps going —
  // it very easily ends up outside the browser window while the button is
  // still down. Without capture, the eventual release happens outside the
  // page entirely and never reaches el (or even window), leaving isPanning
  // stuck true — the image then keeps following the next mousemove with no
  // button held. Capture keeps pointerup reliably targeted at el regardless
  // of where the cursor ends up.
  //
  // The one thing capture breaks: it retargets the click that follows
  // pointerup to the capturing element, which would swallow the close
  // button's own click if el captured on every pointerdown. Skipping
  // capture (and panning) when the press starts on a button sidesteps that
  // — the button's own pointerdown/click then fire normally, uncaptured.
  el.addEventListener("pointerdown", (e: PointerEvent) => {
    if (e.button !== 0) return
    if ((e.target as HTMLElement)?.closest("button")) return
    // Without this, the browser's own native "drag this image out" gesture
    // can kick in alongside our pointer tracking (image has no `draggable`
    // override, and hitting clampPan()'s limit mid-drag is exactly the kind
    // of fast/sustained pointer movement that triggers it). When that
    // happens the browser hands the gesture to its native drag machinery
    // and fires pointercancel instead of a normal pointerup, which used to
    // leave isPanning stuck true — the image then kept following the mouse
    // with no button held, until an unrelated click happened to fire a
    // pointerup and reset it.
    e.preventDefault()
    isPanning = true
    startX = e.clientX - panX
    startY = e.clientY - panY
    el.setPointerCapture(e.pointerId)
  })

  el.addEventListener("pointermove", (e: PointerEvent) => {
    if (!isPanning) return
    panX = e.clientX - startX
    panY = e.clientY - startY
    clampPan(el)
    applyTransform()
  })

  el.addEventListener("pointerup", () => {
    isPanning = false
  })

  // Belt-and-suspenders: if the gesture ever gets cancelled instead of
  // cleanly released (native drag takeover, OS-level interruption, etc.),
  // still clear isPanning so it can't get stuck "on".
  el.addEventListener("pointercancel", () => {
    isPanning = false
  })

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && overlay?.classList.contains("active")) {
      closeLightbox()
    }
  })

  return el
}

function openLightbox(src: string, alt: string) {
  const el = ensureOverlay()
  if (!img) return

  zoom = 1
  panX = 0
  panY = 0
  applyTransform()

  img.src = src
  img.alt = alt
  el.classList.add("active")
  document.documentElement.classList.add("lightbox-lock")
}

function closeLightbox() {
  if (!overlay) return
  overlay.classList.remove("active")
  document.documentElement.classList.remove("lightbox-lock")
}

function lightboxClickHandler(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  if (target.closest(".lightbox-overlay")) return

  const clicked = target.closest("img") as HTMLImageElement | null
  if (!clicked) return
  if (clicked.dataset.noLightbox === "true") return

  e.preventDefault()
  openLightbox(clicked.currentSrc || clicked.src, clicked.alt)
}

document.addEventListener("click", lightboxClickHandler)
