// 캘린더 일정 · 할 일 내보내기에 들어갈 내용을 만들어요.
// 고른 기간(시작 월 ~ 끝 월)의 달마다 한 쪽(엑셀은 한 시트)씩.
// 모양: 「달력」 = 화면처럼 일~토 칸에 날짜별로 / 「목록」 = 날짜순 표.

import { Lecture, Todo } from "./storage";
import { CalEvent } from "./calendarImport";
import { esc } from "./curriculumDoc";
import { ExportKind, TableDoc, saveTables, tableHtml } from "./tableExport";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayLabel = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8))}(${WEEK[new Date(`${date}T00:00:00`).getDay()]})`;
const lectureName = (l: Lecture) => l.title || l.keyword || l.org || "제목 없는 강의";
const monthKey = (m: Date) => `${m.getFullYear()}-${pad(m.getMonth() + 1)}`;
const monthTitle = (m: Date) => `${m.getFullYear()}년 ${m.getMonth() + 1}월`;
const today = () => ymd(new Date());

export type ExportWhat = "events" | "todos";
export type ExportLayout = "grid" | "list";

// 「2026-09」 ~ 「2026-12」 → 달 목록 (최대 24달)
export function monthRange(from: string, to: string): Date[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let a = new Date(fy, fm - 1, 1);
  let b = new Date(ty, tm - 1, 1);
  if (a > b) [a, b] = [b, a];
  const out: Date[] = [];
  for (let d = a; d <= b && out.length < 24; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push(d);
  return out;
}

type Item = { date: string; time: string; text: string; tag: string; place: string; done?: boolean };

function eventItems(month: Date, lectures: Lecture[], events: CalEvent[]): Item[] {
  const key = monthKey(month);
  const imported = new Set(lectures.map((l) => l.calendarId).filter(Boolean));
  return [
    ...lectures.filter((l) => l.date.startsWith(key)).map((l) => ({ date: l.date, time: l.startTime, text: lectureName(l), tag: "강의", place: l.org })),
    ...events.filter((e) => e.date.startsWith(key) && !imported.has(e.id)).map((e) => ({ date: e.date, time: e.startTime, text: e.title, tag: "구글 일정", place: e.location })),
  ].sort((a, b) => (a.date + (a.time || "00:00")).localeCompare(b.date + (b.time || "00:00")));
}

function todoItems(month: Date, todos: Todo[], lectures: Lecture[]): Item[] {
  const byId = new Map(lectures.map((l) => [l.id, l]));
  return todos
    .filter((t) => t.due.startsWith(monthKey(month)))
    .sort((a, b) => a.due.localeCompare(b.due) || Number(a.done) - Number(b.done))
    .map((t) => ({ date: t.due, time: "", text: t.text, tag: t.done ? "☑ 완료" : t.due < today() ? "⚠ 지남" : "☐", place: byId.get(t.lectureId) ? lectureName(byId.get(t.lectureId)!) : "", done: t.done }));
}

const summary = (what: ExportWhat, items: Item[]) =>
  what === "events"
    ? `강의 ${items.filter((i) => i.tag === "강의").length}개 · 구글 일정 ${items.filter((i) => i.tag === "구글 일정").length}개 · ${today()} 기준`
    : `모두 ${items.length}개 · 남은 일 ${items.filter((i) => !i.done).length}개 · 완료 ${items.filter((i) => i.done).length}개 · ${today()} 기준`;

const label = (what: ExportWhat) => (what === "events" ? "일정" : "할 일");

// 목록 표
function listDoc(what: ExportWhat, month: Date, items: Item[]): TableDoc {
  return what === "events"
    ? {
        title: `${monthTitle(month)} 일정`,
        subtitle: summary(what, items),
        sheet: `${month.getMonth() + 1}월 일정`,
        columns: [
          { label: "날짜", width: 12 },
          { label: "시간", width: 9 },
          { label: "일정", width: 45, align: "left" },
          { label: "구분", width: 12 },
          { label: "강의처 · 장소", width: 22, align: "left" },
        ],
        rows: items.map((e) => [dayLabel(e.date), e.time || "종일", e.text, e.tag, e.place]),
      }
    : {
        title: `${monthTitle(month)} 할 일`,
        subtitle: summary(what, items),
        sheet: `${month.getMonth() + 1}월 할 일`,
        columns: [
          { label: "상태", width: 10 },
          { label: "마감일", width: 14 },
          { label: "할 일", width: 50, align: "left" },
          { label: "연결 강의", width: 26, align: "left" },
        ],
        rows: items.map((t) => [t.tag, dayLabel(t.date), t.text, t.place]),
      };
}

// 날짜 없는 할 일 (목록에만)
function undatedDoc(todos: Todo[], lectures: Lecture[]): TableDoc {
  const byId = new Map(lectures.map((l) => [l.id, l]));
  const list = todos.filter((t) => !t.due);
  return {
    title: "날짜 없는 할 일",
    subtitle: `${list.length}개 · ${today()} 기준`,
    sheet: "날짜 없음",
    columns: [
      { label: "상태", width: 10 },
      { label: "할 일", width: 64, align: "left" },
      { label: "연결 강의", width: 26, align: "left" },
    ],
    rows: list.map((t) => [t.done ? "☑ 완료" : "☐", t.text, byId.get(t.lectureId) ? lectureName(byId.get(t.lectureId)!) : ""]),
  };
}

// 달력 표: 일~토 7칸, 주마다 한 줄. 칸 = 「3일」 + 그날 항목들
function weeksOf(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
  const days = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  return Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7)).filter((wk) => wk.some((d) => d.getMonth() === month.getMonth()));
}
const itemText = (what: ExportWhat, i: Item) => (what === "events" ? `${i.time ? `${i.time} ` : ""}${i.text}` : `${i.done ? "☑" : "☐"} ${i.text}`);

function gridDoc(what: ExportWhat, month: Date, items: Item[]): TableDoc {
  return {
    title: `${monthTitle(month)} ${label(what)}`,
    subtitle: summary(what, items),
    sheet: `${month.getMonth() + 1}월 ${label(what)}`,
    columns: WEEK.map((w) => ({ label: w, width: 1, align: "left" as const })),
    rows: weeksOf(month).map((wk) =>
      wk.map((d) => (d.getMonth() !== month.getMonth() ? "" : [`${d.getDate()}일`, ...items.filter((i) => i.date === ymd(d)).map((i) => itemText(what, i))].join("\n"))),
    ),
    minLines: 4,
  };
}

// PDF 용 달력 (화면과 같은 색)
function gridHtml(what: ExportWhat, month: Date, items: Item[]) {
  const color = (i: Item) =>
    what === "events"
      ? i.tag === "강의"
        ? { c: "#a8435a", bg: "#fde3e7" }
        : { c: "#555", bg: "#eeeeee" }
      : i.done
        ? { c: "#888", bg: "#f3f3f3" }
        : { c: "#3d5f2f", bg: "#e1efd8" };
  return `<div style="padding:4px">
<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:8px"><div style="font-size:24px;font-weight:800">${esc(`${monthTitle(month)} ${label(what)}`)}</div><div style="font-size:12px;color:#666">${esc(summary(what, items))}</div></div>
<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px">
<tr>${WEEK.map((w, i) => `<th style="border:1px solid #999;background:#f3f3f3;padding:4px;color:${i === 0 ? "#C0392B" : i === 6 ? "#1F5FBF" : "#333"}">${w}</th>`).join("")}</tr>
${weeksOf(month)
  .map(
    (wk) =>
      `<tr>${wk
        .map((d) => {
          const other = d.getMonth() !== month.getMonth();
          const list = other ? [] : items.filter((i) => i.date === ymd(d));
          return `<td style="border:1px solid #999;vertical-align:top;height:88px;padding:3px;background:${other ? "#fafafa" : "#fff"}"><div style="font-weight:700;color:${other ? "#bbb" : d.getDay() === 0 ? "#C0392B" : d.getDay() === 6 ? "#1F5FBF" : "#333"};margin-bottom:2px">${d.getDate()}</div>${list
            .map((i) => {
              const { c, bg } = color(i);
              return `<div style="background:${bg};color:${c};border-radius:3px;padding:1px 3px;margin-bottom:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;${i.done ? "text-decoration:line-through;" : ""}">${esc(itemText(what, i))}</div>`;
            })
            .join("")}</td>`;
        })
        .join("")}</tr>`,
  )
  .join("")}
</table></div>`;
}

export async function exportSchedule(o: {
  what: ExportWhat;
  layout: ExportLayout;
  kind: ExportKind;
  from: string; // YYYY-MM
  to: string;
  lectures: Lecture[];
  events: CalEvent[];
  todos: Todo[];
  includeUndated?: boolean; // 할 일 목록에 날짜 없는 것도
}) {
  const months = monthRange(o.from, o.to);
  const itemsOf = (m: Date) => (o.what === "events" ? eventItems(m, o.lectures, o.events) : todoItems(m, o.todos, o.lectures));
  const docs = months.map((m) => (o.layout === "grid" ? gridDoc : listDoc)(o.what, m, itemsOf(m)));
  if (o.what === "todos" && o.layout === "list" && o.includeUndated && o.todos.some((t) => !t.due)) docs.push(undatedDoc(o.todos, o.lectures));
  const span = months.length > 1 ? `${monthTitle(months[0])}~${months.at(-1)!.getMonth() + 1}월` : monthTitle(months[0]);
  const base = `${span} ${label(o.what)} (${o.layout === "grid" ? "달력" : "목록"})`;
  const pdfPages = o.layout === "grid" ? months.map((m) => gridHtml(o.what, m, itemsOf(m))) : docs.map(tableHtml);
  return saveTables(o.kind, docs, base, { pdfPages, landscape: o.layout === "grid" });
}
