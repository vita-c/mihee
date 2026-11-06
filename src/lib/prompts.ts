// 「Claude에게 보내기」 버튼이 복사하는 요청 문장을 만들어요.
// 강의 정보 + 지금까지 쓴 커리큘럼 + 고른 내 자료를 한 번에 묶어서, 앞 내용을 다시 설명하지 않게 해요.

import { Lecture, Material, MATERIAL_KINDS, scheduleTotal } from "./storage";

const or = (v: string, fallback = "(아직 비어 있음)") => (v.trim() ? v.trim() : fallback);

function lectureInfo(l: Lecture) {
  return [
    `- 강의처: ${or(l.org)}`,
    `- 키워드: ${or(l.keyword)}`,
    `- 대상: ${or(l.audience)}`,
    `- 총 시간: ${l.totalMinutes}분`,
    `- 날짜: ${or(l.date)}`,
    `- 강의 제목: ${or(l.title)}`,
  ].join("\n");
}

function curriculumText(l: Lecture) {
  const schedule = l.schedule.length
    ? l.schedule
        .map((r) =>
          [`  - ${or(r.label, "(이름 없음)")} · ${r.minutes}분`, ...r.subs.filter((s) => s.trim()).map((s) => `      · ${s.trim()}`)].join("\n"),
        )
        .join("\n") + `\n  (합계 ${scheduleTotal(l)}분)`
    : "  (아직 비어 있음)";
  return [
    `[교육목표]\n${or(l.goal)}`,
    `[교육흐름]\n${or(l.flow)}`,
    `[타임스케줄]\n${schedule}`,
    `[기대효과]\n${or(l.effect)}`,
  ].join("\n\n");
}

function materialsText(materials: Material[]) {
  if (!materials.length) return "(고른 자료 없음)";
  return materials
    .map((m) => {
      const kind = MATERIAL_KINDS.find((k) => k.kind === m.kind)?.label ?? "";
      return `### ${kind} · ${or(m.title, "제목 없음")}\n${m.body.trim()}`;
    })
    .join("\n\n");
}

export function curriculumPrompt(l: Lecture, materials: Material[]) {
  return `강의 커리큘럼 초안을 같이 만들어 줘. 나는 대학 강의와 교육과정을 만드는 강사야.

## 강의 정보
${lectureInfo(l)}

## 지금까지 쓴 커리큘럼 (비어 있는 칸을 채우고, 쓴 칸은 다듬어 줘)
${curriculumText(l)}

## 내 자료 (내 경력과 사례를 살려서 써 줘)
${materialsText(materials)}

## 부탁
1. 강의 제목 후보 3개
2. 교육목표 (3줄 이내)
3. 교육흐름 (도입 → 전개 → 정리)
4. 타임스케줄: 총 ${l.totalMinutes}분에 정확히 맞게, 시간마다 "큰 제목 · 분" 한 줄과 그 아래 소제목 2개
5. 기대효과 (3줄 이내)
내 자료에 없는 경력이나 숫자는 지어내지 말고, 필요하면 [확인 필요]라고 표시해 줘.`;
}

export function pptPrompt(l: Lecture, materials: Material[]) {
  return `아래 커리큘럼으로 강의 PPT 구성안을 만들어 줘.

## 강의 정보
${lectureInfo(l)}

## 커리큘럼
${curriculumText(l)}

## 지금까지 쓴 PPT 구성 (있으면 이어서 다듬어 줘)
${or(l.ppt)}

## 내 자료 (강사 소개 · 사례 · 활동에 그대로 살려 줘)
${materialsText(materials)}

## 부탁
- 슬라이드마다 "번호. 제목 / 핵심 문장 2~3개 / 넣을 그림·활동"
- 첫 장은 강의 제목, 둘째 장은 강사 소개
- 타임스케줄 순서를 그대로 따라가고, 활동 슬라이드에는 진행 시간을 적어 줘
- 내 자료에 없는 경력이나 숫자는 지어내지 말고 [확인 필요]라고 표시해 줘`;
}
