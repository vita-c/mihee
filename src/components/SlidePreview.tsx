"use client";

// PPT 미리보기예요. .pptx 를 그리는 exportPptx 와 같은 자리 · 같은 색으로 화면에 그려요.
// 크기는 컨테이너 너비 기준(cqw)이라 큰 화면 · 작은 썸네일이 모두 같은 비율로 보여요.

import { useState } from "react";
import { Slide } from "@/lib/storage";
import { PPT_FONT, PptTheme } from "@/lib/pptThemes";
import { SLIDE_H, SLIDE_W, isCoverLike, splitAgenda, splitPart } from "@/lib/exportPptx";
import { Button } from "./ui";

const pct = (inch: number, of: number) => `${(inch / of) * 100}%`;
const fs = (pt: number) => `${(pt / (SLIDE_W * 72)) * 100}cqw`; // 슬라이드 너비 대비 글자 크기
const c = (hex: string) => `#${hex}`;

function Box({ x, y, w, h, style, children }: { x: number; y: number; w: number; h: number; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", left: pct(x, SLIDE_W), top: pct(y, SLIDE_H), width: pct(w, SLIDE_W), height: pct(h, SLIDE_H), ...style }}>{children}</div>
  );
}

const List = ({ items, pt, color }: { items: string[]; pt: number; color: string }) => (
  <ul style={{ margin: 0, paddingLeft: "1.2em", fontSize: fs(pt), color: c(color), lineHeight: 1.45 }}>
    {items.map((b, i) => (
      <li key={i} style={{ marginBottom: "0.35em" }}>
        {b}
      </li>
    ))}
  </ul>
);

export function SlideView({ slide, theme: t, page }: { slide: Slide; theme: PptTheme; page: number }) {
  const cover = isCoverLike(slide);
  const bg = cover ? t.primary : slide.kind === "section" ? t.soft : t.bg;
  let body: React.ReactNode;

  if (cover) {
    body = (
      <>
        <Box x={0.8} y={2.35} w={0.14} h={1.5} style={{ background: c(t.accent) }} />
        <Box x={1.15} y={2.2} w={11.2} h={1.3} style={{ display: "flex", alignItems: "center", fontSize: fs(40), fontWeight: 700, color: c(t.onPrimary), lineHeight: 1.2 }}>
          {slide.title}
        </Box>
        <Box x={1.15} y={3.6} w={11.2} h={2.6} style={{ fontSize: fs(18), color: c(t.onPrimary), whiteSpace: "pre-line", lineHeight: 1.5 }}>
          {slide.bullets.join("\n")}
        </Box>
      </>
    );
  } else if (slide.kind === "section") {
    const [part, label] = splitPart(slide.title);
    body = (
      <>
        <Box x={0.9} y={1.6} w={11} h={0.7} style={{ fontSize: fs(24), fontWeight: 700, color: c(t.accent) }}>
          {part}
        </Box>
        <Box x={0.9} y={2.3} w={11.5} h={1.2} style={{ fontSize: fs(36), fontWeight: 700, color: c(t.primary), lineHeight: 1.2 }}>
          {label}
        </Box>
        <Box x={0.9} y={3.6} w={1.4} h={0.08} style={{ background: c(t.accent) }} />
        <Box x={0.9} y={3.95} w={11.5} h={2.6}>
          <List items={slide.bullets} pt={20} color={t.text} />
        </Box>
      </>
    );
  } else {
    const head = (
      <>
        <Box x={0.7} y={0.45} w={11.9} h={0.9} style={{ display: "flex", alignItems: "center", fontSize: fs(28), fontWeight: 700, color: c(t.primary) }}>
          {slide.title}
        </Box>
        <Box x={0.7} y={1.35} w={1.2} h={0.07} style={{ background: c(t.accent) }} />
      </>
    );
    if (slide.kind === "agenda") {
      const pt = slide.bullets.length > 10 ? 12 : 14;
      body = (
        <>
          {head}
          <Box x={0.9} y={1.75} w={11.5} h={5.4}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: fs(pt) }}>
              <tbody>
                {slide.bullets.map((b, i) => {
                  const [time, label] = splitAgenda(b);
                  return (
                    <tr key={i}>
                      <td style={{ width: "22.6%", padding: "0.3em 0.6em", border: `1px solid ${c(t.soft)}`, color: c(t.accent), fontWeight: 700 }}>{time}</td>
                      <td style={{ padding: "0.3em 0.6em", border: `1px solid ${c(t.soft)}`, color: c(t.text) }}>{label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        </>
      );
    } else if (slide.kind === "prompt") {
      body = (
        <>
          {head}
          <Box x={0.7} y={1.75} w={4.6} h={5}>
            <List items={slide.bullets} pt={16} color={t.text} />
          </Box>
          <Box x={5.6} y={1.7} w={7.05} h={5.25} style={{ background: c(t.soft), border: `1px solid ${c(t.accent)}`, borderRadius: "1.2cqw" }} />
          <Box x={5.85} y={1.8} w={3} h={0.4} style={{ fontSize: fs(12), fontWeight: 700, color: c(t.accent) }}>
            프롬프트
          </Box>
          <Box x={5.85} y={2.2} w={6.6} h={4.6} style={{ fontSize: fs(13), color: c(t.text), whiteSpace: "pre-wrap", lineHeight: 1.4, overflow: "hidden" }}>
            {slide.prompt || "(프롬프트를 적어 주세요)"}
          </Box>
        </>
      );
    } else {
      body = (
        <>
          {head}
          <Box x={0.9} y={1.8} w={11.6} h={4.9}>
            <List items={slide.bullets} pt={20} color={t.text} />
          </Box>
        </>
      );
    }
    body = (
      <>
        {body}
        <Box x={12.2} y={6.95} w={0.8} h={0.35} style={{ fontSize: fs(10), color: c(t.accent), textAlign: "right" }}>
          {page}
        </Box>
      </>
    );
  }

  return (
    <div style={{ containerType: "inline-size", width: "100%" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: `${SLIDE_W} / ${SLIDE_H}`, background: c(bg), fontFamily: `"${PPT_FONT}", "Malgun Gothic", sans-serif`, overflow: "hidden" }}>
        {body}
      </div>
    </div>
  );
}

// 큰 화면 + 아래 썸네일 줄 + 발표자 메모 + 저장 버튼
export function SlidePreview({
  slides,
  theme,
  onSave,
  onClose,
  saveMsg,
}: {
  slides: Slide[];
  theme: PptTheme;
  onSave: () => void;
  onClose: () => void;
  saveMsg: string;
}) {
  const [i, setI] = useState(0);
  const cur = slides[Math.min(i, slides.length - 1)];
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/60 p-3 sm:p-6" onKeyDown={(e) => {
      if (e.key === "ArrowRight") setI((n) => Math.min(slides.length - 1, n + 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
      if (e.key === "Escape") onClose();
    }} tabIndex={-1}>
      <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col rounded-2xl bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold">PPT 미리보기</h3>
          <span className="text-sm text-ink-500">
            {theme.name} · {slides.length}장
          </span>
          <div className="ml-auto flex gap-2">
            <Button onClick={onSave}>PPT 저장 (.pptx)</Button>
            <Button variant="ghost" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>
        {saveMsg && <p className="mt-1 text-sm text-blossom-700">{saveMsg}</p>}
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" aria-label="이전 장" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
              ◀
            </Button>
            <div className="flex-1 overflow-hidden rounded-lg shadow ring-1 ring-black/10">{cur && <SlideView slide={cur} theme={theme} page={i + 1} />}</div>
            <Button variant="ghost" aria-label="다음 장" onClick={() => setI(Math.min(slides.length - 1, i + 1))} disabled={i >= slides.length - 1}>
              ▶
            </Button>
          </div>
          {cur?.notes && (
            <div className="mx-10 mt-3 rounded-xl bg-leaf-50 p-3 text-sm leading-relaxed">
              <span className="font-semibold text-leaf-800">발표자 메모 · 수업 내용</span>
              <p className="mt-1 whitespace-pre-line">{cur.notes}</p>
            </div>
          )}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {slides.map((s, n) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setI(n)}
                className={`w-36 shrink-0 overflow-hidden rounded ring-2 ${n === i ? "ring-blossom-500" : "ring-transparent"}`}
                aria-label={`${n + 1}번째 장`}
              >
                <SlideView slide={s} theme={theme} page={n + 1} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
