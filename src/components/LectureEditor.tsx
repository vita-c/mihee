"use client";

import { Lecture, Material, MATERIAL_KINDS, ScheduleRow, newId, scheduleTotal } from "@/lib/storage";
import { curriculumPrompt, pptPrompt } from "@/lib/prompts";
import { Button, CopyButton, Field, inputClass } from "./ui";

const area = `${inputClass} min-h-28 resize-y leading-relaxed`;

function Section({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-blossom-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-lg font-bold">
        <span className="rounded-full bg-blossom-100 px-2.5 py-0.5 text-sm text-blossom-700">{step}</span>
        {title}
      </h3>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function LectureEditor({
  lecture,
  others,
  materials,
  onChange,
  onBack,
  onDelete,
}: {
  lecture: Lecture;
  others: Lecture[];
  materials: Material[];
  onChange: (l: Lecture) => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const set = <K extends keyof Lecture>(key: K, value: Lecture[K]) => onChange({ ...lecture, [key]: value });
  const total = scheduleTotal(lecture);
  const diff = lecture.totalMinutes - total;
  const picked = materials.filter((m) => lecture.materialIds.includes(m.id));

  const setRow = (id: string, patch: Partial<ScheduleRow>) =>
    set(
      "schedule",
      lecture.schedule.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );

  function toggleMaterial(id: string) {
    set(
      "materialIds",
      lecture.materialIds.includes(id) ? lecture.materialIds.filter((x) => x !== id) : [...lecture.materialIds, id],
    );
  }

  function loadFrom(id: string) {
    const src = others.find((o) => o.id === id);
    if (!src) return;
    const hasContent = lecture.goal || lecture.flow || lecture.effect || lecture.schedule.length;
    if (hasContent && !window.confirm("지금 쓴 커리큘럼을 지난 강의 내용으로 바꿀까요?")) return;
    onChange({
      ...lecture,
      goal: src.goal,
      flow: src.flow,
      effect: src.effect,
      schedule: src.schedule.map((r) => ({ ...r, id: newId() })),
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onBack}>
          ← 강의 모아 보기
        </Button>
        <Button
          variant="ghost"
          className="ml-auto text-xs"
          onClick={() => window.confirm("이 강의 카드를 지울까요? 되돌릴 수 없어요.") && onDelete()}
        >
          카드 지우기
        </Button>
      </div>

      <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Section step="1" title="강의 요청">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="강의처">
                <input className={inputClass} value={lecture.org} onChange={(e) => set("org", e.target.value)} placeholder="예: ○○대학교 평생교육원" />
              </Field>
              <Field label="키워드">
                <input className={inputClass} value={lecture.keyword} onChange={(e) => set("keyword", e.target.value)} placeholder="예: 생성형 AI 업무 활용" />
              </Field>
              <Field label="대상">
                <input className={inputClass} value={lecture.audience} onChange={(e) => set("audience", e.target.value)} placeholder="예: 신입 교직원 30명" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="총 시간(분)">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={lecture.totalMinutes}
                    onChange={(e) => set("totalMinutes", Math.max(0, Number(e.target.value) || 0))}
                  />
                </Field>
                <Field label="날짜">
                  <input type="date" className={inputClass} value={lecture.date} onChange={(e) => set("date", e.target.value)} />
                </Field>
              </div>
            </div>
            <Field label="강의 제목">
              <input className={inputClass} value={lecture.title} onChange={(e) => set("title", e.target.value)} placeholder="Claude에게 제목 후보를 받아서 골라도 좋아요" />
            </Field>
          </Section>

          <Section step="2" title="커리큘럼">
            <div className="flex flex-col gap-2 rounded-xl bg-leaf-50 p-3 sm:flex-row sm:items-center">
              <CopyButton label="🍃 Claude에게 보내기 · 커리큘럼 초안 부탁" getText={() => curriculumPrompt(lecture, picked)} />
              <span className="text-xs text-leaf-800">강의 정보 + 쓴 칸 + 고른 내 자료 {picked.length}개가 함께 복사돼요</span>
            </div>
            {others.length > 0 && (
              <Field label="지난 강의에서 불러오기" hint="목표 · 흐름 · 시간표 · 기대효과를 가져와요">
                <select className={inputClass} value="" onChange={(e) => loadFrom(e.target.value)}>
                  <option value="">고르기…</option>
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title || o.keyword || "제목 없는 강의"} {o.org ? `· ${o.org}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="교육목표">
              <textarea className={area} value={lecture.goal} onChange={(e) => set("goal", e.target.value)} />
            </Field>
            <Field label="교육흐름">
              <textarea className={area} value={lecture.flow} onChange={(e) => set("flow", e.target.value)} />
            </Field>

            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-blossom-700">타임스케줄</span>
                <span
                  className={`text-sm font-semibold ${
                    lecture.schedule.length === 0 ? "text-ink-500" : diff === 0 ? "text-leaf-600" : "text-blossom-700"
                  }`}
                >
                  합계 {total}분 / {lecture.totalMinutes}분
                  {lecture.schedule.length > 0 && (diff === 0 ? " ✓ 딱 맞아요" : diff > 0 ? ` · ${diff}분 남아요` : ` · ${-diff}분 넘쳐요`)}
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {lecture.schedule.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <span className="w-6 text-right text-sm text-ink-500">{i + 1}</span>
                    <input className={inputClass} value={r.label} onChange={(e) => setRow(r.id, { label: e.target.value })} placeholder="예: 도입 · 아이스브레이킹" />
                    <input
                      type="number"
                      min={0}
                      className={`${inputClass} w-20 shrink-0`}
                      value={r.minutes}
                      onChange={(e) => setRow(r.id, { minutes: Math.max(0, Number(e.target.value) || 0) })}
                    />
                    <span className="text-sm text-ink-500">분</span>
                    <Button variant="ghost" className="px-2" aria-label="이 줄 지우기" onClick={() => set("schedule", lecture.schedule.filter((x) => x.id !== r.id))}>
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="soft"
                className="mt-2"
                onClick={() => set("schedule", [...lecture.schedule, { id: newId(), label: "", minutes: Math.max(0, diff) || 10 }])}
              >
                + 시간표 줄 추가
              </Button>
            </div>

            <Field label="기대효과">
              <textarea className={area} value={lecture.effect} onChange={(e) => set("effect", e.target.value)} />
            </Field>
          </Section>

          <Section step="3" title="PPT 구성">
            <div className="flex flex-col gap-2 rounded-xl bg-leaf-50 p-3 sm:flex-row sm:items-center">
              <CopyButton label="🍃 Claude에게 보내기 · PPT 구성 부탁" getText={() => pptPrompt(lecture, picked)} />
              <span className="text-xs text-leaf-800">커리큘럼 전체가 같이 가서 다시 설명하지 않아도 돼요</span>
            </div>
            <Field label="PPT 구성" hint="Claude가 준 구성안을 붙여 넣어 저장해요">
              <textarea className={`${area} min-h-60`} value={lecture.ppt} onChange={(e) => set("ppt", e.target.value)} />
            </Field>
          </Section>
        </div>

        <aside className="h-fit rounded-2xl border border-leaf-300 bg-leaf-50 p-5 lg:sticky lg:top-4">
          <h3 className="font-bold text-leaf-800">이 강의에 넣을 내 자료</h3>
          <p className="mt-1 text-xs text-leaf-800">체크한 자료가 「Claude에게 보내기」에 함께 들어가요.</p>
          {materials.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">아직 서랍이 비어 있어요. 위 메뉴의 「내 자료 서랍」에서 추가해 주세요.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {MATERIAL_KINDS.map((k) => {
                const list = materials.filter((m) => m.kind === k.kind);
                if (!list.length) return null;
                return (
                  <div key={k.kind}>
                    <div className="text-xs font-semibold text-leaf-800">
                      {k.emoji} {k.label}
                    </div>
                    <div className="mt-1 space-y-1">
                      {list.map((m) => (
                        <label key={m.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 text-sm hover:bg-leaf-100">
                          <input
                            type="checkbox"
                            className="mt-1 accent-leaf-600"
                            checked={lecture.materialIds.includes(m.id)}
                            onChange={() => toggleMaterial(m.id)}
                          />
                          <span>{m.title || "제목 없음"}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
