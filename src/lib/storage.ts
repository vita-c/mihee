// 브라우저 저장소(localStorage)에 강의와 내 자료를 저장하는 곳이에요.

export type MaterialKind = "intro" | "case" | "curriculum" | "activity";

export const MATERIAL_KINDS: { kind: MaterialKind; label: string; emoji: string }[] = [
  { kind: "intro", label: "강사 소개 · 경력", emoji: "🌸" },
  { kind: "case", label: "사례 · 예시", emoji: "📌" },
  { kind: "curriculum", label: "지난 커리큘럼", emoji: "📚" },
  { kind: "activity", label: "활동 · 실습", emoji: "✏️" },
];

export type Material = {
  id: string;
  kind: MaterialKind;
  title: string;
  body: string;
};

export type ScheduleRow = {
  id: string;
  label: string;
  minutes: number;
};

export type Lecture = {
  id: string;
  org: string;
  keyword: string;
  audience: string;
  totalMinutes: number;
  date: string;
  title: string;
  goal: string;
  flow: string;
  schedule: ScheduleRow[];
  effect: string;
  ppt: string;
  materialIds: string[];
  updatedAt: string;
};

export type Store = {
  version: 1;
  lectures: Lecture[];
  materials: Material[];
};

const KEY = "lecture-room:v1";
const MAX_TEXT = 20000;

export const emptyStore = (): Store => ({ version: 1, lectures: [], materials: [] });

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
  return { id: v.id, kind, title: str(v.title, 200), body: str(v.body) };
}

function cleanLecture(v: unknown): Lecture | null {
  if (!isObj(v) || typeof v.id !== "string") return null;
  const schedule = Array.isArray(v.schedule)
    ? v.schedule
        .filter(isObj)
        .map((r) => ({ id: str(r.id, 100) || newId(), label: str(r.label, 500), minutes: num(r.minutes) }))
    : [];
  const materialIds = Array.isArray(v.materialIds) ? v.materialIds.filter((x): x is string => typeof x === "string") : [];
  return {
    id: v.id,
    org: str(v.org, 200),
    keyword: str(v.keyword, 200),
    audience: str(v.audience, 200),
    totalMinutes: num(v.totalMinutes),
    date: str(v.date, 20),
    title: str(v.title, 300),
    goal: str(v.goal),
    flow: str(v.flow),
    schedule,
    effect: str(v.effect),
    ppt: str(v.ppt),
    materialIds,
    updatedAt: str(v.updatedAt, 40),
  };
}

// 형식이 틀린 줄만 건너뛰고 나머지는 지켜요. 백업 가져오기에도 같은 검사를 써요.
export function parseStore(raw: unknown): Store | null {
  if (!isObj(raw)) return null;
  if (!Array.isArray(raw.lectures) || !Array.isArray(raw.materials)) return null;
  return {
    version: 1,
    lectures: raw.lectures.map(cleanLecture).filter((x): x is Lecture => x !== null),
    materials: raw.materials.map(cleanMaterial).filter((x): x is Material => x !== null),
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
    title: "",
    goal: "",
    flow: "",
    schedule: [],
    effect: "",
    ppt: "",
    materialIds: [],
    updatedAt: new Date().toISOString(),
  };
}

export const scheduleTotal = (l: Lecture) => l.schedule.reduce((sum, r) => sum + r.minutes, 0);

export const curriculumDone = (l: Lecture) =>
  Boolean(l.title.trim() && l.goal.trim() && l.flow.trim() && l.schedule.length > 0 && l.effect.trim());

export const pptDone = (l: Lecture) => Boolean(l.ppt.trim());
