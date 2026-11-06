"use client";

// 3번 PPT 구성: 디자인 컨셉 고르기 → PPT 구성 만들기(장마다 내용 · 프롬프트 · 수업 메모) → PPT 작성(미리보기 · .pptx 저장)

import { useState } from "react";
import { Lecture, Material, Slide, SLIDE_KINDS, SlideKind, newId } from "@/lib/storage";
import { PPT_THEMES, themeOf } from "@/lib/pptThemes";
import { pptSlides } from "@/lib/pptSlides";
import { slidesPptx } from "@/lib/exportPptx";
import { curriculumDoc, docFileName } from "@/lib/curriculumDoc";
import { download } from "@/lib/zipWrite";
import { Button, inputClass } from "./ui";
import { SlidePreview, SlideView } from "./SlidePreview";

const KIND_LABEL: Record<SlideKind, string> = {
  cover: "표지",
  intro: "강사 소개",
  goal: "목표",
  agenda: "흐름",
  section: "구분",
  content: "내용",
  prompt: "프롬프트",
  closing: "마무리",
};

export function PptSection({
  lecture,
  materials,
  onChange,
  ask,
}: {
  lecture: Lecture;
  materials: Material[];
  onChange: (l: Lecture) => void;
  ask: (message: string, okLabel?: string) => Promise<boolean>;
}) {
  const theme = themeOf(lecture.pptTheme);
  const slides = lecture.slides ?? [];
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const setSlides = (next: Slide[]) => onChange({ ...lecture, slides: next });
  const patch = (id: string, p: Partial<Slide>) => setSlides(slides.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const move = (i: number, d: number) => {
    const next = [...slides];
    const [x] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + d)), 0, x);
    setSlides(next);
  };

  async function build() {
    if (slides.length && !(await ask("지금 PPT 구성을 커리큘럼으로 새로 만들까요?\n고친 내용은 바뀌어요.", "새로 만들기"))) return null;
    const next = pptSlides(lecture, materials);
    setSlides(next);
    setOpen(null);
    return next;
  }

  async function write() {
    setMsg("");
    if (!slides.length) {
      const next = pptSlides(lecture, materials);
      setSlides(next);
    }
    setPreview(true);
  }

  async function save() {
    try {
      setMsg("PPT 파일을 만드는 중…");
      const blob = await slidesPptx(slides.length ? slides : pptSlides(lecture, materials), theme, curriculumDoc(lecture).title);
      const name = docFileName(curriculumDoc(lecture), "pptx").replace(" 커리큘럼.pptx", " 강의.pptx");
      download(blob, name);
      setMsg(`「${name}」을 내려받았어요. 다운로드 폴더를 확인하세요.`);
    } catch {
      setMsg("PPT 파일을 만들지 못했어요. 다시 눌러 주세요.");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-blossom-700">디자인 컨셉</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {PPT_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ ...lecture, pptTheme: t.id })}
              className={`rounded-xl border bg-white p-2 text-left ${theme.id === t.id ? "border-blossom-500 ring-2 ring-blossom-100" : "border-blossom-200 hover:border-blossom-500"}`}
            >
              <div className="flex h-12 overflow-hidden rounded-md">
                <div className="flex-[2]" style={{ background: `#${t.primary}` }} />
                <div className="flex-1" style={{ background: `#${t.accent}` }} />
                <div className="flex-1" style={{ background: `#${t.soft}` }} />
                <div className="flex-1 border-l border-black/5" style={{ background: `#${t.bg}` }} />
              </div>
              <div className="mt-1.5 text-sm font-semibold">
                {theme.id === t.id && "✓ "}
                {t.name}
              </div>
              <div className="text-xs text-ink-500">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-blossom-50 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button variant="soft" onClick={build} disabled={!lecture.keyword.trim()}>
          📝 PPT 구성 만들기
        </Button>
        <Button onClick={write} disabled={!lecture.keyword.trim() && !slides.length}>
          🎨 PPT 작성 · 미리보기
        </Button>
        <span className="text-xs text-ink-500">
          {slides.length ? `${slides.length}장 · 아래에서 장마다 고칠 수 있어요` : "커리큘럼으로 장마다 내용 · 실습 프롬프트 · 수업 메모를 만들어요"}
        </span>
      </div>
      {msg && !preview && <p className="text-sm text-blossom-700">{msg}</p>}

      {slides.length > 0 && (
        <div className="space-y-2">
          {slides.map((s, i) => {
            const isOpen = open === s.id;
            return (
              <div key={s.id} className="rounded-xl border border-blossom-200 bg-white">
                <div className="flex items-center gap-2 p-2">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setOpen(isOpen ? null : s.id)}>
                    <div className="w-28 shrink-0 overflow-hidden rounded ring-1 ring-black/10">
                      <SlideView slide={s} theme={theme} page={i + 1} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-ink-500">
                        {i + 1} · {KIND_LABEL[s.kind]}
                        {s.prompt && " · 프롬프트 있음"}
                      </div>
                      <div className="truncate font-semibold">{s.title || "제목 없음"}</div>
                    </div>
                  </button>
                  <Button variant="ghost" className="px-2 py-1 text-xs" aria-label="위로" onClick={() => move(i, -1)} disabled={i === 0}>
                    ↑
                  </Button>
                  <Button variant="ghost" className="px-2 py-1 text-xs" aria-label="아래로" onClick={() => move(i, 1)} disabled={i === slides.length - 1}>
                    ↓
                  </Button>
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setOpen(isOpen ? null : s.id)}>
                    {isOpen ? "접기" : "고치기"}
                  </Button>
                </div>
                {isOpen && (
                  <div className="space-y-3 border-t border-blossom-100 p-3">
                    <div className="flex flex-wrap gap-2">
                      <input className={`${inputClass} min-w-0 flex-1 font-semibold`} value={s.title} onChange={(e) => patch(s.id, { title: e.target.value })} placeholder="장 제목" />
                      <select className={`${inputClass.replace("w-full", "")} w-32`} value={s.kind} onChange={(e) => patch(s.id, { kind: e.target.value as SlideKind })}>
                        {SLIDE_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {KIND_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="block">
                      <span className="text-xs font-semibold text-blossom-700">내용 (한 줄에 하나)</span>
                      <textarea
                        className={`${inputClass} mt-1 min-h-24 resize-y text-sm leading-relaxed`}
                        value={s.bullets.join("\n")}
                        onChange={(e) => patch(s.id, { bullets: e.target.value.split("\n") })}
                      />
                    </label>
                    {(s.kind === "prompt" || s.prompt) && (
                      <label className="block">
                        <span className="text-xs font-semibold text-blossom-700">화면에 보여 줄 프롬프트</span>
                        <textarea className={`${inputClass} mt-1 min-h-40 resize-y text-sm leading-relaxed`} value={s.prompt} onChange={(e) => patch(s.id, { prompt: e.target.value })} />
                      </label>
                    )}
                    <label className="block">
                      <span className="text-xs font-semibold text-leaf-800">발표자 메모 · 수업 내용 (PPT 메모 칸에 들어가요)</span>
                      <textarea className={`${inputClass} mt-1 min-h-20 resize-y text-sm leading-relaxed`} value={s.notes} onChange={(e) => patch(s.id, { notes: e.target.value })} />
                    </label>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        className="text-xs"
                        onClick={async () => (await ask("이 장을 지울까요?", "지우기")) && setSlides(slides.filter((x) => x.id !== s.id))}
                      >
                        이 장 지우기
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <Button
            variant="soft"
            onClick={() => {
              const s: Slide = { id: newId(), kind: "content", title: "새 장", bullets: [""], prompt: "", notes: "" };
              setSlides([...slides, s]);
              setOpen(s.id);
            }}
          >
            + 장 추가
          </Button>
        </div>
      )}

      {preview && slides.length > 0 && (
        <SlidePreview
          slides={slides.map((s) => ({ ...s, bullets: s.bullets.filter((b) => b.trim()) }))}
          theme={theme}
          onSave={save}
          onClose={() => {
            setPreview(false);
            setMsg("");
          }}
          saveMsg={msg}
        />
      )}
    </div>
  );
}
