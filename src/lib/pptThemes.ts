// PPT 디자인 컨셉이에요. 미리보기(화면)와 .pptx 저장이 같은 색을 써요. 색은 # 없이 6자리예요.

export type PptTheme = {
  id: string;
  name: string;
  desc: string;
  bg: string; // 본문 바탕
  primary: string; // 표지 · 제목 색
  accent: string; // 강조 줄 · 번호
  text: string; // 본문 글자
  soft: string; // 상자 · 섹션 바탕
  onPrimary: string; // 표지 위 글자
};

export const PPT_THEMES: PptTheme[] = [
  { id: "blossom", name: "사과꽃 파스텔", desc: "연분홍 + 연두, 부드럽고 따뜻하게", bg: "FFF9F7", primary: "C2416B", accent: "6FA45A", text: "3A2E2E", soft: "FDE7EC", onPrimary: "FFFFFF" },
  { id: "blue", name: "비즈니스 블루", desc: "기관 · 기업 교육에 무난하게", bg: "FFFFFF", primary: "1F4E9C", accent: "2E9CDB", text: "1F2937", soft: "E8F0FB", onPrimary: "FFFFFF" },
  { id: "dark", name: "모던 다크", desc: "어두운 바탕에 노랑 포인트", bg: "1E2230", primary: "F2B84B", accent: "5CC8C2", text: "F3F4F6", soft: "2C3245", onPrimary: "1E2230" },
  { id: "beige", name: "따뜻한 베이지", desc: "차분한 갈색 톤, 강의실 느낌", bg: "F7F1E8", primary: "8A5A3C", accent: "D08C60", text: "3E3128", soft: "EADFCF", onPrimary: "FFFFFF" },
  { id: "mono", name: "깔끔한 모노", desc: "흑백에 주황 한 점, 군더더기 없이", bg: "FFFFFF", primary: "111111", accent: "E4572E", text: "222222", soft: "F1F1F1", onPrimary: "FFFFFF" },
];

export const themeOf = (id: string) => PPT_THEMES.find((t) => t.id === id) ?? PPT_THEMES[0];

export const PPT_FONT = "맑은 고딕";
