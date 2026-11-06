// 제목 후보 · 커리큘럼 초안이 같이 쓰는 한국어 도우미예요.

// 받침이 있으면 앞 것, 없으면 뒤 것. 로/으로는 ㄹ 받침도 "로"예요. 한글이 아닌 끝(AI 등)은 받침 없음으로 봐요.
export function josa(word: string, kind: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const jong = code >= 0 && code <= 11171 ? code % 28 : 0;
  if (kind === "로") return jong && jong !== 8 ? "으로" : "로";
  if (kind === "을") return jong ? "을" : "를";
  if (kind === "과") return jong ? "과" : "와";
  if (kind === "은") return jong ? "은" : "는";
  if (kind === "이") return jong ? "이" : "가";
  return kind;
}

// "생성형, 보고서, 사업계획서" → ["생성형 AI", "보고서", "사업계획서"]
export function splitKeywords(keyword: string) {
  return keyword
    .split(/[,，/·]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => (w === "생성형" ? "생성형 AI" : w));
}

// "재직자 20명" → "재직자"
export const cleanAudience = (audience: string) =>
  audience.replace(/\d+\s*(명|인)?/g, "").replace(/\s+/g, " ").trim();
