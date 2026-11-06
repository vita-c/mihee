"use client";

// ✅ 할 일 탭: 할 일을 적고(마감일 · 강의 연결은 골라서), 지난 · 오늘 · 다가오는 · 날짜 없음 · 완료로 나눠 보여 줘요.
// 강의를 고르면 강의 날짜를 기준으로 「준비 목록」(D-14 ~ D+1)을 한 번에 넣을 수 있어요.

import { useState } from "react";
import { Lecture, Todo, newId } from "@/lib/storage";
import { Button, inputClass } from "./ui";
import { ExportDialog } from "./ExportDialog";
import { loadSavedEvents } from "@/lib/calendarImport";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

// 강의 하나를 준비할 때 늘 하는 일 (강의 날 기준 며칠 전)
const PREP: [number, string][] = [
  [-14, "강의처와 일정 · 인원 · 장비 확인"],
  [-10, "커리큘럼 보내기"],
  [-5, "PPT 완성"],
  [-3, "실습 자료 · 프롬프트 점검"],
  [-1, "자료 인쇄 · 노트북 충전 · 강의장 위치 확인"],
  [1, "강의 후기 · 설문 정리"],
];

const lectureName = (l: Lecture) => l.title || l.keyword || l.org || "제목 없는 강의";

export function TodoView({
  todos,
  lectures,
  onChange,
  onOpen,
}: {
  todos: Todo[];
  lectures: Lecture[];
  onChange: (t: Todo[]) => void;
  onOpen: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [lectureId, setLectureId] = useState("");
  const [prepFor, setPrepFor] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [msg, setMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const today = ymd(new Date());
  const byId = new Map(lectures.map((l) => [l.id, l]));

  function add() {
    if (!text.trim()) return;
    onChange([...todos, { id: newId(), text: text.trim(), due, done: false, lectureId }]);
    setText("");
    setMsg("");
  }

  function addPrep() {
    const l = byId.get(prepFor);
    if (!l) return;
    const existing = new Set(todos.filter((t) => t.lectureId === l.id).map((t) => t.text));
    const fresh = PREP.filter(([, t]) => !existing.has(t)).map(([d, t]) => ({ id: newId(), text: t, due: l.date ? addDays(l.date, d) : "", done: false, lectureId: l.id }));
    onChange([...todos, ...fresh]);
    setMsg(fresh.length ? `「${lectureName(l)}」 준비 목록 ${fresh.length}개를 넣었어요${l.date ? "" : " (강의 날짜가 없어서 마감일은 비워 뒀어요)"}.` : "이미 다 들어 있어요.");
  }

  const patch = (id: string, p: Partial<Todo>) => onChange(todos.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const open = todos.filter((t) => !t.done).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const groups: [string, Todo[]][] = [
    ["⚠ 지난 할 일", open.filter((t) => t.due && t.due < today)],
    ["오늘", open.filter((t) => t.due === today)],
    ["다가오는 할 일", open.filter((t) => t.due > today)],
    ["날짜 없음", open.filter((t) => !t.due)],
  ];
  const done = todos.filter((t) => t.done);

  const row = (t: Todo) => {
    const l = byId.get(t.lectureId);
    return (
      <div key={t.id} className="flex items-center gap-2 rounded-xl border border-blossom-100 bg-white px-3 py-2">
        <input type="checkbox" className="h-4 w-4 accent-leaf-600" checked={t.done} onChange={() => patch(t.id, { done: !t.done })} aria-label="완료" />
        <input
          className={`min-w-0 flex-1 bg-transparent text-[15px] outline-none ${t.done ? "text-ink-500 line-through" : ""}`}
          value={t.text}
          onChange={(e) => patch(t.id, { text: e.target.value })}
        />
        {l && (
          <button type="button" onClick={() => onOpen(l.id)} className="hidden max-w-40 truncate rounded-full bg-blossom-100 px-2 py-0.5 text-xs text-blossom-700 sm:block" title="강의 카드 열기">
            {lectureName(l)}
          </button>
        )}
        <input
          type="date"
          className={`rounded-lg border border-blossom-100 px-1.5 py-0.5 text-xs ${t.due && t.due < today && !t.done ? "text-blossom-700" : "text-ink-500"}`}
          value={t.due}
          onChange={(e) => patch(t.id, { due: e.target.value })}
          aria-label="마감일"
        />
        <Button variant="ghost" className="px-2 py-1 text-xs" aria-label="지우기" onClick={() => onChange(todos.filter((x) => x.id !== t.id))}>
          ✕
        </Button>
      </div>
    );
  };

  return (
    <div className="max-w-3xl">
      {exporting && (
        <ExportDialog initialWhat="todos" month={new Date()} lectures={lectures} events={loadSavedEvents().events} todos={todos} onClose={() => setExporting(false)} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">할 일</h2>
        <Button variant="soft" className="ml-auto py-1.5 text-xs" onClick={() => setExporting(true)}>
          📤 저장하기
        </Button>
      </div>
      <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-blossom-200 bg-white p-3 sm:flex-row sm:items-center">
        <input className={`${inputClass} flex-1`} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="할 일 적기 (Enter로 추가)" />
        <input type="date" className={`${inputClass.replace("w-full", "")} sm:w-40`} value={due} onChange={(e) => setDue(e.target.value)} aria-label="마감일" />
        <select className={`${inputClass.replace("w-full", "")} sm:w-44`} value={lectureId} onChange={(e) => setLectureId(e.target.value)} aria-label="연결할 강의">
          <option value="">강의 연결 안 함</option>
          {lectures.map((l) => (
            <option key={l.id} value={l.id}>
              {lectureName(l)}
            </option>
          ))}
        </select>
        <Button onClick={add} disabled={!text.trim()}>
          추가
        </Button>
      </div>

      {lectures.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-blossom-50 p-3 sm:flex-row sm:items-center">
          <span className="text-sm font-semibold text-blossom-700">강의 준비 목록</span>
          <select className={`${inputClass.replace("w-full", "")} sm:w-56`} value={prepFor} onChange={(e) => setPrepFor(e.target.value)} aria-label="준비할 강의">
            <option value="">강의 고르기…</option>
            {lectures.map((l) => (
              <option key={l.id} value={l.id}>
                {lectureName(l)} {l.date && `(${l.date})`}
              </option>
            ))}
          </select>
          <Button variant="soft" onClick={addPrep} disabled={!prepFor}>
            한 번에 넣기
          </Button>
          <span className="text-xs text-ink-500">일정 확인(D-14) → 커리큘럼(D-10) → PPT(D-5) → 점검(D-3) → 인쇄(D-1) → 후기(D+1)</span>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-blossom-700">{msg}</p>}

      <div className="mt-5 space-y-5">
        {groups.map(([title, list]) =>
          list.length ? (
            <section key={title}>
              <h3 className={`mb-2 text-sm font-semibold ${title.startsWith("⚠") ? "text-blossom-700" : "text-ink-500"}`}>
                {title} <span className="opacity-70">{list.length}</span>
              </h3>
              <div className="space-y-1.5">{list.map(row)}</div>
            </section>
          ) : null,
        )}
        {open.length === 0 && <p className="rounded-2xl border border-dashed border-blossom-200 p-6 text-center text-sm text-ink-500">남은 할 일이 없어요 🌸</p>}
        {done.length > 0 && (
          <section>
            <button type="button" className="mb-2 text-sm font-semibold text-ink-500" onClick={() => setShowDone(!showDone)}>
              {showDone ? "▾" : "▸"} 완료 {done.length}
            </button>
            {showDone && <div className="space-y-1.5">{done.map(row)}</div>}
          </section>
        )}
      </div>
    </div>
  );
}
