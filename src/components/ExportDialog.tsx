"use client";

// 「📤 저장하기」 창: 무엇(일정 · 할 일) · 기간(시작 월 ~ 끝 월) · 모양(달력 · 목록) · 형식(PDF · 한글 · Word · 엑셀)을 골라 저장해요.

import { useState } from "react";
import { Lecture, Todo } from "@/lib/storage";
import { CalEvent } from "@/lib/calendarImport";
import { ExportLayout, ExportWhat, exportSchedule, monthRange } from "@/lib/calendarExport";
import { EXPORT_KINDS, ExportKind } from "@/lib/tableExport";
import { Button } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");
const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

function Choice<T extends string>({ value, options, onChange }: { value: T; options: [T, string, string][]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(([v, l, d]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-xl border p-3 text-left ${value === v ? "border-blossom-500 bg-blossom-50 ring-2 ring-blossom-100" : "border-blossom-200 hover:border-blossom-500"}`}
        >
          <div className="text-sm font-semibold">
            {value === v && "✓ "}
            {l}
          </div>
          <div className="text-xs text-ink-500">{d}</div>
        </button>
      ))}
    </div>
  );
}

export function ExportDialog({
  initialWhat,
  month,
  lectures,
  events,
  todos,
  onClose,
}: {
  initialWhat: ExportWhat;
  month: Date;
  lectures: Lecture[];
  events: CalEvent[];
  todos: Todo[];
  onClose: () => void;
}) {
  const [what, setWhat] = useState<ExportWhat>(initialWhat);
  const [from, setFrom] = useState(ym(month));
  const [to, setTo] = useState(ym(month));
  const [layout, setLayout] = useState<ExportLayout>("grid");
  const [undated, setUndated] = useState(true);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const [msg, setMsg] = useState("");
  const count = from && to ? monthRange(from, to).length : 0;

  async function save(kind: ExportKind) {
    if (!from || !to) return;
    setBusy(kind);
    setMsg("");
    try {
      await exportSchedule({ what, layout, kind, from, to, lectures, events, todos, includeUndated: undated });
      setMsg("저장했어요. 저장 위치를 묻는 창이 뜨면 골라 주세요.");
    } catch {
      setMsg("저장하지 못했어요. 다시 눌러 주세요.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-3" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold">📤 저장하기</h3>
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1.5 text-xs font-semibold text-blossom-700">무엇을</div>
            <Choice
              value={what}
              onChange={setWhat}
              options={[
                ["events", "📅 일정", "강의 + 구글 캘린더 일정"],
                ["todos", "✅ 할 일", "마감일이 있는 할 일"],
              ]}
            />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-blossom-700">기간 (달마다 한 쪽씩)</div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="month" className="rounded-xl border border-blossom-200 px-3 py-1.5 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span className="text-ink-500">~</span>
              <input type="month" className="rounded-xl border border-blossom-200 px-3 py-1.5 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
              <span className="text-xs text-ink-500">{count ? `${count}달` : ""}</span>
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-blossom-700">모양</div>
            <Choice
              value={layout}
              onChange={setLayout}
              options={[
                ["grid", "🗓 달력 표", "화면 그대로 일~토 칸에 날짜별로"],
                ["list", "📋 목록", "날짜순 표 (시간 · 장소 · 강의까지)"],
              ]}
            />
            {what === "todos" && layout === "list" && (
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-ink-500">
                <input type="checkbox" className="accent-blossom-500" checked={undated} onChange={(e) => setUndated(e.target.checked)} />
                날짜 없는 할 일도 맨 뒤에 넣기
              </label>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-blossom-700">형식 — 누르면 저장돼요</div>
            <div className="flex flex-wrap gap-2">
              {EXPORT_KINDS.map(({ kind, label }) => (
                <Button key={kind} variant={kind === "pdf" ? "primary" : "soft"} disabled={!!busy || !count} onClick={() => save(kind)}>
                  {busy === kind ? "만드는 중…" : label}
                </Button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-500">엑셀은 달마다 시트가 하나씩 생겨요. 달력 PDF는 가로 A4예요.</p>
          </div>
          {msg && <p className="text-sm text-blossom-700">{msg}</p>}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
