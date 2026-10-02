import type { ViewRenderer, ViewTypeRegistration, BasesEntry } from "../../types";
import { i18n } from "../../i18n";

function formatMessage(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

// Same hex values as CANVAS_PRESET_COLORS in vendor/canvas-page/src/types.ts (preset 2/4/5) —
// kept as local literals rather than a cross-package import so this view has no dependency on
// canvas-page ever being installed.
const GREEN = "#44cf6e";
const ORANGE = "#e9973f";
const BLUE = "#53dfdd";

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function hasCategory(entry: BasesEntry, label: string): boolean {
  const cats = entry.properties?.category;
  if (!Array.isArray(cats)) return false;
  return cats.some((c) => typeof c === "string" && c.includes(label));
}

/** "2026-09-05" / "2026-09-05T00:00:00.000Z" / Date -> "2026-09", else undefined. */
function monthKey(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  const match = /^(\d{4})-(\d{2})/.exec(String(value).trim());
  return match ? `${match[1]}-${match[2]}` : undefined;
}

interface Bar {
  label: string;
  value: number;
  color: string;
}

// Server-rendered once at build time (like a normal Bases table) — the numbers reflect
// whatever was true as of the last Quartz Syncer publish + deploy, not the visitor's real
// time. Unlike the calendar view, this has no "today" concept to go stale, so no client
// script is needed to correct it after load.
const TaskManagementChart: ViewRenderer = ({ entries, locale, total }) => {
  const localeStrings = i18n(locale).components.bases;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const taskManagementEntry = entries.find((e) => e.fileProperties.basename === "Task Management");
  const props = taskManagementEntry?.properties ?? {};

  const manualReview = toNumber(props["本月卡片盒筆記回顧"]);
  const manualQuiz = toNumber(props["本月英文測驗練習"]);
  const examBaseline = toNumber(props["本月考古題練習_月初基準"]);
  const answerBaseline = toNumber(props["本月考古題參考答案_月初基準"]);

  const englishCount = entries.filter(
    (e) => hasCategory(e, "English learning notes") && monthKey(e.properties?.["date"]) === thisMonth,
  ).length;

  const examTotal = entries
    .filter((e) => hasCategory(e, "Exam notes"))
    .reduce((sum, e) => sum + toNumber(e.properties?.["已練習次數"]), 0);
  const examMonthCount = Math.max(0, examTotal - examBaseline);

  const answerTotal = entries.filter(
    (e) => hasCategory(e, "Exam notes") && e.properties?.["參考答案已完成"] === true,
  ).length;
  const answerMonthCount = Math.max(0, answerTotal - answerBaseline);

  const bars: Bar[] = [
    { label: "完成考古題參考答案", value: answerMonthCount, color: GREEN },
    { label: "英文學習筆記", value: englishCount, color: BLUE },
    { label: "考古題練習", value: examMonthCount, color: GREEN },
    { label: "卡片盒筆記回顧", value: manualReview, color: ORANGE },
    { label: "英文測驗練習", value: manualQuiz, color: BLUE },
  ];

  const maxValue = Math.max(1, ...bars.map((b) => b.value));
  const chartHeight = 160;
  const barWidth = 56;
  const gap = 28;
  const topPadding = 20;
  const labelHeight = 46;
  const chartWidth = bars.length * (barWidth + gap) + gap;

  return (
    <div class="bases-chart-wrapper">
      <div class="bases-view-meta">
        {formatMessage(localeStrings.showingCount, { count: entries.length, total })}
      </div>
      <svg
        class="bases-chart"
        viewBox={`0 0 ${chartWidth} ${topPadding + chartHeight + labelHeight}`}
        role="img"
        aria-label="本月任務統計長條圖"
      >
        {bars.map((bar, i) => {
          const x = gap + i * (barWidth + gap);
          const barHeight = Math.max(2, (bar.value / maxValue) * chartHeight);
          const y = topPadding + chartHeight - barHeight;
          return (
            <g>
              <text
                x={x + barWidth / 2}
                y={y - 6}
                text-anchor="middle"
                class="bases-chart-value"
              >
                {bar.value}
              </text>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill={bar.color} rx="4" />
              <text
                x={x + barWidth / 2}
                y={topPadding + chartHeight + 18}
                text-anchor="middle"
                class="bases-chart-label"
              >
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string" && v !== "");
  return typeof value === "string" && value !== "" ? [value] : [];
}

function asStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, mapped] of Object.entries(value as Record<string, unknown>)) {
    if (typeof mapped === "string") result[key] = mapped;
  }
  return result;
}

// `chartMode: tagFrequency` — counts how often each tag appears, optionally split into one
// chart per value of `groupProperty` (a list or single-value frontmatter field). `groupMap`
// renames/merges group values (e.g. old exam subject names -> the current subject list),
// `groupOrder` fixes the order groups are drawn in (unlisted groups go last), and `top`
// caps the bars per chart (ties at the cutoff are kept when the count is 2+). `showOverall`
// adds an all-groups ranking (each bar also notes how many groups the tag appears in) above
// the per-group charts.
// Same zero-script SSR approach as the Task Management chart.
const UNGROUPED = "（未填）";

interface HBar {
  label: string;
  value: number;
  valueText: string;
  tooltip: string;
}

function entryTags(entry: BasesEntry): string[] {
  const tags = new Set<string>();
  for (const tag of entry.fileProperties.tags ?? []) {
    const clean = tag.replace(/^#/, "");
    if (clean) tags.add(clean);
  }
  return [...tags];
}

const byZhHant = (a: string, b: string) => a.localeCompare(b, "zh-Hant");

/** First `top` items of an already-sorted list, plus anything tied with the last one —
 *  unless that tie is at a count of 1, where listing every single-use tag would just
 *  make the chart long without telling you anything. */
function takeTopWithTies<T>(sorted: T[], top: number, countOf: (item: T) => number): T[] {
  if (sorted.length <= top) return sorted;
  const cutoff = countOf(sorted[top - 1]);
  if (cutoff < 2) return sorted.slice(0, top);
  return sorted.filter((item, i) => i < top || countOf(item) >= cutoff);
}

function HorizontalBars({ bars, ariaLabel }: { bars: HBar[]; ariaLabel: string }) {
  if (bars.length === 0) return null;
  const labelWidth = 150;
  const barArea = 260;
  const valueWidth = 80;
  const rowHeight = 24;
  const barHeight = 16;
  const chartWidth = labelWidth + barArea + valueWidth;
  const chartHeight = bars.length * rowHeight + 4;
  const maxValue = Math.max(1, ...bars.map((b) => b.value));

  return (
    <svg
      class="bases-chart bases-chart-horizontal"
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      role="img"
      aria-label={ariaLabel}
    >
      {bars.map((bar, i) => {
        const y = 2 + i * rowHeight;
        const width = Math.max(2, (bar.value / maxValue) * barArea);
        const label = bar.label.length > 11 ? `${bar.label.slice(0, 10)}…` : bar.label;
        return (
          <g>
            <title>{bar.tooltip}</title>
            <text
              x={labelWidth - 8}
              y={y + barHeight / 2}
              text-anchor="end"
              dominant-baseline="central"
              class="bases-chart-hlabel"
            >
              {label}
            </text>
            <rect x={labelWidth} y={y} width={width} height={barHeight} rx="3" class="bases-chart-hbar" />
            <text
              x={labelWidth + width + 6}
              y={y + barHeight / 2}
              dominant-baseline="central"
              class="bases-chart-value"
            >
              {bar.valueText}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const TagFrequencyChart: ViewRenderer = ({ entries, view, locale, total }) => {
  const localeStrings = i18n(locale).components.bases;
  const groupProperty = typeof view.groupProperty === "string" ? view.groupProperty : undefined;
  const groupMap = asStringMap(view.groupMap);
  const groupOrder = asStringList(view.groupOrder);
  const top = Math.max(1, toNumber(view.top) || 10);

  const groups = new Map<string, BasesEntry[]>();
  // tag -> { notes containing it (each note once), groups it appears in }
  const overall = new Map<string, { count: number; groups: Set<string> }>();
  for (const entry of entries) {
    const raw = groupProperty ? asStringList(entry.properties?.[groupProperty]) : [""];
    const names = new Set((raw.length ? raw : [UNGROUPED]).map((name) => groupMap[name] ?? name));
    for (const name of names) {
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(entry);
    }
    for (const tag of entryTags(entry)) {
      if (!overall.has(tag)) overall.set(tag, { count: 0, groups: new Set() });
      const stat = overall.get(tag)!;
      stat.count += 1;
      for (const name of names) stat.groups.add(name);
    }
  }

  const rank = (name: string) => {
    const i = groupOrder.indexOf(name);
    return i === -1 ? groupOrder.length : i;
  };
  const sortedGroups = [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]) || byZhHant(a[0], b[0]));
  const untaggedOf = (list: BasesEntry[]) => list.filter((e) => entryTags(e).length === 0).length;
  const groupList = (set: Set<string>) => [...set].sort((a, b) => rank(a) - rank(b) || byZhHant(a, b)).join("、");

  const overallBars: HBar[] = takeTopWithTies(
    [...overall.entries()].sort(
      (a, b) => b[1].count - a[1].count || b[1].groups.size - a[1].groups.size || byZhHant(a[0], b[0]),
    ),
    top,
    ([, stat]) => stat.count,
  ).map(([tag, stat]) => ({
      label: tag,
      value: stat.count,
      valueText: groupProperty ? `${stat.count}（${stat.groups.size} 科）` : String(stat.count),
      tooltip: groupProperty ? `${tag}：${stat.count} 次，${groupList(stat.groups)}` : `${tag}：${stat.count}`,
    }));

  return (
    <div class="bases-chart-wrapper">
      <div class="bases-view-meta">
        {formatMessage(localeStrings.showingCount, { count: entries.length, total })}
      </div>
      {view.showOverall === true && (
        <section class="bases-chart-group">
          <h3 class="bases-chart-group-title">全部科目合計</h3>
          <div class="bases-chart-group-meta">
            共 {entries.length} 篇，其中 {untaggedOf(entries)} 篇尚未加 tag
          </div>
          <HorizontalBars bars={overallBars} ariaLabel="全部科目關鍵字出現次數長條圖" />
        </section>
      )}
      {sortedGroups.map(([name, list]) => {
        const counts = new Map<string, number>();
        for (const entry of list) {
          for (const tag of entryTags(entry)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
        const bars: HBar[] = takeTopWithTies(
          [...counts.entries()].sort((a, b) => b[1] - a[1] || byZhHant(a[0], b[0])),
          top,
          ([, n]) => n,
        ).map(([tag, n]) => ({ label: tag, value: n, valueText: String(n), tooltip: `${tag}：${n}` }));

        return (
          <section class="bases-chart-group">
            {groupProperty && <h3 class="bases-chart-group-title">{name}</h3>}
            <div class="bases-chart-group-meta">
              共 {list.length} 篇，其中 {untaggedOf(list)} 篇尚未加 tag
            </div>
            <HorizontalBars bars={bars} ariaLabel={`${name} 關鍵字出現次數長條圖`} />
          </section>
        );
      })}
    </div>
  );
};

const ChartView: ViewRenderer = (props) =>
  props.view.chartMode === "tagFrequency" ? TagFrequencyChart(props) : TaskManagementChart(props);

export const chartViewRegistration: ViewTypeRegistration = {
  id: "chart",
  name: "Chart",
  icon: "bar-chart",
  render: ChartView,
};

export { ChartView };
