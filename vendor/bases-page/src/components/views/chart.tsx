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
const ChartView: ViewRenderer = ({ entries, locale, total }) => {
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

export const chartViewRegistration: ViewTypeRegistration = {
  id: "chart",
  name: "Chart",
  icon: "bar-chart",
  render: ChartView,
};

export { ChartView };
