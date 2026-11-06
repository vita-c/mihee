// PPT 구성을 파워포인트(.pptx) 파일로 만들어요. pptxgenjs 로 브라우저 안에서 바로 만들어요.
// 화면 미리보기(SlidePreview)와 같은 자리 · 같은 색으로 그려요. 단위는 인치, 와이드(13.33 × 7.5)예요.

import type PptxGenJS from "pptxgenjs";
import { Slide } from "./storage";
import { PPT_FONT, PptTheme } from "./pptThemes";

export const SLIDE_W = 13.333;
export const SLIDE_H = 7.5;

// 「PART 1. 오리엔테이션」 → ["PART 1", "오리엔테이션"]
export const splitPart = (title: string) => {
  const m = title.match(/^(PART \d+)\.\s*(.*)$/);
  return m ? [m[1], m[2]] : ["", title];
};
// 「10:00~10:20  오리엔테이션」 → ["10:00~10:20", "오리엔테이션"]
export const splitAgenda = (line: string) => {
  const m = line.match(/^(\S+~\S+)\s+(.*)$/);
  return m ? [m[1], m[2]] : ["", line];
};
// 기대효과 · 감사합니다 처럼 표지 모양으로 그리는 장
export const isCoverLike = (s: Slide) => s.kind === "cover" || s.kind === "closing";

type Sld = ReturnType<PptxGenJS["addSlide"]>;

function drawSlide(pptx: PptxGenJS, s: Sld, slide: Slide, t: PptTheme, page: number) {
  const font = { fontFace: PPT_FONT };
  const bullets = (items: string[], size: number, color: string) =>
    items.map((b) => ({ text: b, options: { bullet: { indent: 18 }, fontSize: size, color, paraSpaceAfter: 8 } }));

  if (isCoverLike(slide)) {
    s.background = { color: t.primary };
    s.addShape(pptx.ShapeType.rect, { x: 0.8, y: 2.35, w: 0.14, h: 1.5, fill: { color: t.accent }, line: { color: t.accent } });
    s.addText(slide.title, { ...font, x: 1.15, y: 2.2, w: 11.2, h: 1.3, fontSize: 40, bold: true, color: t.onPrimary, valign: "middle" });
    if (slide.bullets.length)
      s.addText(slide.bullets.join("\n"), { ...font, x: 1.15, y: 3.6, w: 11.2, h: 2.6, fontSize: 18, color: t.onPrimary, valign: "top", paraSpaceAfter: 6 });
    return;
  }

  s.background = { color: slide.kind === "section" ? t.soft : t.bg };
  s.addText(String(page), { ...font, x: 12.2, y: 6.95, w: 0.8, h: 0.35, fontSize: 10, color: t.accent, align: "right" });

  if (slide.kind === "section") {
    const [part, label] = splitPart(slide.title);
    if (part) s.addText(part, { ...font, x: 0.9, y: 1.6, w: 11, h: 0.7, fontSize: 24, bold: true, color: t.accent });
    s.addText(label, { ...font, x: 0.9, y: 2.3, w: 11.5, h: 1.2, fontSize: 36, bold: true, color: t.primary, valign: "top" });
    s.addShape(pptx.ShapeType.rect, { x: 0.9, y: 3.6, w: 1.4, h: 0.08, fill: { color: t.accent }, line: { color: t.accent } });
    if (slide.bullets.length) s.addText(bullets(slide.bullets, 20, t.text), { ...font, x: 0.9, y: 3.95, w: 11.5, h: 2.6, valign: "top" });
    return;
  }

  s.addText(slide.title, { ...font, x: 0.7, y: 0.45, w: 11.9, h: 0.9, fontSize: 28, bold: true, color: t.primary, valign: "middle" });
  s.addShape(pptx.ShapeType.rect, { x: 0.7, y: 1.35, w: 1.2, h: 0.07, fill: { color: t.accent }, line: { color: t.accent } });

  if (slide.kind === "agenda") {
    const size = slide.bullets.length > 10 ? 12 : 14;
    const rows = slide.bullets.map((b) => splitAgenda(b).map((text, i) => ({ text, options: { color: i === 0 ? t.accent : t.text, bold: i === 0 } })));
    s.addTable(rows, { ...font, x: 0.9, y: 1.75, w: 11.5, colW: [2.6, 8.9], fontSize: size, border: { type: "solid", pt: 0.75, color: t.soft }, fill: { color: t.bg }, valign: "middle" });
    return;
  }

  if (slide.kind === "prompt") {
    if (slide.bullets.length) s.addText(bullets(slide.bullets, 16, t.text), { ...font, x: 0.7, y: 1.75, w: 4.6, h: 5, valign: "top" });
    s.addShape(pptx.ShapeType.roundRect, { x: 5.6, y: 1.7, w: 7.05, h: 5.25, fill: { color: t.soft }, line: { color: t.accent, width: 1 }, rectRadius: 0.12 });
    s.addText("프롬프트", { ...font, x: 5.85, y: 1.8, w: 3, h: 0.4, fontSize: 12, bold: true, color: t.accent });
    s.addText(slide.prompt || "(프롬프트를 적어 주세요)", { ...font, x: 5.85, y: 2.2, w: 6.6, h: 4.6, fontSize: 13, color: t.text, valign: "top", paraSpaceAfter: 2 });
    return;
  }

  s.addText(bullets(slide.bullets.length ? slide.bullets : [" "], 20, t.text), { ...font, x: 0.9, y: 1.8, w: 11.6, h: 4.9, valign: "top" });
}

export async function slidesPptx(slides: Slide[], theme: PptTheme, title: string): Promise<Blob> {
  const { default: Pptx } = await import("pptxgenjs");
  const pptx = new Pptx();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = title;
  pptx.author = "사과꽃 강의실";
  slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    drawSlide(pptx, s, slide, theme, i + 1);
    if (slide.notes.trim()) s.addNotes(slide.notes);
  });
  return (await pptx.write({ outputType: "blob" })) as Blob;
}
