// 커리큘럼 문서(한글 · 워드 · PDF)에 들어갈 내용을 한 번에 정리해요. 세 형식이 모두 이걸 받아서 그려요.
// 양식: 제목 상자 → Ⅰ 교육 목표 → Ⅱ 교육 흐름 → Ⅲ 교육 내용(시간표 표) → Ⅳ 기대효과

import { Lecture } from "./storage";

export type DocRow = { no: string; time: string; label: string; subs: string[]; isBreak: boolean };

export type CurriculumDoc = {
  title: string;
  info: string[];
  goals: string[];
  flows: string[];
  rows: DocRow[];
  effects: string[];
  note: string;
};

export const SECTIONS = ["교육 목표", "교육 흐름", "교육 내용", "기대효과"];
export const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ"];

// "- 줄" · "• 줄" 앞 기호는 떼고, 빈 줄은 빼요. 기호는 문서 쪽에서 다시 붙여요.
const lines = (text: string) =>
  text
    .split("\n")
    .map((s) => s.replace(/^\s*[-•·*]\s*/, "").trim())
    .filter(Boolean);

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fmt = (min: number) => `${Math.floor(min / 60) % 24}:${String(min % 60).padStart(2, "0")}`;

function hours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h}시간` : "", m ? `${m}분` : ""].filter(Boolean).join(" ");
}

export function curriculumDoc(l: Lecture): CurriculumDoc {
  let t = toMin(l.startTime || "10:00");
  let n = 0;
  const rows = l.schedule.map((r) => {
    const isBreak = r.label.trim() === "휴식";
    const time = `${fmt(t)}~${fmt(t + r.minutes)}`;
    t += r.minutes;
    return { no: isBreak ? "" : String(++n), time, label: r.label.trim() || "(제목 없음)", subs: r.subs.map((s) => s.trim()).filter(Boolean), isBreak };
  });
  const when = [l.date, l.totalMinutes ? `총 ${hours(l.totalMinutes)}` : ""].filter(Boolean).join(" · ");
  return {
    title: l.title.trim() || l.keyword.trim() || "강의 커리큘럼",
    info: [l.org && `교육 기관: ${l.org}`, l.audience && `교육 대상: ${l.audience}`, when && `교육 일시: ${when}`].filter(
      (x): x is string => Boolean(x),
    ),
    goals: lines(l.goal),
    flows: lines(l.flow),
    rows,
    effects: lines(l.effect),
    note: "- 교육 내용은 교육 진행에 따라 변경될 수 있습니다. -",
  };
}

export const docFileName = (doc: CurriculumDoc, ext: string) => `${doc.title.replace(/[\\/:*?"<>|]/g, " ").trim()} 커리큘럼.${ext}`;

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
