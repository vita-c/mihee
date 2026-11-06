"use client";

// 📅 캘린더 탭: 위 달력 = 일정(강의 분홍 · 구글 캘린더 회색), 아래 달력 = 할 일(초록). 두 달력은 같은 달을 같이 넘겨요.
// 구글 일정은 전부 가져와 이 브라우저에 보관해 두고, 탭을 열 때 새로 읽어요. 회색 일정을 누르면 그 일정으로 강의 카드를 만들어요.
// 할 일 달력은 날짜 칸을 누르면 그날 할 일을 바로 적을 수 있어요.

import { useEffect, useState } from "react";
import { Fee, Lecture, Todo, newId } from "@/lib/storage";
import { CalEvent, eventToLecture, fetchIcal, icalError, loadIcalUrl, loadSavedEvents } from "@/lib/calendarImport";
import { Button, inputClass, useConfirm } from "./ui";
import { CalendarImport } from "./CalendarImport";
import { FeeDialog, blankFee, guessOrg, won } from "./FeeView";
import { ExportDialog } from "./ExportDialog";
import type { ExportWhat } from "@/lib/calendarExport";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const lectureLabel = (l: Lecture) => l.title || l.keyword || l.org || "제목 없는 강의";

// 한 달 달력 틀. 칸 안에 무엇을 넣을지는 renderDay 가 정해요. onDayClick 이 있으면 빈 곳을 눌러 쓸 수 있어요.
function MonthGrid({
  month,
  today,
  renderDay,
  onDayClick,
}: {
  month: Date;
  today: string;
  renderDay: (key: string) => React.ReactNode;
  onDayClick?: (key: string) => void;
}) {
  // 첫 칸은 그 달 1일이 있는 주의 일요일부터, 6주(42칸)
  const first = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
  const days = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] grid-cols-7 overflow-hidden rounded-2xl border border-blossom-200 bg-white">
        {WEEK.map((w, i) => (
          <div key={w} className={`border-b border-blossom-100 py-2 text-center text-xs font-semibold ${i === 0 ? "text-blossom-700" : "text-ink-500"}`}>
            {w}
          </div>
        ))}
        {days.map((d) => {
          const key = ymd(d);
          const other = d.getMonth() !== month.getMonth();
          return (
            <div
              key={key}
              onClick={onDayClick ? (e) => e.target === e.currentTarget && onDayClick(key) : undefined}
              className={`min-h-24 border-b border-r border-blossom-100 p-1.5 ${other ? "bg-blossom-50/40" : ""} ${onDayClick ? "cursor-pointer hover:bg-leaf-50/60" : ""}`}
            >
              <div
                className={`pointer-events-none mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs ${
                  key === today ? "bg-blossom-500 font-bold text-white" : other ? "text-ink-500/50" : d.getDay() === 0 ? "text-blossom-700" : "text-ink-500"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="space-y-1">{renderDay(key)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarView({
  lectures,
  todos,
  onOpen,
  onImport,
  onToggleTodo,
  onSaveTodo,
  onDeleteTodo,
  fees,
  onSaveFee,
}: {
  fees: Fee[];
  onSaveFee: (f: Fee) => void;
  lectures: Lecture[];
  todos: Todo[];
  onOpen: (id: string) => void;
  onImport: (l: Lecture[]) => void;
  onToggleTodo: (id: string) => void;
  onSaveTodo: (t: Todo) => void; // 새 할 일이면 추가, 있던 것이면 고쳐요
  onDeleteTodo: (id: string) => void;
}) {
  const today = ymd(new Date());
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [cal, setCal] = useState(false);
  const [gEvents, setGEvents] = useState<CalEvent[]>(() => loadSavedEvents().events);
  const [gStatus, setGStatus] = useState("");
  // 할 일 창: 날짜 칸을 누르면 새 할 일, 할 일을 누르면 고치기 · 지우기
  const [editing, setEditing] = useState<Todo | null>(null);
  const isNew = editing ? !todos.some((t) => t.id === editing.id) : false;
  const { ask, dialog } = useConfirm();
  const [exporting, setExporting] = useState<ExportWhat | null>(null);

  // 구글 일정을 누르면: 강의 카드 만들기 / 강의료 기록 중에서 골라요
  const [picked, setPicked] = useState<CalEvent | null>(null);
  const [feeDraft, setFeeDraft] = useState<Fee | null>(null);
  const feeByEvent = new Map(fees.filter((f) => f.calendarId).map((f) => [f.calendarId, f]));
  const feeOrgs = [...new Set(fees.map((f) => f.org))].sort((a, b) => a.localeCompare(b, "ko"));

  function makeCard(e: CalEvent) {
    const l = eventToLecture(e);
    onImport([l]);
    onOpen(l.id);
  }

  function recordFee(e: CalEvent) {
    const existing = feeByEvent.get(e.id);
    // 이미 쓰던 기관 이름 중 일정 제목과 맞는 게 있으면 그걸로, 없으면 제목 앞부분으로
    const org = feeOrgs.find((o) => e.title.startsWith(o)) ?? guessOrg(e.title);
    setFeeDraft(existing ?? blankFee({ date: e.date, org, memo: e.title !== org ? e.title : "", calendarId: e.id }));
    setPicked(null);
  }

  async function loadGoogle() {
    const url = loadIcalUrl();
    if (!url) {
      setGStatus("");
      return;
    }
    setGStatus("구글 일정 읽는 중…");
    try {
      const list = await fetchIcal(url);
      setGEvents(list);
      setGStatus(`구글 일정 ${list.length}개`);
    } catch (e) {
      setGStatus(icalError(e instanceof Error ? e.message : ""));
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 탭을 열 때 한 번 구글 일정을 읽어요
    loadGoogle();
  }, []);

  function saveTodo() {
    if (!editing || !editing.text.trim()) return;
    onSaveTodo({ ...editing, text: editing.text.trim() });
    setEditing(null);
  }

  async function deleteTodo() {
    if (!editing) return;
    if (!(await ask(`「${editing.text}」 할 일을 지울까요?`, "지우기"))) return;
    onDeleteTodo(editing.id);
    setEditing(null);
  }

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const inMonth = (s: string) => s.startsWith(`${month.getFullYear()}-${pad(month.getMonth() + 1)}`);
  const monthLectures = lectures.filter((l) => inMonth(l.date)).length;
  const monthTodos = todos.filter((t) => inMonth(t.due) && !t.done).length;
  // 이미 강의 카드로 가져온 구글 일정은 분홍 카드로 보이니 회색은 빼요
  const imported = new Set(lectures.map((l) => l.calendarId).filter(Boolean));

  return (
    <div>
      {dialog}
      {exporting && <ExportDialog initialWhat={exporting} month={month} lectures={lectures} events={gEvents} todos={todos} onClose={() => setExporting(null)} />}
      {cal && (
        <CalendarImport
          lectures={lectures}
          onImport={onImport}
          onClose={() => {
            setCal(false);
            loadGoogle(); // 창에서 비공개 주소를 넣었으면 바로 달력에 보여 줘요
          }}
        />
      )}
      {picked && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" onClick={() => setPicked(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs text-ink-500">구글 캘린더 일정</div>
            <h3 className="mt-1 font-bold">{picked.title}</h3>
            <p className="mt-1 text-sm text-ink-500">
              {picked.date} {picked.startTime ? `${picked.startTime} · ${picked.minutes}분` : "종일"}
              {picked.location && ` · ${picked.location}`}
            </p>
            {feeByEvent.get(picked.id) && <p className="mt-2 text-sm text-leaf-800">💰 강의료 {won(feeByEvent.get(picked.id)!.amount)} 기록돼 있어요</p>}
            <div className="mt-4 grid gap-2">
              <Button
                onClick={() => {
                  makeCard(picked);
                  setPicked(null);
                }}
              >
                📝 강의 카드 만들기 <span className="text-xs font-normal opacity-80">(일정 제목 → 강의처)</span>
              </Button>
              <Button variant="soft" onClick={() => recordFee(picked)}>
                💰 강의료 {feeByEvent.get(picked.id) ? "고치기" : "기록"}
              </Button>
              <Button variant="ghost" onClick={() => setPicked(null)}>
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
      {feeDraft && (
        <FeeDialog
          fee={feeDraft}
          orgs={feeOrgs}
          onSave={(f) => {
            onSaveFee(f);
            setFeeDraft(null);
          }}
          onClose={() => setFeeDraft(null)}
        />
      )}
      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold">{isNew ? "할 일 추가" : "할 일 고치기"}</h3>
            <input
              autoFocus
              className={`${inputClass} mt-3`}
              value={editing.text}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && saveTodo()}
              placeholder="할 일 적기 (Enter로 저장)"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="date"
                className={`${inputClass.replace("w-full", "")} w-40`}
                value={editing.due}
                onChange={(e) => setEditing({ ...editing, due: e.target.value })}
                aria-label="날짜"
              />
              <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-leaf-600" checked={editing.done} onChange={(e) => setEditing({ ...editing, done: e.target.checked })} />
                완료
              </label>
            </div>
            <select
              className={`${inputClass} mt-3`}
              value={editing.lectureId}
              onChange={(e) => setEditing({ ...editing, lectureId: e.target.value })}
              aria-label="연결할 강의"
            >
              <option value="">강의 연결 안 함</option>
              {lectures.map((l) => (
                <option key={l.id} value={l.id}>
                  {lectureLabel(l)} {l.date && `(${l.date})`}
                </option>
              ))}
            </select>
            <div className="mt-4 flex items-center gap-2">
              {!isNew && (
                <Button variant="ghost" className="text-blossom-700" onClick={deleteTodo}>
                  지우기
                </Button>
              )}
              <Button variant="ghost" className="ml-auto" onClick={() => setEditing(null)}>
                취소
              </Button>
              <Button variant="leaf" onClick={saveTodo} disabled={!editing.text.trim()}>
                {isNew ? "추가" : "저장"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" aria-label="이전 달" onClick={() => shift(-1)}>
          ◀
        </Button>
        <h2 className="text-xl font-bold">
          {month.getFullYear()}년 {month.getMonth() + 1}월
        </h2>
        <Button variant="ghost" aria-label="다음 달" onClick={() => shift(1)}>
          ▶
        </Button>
        <Button variant="ghost" className="text-xs" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
          오늘
        </Button>
        <span className="text-sm text-ink-500">강의 {monthLectures}개</span>
        {gStatus && (
          <span className="text-xs text-ink-500">
            · {gStatus}{" "}
            <button type="button" className="underline" onClick={loadGoogle}>
              새로고침
            </button>
          </span>
        )}
        <Button variant="soft" className="ml-auto" onClick={() => setCal(true)}>
          📅 구글 캘린더에서 가져오기
        </Button>
      </div>

      <h3 className="mb-2 mt-4 text-sm font-semibold text-blossom-700">📅 일정</h3>
      <MonthGrid
        month={month}
        today={today}
        renderDay={(key) => (
          <>
            {lectures
              .filter((l) => l.date === key)
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onOpen(l.id)}
                  className="block w-full truncate rounded-md bg-blossom-100 px-1.5 py-0.5 text-left text-xs font-semibold text-blossom-700 hover:bg-blossom-200"
                  title={`${l.startTime} ${lectureLabel(l)}${l.org && l.org !== lectureLabel(l) ? ` · ${l.org}` : ""}`}
                >
                  {l.startTime} {lectureLabel(l)}
                </button>
              ))}
            {gEvents
              .filter((e) => e.date === key && !imported.has(e.id))
              .map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setPicked(e)}
                  className="block w-full truncate rounded-md bg-ink-500/10 px-1.5 py-0.5 text-left text-xs text-ink-500 hover:bg-blossom-100 hover:text-blossom-700"
                  title={`구글 캘린더 · ${e.startTime || "종일"} ${e.title}${e.location ? ` · ${e.location}` : ""} — 누르면 강의 카드 · 강의료`}
                >
                  {feeByEvent.has(e.id) && "💰"}
                  {e.startTime} {e.title}
                </button>
              ))}
          </>
        )}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-500">분홍 = 강의(누르면 강의 카드로) · 회색 = 구글 캘린더 일정(누르면 강의 카드 만들기 · 강의료 기록) · 💰 = 강의료 기록함</p>
        <Button variant="soft" className="py-1.5 text-xs" onClick={() => setExporting("events")}>
          📤 일정 저장하기
        </Button>
      </div>

      <div className="mb-2 mt-8 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-leaf-800">✅ 할 일</h3>
        <span className="text-xs text-ink-500">
          {month.getMonth() + 1}월 남은 할 일 {monthTodos}개 · 빈 곳을 누르면 추가 · 할 일을 누르면 고치기 · 지우기
        </span>
      </div>
      <MonthGrid
        month={month}
        today={today}
        onDayClick={(key) => setEditing({ id: newId(), text: "", due: key, done: false, lectureId: "" })}
        renderDay={(key) =>
          todos
            .filter((t) => t.due === key)
            .map((t) => (
              <div
                key={t.id}
                className={`flex w-full items-center rounded-md text-xs ${t.done ? "text-ink-500" : "bg-leaf-50 text-leaf-800"}`}
              >
                <button type="button" onClick={() => onToggleTodo(t.id)} className="shrink-0 px-1.5 py-0.5 hover:text-leaf-600" title={t.done ? "다시 할 일로" : "완료"} aria-label={t.done ? "다시 할 일로" : "완료"}>
                  {t.done ? "☑" : "☐"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(t)}
                  className={`min-w-0 flex-1 truncate py-0.5 pr-1.5 text-left hover:underline ${t.done ? "line-through" : ""}`}
                  title="누르면 고치기 · 지우기"
                >
                  {t.text}
                </button>
              </div>
            ))
        }
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-500">☐ 를 누르면 완료 · 글자를 누르면 고치기 · 지우기 · 날짜 없는 할 일은 「할 일」 탭에서 볼 수 있어요</p>
        <Button variant="soft" className="py-1.5 text-xs" onClick={() => setExporting("todos")}>
          📤 할 일 저장하기
        </Button>
      </div>
    </div>
  );
}
