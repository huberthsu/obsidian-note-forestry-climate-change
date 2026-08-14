// @ts-nocheck

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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekday(year, month) {
  return new Date(year, month, 1).getDay();
}

function buildDayCell(dayNum, isToday, dayEntries) {
  const cell = document.createElement("div");
  cell.className = "bases-calendar-day" + (isToday ? " is-today" : "");

  const daynum = document.createElement("span");
  daynum.className = "bases-calendar-daynum";
  daynum.textContent = String(dayNum);
  cell.appendChild(daynum);

  if (dayEntries && dayEntries.length > 0) {
    const wrap = document.createElement("div");
    wrap.className = "bases-calendar-entries";
    dayEntries.forEach((entry) => {
      const a = document.createElement("a");
      a.href = entry.href;
      a.className = "internal internal-link bases-calendar-chip";
      a.dataset.slug = entry.slug;
      a.title = entry.tooltip;
      a.textContent = entry.title;
      wrap.appendChild(a);
    });
    cell.appendChild(wrap);
  }

  return cell;
}

function renderMonth(container, year, month, byDay, todayKey) {
  const daysEl = container.querySelector(".bases-calendar-days");
  const labelEl = container.querySelector(".bases-calendar-label");
  if (!daysEl || !labelEl) return;

  daysEl.innerHTML = "";
  const leading = firstWeekday(year, month);
  const totalDays = daysInMonth(year, month);
  const cellCount = Math.ceil((leading + totalDays) / 7) * 7;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < cellCount; i++) {
    const dayNum = i - leading + 1;
    if (dayNum < 1 || dayNum > totalDays) {
      const blank = document.createElement("div");
      blank.className = "bases-calendar-day is-outside";
      fragment.appendChild(blank);
      continue;
    }
    const key = year + "-" + pad2(month + 1) + "-" + pad2(dayNum);
    fragment.appendChild(buildDayCell(dayNum, key === todayKey, byDay[key]));
  }

  daysEl.appendChild(fragment);
  labelEl.textContent = MONTH_LABELS[month] + " " + year;
  container.dataset.currentYear = String(year);
  container.dataset.currentMonth = String(month);

  // Deliberately a narrow, calendar-specific event rather than the shared
  // "render" event: popover.inline.ts opted into this one specifically
  // (and is idempotency-guarded against repeat calls), but "render" is also
  // heard by other core scripts (darkmode confirmed) that assume it only
  // ever fires once per navigation — broadcasting on it here previously
  // caused those to double-initialize and silently misbehave.
  document.dispatchEvent(new CustomEvent("bases-content-inserted"));
}

function initCalendar(container, cleanupFns) {
  // Quartz's SPA router also fires an initial "nav" on first load, so this
  // can run twice for the same container (once from the immediate call at
  // the bottom of this file, once from that "nav"). Without this guard the
  // prev/next/today buttons would each get a second click listener, making
  // every click advance two months instead of one.
  if (container.dataset.calendarReady === "1") return;
  container.dataset.calendarReady = "1";

  const dataScript = container.querySelector('script[type="application/json"]');
  if (!dataScript) return;

  let payload;
  try {
    payload = JSON.parse(dataScript.textContent);
  } catch (e) {
    return;
  }
  const byDay = payload.byDay || {};

  const now = new Date();
  const todayKey = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());

  // The server-rendered initial grid bakes in "today" (both which month is
  // shown AND which day gets the is-today highlight) as of build time — on a
  // static site that's stale the moment a visitor loads the page any time
  // after the last deploy. A same-year/same-month comparison isn't enough:
  // a build from yesterday still has the right month today, but the
  // highlighted day would be wrong. Simplest correct fix is to always
  // re-render once against the visitor's real clock on init, regardless of
  // whether the server-rendered grid happens to already match.
  renderMonth(container, now.getFullYear(), now.getMonth(), byDay, todayKey);

  const shiftMonth = (delta) => {
    const cy = Number(container.dataset.currentYear);
    const cm = Number(container.dataset.currentMonth);
    const next = new Date(cy, cm + delta, 1);
    renderMonth(container, next.getFullYear(), next.getMonth(), byDay, todayKey);
  };

  const prevBtn = container.querySelector(".bases-calendar-prev");
  const nextBtn = container.querySelector(".bases-calendar-next");
  const todayBtn = container.querySelector(".bases-calendar-today-btn");

  const prevHandler = () => shiftMonth(-1);
  const nextHandler = () => shiftMonth(1);
  const todayHandler = () => renderMonth(container, now.getFullYear(), now.getMonth(), byDay, todayKey);

  if (prevBtn) {
    prevBtn.addEventListener("click", prevHandler);
    cleanupFns.push(() => prevBtn.removeEventListener("click", prevHandler));
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", nextHandler);
    cleanupFns.push(() => nextBtn.removeEventListener("click", nextHandler));
  }
  if (todayBtn) {
    todayBtn.addEventListener("click", todayHandler);
    cleanupFns.push(() => todayBtn.removeEventListener("click", todayHandler));
  }
}

function initCalendars() {
  const containers = document.querySelectorAll(".bases-calendar");
  if (containers.length === 0) return;
  const cleanupFns = [];

  containers.forEach((container) => {
    initCalendar(container, cleanupFns);
  });

  if (window.addCleanup) {
    window.addCleanup(() => {
      cleanupFns.forEach((fn) => {
        fn();
      });
    });
  }
}

document.addEventListener("nav", () => {
  initCalendars();
});
document.addEventListener("render", () => {
  initCalendars();
});

initCalendars();
