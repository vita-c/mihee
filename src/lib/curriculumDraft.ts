// 「커리큘럼 생성」 · 칸마다 「다시 생성」이 쓰는 초안이에요. 키워드 · 대상 · 총 시간을 문장 틀에 끼워 만들어요.
// AI 없이 바로 만드는 뼈대라, 고른 뒤 내 말로 고치거나 「Claude에게 보내기」로 다듬어요.

import { Lecture, ScheduleRow, newId, padSubs } from "./storage";
import { cleanAudience, josa, splitKeywords } from "./korean";

type Ctx = { K: string; topics: string[]; list: string; last: string; who: string; A: string };
type Pool = (c: Ctx) => string[];

function ctx(l: Lecture): Ctx | null {
  const words = splitKeywords(l.keyword);
  if (!words.length) return null;
  const [K, ...topics] = words;
  const A = cleanAudience(l.audience);
  return { K, topics, list: topics.join(", "), last: topics[topics.length - 1] ?? "", who: A || "수강생", A };
}

const j = josa;
const seq = (c: Ctx) => (c.topics.length ? c.topics.join(" → ") : `${c.K} 기본 활용 → 내 업무에 적용`);

// 한 칸 = 줄마다 고를 수 있는 문장 틀 묶음. 줄마다 하나씩 뽑아서 이어 붙여요.
const GOAL: Pool[] = [
  (c) => [
    `${c.K}의 기본 개념과 ${c.A ? `${c.A}의 ` : ""}업무 활용 범위를 이해한다`,
    `${c.K}${j(c.K, "이")} 무엇이고 어떤 일에 쓸 수 있는지 설명할 수 있다`,
    `${c.who}의 업무에서 ${c.K}${j(c.K, "을")} 쓸 수 있는 장면을 찾아낸다`,
    `${c.K}의 특징과 한계를 알고 안전하게 쓰는 원칙을 익힌다`,
  ],
  (c) =>
    c.topics.length
      ? [
          `${c.list}에 ${c.K}${j(c.K, "을")} 적용해 초안을 직접 만들어 본다`,
          `${c.K}${j(c.K, "로")} ${c.list}${j(c.last, "을")} 처음부터 끝까지 완성해 본다`,
          `좋은 질문(프롬프트)으로 ${c.list} 초안을 빠르게 뽑아낸다`,
          `${c.list} 작성 과정에 ${c.K}${j(c.K, "을")} 단계별로 활용할 수 있다`,
        ]
      : [`${c.K}${j(c.K, "을")} 실습하며 기본 활용법을 익힌다`, `${c.K}${j(c.K, "로")} 내 업무 결과물 하나를 직접 만들어 본다`],
  () => [
    "배운 방법을 내 업무에 맞게 바꿔 쓰는 나만의 활용 순서를 정리한다",
    "강의 후 바로 쓸 수 있는 나만의 프롬프트 모음을 만든다",
    "AI가 만든 결과물을 검토하고 고치는 기준을 세운다",
    "동료와 결과물을 나누며 더 나은 활용법을 찾는다",
  ],
];

const FLOW: Pool[] = [
  (c) =>
    [
      `${c.who}의 업무 속 ${c.K} 활용 사례 살펴보기 → 기본 사용법 익히기`,
      `오늘 만들 결과물 미리 보기 → ${c.K} 첫 체험`,
      `${c.K}${j(c.K, "로")} 달라진 일하는 방식 이야기 → 화면 둘러보기`,
      `내 업무 고민 나누기 → ${c.K}${j(c.K, "이")} 도울 수 있는 일 찾기`,
    ].map((s) => `도입: ${s}`),
  (c) =>
    [
      `${seq(c)} 차례로 실습 (예시 보기 → 따라 하기 → 내 업무로 바꿔 보기)`,
      `${seq(c)} 순서로, 시연 → 개인 실습 → 짝 피드백`,
      `${seq(c)}: 좋은 질문 쓰는 법 → 초안 만들기 → 다듬기`,
      `${seq(c)} 실습 후, 내 업무 자료로 한 번 더 만들어 보기`,
    ].map((s) => `전개: ${s}`),
  () =>
    [
      "결과물 공유 · 피드백 → 내 업무 적용 계획 세우기 · 질의응답",
      "오늘 만든 결과물 발표 → 활용 팁 정리 · 질의응답",
      "나만의 프롬프트 모음 정리 → 다음 단계 안내 · 소감 나누기",
      "잘된 결과물 함께 보기 → 주의할 점 정리 · 질의응답",
    ].map((s) => `정리: ${s}`),
];

const EFFECT: Pool[] = [
  (c) =>
    c.topics.length
      ? [
          `${c.list}${j(c.last, "을")} 만드는 시간을 줄이고 결과물의 완성도를 높인다`,
          `${c.list} 초안 작성 시간이 절반 이하로 줄어든다`,
          `${c.list}의 구성과 문장이 한층 깔끔해진다`,
        ]
      : [`${c.K}${j(c.K, "로")} 반복 업무 시간을 줄인다`, `${c.K}${j(c.K, "로")} 하던 일을 더 빠르고 정확하게 끝낸다`],
  (c) => [
    `${c.who}${j(c.who, "이")} ${c.K}${j(c.K, "을")} 업무에 바로 쓸 수 있다는 자신감을 얻는다`,
    `${c.K}에 대한 막연한 두려움이 줄고 스스로 써 보는 습관이 생긴다`,
    `${c.who} 개인의 업무 생산성이 눈에 띄게 높아진다`,
  ],
  () => [
    "강의 후에도 혼자 반복해 쓸 수 있는 활용 순서(프롬프트 예시)를 갖게 된다",
    "팀 안에서 AI 활용 사례를 나누는 분위기가 만들어진다",
    "결과물을 검토하는 눈이 생겨 AI를 안전하게 활용한다",
  ],
];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function build(pools: Pool[], c: Ctx, bullet: boolean) {
  return pools.map((p) => (bullet ? "- " : "") + pick(p(c))).join("\n");
}

// 방금 본 것과 겹치지 않는 후보를 n개 모아요. 틀이 모자라면 본 것도 섞어요.
function variants(make: () => string, avoid: string[], n: number) {
  const out: string[] = [];
  for (let i = 0; i < 60 && out.length < n; i++) {
    const v = make();
    if (!out.includes(v) && !avoid.includes(v)) out.push(v);
  }
  for (let i = 0; i < 60 && out.length < n; i++) {
    const v = make();
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

export type TextField = "goal" | "flow" | "effect";
const POOLS: Record<TextField, { pools: Pool[]; bullet: boolean }> = {
  goal: { pools: GOAL, bullet: true },
  flow: { pools: FLOW, bullet: false },
  effect: { pools: EFFECT, bullet: true },
};

export function textOptions(l: Lecture, field: TextField, avoid: string[] = [], n = 3) {
  const c = ctx(l);
  if (!c) return [];
  const { pools, bullet } = POOLS[field];
  return variants(() => build(pools, c, bullet), avoid, n);
}

// 타임스케줄은 구성 방식(스타일)마다 비중이 달라요
// 줄마다 큰 제목 하나 + 소제목 두 개예요
type Block = { label: string; subs: string[] };
type Style = {
  name: string;
  intro: number;
  learn: number;
  share: number;
  wrap: number;
  project?: number;
  learnSubs: (K: string) => string[];
  practice: (i: number, K: string, t: string) => Block;
};
const STYLES: Style[] = [
  {
    name: "기본",
    intro: 0.06,
    learn: 0.15,
    share: 0.1,
    wrap: 0.06,
    learnSubs: (K) => [`${K}${j(K, "이")} 할 수 있는 일과 한계`, "화면 둘러보기 · 첫 질문(프롬프트) 써 보기"],
    practice: (i, K, t) => ({ label: `실습 ${i}: ${K}${j(K, "로")} ${t} 만들기`, subs: [`${t} 예시로 따라 만들기`, `내 업무 자료로 ${t} 바꿔 만들기`] }),
  },
  {
    name: "실습 중심",
    intro: 0.05,
    learn: 0.08,
    share: 0.1,
    wrap: 0.05,
    learnSubs: (K) => [`${K} 핵심 기능 빠르게 훑기`, "바로 따라 하는 첫 질문"],
    practice: (i, K, t) => ({ label: `실습 ${i}: ${t} 직접 만들기 (${K})`, subs: [`${t} 초안 직접 만들기`, "짝과 바꿔 보고 다듬기"] }),
  },
  {
    name: "이론 탄탄",
    intro: 0.06,
    learn: 0.25,
    share: 0.08,
    wrap: 0.06,
    learnSubs: (K) => [`${K}${j(K, "이")} 일하는 원리 · 할 수 있는 일과 한계`, "좋은 질문(프롬프트)의 구조 · 업무별 활용 사례"],
    practice: (i, K, t) => ({ label: `시연 · 실습 ${i}: ${t} 작성 과정`, subs: [`${t} 작성 과정 시연 · 질문 쓰는 법`, "따라 만들고 결과 다듬기"] }),
  },
  {
    name: "프로젝트형",
    intro: 0.05,
    learn: 0.12,
    share: 0.12,
    wrap: 0.05,
    project: 0.15,
    learnSubs: (K) => [`${K}${j(K, "이")} 할 수 있는 일과 한계`, "화면 둘러보기 · 첫 질문(프롬프트) 써 보기"],
    practice: (i, K, t) => ({ label: `실습 ${i}: ${K}${j(K, "로")} ${t} 만들기`, subs: [`${t} 예시로 따라 만들기`, `내 업무 자료로 ${t} 바꿔 만들기`] }),
  },
];

// 키워드가 하나뿐이면 실습 두 개를 기본 활용 → 내 업무 적용으로 잡아요
const basicPractice = (K: string): Block[] => [
  { label: `실습 1: ${K} 기본 활용`, subs: [`${K} 기본 기능 따라 하기`, "자주 쓰는 질문(프롬프트) 패턴 익히기"] },
  { label: "실습 2: 내 업무에 적용해 보기", subs: ["내 업무 하나 골라 적용해 보기", "결과물 다듬고 저장하기"] },
];

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

function schedule(total: number, K: string, topics: string[], s: Style): ScheduleRow[] {
  const practice = topics.length ? topics.map((t, i) => s.practice(i + 1, K, t)) : basicPractice(K);
  const breaks = total >= 180 ? Math.min(4, Math.floor(total / 120)) : 0;
  const head = [
    {
      label: "오리엔테이션 · 강의 소개 · 아이스브레이킹",
      subs: ["강사 소개 · 오늘의 목표 안내", "아이스브레이킹: 내 업무 고민 나누기"],
      minutes: round5(total * s.intro),
    },
    { label: `${K} 이해 · 기본 사용법`, subs: s.learnSubs(K), minutes: round5(total * s.learn) },
  ];
  const tail = [
    ...(s.project
      ? [
          {
            label: "미니 프로젝트: 내 업무 결과물 만들기",
            subs: ["내 업무 과제 하나 정하기", `${K}${j(K, "로")} 결과물 완성하기`],
            minutes: round5(total * s.project),
          },
        ]
      : []),
    {
      label: s.project ? "미니 프로젝트 발표 · 피드백" : "결과물 공유 · 피드백",
      subs: ["결과물 발표 · 서로 피드백", "잘된 질문(프롬프트) 모아 보기"],
      minutes: round5(total * s.share),
    },
    {
      label: "정리 · 내 업무 적용 계획 · 질의응답",
      subs: ["오늘 배운 내용 정리 · 내 업무 적용 계획", "질의응답 · 소감 나누기"],
      minutes: round5(total * s.wrap),
    },
  ];
  const fixed = [...head, ...tail].reduce((sum, r) => sum + r.minutes, 0) + breaks * 10;
  const each = round5(Math.max(5 * practice.length, total - fixed) / practice.length);
  const rows = [...head, ...practice.map((b) => ({ ...b, minutes: each })), ...tail];

  // 반올림으로 생긴 차이는 가장 긴 실습 줄에서 맞춰요
  const diff = total - breaks * 10 - rows.reduce((sum, r) => sum + r.minutes, 0);
  const longest = rows.reduce((best, r, i) => (r.minutes > rows[best].minutes ? i : best), 2);
  rows[longest].minutes = Math.max(5, rows[longest].minutes + diff);

  // 휴식은 시간이 고르게 나뉘는 자리에 끼워요 (마지막 줄 뒤에는 안 넣어요)
  const out: (Block & { minutes: number })[] = [];
  let sum = 0;
  let placed = 0;
  rows.forEach((r, i) => {
    out.push(r);
    sum += r.minutes;
    if (placed < breaks && i < rows.length - 1 && sum >= ((placed + 1) * total) / (breaks + 1) - 10 * placed) {
      out.push({ label: "휴식", subs: [], minutes: 10 });
      placed++;
    }
  });
  if (placed < breaks) rows[longest].minutes += (breaks - placed) * 10;
  return out.map((r) => ({ id: newId(), ...r, subs: padSubs(r.subs) }));
}

export type ScheduleOption = { name: string; rows: ScheduleRow[] };

export function scheduleOptions(l: Lecture, avoid: string[] = [], n = 3): ScheduleOption[] {
  const c = ctx(l);
  if (!c) return [];
  const order = [...STYLES].sort(() => Math.random() - 0.5);
  const fresh = order.filter((s) => !avoid.includes(s.name));
  return [...fresh, ...order.filter((s) => avoid.includes(s.name))]
    .slice(0, n)
    .map((s) => ({ name: s.name, rows: schedule(l.totalMinutes || 120, c.K, c.topics, s) }));
}

export function curriculumDraft(l: Lecture): Pick<Lecture, "goal" | "flow" | "schedule" | "effect"> | null {
  const c = ctx(l);
  if (!c) return null;
  return {
    goal: textOptions(l, "goal", [], 1)[0],
    flow: textOptions(l, "flow", [], 1)[0],
    effect: textOptions(l, "effect", [], 1)[0],
    schedule: schedule(l.totalMinutes || 120, c.K, c.topics, STYLES[0]),
  };
}
