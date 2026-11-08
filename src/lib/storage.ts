// 브라우저 저장소(localStorage)에 강의와 내 자료를 저장하는 곳이에요.

export type MaterialKind = "intro" | "case" | "curriculum" | "activity";

export const MATERIAL_KINDS: { kind: MaterialKind; label: string; emoji: string; desc: string }[] = [
  { kind: "intro", label: "강사 소개 · 경력", emoji: "🌸", desc: "강의처에 보내는 내 소개 · 경력 · 자격이에요." },
  {
    kind: "case",
    label: "사례 · 예시",
    emoji: "📌",
    desc: "강의 중에 들려줄 이야기 한 토막이에요. 실제 사례 · 비유 · 수강생 질문처럼, 강의 내용 속에 끼워 넣는 재료예요.",
  },
  {
    kind: "curriculum",
    label: "지난 커리큘럼",
    emoji: "📚",
    desc: "예전에 한 강의의 구성 전체예요. 목표 · 흐름 · 시간표가 담긴 틀이라, 새 강의의 뼈대로 다시 써요. 파일로 올려도 돼요.",
  },
  { kind: "activity", label: "활동 · 실습", emoji: "✏️", desc: "수강생이 직접 해 보는 활동 · 워크시트 · 실습 아이디어예요." },
];

export type Material = {
  id: string;
  kind: MaterialKind;
  title: string;
  body: string;
  fileName?: string;
};

// 시간표 한 줄 = 큰 제목(label) + 소제목 두 개(subs)
export type ScheduleRow = {
  id: string;
  label: string;
  minutes: number;
  subs: string[];
};

export const SUB_COUNT = 2;
export const padSubs = (subs: string[] = []) => Array.from({ length: SUB_COUNT }, (_, i) => subs[i] ?? "");

// PPT 한 장. prompt 는 화면에 크게 보여 줄 실습 프롬프트, notes 는 발표자 메모(수업 내용)예요.
export type SlideKind = "cover" | "intro" | "goal" | "agenda" | "section" | "content" | "prompt" | "closing";
export const SLIDE_KINDS: SlideKind[] = ["cover", "intro", "goal", "agenda", "section", "content", "prompt", "closing"];
export type Slide = {
  id: string;
  kind: SlideKind;
  title: string;
  bullets: string[];
  prompt: string;
  notes: string;
};

// 수업 로그 (5회차 v2 · 코엘의 「수업 로그 여섯 줄」 힌트)
// 준비 시작 · 초안 완료는 "YYYY-MM-DDTHH:mm"(이 컴퓨터 시각), 비어 있으면 ""
export type LectureLog = {
  prepStart: string;
  draftDone: string;
  adopted: string; // 채택: 이번에 고른 구성 · 방향
  rejected: string; // 제친 것: 고민하다 뺀 것과 이유
  axis: string; // 축: 이번 강의에서 가장 중요하게 잡은 것
  after: string; // 수업 후: 매끄럽지 않았던 것 · 예상과 달랐던 것 · 다음엔
};

export const blankLog = (): LectureLog => ({ prepStart: "", draftDone: "", adopted: "", rejected: "", axis: "", after: "" });

// 준비 시작 → 초안 완료까지 걸린 분. 둘 중 하나라도 없거나 거꾸로면 null
export function prepMinutes(log: LectureLog): number | null {
  if (!log.prepStart || !log.draftDone) return null;
  const a = new Date(log.prepStart).getTime();
  const b = new Date(log.draftDone).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 60000);
}

export const formatMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ""}` : `${m}분`);

export type Lecture = {
  id: string;
  org: string;
  keyword: string;
  audience: string;
  totalMinutes: number;
  date: string;
  startTime: string;
  title: string;
  goal: string;
  flow: string;
  schedule: ScheduleRow[];
  effect: string;
  ppt: string;
  pptTheme: string;
  slides: Slide[];
  materialIds: string[];
  log: LectureLog;
  calendarId: string; // 캘린더에서 가져온 카드면 그 일정 번호 (같은 일정을 두 번 가져오지 않게)
  updatedAt: string;
};

// 할 일 한 줄. lectureId 가 있으면 그 강의 준비용이에요.
export type Todo = {
  id: string;
  text: string;
  due: string; // YYYY-MM-DD, 없으면 ""
  done: boolean;
  lectureId: string;
};

// 강의료 한 건. calendarId 가 있으면 구글 캘린더 일정에서 기록한 거예요 (같은 일정 두 번 기록 막기).
export type Fee = {
  id: string;
  date: string; // YYYY-MM-DD
  org: string; // 기관
  amount: number; // 원
  paid: boolean; // 입금 완료
  paidDate: string; // 입금된 날 YYYY-MM-DD (date 는 강의한 날)
  memo: string;
  calendarId: string;
};

// 함께 일하는 강사 한 명 — 「강사 이력카드」 양식의 칸을 그대로 담아요. fields 는 전문(강의) 분야.
export type Education = { start: string; end: string; school: string; major: string; degree: string };
export type Job = { org: string; period: string; position: string; duties: string };
// 이 강사와 함께한 수업 한 번 (나만 보는 기록, 인쇄에는 안 나와요)
export type CoSession = { date: string; place: string; hours: number; memo: string };
export type Instructor = {
  id: string;
  name: string;
  birth: string;
  org: string; // 소속
  position: string; // 직위
  region: string; // 근무 지역
  fields: string[];
  addrWork: string;
  addrHome: string;
  telWork: string;
  telHome: string;
  fax: string;
  mobile: string;
  email: string;
  account: string; // 계좌번호
  education: Education[];
  jobs: Job[];
  certs: string; // 자격/면허 · 교육이수
  writings: string; // 논문 및 저서
  consulting: string; // 컨설팅 및 자문 등 이력
  career: string; // 기타 이력 (여러 줄)
  contact: string; // 예전 연락처 칸 (휴대폰 · 메일로 나눠 옮겨요)
  photo: string; // 사진 (작게 줄인 JPEG data URL, 없으면 "")
  comment: string; // 나만의 코멘트 (인쇄에는 안 나와요)
  sessions: CoSession[]; // 함께한 수업
};

export const blankInstructor = (o: Partial<Instructor> = {}): Instructor => ({
  id: newId(),
  name: "",
  birth: "",
  org: "",
  position: "",
  region: "",
  fields: [],
  addrWork: "",
  addrHome: "",
  telWork: "",
  telHome: "",
  fax: "",
  mobile: "",
  email: "",
  account: "",
  education: [],
  jobs: [],
  certs: "",
  writings: "",
  consulting: "",
  career: "",
  contact: "",
  photo: "",
  comment: "",
  sessions: [],
  ...o,
});

export type Store = {
  version: 1;
  lectures: Lecture[];
  materials: Material[];
  todos: Todo[];
  fees: Fee[];
  instructors: Instructor[];
};

const KEY = "lecture-room:v1";
const MAX_TEXT = 20000;

export const emptyStore = (): Store => ({ version: 1, lectures: [], materials: [], todos: [], fees: [], instructors: [] });

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const str = (v: unknown, max = MAX_TEXT) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(v, 100000) : 0);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function cleanMaterial(v: unknown): Material | null {
  if (!isObj(v) || typeof v.id !== "string") return null;
  const kind = MATERIAL_KINDS.some((k) => k.kind === v.kind) ? (v.kind as MaterialKind) : null;
  if (!kind) return null;
  const fileName = str(v.fileName, 200);
  return { id: v.id, kind, title: str(v.title, 200), body: str(v.body), ...(fileName ? { fileName } : {}) };
}

function cleanLog(v: unknown): LectureLog {
  if (!isObj(v)) return blankLog();
  const time = (x: unknown) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str(x, 16)) ? str(x, 16) : "");
  return {
    prepStart: time(v.prepStart),
    draftDone: time(v.draftDone),
    adopted: str(v.adopted),
    rejected: str(v.rejected),
    axis: str(v.axis, 500),
    after: str(v.after),
  };
}

function cleanLecture(v: unknown): Lecture | null {
  if (!isObj(v) || typeof v.id !== "string") return null;
  const schedule = Array.isArray(v.schedule)
    ? v.schedule
        .filter(isObj)
        .map((r) => ({
          id: str(r.id, 100) || newId(),
          label: str(r.label, 500),
          minutes: num(r.minutes),
          subs: padSubs(Array.isArray(r.subs) ? r.subs.map((s) => str(s, 500)) : []),
        }))
    : [];
  const materialIds = Array.isArray(v.materialIds) ? v.materialIds.filter((x): x is string => typeof x === "string") : [];
  return {
    id: v.id,
    org: str(v.org, 200),
    keyword: str(v.keyword, 200),
    audience: str(v.audience, 200),
    totalMinutes: num(v.totalMinutes),
    date: str(v.date, 20),
    startTime: /^\d{2}:\d{2}$/.test(str(v.startTime, 5)) ? str(v.startTime, 5) : "10:00",
    title: str(v.title, 300),
    goal: str(v.goal),
    flow: str(v.flow),
    schedule,
    effect: str(v.effect),
    ppt: str(v.ppt),
    pptTheme: str(v.pptTheme, 40) || "blossom",
    slides: Array.isArray(v.slides)
      ? v.slides.filter(isObj).map((s) => ({
          id: str(s.id, 100) || newId(),
          kind: SLIDE_KINDS.includes(s.kind as SlideKind) ? (s.kind as SlideKind) : "content",
          title: str(s.title, 300),
          bullets: Array.isArray(s.bullets) ? s.bullets.map((b) => str(b, 500)).slice(0, 12) : [],
          prompt: str(s.prompt, 5000),
          notes: str(s.notes, 5000),
        }))
      : [],
    materialIds,
    log: cleanLog(v.log),
    calendarId: str(v.calendarId, 300),
    updatedAt: str(v.updatedAt, 40),
  };
}

function cleanInstructor(p: Record<string, unknown>): Instructor {
  const s = (k: string, max = 300) => str(p[k], max);
  const rows = <T,>(v: unknown, keys: (keyof T)[]) =>
    Array.isArray(v) ? v.filter(isObj).slice(0, 30).map((r) => Object.fromEntries(keys.map((k) => [k, str(r[k as string], 300)])) as T) : [];
  const contact = s("contact", 200);
  return blankInstructor({
    id: s("id", 100) || newId(),
    name: s("name", 100),
    birth: s("birth", 30),
    org: s("org"),
    position: s("position", 100),
    region: s("region", 100),
    fields: Array.isArray(p.fields) ? p.fields.map((x) => str(x, 50)).filter(Boolean).slice(0, 20) : [],
    addrWork: s("addrWork"),
    addrHome: s("addrHome"),
    telWork: s("telWork", 50),
    telHome: s("telHome", 50),
    fax: s("fax", 50),
    // 예전 「연락처」 칸에 적어 둔 휴대폰 · 메일은 새 칸으로 옮겨요
    mobile: s("mobile", 50) || (contact.match(/01[016789][-\d\s.]{7,12}\d/)?.[0] ?? ""),
    email: s("email", 200) || (contact.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? ""),
    account: s("account", 100),
    education: rows<Education>(p.education, ["start", "end", "school", "major", "degree"]),
    jobs: rows<Job>(p.jobs, ["org", "period", "position", "duties"]),
    certs: s("certs", 5000),
    writings: s("writings", 5000),
    consulting: s("consulting", 5000),
    career: s("career", 5000),
    contact,
    photo: typeof p.photo === "string" && p.photo.startsWith("data:image/") && p.photo.length < 400000 ? p.photo : "",
    comment: s("comment", 5000),
    sessions: Array.isArray(p.sessions)
      ? p.sessions
          .filter(isObj)
          .slice(0, 500)
          .map((r) => ({
            date: /^\d{4}-\d{2}-\d{2}$/.test(str(r.date, 10)) ? str(r.date, 10) : "",
            place: str(r.place, 200),
            hours: typeof r.hours === "number" && Number.isFinite(r.hours) && r.hours >= 0 ? Math.min(r.hours, 1000) : 0,
            memo: str(r.memo, 300),
          }))
      : [],
  });
}

// 형식이 틀린 줄만 건너뛰고 나머지는 지켜요. 백업 가져오기에도 같은 검사를 써요.
export function parseStore(raw: unknown): Store | null {
  if (!isObj(raw)) return null;
  if (!Array.isArray(raw.lectures) || !Array.isArray(raw.materials)) return null;
  return {
    version: 1,
    lectures: raw.lectures.map(cleanLecture).filter((x): x is Lecture => x !== null),
    materials: raw.materials.map(cleanMaterial).filter((x): x is Material => x !== null),
    // 할 일은 나중에 생긴 칸이라, 예전 기록 · 백업에는 없을 수 있어요
    todos: Array.isArray(raw.todos)
      ? raw.todos.filter(isObj).map((t) => ({
          id: str(t.id, 100) || newId(),
          text: str(t.text, 500),
          due: /^\d{4}-\d{2}-\d{2}$/.test(str(t.due, 10)) ? str(t.due, 10) : "",
          done: t.done === true,
          lectureId: str(t.lectureId, 100),
        }))
      : [],
    fees: Array.isArray(raw.fees)
      ? raw.fees.filter(isObj).map((f) => ({
          id: str(f.id, 100) || newId(),
          date: /^\d{4}-\d{2}-\d{2}$/.test(str(f.date, 10)) ? str(f.date, 10) : "",
          org: str(f.org, 200),
          amount: typeof f.amount === "number" && Number.isFinite(f.amount) && f.amount >= 0 ? Math.min(Math.round(f.amount), 1e10) : 0, // num() 은 10만에서 잘려서 따로 봐요
          paid: f.paid === true,
          paidDate: /^\d{4}-\d{2}-\d{2}$/.test(str(f.paidDate, 10)) ? str(f.paidDate, 10) : "",
          memo: str(f.memo, 1000),
          calendarId: str(f.calendarId, 300),
        }))
      : [],
    instructors: Array.isArray(raw.instructors) ? raw.instructors.filter(isObj).map(cleanInstructor) : [],
  };
}

export type LoadResult = { store: Store; warning?: string };

export function loadStore(): LoadResult {
  try {
    const text = window.localStorage.getItem(KEY);
    if (!text) return { store: emptyStore() };
    try {
      const parsed = parseStore(JSON.parse(text));
      if (parsed) return { store: parsed };
    } catch {
      // 아래에서 처리해요
    }
    // 아예 읽을 수 없으면 원래 글자를 다른 칸에 옮겨 두고 알려요. 덮어써서 잃어버리지 않게요.
    window.localStorage.setItem(`${KEY}:broken`, text);
    return { store: emptyStore(), warning: "저장된 기록을 읽지 못했어요. 원래 내용은 따로 보관해 뒀어요." };
  } catch {
    return { store: emptyStore(), warning: "이 브라우저에서는 저장소를 쓸 수 없어요. 시크릿 창이면 일반 창으로 열어 주세요." };
  }
}

export function saveStore(store: Store): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function blankLecture(): Lecture {
  return {
    id: newId(),
    org: "",
    keyword: "",
    audience: "",
    totalMinutes: 120,
    date: "",
    startTime: "10:00",
    title: "",
    goal: "",
    flow: "",
    schedule: [],
    effect: "",
    ppt: "",
    pptTheme: "blossom",
    slides: [],
    materialIds: [],
    log: blankLog(),
    calendarId: "",
    updatedAt: new Date().toISOString(),
  };
}

export const scheduleTotal = (l: Lecture) => l.schedule.reduce((sum, r) => sum + r.minutes, 0);

export const curriculumDone = (l: Lecture) =>
  Boolean(l.title.trim() && l.goal.trim() && l.flow.trim() && l.schedule.length > 0 && l.effect.trim());

export const pptDone = (l: Lecture) => Boolean(l.ppt.trim());
