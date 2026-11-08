"use client";

import { Lecture, Material, MATERIAL_KINDS, ScheduleRow, newId, padSubs, scheduleTotal } from "@/lib/storage";
import { useState } from "react";
import { curriculumPrompt, learnedText, pptPrompt } from "@/lib/prompts";
import { titleIdeas } from "@/lib/titleIdeas";
import { ScheduleOption, TextField, curriculumDraft, scheduleOptions, textOptions } from "@/lib/curriculumDraft";
import { curriculumDoc, docFileName } from "@/lib/curriculumDoc";
import { curriculumDocx } from "@/lib/exportDocx";
import { curriculumHwpx } from "@/lib/exportHwpx";
import { printCurriculum } from "@/lib/exportPdf";
import { download } from "@/lib/zipWrite";
import { Button, CopyButton, Field, inputClass, useConfirm } from "./ui";
import { PptSection } from "./PptSection";
import { LastLearned, LogSection } from "./LogSection";

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
  const [ideas, setIdeas] = useState<string[]>([]);
  const showIdeas = () => setIdeas(titleIdeas(lecture.keyword, lecture.audience, lecture.totalMinutes, ideas));
  const [textRegen, setTextRegen] = useState<Partial<Record<TextField, string[]>>>({});
  const [schedRegen, setSchedRegen] = useState<ScheduleOption[]>([]);
  const canRegen = Boolean(lecture.keyword.trim());
  const [saveMsg, setSaveMsg] = useState("");
  const { ask, dialog } = useConfirm();
  const [learnedFrom, setLearnedFrom] = useState<Lecture | null>(null);

  async function saveDoc(kind: "hwpx" | "docx" | "pdf") {
    const doc = curriculumDoc(lecture);
    setSaveMsg("");
    try {
      if (kind === "pdf") {
        printCurriculum(doc);
        setSaveMsg("인쇄 창이 열려요. 프린터에서 「PDF로 저장」을 고르세요.");
        return;
      }
      const blob = kind === "hwpx" ? await curriculumHwpx(doc) : curriculumDocx(doc);
      download(blob, docFileName(doc, kind));
      setSaveMsg(`「${docFileName(doc, kind)}」을 내려받았어요. 다운로드 폴더를 확인하세요.`);
    } catch {
      setSaveMsg("문서를 만들지 못했어요. 다시 눌러 주세요.");
    }
  }

  const scheduleKey = (rows: ScheduleRow[]) => rows.map((r) => `${r.label}|${r.minutes}`).join("/");

  // 교육목표 · 교육흐름 · 기대효과: 칸 위 「다시 생성」 → 후보 3개 중 고르면 칸에 들어가요
  function textBlock(field: TextField, label: string) {
    const options = textRegen[field] ?? [];
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-blossom-700">{label}</span>
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            disabled={!canRegen}
            onClick={() => setTextRegen({ ...textRegen, [field]: textOptions(lecture, field, [...options, lecture[field]]) })}
          >
            🔄 다시 생성
          </Button>
        </div>
        <textarea className={`${area} mt-1`} value={lecture[field]} onChange={(e) => set(field, e.target.value)} />
        {options.length > 0 && (
          <div className="mt-2 space-y-2 rounded-xl bg-blossom-50 p-3">
            <div className="flex items-center text-xs text-ink-500">
              고르면 위 칸에 들어가요
              <button type="button" className="ml-auto hover:text-blossom-700" onClick={() => setTextRegen({ ...textRegen, [field]: [] })}>
                닫기
              </button>
            </div>
            {options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => set(field, o)}
                className={`block w-full whitespace-pre-line rounded-lg border bg-white p-3 text-left text-sm leading-relaxed ${
                  lecture[field] === o ? "border-blossom-500 ring-2 ring-blossom-100" : "border-blossom-200 hover:border-blossom-500"
                }`}
              >
                {lecture[field] === o && <span className="mb-1 block text-xs font-semibold text-blossom-700">✓ 고른 것</span>}
                {o}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

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

  async function generate() {
    const draft = curriculumDraft(lecture);
    if (!draft) return;
    const hasContent = lecture.goal || lecture.flow || lecture.effect || lecture.schedule.length;
    if (hasContent && !(await ask("지금 쓴 커리큘럼을 새 초안으로 바꿀까요?", "바꾸기"))) return;
    onChange({ ...lecture, ...draft });
  }

  async function loadFrom(id: string) {
    const src = others.find((o) => o.id === id);
    if (!src) return;
    setLearnedFrom(src);
    const hasContent = lecture.goal || lecture.flow || lecture.effect || lecture.schedule.length;
    if (hasContent && !(await ask("지금 쓴 커리큘럼을 지난 강의 내용으로 바꿀까요?", "바꾸기"))) return;
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
      {dialog}
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onBack}>
          ← 강의 모아 보기
        </Button>
        <Button
          variant="ghost"
          className="ml-auto text-xs"
          onClick={async () => (await ask("이 강의 카드를 지울까요?\n되돌릴 수 없어요.", "지우기")) && onDelete()}
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
              <input className={inputClass} value={lecture.title} onChange={(e) => set("title", e.target.value)} placeholder="아래 「제목 후보 보기」에서 골라도 좋아요" />
            </Field>
            <div className="rounded-xl bg-blossom-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="soft" onClick={showIdeas} disabled={!lecture.keyword.trim()}>
                  {ideas.length ? "🔄 다시 보기" : "✨ 제목 후보 5개 보기"}
                </Button>
                <span className="text-xs text-ink-500">
                  {lecture.keyword.trim() ? "키워드 · 대상 · 총 시간으로 만들어요. 고르면 강의 제목에 들어가요" : "키워드를 먼저 넣어 주세요"}
                </span>
              </div>
              {ideas.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {ideas.map((t) => (
                    <label key={t} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white">
                      <input
                        type="radio"
                        name={`title-${lecture.id}`}
                        className="accent-blossom-500"
                        checked={lecture.title === t}
                        onChange={() => set("title", t)}
                      />
                      <span className="text-[15px]">{t}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <Section step="2" title="커리큘럼">
            <div className="flex flex-col gap-2 rounded-xl bg-blossom-50 p-3 sm:flex-row sm:items-center">
              <Button onClick={generate} disabled={!lecture.keyword.trim()}>
                📝 커리큘럼 생성
              </Button>
              <span className="text-xs text-ink-500">
                {lecture.keyword.trim()
                  ? `키워드 · 대상 · 총 ${lecture.totalMinutes}분으로 4칸을 바로 채워요. 채운 뒤 고쳐 쓰면 돼요`
                  : "1번에 키워드를 먼저 넣어 주세요"}
              </span>
            </div>
            <div className="flex flex-col gap-2 rounded-xl bg-leaf-50 p-3 sm:flex-row sm:items-center">
              <CopyButton label="🍃 Claude에게 보내기 · 커리큘럼 초안 부탁" getText={() => curriculumPrompt(lecture, picked, learnedFrom)} />
              <span className="text-xs text-leaf-800">
                강의 정보 + 쓴 칸 + 고른 내 자료 {picked.length}개
                {learnedFrom && learnedText(learnedFrom) ? " + 지난번에 배운 것" : ""}이 함께 복사돼요
              </span>
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
            {learnedFrom && <LastLearned src={learnedFrom} onClose={() => setLearnedFrom(null)} />}
            {textBlock("goal", "교육목표")}
            {textBlock("flow", "교육흐름")}

            <div>
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="text-sm font-semibold text-blossom-700">타임스케줄</span>
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs"
                  disabled={!canRegen}
                  onClick={() => setSchedRegen(scheduleOptions(lecture, schedRegen.map((o) => o.name)))}
                >
                  🔄 다시 생성
                </Button>
                <span
                  className={`ml-auto text-sm font-semibold ${
                    lecture.schedule.length === 0 ? "text-ink-500" : diff === 0 ? "text-leaf-600" : "text-blossom-700"
                  }`}
                >
                  합계 {total}분 / {lecture.totalMinutes}분
                  {lecture.schedule.length > 0 && (diff === 0 ? " ✓ 딱 맞아요" : diff > 0 ? ` · ${diff}분 남아요` : ` · ${-diff}분 넘쳐요`)}
                </span>
              </div>
              {schedRegen.length > 0 && (
                <div className="mt-2 rounded-xl bg-blossom-50 p-3">
                  <div className="flex items-center text-xs text-ink-500">
                    구성 방식을 고르면 아래 시간표가 바뀌어요
                    <button type="button" className="ml-auto hover:text-blossom-700" onClick={() => setSchedRegen([])}>
                      닫기
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    {schedRegen.map((o) => {
                      const chosen = scheduleKey(lecture.schedule) === scheduleKey(o.rows);
                      return (
                        <button
                          key={o.name}
                          type="button"
                          onClick={() => set("schedule", o.rows.map((r) => ({ ...r, id: newId() })))}
                          className={`rounded-lg border bg-white p-3 text-left text-xs leading-relaxed ${
                            chosen ? "border-blossom-500 ring-2 ring-blossom-100" : "border-blossom-200 hover:border-blossom-500"
                          }`}
                        >
                          <span className="mb-1 block text-sm font-semibold text-blossom-700">
                            {chosen && "✓ "}
                            {o.name}
                          </span>
                          {o.rows.map((r) => (
                            <span key={r.id} className="mt-1 block">
                              <span className="flex gap-2 font-semibold">
                                <span className="flex-1">{r.label}</span>
                                <span className="shrink-0 font-normal text-ink-500">{r.minutes}분</span>
                              </span>
                              {r.subs.filter(Boolean).map((sub) => (
                                <span key={sub} className="block pl-2 text-ink-500">
                                  └ {sub}
                                </span>
                              ))}
                            </span>
                          ))}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="mt-2 space-y-2">
                {lecture.schedule.map((r, i) => (
                  <div key={r.id}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-right text-sm text-ink-500">{i + 1}</span>
                    <input className={`${inputClass} min-w-0 flex-1 font-semibold`} value={r.label} onChange={(e) => setRow(r.id, { label: e.target.value })} placeholder="큰 제목 · 예: 도입 · 아이스브레이킹" />
                    <input
                      type="number"
                      min={0}
                      className={`${inputClass.replace("w-full", "")} w-20 shrink-0`}
                      value={r.minutes}
                      onChange={(e) => setRow(r.id, { minutes: Math.max(0, Number(e.target.value) || 0) })}
                    />
                    <span className="text-sm text-ink-500">분</span>
                    <Button variant="ghost" className="px-2" aria-label="이 줄 지우기" onClick={() => set("schedule", lecture.schedule.filter((x) => x.id !== r.id))}>
                      ✕
                    </Button>
                  </div>
                  {r.label.trim() !== "휴식" && (
                    <div className="mt-1 space-y-1 pl-8 pr-[8.5rem]">
                      {r.subs.map((sub, k) => (
                        <div key={k} className="flex items-center gap-1.5">
                          <span className="text-xs text-ink-500">└</span>
                          <input
                            className={`${inputClass} py-1 text-sm`}
                            value={sub}
                            onChange={(e) => setRow(r.id, { subs: r.subs.map((x, m) => (m === k ? e.target.value : x)) })}
                            placeholder={`소제목 ${k + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                ))}
              </div>
              <Button
                variant="soft"
                className="mt-2"
                onClick={() => set("schedule", [...lecture.schedule, { id: newId(), label: "", minutes: Math.max(0, diff) || 10, subs: padSubs() }])}
              >
                + 시간표 줄 추가
              </Button>
            </div>

            {textBlock("effect", "기대효과")}
          </Section>

          <Section step="📄" title="커리큘럼 문서로 저장">
            <p className="-mt-2 text-sm text-ink-500">강의 제목 · 교육목표 · 교육흐름 · 시간표 · 기대효과를 계획서 양식 문서로 만들어요.</p>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="시작 시간" hint="시간표 칸의 시각을 여기서부터 계산해요">
                <input
                  type="time"
                  step={300}
                  className={`${inputClass.replace("w-full", "")} w-36`}
                  value={lecture.startTime || "10:00"}
                  onChange={(e) => set("startTime", e.target.value || "10:00")}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveDoc("hwpx")}>한글 문서 저장 (.hwpx)</Button>
              <Button onClick={() => saveDoc("docx")}>Word 저장 (.docx)</Button>
              <Button variant="soft" onClick={() => saveDoc("pdf")}>
                PDF 저장
              </Button>
            </div>
            {saveMsg && <p className="text-sm text-blossom-700">{saveMsg}</p>}
          </Section>

          <Section step="3" title="PPT 구성">
            <PptSection lecture={lecture} materials={materials} onChange={onChange} ask={ask} />
            <div className="flex flex-col gap-2 rounded-xl bg-leaf-50 p-3 sm:flex-row sm:items-center">
              <CopyButton label="🍃 Claude에게 보내기 · PPT 구성 부탁" getText={() => pptPrompt(lecture, picked)} />
              <span className="text-xs text-leaf-800">커리큘럼 전체가 같이 가서 다시 설명하지 않아도 돼요</span>
            </div>
            <Field label="Claude 구성안 메모" hint="Claude가 준 구성안을 붙여 넣어 두는 칸이에요">
              <textarea className={`${area} min-h-32`} value={lecture.ppt} onChange={(e) => set("ppt", e.target.value)} />
            </Field>
          </Section>

          <Section step="4" title="📒 수업 로그">
            <LogSection lecture={lecture} onChange={onChange} />
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
