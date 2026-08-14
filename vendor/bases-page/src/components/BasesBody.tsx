import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types";
import type { BasesData, BasesPageOptions } from "../types";
import { resolveBasesEntries } from "../resolver";
import type { EvalContext } from "../compiler";
import { i18n } from "../i18n";
import { registerCustomViews, viewRegistry } from "../registry";
import { ViewSelector } from "./ViewSelector";
import { registerBuiltinViews } from "./views";
import style from "./styles/bases.scss";
// @ts-expect-error inline script import handled by esbuild plugin
import script from "./scripts/bases.inline.ts";
import { wrapScripts } from "../util/lang";

let builtinViewsRegistered = false;

export default ((opts?: BasesPageOptions) => {
  const Component: QuartzComponent = (props: QuartzComponentProps) => {
    const locale = props.cfg?.locale ?? "en-US";
    const localeStrings = i18n(locale).components.bases;
    const fileData = props.fileData as {
      basesData?: BasesData;
      basesOptions?: BasesPageOptions;
      basesSelfContext?: EvalContext["self"];
    };
    const basesData = fileData.basesData;
    const basesOptions = fileData.basesOptions ?? opts;
    const basesSelfContext = fileData.basesSelfContext;
    const slug = (props.fileData.slug as string) ?? "";
    const rawSlugs = ((props.ctx as Record<string, unknown>)?.allSlugs as string[]) ?? [];
    const baseSlugs = new Set(rawSlugs.filter((s) => s.endsWith(".base")));
    const baseAliases = new Set([...baseSlugs].map((s) => s.replace(/\.base$/, "")));
    const allSlugs = rawSlugs.filter((s) => !baseSlugs.has(s) && !baseAliases.has(s));
    const linkResolution = basesOptions?.linkResolution ?? "shortest";

    if (!basesData) {
      return <div class="bases-page bases-empty">{localeStrings.noData}</div>;
    }

    const views = basesData.views ?? [];
    if (views.length === 0) {
      return <div class="bases-page bases-empty">{localeStrings.noViews}</div>;
    }

    const preferredType = basesOptions?.defaultViewType ?? "table";
    const initialIndex = Math.max(
      0,
      views.findIndex((view) => view.type === preferredType),
    );
    if (!builtinViewsRegistered) {
      registerBuiltinViews();
      builtinViewsRegistered = true;
    }

    if (basesOptions?.customViews) {
      registerCustomViews(basesOptions.customViews);
    }

    // Collect CSS + scripts from active view types (deduplicated by type)
    const activeTypes = new Set(views.map((v) => v.type));
    const viewCssChunks: string[] = [];
    const viewScriptChunks: string[] = [];
    for (const typeId of activeTypes) {
      const reg = viewRegistry.get(typeId);
      if (reg?.css) viewCssChunks.push(reg.css);
      if (reg?.afterDOMLoaded) viewScriptChunks.push(reg.afterDOMLoaded);
    }

    return (
      <div class="bases-page" data-initial-view={initialIndex}>
        {viewCssChunks.length > 0 && (
          <style dangerouslySetInnerHTML={{ __html: viewCssChunks.join("\n") }} />
        )}
        <ViewSelector views={views} activeIndex={initialIndex} locale={locale} />
        <div class="bases-view-container">
          {views.map((view, index) => {
            const { entries, total } = resolveBasesEntries(
              basesData,
              props.allFiles,
              view,
              basesSelfContext,
            );
            const registration = viewRegistry.get(view.type);
            const Renderer = registration?.render;
            return (
              <div
                class={`bases-view ${index === initialIndex ? "is-active" : ""}`}
                data-view-index={index}
                data-view-type={view.type}
              >
                {entries.length === 0 ? (
                  <div class="bases-empty">{localeStrings.noData}</div>
                ) : Renderer ? (
                  <Renderer
                    entries={entries}
                    view={view}
                    basesData={basesData}
                    total={total}
                    locale={locale}
                    slug={slug}
                    allSlugs={allSlugs}
                    linkResolution={linkResolution}
                    options={registration.options}
                  />
                ) : (
                  <div class="bases-empty">Unknown view type: {view.type}</div>
                )}
              </div>
            );
          })}
        </div>
        {/*
          Rendered inline (like the <style> block above) rather than via
          Component.afterDOMLoaded: BasesBody is a pageType's `body` component,
          not a layout component, so Quartz's componentResources emitter never
          discovers it and afterDOMLoaded would silently never run. Inlining
          means this re-runs on every full/direct page load, but — like an
          inline <script> generally — won't re-fire after a client-side SPA
          navigation into this page from another one.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: wrapScripts([script, ...viewScriptChunks]) }}
        />
      </div>
    );
  };

  Component.css = style;

  return Component;
}) satisfies QuartzComponentConstructor<BasesPageOptions>;
