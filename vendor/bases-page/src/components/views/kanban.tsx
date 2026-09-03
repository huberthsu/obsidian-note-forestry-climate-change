import type { ViewRenderer, ViewTypeRegistration, BasesEntry } from "../../types";
import type { FullSlug } from "@quartz-community/types";
import { i18n } from "../../i18n";
import {
  formatValue,
  getColumnLabel,
  getColumns,
  isEmptyValue,
  renderCellValue,
  resolveEntryPropertyValue,
} from "../shared/cell";
import { transformLink } from "@quartz-community/utils";

function formatMessage(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

/**
 * Obsidian's kanban-view groups by a plain date scalar (`note.date`) as often
 * as by a text/select property (`note.status`). YAML parses date-only
 * scalars to a UTC-midnight Date, but `columnOrders`/`cardOrders` persist the
 * plain "YYYY-MM-DD" string Obsidian showed as the column label — so Date
 * values need the same UTC-safe formatting as calendar.tsx to match those
 * saved keys instead of falling through to formatValue's JSON.stringify.
 */
function formatGroupLabel(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return formatValue(value);
}

const KanbanView: ViewRenderer = ({
  entries,
  view,
  basesData,
  total,
  locale,
  slug,
  allSlugs,
  linkResolution,
}) => {
  const localeStrings = i18n(locale).components.bases;
  const groupProperty =
    (typeof view.groupByProperty === "string" && view.groupByProperty) ||
    view.groupBy?.property ||
    (typeof view.boardProperty === "string" && view.boardProperty) ||
    undefined;
  const columns = getColumns(view, basesData, entries).filter((column) => column !== groupProperty);
  const emptyLabel = groupProperty ? localeStrings.uncategorized : localeStrings.allEntries;
  const transformOpts = { strategy: linkResolution, allSlugs: allSlugs as FullSlug[] };

  const groups = new Map<string, { label: string; entries: BasesEntry[] }>();
  for (const entry of entries) {
    const rawValue = groupProperty ? resolveEntryPropertyValue(groupProperty, entry) : undefined;
    const label = isEmptyValue(rawValue) ? emptyLabel : formatGroupLabel(rawValue);
    const key = label || emptyLabel;
    const existing = groups.get(key);
    if (existing) existing.entries.push(entry);
    else groups.set(key, { label: key, entries: [entry] });
  }

  if (groups.size === 0) {
    groups.set(localeStrings.allEntries, { label: localeStrings.allEntries, entries });
  }

  // Obsidian persists the manually-arranged column order per group property
  // at `columnOrders[<groupProperty>]` (an array of raw column values,
  // including the literal "Uncategorized" placeholder for empty groups).
  // Apply it when present so the published board matches what was arranged
  // in Obsidian instead of falling back to first-seen order.
  const columnOrders = view.columnOrders as Record<string, unknown> | undefined;
  const rawColumnOrder = groupProperty ? columnOrders?.[groupProperty] : undefined;
  const orderedKeys = Array.isArray(rawColumnOrder)
    ? rawColumnOrder.filter((v): v is string => typeof v === "string")
    : [];

  const orderedGroups: { label: string; entries: BasesEntry[] }[] = [];
  const seenGroups = new Set<string>();
  for (const key of orderedKeys) {
    const group = groups.get(key);
    if (group && !seenGroups.has(key)) {
      orderedGroups.push(group);
      seenGroups.add(key);
    }
  }
  for (const [key, group] of groups) {
    if (!seenGroups.has(key)) {
      orderedGroups.push(group);
      seenGroups.add(key);
    }
  }

  // Likewise `cardOrders[<groupProperty>][<columnLabel>]` is a manually
  // arranged list of file paths within one column. Apply it, appending any
  // entries it doesn't mention (cards Obsidian hasn't recorded an order for
  // yet) after the ordered ones, in their original order.
  const cardOrdersForProperty = groupProperty
    ? (view.cardOrders as Record<string, Record<string, unknown>> | undefined)?.[groupProperty]
    : undefined;

  for (const group of orderedGroups) {
    const rawCardOrder = cardOrdersForProperty?.[group.label];
    const cardOrder = Array.isArray(rawCardOrder)
      ? rawCardOrder.filter((v): v is string => typeof v === "string")
      : undefined;
    if (!cardOrder || cardOrder.length === 0) continue;
    const byPath = new Map(group.entries.map((entry) => [entry.fileProperties.path, entry]));
    const sorted: BasesEntry[] = [];
    const used = new Set<string>();
    for (const path of cardOrder) {
      const entry = byPath.get(path);
      if (entry && !used.has(path)) {
        sorted.push(entry);
        used.add(path);
      }
    }
    for (const entry of group.entries) {
      if (!used.has(entry.fileProperties.path)) sorted.push(entry);
    }
    group.entries = sorted;
  }

  return (
    <div class="bases-kanban-wrapper">
      <div class="bases-view-meta">
        {formatMessage(localeStrings.showingCount, { count: entries.length, total })}
      </div>
      <div class="bases-board">
        {orderedGroups.map((group) => (
          <div class="bases-board-column">
            <div class="bases-board-column-header">
              <span>{group.label}</span>
              <span class="bases-board-count">{group.entries.length}</span>
            </div>
            <div class="bases-board-column-body">
              {group.entries.map((entry) => {
                const ctx = { slug, allSlugs, linkResolution };
                return (
                  <div class="bases-board-card">
                    <a
                      href={transformLink(slug as FullSlug, entry.slug, transformOpts)}
                      class="internal internal-link"
                      data-slug={entry.slug}
                    >
                      {entry.title}
                    </a>
                    {columns.length > 0 && (
                      <div class="bases-board-card-meta">
                        {columns.map((column) => {
                          const value = resolveEntryPropertyValue(column, entry);
                          if (isEmptyValue(value)) return null;
                          return (
                            <div class="bases-board-card-row">
                              <span class="bases-board-card-label">
                                {getColumnLabel(column, basesData)}
                              </span>
                              <span class="bases-board-card-value">
                                {renderCellValue(value, ctx, column)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const kanbanViewRegistration: ViewTypeRegistration = {
  id: "kanban-view",
  name: "Kanban",
  icon: "square-kanban",
  render: KanbanView,
};

export { KanbanView };
