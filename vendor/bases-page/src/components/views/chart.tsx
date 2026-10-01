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

  const manualAnswerKeys = toNumber(props["本月完成考古題參考答案"]);
  const manualReview = toNumber(props["本月卡片盒筆記回顧"]);
  const manualQuiz = toNumber(props["本月英文測驗練習"]);
  const examBaseline = toNumber(props["本月考古題練習_月初基準"]);

  const englishCount = entries.filter(
    (e) => hasCategory(e, "English learning notes") && monthKey(e.properties?.["date"]) === thisMonth,
  ).length;

  const examTotal = entries
    .filter((e) => hasCategory(e, "Exam notes"))
    .reduce((sum, e) => sum + toNumber(e.properties?.["已練習次數"]), 0);
  const examMonthCount = Math.max(0, examTotal - examBaseline);

  const bars: Bar[] = [
    { label: "完成考古題參考答案", value: manualAnswerKeys, color: GREEN },
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
// caps the bars per group. Same zero-script SSR approach as the Task Management chart.
const UNGROUPED = "（未填）";

const TagFrequencyChart: ViewRenderer = ({ entries, view, locale, total }) => {
  const localeStrings = i18n(locale).components.bases;
  const groupProperty = typeof view.groupProperty === "string" ? view.groupProperty : undefined;
  const groupMap = asStringMap(view.groupMap);
  const groupOrder = asStringList(view.groupOrder);
  const top = Math.max(1, toNumber(view.top) || 10);

  const groups = new Map<string, BasesEntry[]>();
  for (const entry of entries) {
    const raw = groupProperty ? asStringList(entry.properties?.[groupProperty]) : [""];
    const names = new Set((raw.length ? raw : [UNGROUPED]).map((name) => groupMap[name] ?? name));
    for (const name of names) {
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(entry);
    }
  }

  const rank = (name: string) => {
    const i = groupOrder.indexOf(name);
    return i === -1 ? groupOrder.length : i;
  };
  const sortedGroups = [...groups.entries()].sort(
    (a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], "zh-Hant"),
  );

  const labelWidth = 150;
  const barArea = 280;
  const valueWidth = 30;
  const rowHeight = 24;
  const barHeight = 16;
  const chartWidth = labelWidth + barArea + valueWidth;

  return (
    <div class="bases-chart-wrapper">
      <div class="bases-view-meta">
        {formatMessage(localeStrings.showingCount, { count: entries.length, total })}
      </div>
      {sortedGroups.map(([name, list]) => {
        const counts = new Map<string, number>();
        for (const entry of list) {
          for (const tag of new Set(entry.fileProperties.tags ?? [])) {
            const clean = tag.replace(/^#/, "");
            if (clean) counts.set(clean, (counts.get(clean) ?? 0) + 1);
          }
        }
        const bars = [...counts.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"))
          .slice(0, top);
        const untagged = list.filter((e) => (e.fileProperties.tags ?? []).length === 0).length;
        const maxValue = Math.max(1, ...bars.map(([, n]) => n));
        const chartHeight = bars.length * rowHeight + 4;

        return (
          <section class="bases-chart-group">
            {groupProperty && <h3 class="bases-chart-group-title">{name}</h3>}
            <div class="bases-chart-group-meta">
              共 {list.length} 篇，其中 {untagged} 篇尚未加 tag
            </div>
            {bars.length > 0 && (
              <svg
                class="bases-chart bases-chart-horizontal"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label={`${name} 關鍵字出現次數長條圖`}
              >
                {bars.map(([tag, n], i) => {
                  const y = 2 + i * rowHeight;
                  const width = Math.max(2, (n / maxValue) * barArea);
                  const label = tag.length > 11 ? `${tag.slice(0, 10)}…` : tag;
                  return (
                    <g>
                      <title>{`${tag}：${n}`}</title>
                      <text
                        x={labelWidth - 8}
                        y={y + barHeight / 2}
                        text-anchor="end"
                        dominant-baseline="central"
                        class="bases-chart-hlabel"
                      >
                        {label}
                      </text>
                      <rect
                        x={labelWidth}
                        y={y}
                        width={width}
                        height={barHeight}
                        rx="3"
                        class="bases-chart-hbar"
                      />
                      <text
                        x={labelWidth + width + 6}
                        y={y + barHeight / 2}
                        dominant-baseline="central"
                        class="bases-chart-value"
                      >
                        {n}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
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
