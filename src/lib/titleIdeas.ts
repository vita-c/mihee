// 키워드 · 대상 · 총 시간을 틀에 끼워서 강의 제목 후보를 만들어요. AI 없이 브라우저 안에서 바로 만들어요.

import { cleanAudience, josa, splitKeywords } from "./korean";

type Parts = { A: string; K: string; K2: string; T: string };

// {A} 대상 · {K} 주제 · {K2} 나머지 키워드 · {T} 시간. 조사는 {을}{로}{과}{의} 처럼 앞말에 맞춰 바꿔요.
const TEMPLATES = [
  "{A}{을} 위한 {K} 실전",
  "{K2}, {K}{로} 빠르게",
  "{T}에 끝내는 {K} 업무 활용",
  "{K}{로} 끝내는 {K2}",
  "일 잘하는 {A}의 {K} 활용법",
  "{K} 실무 마스터: {K2}",
  "처음 만나는 {K}, 바로 쓰는 {K2}",
  "{A} 맞춤 {K} 실습 과정",
  "{K}{로} 바꾸는 {A}의 일하는 방식",
  "{K2} 자동화, {K}{로} 시작하기",
  "현장에서 바로 쓰는 {K}",
  "{K} 업무 혁신 워크숍",
  "따라 하며 익히는 {K}: {K2}",
  "{A}의 시간을 줄이는 {K}",
  "{T} 완성 {K} 실무 과정",
  "{K}{과} 함께하는 {K2} 작성법",
  "오늘부터 쓰는 {K}, {A} 실무편",
  "{K2}{을} {K}{로} 한 번에",
];

function parts(keyword: string, audience: string, minutes: number): Parts | null {
  const words = splitKeywords(keyword);
  if (!words.length) return null;
  const [K, ...rest] = words;
  const A = cleanAudience(audience);
  const T = minutes >= 360 ? "하루" : minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60}시간` : minutes ? `${minutes}분` : "";
  return { A, K, K2: rest.slice(0, 2).join("·"), T };
}

function fill(template: string, p: Parts) {
  for (const key of ["A", "K", "K2", "T"] as const) if (template.includes(`{${key}}`) && !p[key]) return null;
  return template.replace(/\{(A|K2|K|T)\}(\{(을|로|과)\})?/g, (_, key: keyof Parts, __, j?: string) => p[key] + (j ? josa(p[key], j) : ""));
}

export function titleIdeas(keyword: string, audience: string, minutes: number, avoid: string[] = [], count = 5) {
  const p = parts(keyword, audience, minutes);
  if (!p) return [];
  const all = [...new Set(TEMPLATES.map((t) => fill(t, p)).filter((t): t is string => Boolean(t)))];
  const shuffle = (list: string[]) => list.map((t) => [Math.random(), t] as const).sort((a, b) => a[0] - b[0]).map(([, t]) => t);
  // 방금 본 것은 뒤로 미뤄서, 다시 보기를 누르면 되도록 새 후보가 나오게 해요
  const fresh = shuffle(all.filter((t) => !avoid.includes(t)));
  const seen = shuffle(all.filter((t) => avoid.includes(t)));
  return [...fresh, ...seen].slice(0, count);
}
