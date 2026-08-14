import type { ViewRenderer, ViewTypeRegistration, BasesEntry } from "../../types";
import type { FullSlug } from "@quartz-community/types";
import { i18n } from "../../i18n";
import { getColumnLabel, isEmptyValue, resolveEntryPropertyValue } from "../shared/cell";
import { transformLink } from "@quartz-community/utils";
import calendarScript from "../scripts/calendar.inline.ts";

function formatMessage(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Obsidian calendar bases can, in principle, span an entry across a wide date
// range via startDate/endDate. Cap how many days we'll walk so a malformed
// endDate can't turn into an unbounded loop at build time.
const MAX_SPAN_DAYS = 60;

interface DateParts {
  year: number;
  month: number; // 0-11
  day: number;
}

interface DayEntryInfo {
  title: string;
  href: string;
  slug: string;
  tooltip: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * YAML date-only scalars (e.g. `date: 2026-08-10`) parse to a Date at UTC
 * midnight. Reading them back with local getters can roll the day backwards
 * when the build runs in a timezone behind UTC, so UTC getters are used for
 * Date/number inputs. Plain "YYYY-MM-DD" strings are parsed manually for the
 * same reason — `new Date("2026-08-10")` is also UTC-midnight under the hood.
 */
function parseDateParts(value: unknown): DateParts | undefined {
  if (value === null || value === undefined || value === "") return undefined;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return { year: value.getUTCFullYear(), month: value.getUTCMonth(), day: value.getUTCDate() };
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return { year: parsed.getUTCFullYear(), month: parsed.getUTCMonth(), day: parsed.getUTCDate() };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (dateOnly) {
      const [, y, m, d] = dateOnly;
      return { year: Number(y), month: Number(m) - 1, day: Number(d) };
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return { year: parsed.getFullYear(), month: parsed.getMonth(), day: parsed.getDate() };
  }

  return undefined;
}

function dayKey(parts: DateParts): string {
  return `${parts.year}-${pad2(parts.month + 1)}-${pad2(parts.day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** Render one month's day grid — used for the server-rendered initial month only. */
function renderGrid(year: number, month0: number, dayInfoMap: Map<string, DayEntryInfo[]>, today: DateParts) {
  const leading = firstWeekday(year, month0);
  const totalDays = daysInMonth(year, month0);
  const cellCount = Math.ceil((leading + totalDays) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, i) => i - leading + 1);

  return cells.map((dayNum) => {
    if (dayNum < 1 || dayNum > totalDays) {
      return <div class="bases-calendar-day is-outside" />;
    }
    const dayEntries = dayInfoMap.get(dayKey({ year, month: month0, day: dayNum })) ?? [];
    const isToday = year === today.year && month0 === today.month && dayNum === today.day;
    return (
      <div class={`bases-calendar-day${isToday ? " is-today" : ""}`}>
        <span class="bases-calendar-daynum">{dayNum}</span>
        {dayEntries.length > 0 && (
          <div class="bases-calendar-entries">
            {dayEntries.map((e) => (
              <a href={e.href} class="internal internal-link bases-calendar-chip" data-slug={e.slug} title={e.tooltip}>
                {e.title}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  });
}

const CalendarView: ViewRenderer = ({
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
  const startProp =
    (typeof view.startDate === "string" && view.startDate) ||
    (typeof view.date === "string" && view.date) ||
    (typeof view.dateField === "string" && view.dateField) ||
    (typeof view.dateProperty === "string" && view.dateProperty) ||
    undefined;
  const endProp = typeof view.endDate === "string" ? view.endDate : undefined;

  const orderColumns = (view.order && view.order.length > 0 ? view.order : []).filter(
    (column) => column !== startProp && column !== endProp && column !== "file.name",
  );
  const transformOpts = { strategy: linkResolution, allSlugs: allSlugs as FullSlug[] };

  const byDay = new Map<string, BasesEntry[]>();
  const unscheduled: BasesEntry[] = [];

  const addToDay = (parts: DateParts, entry: BasesEntry) => {
    const key = dayKey(parts);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(entry);
    else byDay.set(key, [entry]);
  };

  for (const entry of entries) {
    const startValue = startProp ? resolveEntryPropertyValue(startProp, entry) : undefined;
    const startParts = parseDateParts(startValue);
    if (!startParts) {
      unscheduled.push(entry);
      continue;
    }

    const endValue = endProp ? resolveEntryPropertyValue(endProp, entry) : undefined;
    const endParts = parseDateParts(endValue);

    if (!endParts) {
      addToDay(startParts, entry);
      continue;
    }

    let cursor = new Date(startParts.year, startParts.month, startParts.day);
    const end = new Date(endParts.year, endParts.month, endParts.day);
    let guard = 0;
    while (cursor.getTime() <= end.getTime() && guard < MAX_SPAN_DAYS) {
      addToDay({ year: cursor.getFullYear(), month: cursor.getMonth(), day: cursor.getDate() }, entry);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      guard += 1;
    }
  }

  // Simplified per-day entry info (title/href/tooltip), shared by the
  // server-rendered initial month and the full JSON payload the client script
  // uses to render every other month on demand.
  const dayInfoMap = new Map<string, DayEntryInfo[]>();
  for (const [key, dayEntries] of byDay) {
    dayInfoMap.set(
      key,
      dayEntries.map((entry) => {
        const tooltipParts = orderColumns
          .map((column) => {
            const value = resolveEntryPropertyValue(column, entry);
            if (isEmptyValue(value)) return undefined;
            return `${getColumnLabel(column, basesData)}: ${
              Array.isArray(value) ? value.join(", ") : String(value)
            }`;
          })
          .filter((part): part is string => Boolean(part));
        return {
          title: entry.title,
          href: String(transformLink(slug as FullSlug, entry.slug, transformOpts)),
          slug: entry.slug,
          tooltip: [entry.title, ...tooltipParts].join(" · "),
        };
      }),
    );
  }

  const now = new Date();
  const today: DateParts = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };

  // Escape "</script" so the JSON payload can't prematurely close its <script>
  // tag — same precaution as wrapScripts() uses for the JS bundle.
  const payloadJson = JSON.stringify({ byDay: Object.fromEntries(dayInfoMap) }).replace(
    /<\/script/gi,
    "<\\/script",
  );

  return (
    <div class="bases-calendar-wrapper">
      <div class="bases-view-meta">
        {formatMessage(localeStrings.showingCount, { count: entries.length, total })}
      </div>
      <div class="bases-calendar" data-initial-year={today.year} data-initial-month={today.month}>
        <script type="application/json" class="bases-calendar-data" dangerouslySetInnerHTML={{ __html: payloadJson }} />
        <div class="bases-calendar-nav">
          <button type="button" class="bases-calendar-nav-btn bases-calendar-prev" aria-label="Previous month">
            ‹
          </button>
          <span class="bases-calendar-label">
            {MONTH_LABELS[today.month]} {today.year}
          </span>
          <button type="button" class="bases-calendar-nav-btn bases-calendar-today-btn">
            {localeStrings.today}
          </button>
          <button type="button" class="bases-calendar-nav-btn bases-calendar-next" aria-label="Next month">
            ›
          </button>
        </div>
        <div class="bases-calendar-weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <span>{label}</span>
          ))}
        </div>
        <div class="bases-calendar-days">{renderGrid(today.year, today.month, dayInfoMap, today)}</div>
      </div>
      {unscheduled.length > 0 && (
        <div class="bases-calendar-unscheduled">
          <div class="bases-calendar-unscheduled-title">
            {formatMessage(localeStrings.unscheduled, { count: unscheduled.length })}
          </div>
          <div class="bases-list">
            {unscheduled.map((entry) => (
              <a
                href={transformLink(slug as FullSlug, entry.slug, transformOpts)}
                class="internal internal-link bases-calendar-chip"
                data-slug={entry.slug}
              >
                {entry.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const calendarViewRegistration: ViewTypeRegistration = {
  id: "calendar",
  name: "Calendar",
  icon: "calendar",
  render: CalendarView,
  afterDOMLoaded: calendarScript,
};

export { CalendarView };
