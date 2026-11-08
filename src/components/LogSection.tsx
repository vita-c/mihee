"use client";

// 4 수업 로그 — 5회차 v2 (코엘의 「수업 로그 여섯 줄」 힌트)
// 준비 시작 · 초안 완료 시각으로 준비 시간을 재고, 강의가 끝나면 수업 후를 남겨요.
// 다음 강의에서 「지난 강의에서 불러오기」를 하면 이 기록이 「지난번에 배운 것」으로 보여요.

import { Lecture, LectureLog, formatMinutes, prepMinutes } from "@/lib/storage";
import { Button, Field, inputClass } from "./ui";

const area = `${inputClass} min-h-20 resize-y leading-relaxed`;

// 이 컴퓨터 시각을 "YYYY-MM-DDTHH:mm" 으로
function nowLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function LogSection({ lecture, onChange }: { lecture: Lecture; onChange: (l: Lecture) => void }) {
  const log = lecture.log;
  const set = <K extends keyof LectureLog>(key: K, value: LectureLog[K]) => onChange({ ...lecture, log: { ...log, [key]: value } });
  const mins = prepMinutes(log);
  const backwards = log.prepStart && log.draftDone && mins === null;

  const timeField = (key: "prepStart" | "draftDone", label: string, button: string) => (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="datetime-local"
          className={inputClass}
          value={log[key]}
          onChange={(e) => set(key, e.target.value)}
        />
        <Button variant="soft" className="shrink-0" onClick={() => set(key, nowLocal())}>
          {button}
        </Button>
      </div>
    </Field>
  );

  return (
    <>
      <p className="-mt-2 text-sm text-ink-500">
        준비 시간을 재고, 강의가 끝나면 한 줄 남겨요. 다음 강의에서 이 카드를 불러오면 「지난번에 배운 것」으로 같이 보여요.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {timeField("prepStart", "⏱ 준비 시작", "지금")}
        {timeField("draftDone", "✅ 초안 완료", "지금")}
      </div>
      <div
        className={`rounded-xl p-3 text-sm font-semibold ${
          mins !== null ? "bg-leaf-50 text-leaf-800" : backwards ? "bg-blossom-50 text-blossom-700" : "bg-blossom-50 text-ink-500"
        }`}
      >
        {mins !== null
          ? `준비에 ${formatMinutes(mins)} 걸렸어요`
          : backwards
            ? "초안 완료가 준비 시작보다 앞서 있어요. 시각을 확인해 주세요"
            : "준비를 시작할 때 「지금」, 초안을 다 만들면 「지금」을 눌러요"}
      </div>
      <Field label="채택" hint="이번에 고른 구성 · 방향">
        <textarea className={area} value={log.adopted} onChange={(e) => set("adopted", e.target.value)} />
      </Field>
      <Field label="제친 것" hint="고민하다 뺀 것과 그 이유">
        <textarea className={area} value={log.rejected} onChange={(e) => set("rejected", e.target.value)} />
      </Field>
      <Field label="축" hint="이번 강의에서 가장 중요하게 잡은 것 한 줄">
        <input className={inputClass} value={log.axis} onChange={(e) => set("axis", e.target.value)} />
      </Field>
      <Field label="수업 후" hint="강의를 마치고: 매끄럽지 않았던 것 · 예상과 달랐던 것 · 다음엔 이렇게">
        <textarea className={`${area} min-h-28`} value={log.after} onChange={(e) => set("after", e.target.value)} />
      </Field>
    </>
  );
}

// 「지난 강의에서 불러오기」로 고른 강의의 로그를 보여 주는 상자
export function LastLearned({ src, onClose }: { src: Lecture; onClose: () => void }) {
  const { log } = src;
  const mins = prepMinutes(log);
  const rows = [
    ["축", log.axis],
    ["수업 후", log.after],
    ["제친 것", log.rejected],
  ].filter(([, v]) => v.trim());
  return (
    <div className="rounded-xl border border-leaf-300 bg-leaf-50 p-3 text-sm">
      <div className="flex items-center font-semibold text-leaf-800">
        📒 지난번에 배운 것 · {src.title || src.keyword || "제목 없는 강의"}
        <button type="button" className="ml-auto text-xs font-normal text-ink-500 hover:text-blossom-700" onClick={onClose}>
          닫기
        </button>
      </div>
      {rows.length === 0 && mins === null ? (
        <p className="mt-1 text-ink-500">이 강의에는 아직 수업 로그가 없어요.</p>
      ) : (
        <dl className="mt-2 space-y-1.5">
          {mins !== null && (
            <div>
              <dt className="inline font-semibold text-leaf-800">준비 시간 </dt>
              <dd className="inline">{formatMinutes(mins)}</dd>
            </div>
          )}
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold text-leaf-800">{k}</dt>
              <dd className="whitespace-pre-line leading-relaxed">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
