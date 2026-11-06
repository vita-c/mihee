// 커리큘럼(강의 정보 · 목표 · 시간표 · 기대효과)으로 PPT 구성을 만들어요. AI 없이 틀에 끼워 만드는 초안이에요.
// 시간표 줄마다: 구분 장(PART) → 그 시간에 맞는 내용 장(할 수 있는 일 · 실습 프롬프트 · 체크리스트 …)
// 장마다 발표자 메모(notes)에 몇 분 동안 무엇을 말하고 시킬지 수업 내용을 적어요.

import { Lecture, Material, Slide, SlideKind, newId } from "./storage";
import { curriculumDoc } from "./curriculumDoc";
import { cleanAudience, josa, splitKeywords } from "./korean";

const lines = (text: string) =>
  text
    .split("\n")
    .map((s) => s.replace(/^\s*[-•·*]\s*/, "").trim())
    .filter(Boolean);

const slide = (kind: SlideKind, title: string, bullets: string[] = [], o: { prompt?: string; notes?: string } = {}): Slide => ({
  id: newId(),
  kind,
  title,
  bullets,
  prompt: o.prompt ?? "",
  notes: o.notes ?? "",
});

// 주제에 맞는 실습 프롬프트. [ ] 칸은 수강생이 자기 업무로 바꿔 넣어요.
function practicePrompt(t: string, who: string) {
  if (/엑셀|표|데이터|통계|매출/.test(t))
    return `너는 ${who}의 업무 데이터를 읽고 보고서로 정리하는 분석가야.
아래 표(엑셀에서 그대로 복사해 붙여 넣기)를 보고 분석 보고서를 만들어 줘.

[표] (여기에 붙여 넣기)
[보고 목적] [예: 월간 실적 보고]
[읽는 사람] [예: 팀장님]

1) 꼭 봐야 할 숫자 3개와 그 의미
2) 지난번과 비교해 눈에 띄는 변화
3) 보고서에 바로 넣을 문장 5줄
4) 넣으면 좋은 그래프 종류 추천
숫자는 표에 있는 것만 쓰고, 계산한 값은 계산식을 같이 적어 줘.`;
  if (/계획서|기획|제안/.test(t))
    return `너는 ${who}${josa(who, "을")} 돕는 ${t} 작성 컨설턴트야.
아래 아이디어로 ${t} 초안을 목차부터 만들어 줘.

[아이디어] [한두 줄로 적기]
[제출처 · 읽는 사람] [예: 지원기관 심사위원]
[강조할 점] [예: 지역 문제 해결, 일자리]

목차: 1. 개요  2. 문제와 필요성  3. 해결 방법  4. 추진 일정(표)  5. 예산(표)  6. 기대효과
항목마다 3~5줄로 쓰고, 근거가 필요한 곳은 [자료 확인 필요]로 표시해 줘.`;
  return `너는 ${who} 업무를 돕는 ${t} 작성 전문가야.
아래 내용을 바탕으로 ${t} 초안을 써 줘.

[목적] [예: 상반기 진행 상황을 팀장님께 보고]
[읽는 사람] [예: 팀장 · 임원]
[담을 내용] [핵심 내용 3~5줄]
[형식] 제목 → 요약 3줄 → 본문(소제목 3개) → 다음 할 일, 표 1개 포함
[분량] A4 1쪽 이내, 문장은 짧게`;
}

const refinePrompt = (who: string) => `방금 쓴 초안을 더 좋게 고쳐 줘.
- 문장은 더 짧고 분명하게
- 숫자 · 근거가 필요한 곳에 [확인 필요] 표시
- 읽는 사람이 ${who}의 상사라고 생각하고 어조 다듬기
- 고친 부분은 무엇을 왜 바꿨는지 3줄로 알려 줘`;

export function pptSlides(l: Lecture, materials: Material[]): Slide[] {
  const doc = curriculumDoc(l);
  const [K = "AI", ...topics] = splitKeywords(l.keyword);
  const who = cleanAudience(l.audience) || "수강생";
  const out: Slide[] = [];

  out.push(
    slide("cover", doc.title, doc.info.map((s) => s.replace(/^교육 \S+: /, "")), {
      notes: "[1분] 인사하고 강의 제목 · 오늘 진행 시간을 소개해요.",
    }),
  );

  const intro = materials.filter((m) => m.kind === "intro" && l.materialIds.includes(m.id));
  out.push(
    slide("intro", "강사 소개", intro.length ? intro.flatMap((m) => lines(m.body)).slice(0, 6) : ["[강사 이름]", "[주요 경력]", "[관련 자격 · 저서 · 강의 이력]"], {
      notes: intro.length ? "[2분] 경력 중 오늘 주제와 이어지는 것 한두 가지만 짧게." : "[2분] 내 자료 서랍의 「강사 소개」를 강의 카드에서 체크하면 여기에 자동으로 들어가요.",
    }),
  );

  out.push(slide("goal", "오늘의 교육 목표", doc.goals.length ? doc.goals : ["[교육 목표를 커리큘럼에 먼저 채워 주세요]"], { notes: "[2분] 오늘 끝나면 할 수 있게 되는 것을 먼저 보여 줘요. 수강생에게 가장 기대되는 목표를 물어봐도 좋아요." }));

  out.push(
    slide(
      "agenda",
      "오늘의 흐름",
      doc.rows.map((r) => `${r.time}  ${r.label}`),
      { notes: "[1분] 시간표를 보여 주고 쉬는 시간도 미리 알려 줘요." },
    ),
  );

  let part = 0;
  for (const r of doc.rows) {
    if (r.isBreak) continue;
    part++;
    const minutes = (() => {
      const [a, b] = r.time.split("~").map((x) => x.split(":").map(Number));
      return b[0] * 60 + b[1] - (a[0] * 60 + a[1]);
    })();
    out.push(slide("section", `PART ${part}. ${r.label}`, r.subs, { notes: `[${r.time} · ${minutes}분]\n${r.subs.map((s) => `- ${s}`).join("\n")}` }));

    const label = r.label;
    if (/오리엔테이션|아이스/.test(label)) {
      out.push(
        slide("content", "아이스브레이킹", ["요즘 업무에서 가장 시간이 많이 드는 일은?", `${K}${josa(K, "을")} 써 본 경험 한 가지`, "오늘 꼭 가져가고 싶은 것 한 가지"], {
          notes: `[${Math.max(5, Math.round(minutes / 2))}분] 옆 사람과 짝을 지어 1분씩 이야기해요. 두세 명에게 발표를 부탁하고, 나온 고민을 오늘 실습과 이어 줘요.`,
        }),
      );
    } else if (/이해|사용법|원리/.test(label)) {
      out.push(
        slide("content", `${K}${josa(K, "로")} 할 수 있는 일`, ["글쓰기: 초안 · 요약 · 다듬기", "정리: 표 · 목록 · 비교", "아이디어: 기획 · 질문 뽑기", "분석: 자료 읽고 핵심 찾기"], {
          notes: "[10분] 업무 예시를 하나씩 들어 보여 줘요. 화면을 띄워 직접 한 번 시연하면 이해가 빨라요.",
        }),
        slide("content", "쓸 때 주의할 점", ["사실 확인: 숫자 · 출처는 꼭 다시 보기", "개인정보 · 회사 기밀은 넣지 않기", "결과물은 초안 — 마지막 판단은 사람이"], {
          notes: "[5분] 그럴듯하지만 틀린 답(환각) 예시를 하나 보여 주면 기억에 남아요.",
        }),
        slide("prompt", "좋은 프롬프트의 5요소", ["역할: 누구처럼 답할지", "맥락: 상황 · 대상 · 목적", "지시: 무엇을 해 달라는지", "형식: 분량 · 구성 · 표", "예시: 원하는 모양 보여 주기"], {
          prompt: `너는 [역할: 10년 차 ${who} 선배]야.\n[맥락: 신입에게 업무를 알려 주는 상황]이야.\n[지시: 우리 팀 업무 보고 요령]을 알려 줘.\n[형식: 번호 목록 5개, 항목마다 한 줄 예시 포함]`,
          notes: "[10분] 같은 질문을 5요소 없이 / 있게 두 번 넣어 결과를 비교해 보여 줘요. 수강생도 따라 해 보게 해요.",
        }),
      );
    } else if (/실습|시연|프로젝트/.test(label)) {
      const t = topics.find((x) => label.includes(x)) ?? (/프로젝트/.test(label) ? "내 업무 결과물" : K);
      out.push(
        slide("prompt", `실습 프롬프트: ${t}`, ["① 예시 프롬프트를 그대로 넣어 보기", "② [ ] 칸을 내 업무 내용으로 바꾸기", "③ 결과를 보고 한 번 더 고쳐 달라고 하기"], {
          prompt: practicePrompt(t, who),
          notes: `[${Math.round(minutes * 0.2)}분] 강사가 먼저 화면에서 시연해요.\n[${Math.round(minutes * 0.6)}분] 수강생 개인 실습 — 돌아다니며 막힌 사람을 도와요.\n[${Math.round(minutes * 0.2)}분] 잘된 결과 두세 개를 함께 봐요.`,
        }),
        slide("prompt", "다듬기 프롬프트", ["초안이 나오면 이어서 넣어요", "한 번에 끝내지 말고 2~3번 주고받기"], {
          prompt: refinePrompt(who),
          notes: "같은 대화창에서 이어서 쓰게 해요. 새 창을 열면 앞 내용을 잊어버린다는 점도 알려 줘요.",
        }),
        slide("content", "실습 과제", [...r.subs, "완성 기준: 내 업무에 바로 쓸 수 있는 초안 1개"], {
          notes: "완성한 초안과 쓴 프롬프트를 메모장에 저장해 두게 해요. 마지막 공유 시간에 씁니다.",
        }),
      );
    } else if (/공유|피드백|발표/.test(label)) {
      out.push(
        slide("content", "피드백 체크리스트", ["목적이 첫 줄에 보이나요?", "숫자 · 근거가 맞나요?", "읽는 사람에게 맞는 어조인가요?", "다음에 다시 쓸 프롬프트로 저장했나요?"], {
          notes: `[${minutes}분] 3~4명씩 모둠으로 결과물을 돌려 보고 체크리스트로 한 가지씩 칭찬 · 제안해요. 모둠별 대표 1명 발표.`,
        }),
      );
    } else if (/정리|질의|마무리/.test(label)) {
      out.push(
        slide("content", "오늘 배운 것", doc.goals.length ? doc.goals : ["[교육 목표]"], { notes: "[3분] 목표를 다시 보며 오늘 한 실습과 짝지어 정리해요." }),
        slide("content", "내 업무 적용 계획", ["이번 주에 써 볼 업무 1가지:", "그때 쓸 프롬프트:", "기대하는 시간 절약:"], {
          notes: "[5분] 각자 적어 보게 하고, 한두 명에게 발표를 부탁해요.",
        }),
      );
    } else if (r.subs.length) {
      out.push(slide("content", label, r.subs, { notes: `[${minutes}분] ${r.subs.join(" → ")}` }));
    }
  }

  out.push(slide("closing", "기대효과", doc.effects.length ? doc.effects : ["[기대효과를 커리큘럼에 먼저 채워 주세요]"], { notes: "[2분] 오늘 배운 것을 업무에 쓰면 무엇이 달라지는지 정리해요." }));
  out.push(slide("closing", "감사합니다", ["질문 · 소감 나누기", l.org ? `${l.org} · ${who}` : who], { notes: "질의응답. 설문이나 연락처가 있으면 여기서 안내해요." }));
  return out;
}
