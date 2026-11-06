// 캘린더 일정을 읽어서 강의 카드로 바꿔요. 세 가지 길이 있어요 (③ 비공개 주소가 가장 간단해요, 아래쪽).
// ① 구글 계정 연결: 구글 로그인 창(Google Identity Services)으로 「일정 보기」 허락만 받아 읽어요. 토큰은 화면에만 두고 저장하지 않아요.
// ② .ics 파일: 구글 캘린더 설정 → 내보내기로 받은 파일을 올려요. 연결 설정이 필요 없어요.

import { Lecture, blankLecture } from "./storage";

export type CalEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (내 컴퓨터 시간 기준)
  startTime: string; // HH:MM, 종일 일정이면 ""
  minutes: number;
  location: string;
  description: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function fromRange(id: string, title: string, start: Date, end: Date, allDay: boolean, location: string, description: string): CalEvent {
  return {
    id,
    title: title || "(제목 없는 일정)",
    date: ymd(start),
    startTime: allDay ? "" : hm(start),
    minutes: allDay ? 0 : Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)),
    location,
    description,
  };
}

// 일정 → 강의 카드. 캘린더 일정 제목은 보통 「캠틱-최상민과장님」처럼 강의처라서 강의처 칸에 넣어요.
// 키워드 · 강의 제목은 비워 두고 직접 채워요. 종일 일정은 시간을 기본값(10:00 · 120분)으로 둬요.
export function eventToLecture(e: CalEvent): Lecture {
  const l = blankLecture();
  const memo = [e.location && `장소: ${e.location}`, e.description].filter(Boolean).join("\n");
  return {
    ...l,
    org: e.title,
    date: e.date,
    startTime: e.startTime || l.startTime,
    totalMinutes: e.minutes || l.totalMinutes,
    ppt: memo ? `[캘린더 메모]\n${memo}` : "",
    calendarId: e.id,
  };
}

// ---------- ② .ics 파일 ----------

function icsDate(value: string, params: string): { date: Date; allDay: boolean } | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (!h || /VALUE=DATE(?!-)/.test(params)) return { date: new Date(+y, +mo - 1, +d), allDay: true };
  // Z 가 붙으면 세계 표준시, 아니면 내 컴퓨터 시간으로 봐요 (TZID 는 대부분 한국 시간이라 그대로 써요)
  return { date: z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0))) : new Date(+y, +mo - 1, +d, +h, +mi, +(s || 0)), allDay: false };
}

const unescapeIcs = (s: string) => s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();

// 같은 날짜 · 시각인지 비교하는 열쇠 (내 컴퓨터 시간 기준). 종일 일정은 날짜만.
const occKey = (d: Date, allDay: boolean) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${allDay ? "" : `T${pad(d.getHours())}${pad(d.getMinutes())}`}`;

type Prop = { value: string; params: string };
type RawEvent = Record<string, Prop> & { _exdates?: Prop[] };

const DAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

// 반복 규칙(RRULE)을 날짜마다 펼쳐요. 매일 · 매주(요일 여러 개) · 매월(며칠 · 몇째 주 무슨 요일) · 매년.
// 끝없는 반복도 있어서, 오늘 기준 1년 전 ~ 2년 뒤만 펼쳐요. (그보다 오래된 반복 수업은 달력에 안 보여요)
function expand(start: Date, rule: string, from: Date, to: Date): Date[] {
  const r = Object.fromEntries(rule.split(";").map((p) => p.split("=") as [string, string]));
  const freq = r.FREQ;
  const interval = Math.max(1, Number(r.INTERVAL) || 1);
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? icsDate(r.UNTIL, "")?.date : undefined;
  const end = until && until < to ? until : to;
  const byDay = (r.BYDAY ?? "").split(",").filter(Boolean).map((s) => {
    const m = s.match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/);
    return m ? { n: m[1] ? Number(m[1]) : 0, wd: DAY[m[2]] } : null;
  }).filter((x): x is { n: number; wd: number } => x !== null);
  const byMonthDay = (r.BYMONTHDAY ?? "").split(",").filter(Boolean).map(Number);
  const at = (y: number, m: number, d: number) => new Date(y, m, d, start.getHours(), start.getMinutes(), start.getSeconds());
  // 그 달의 「n번째(음수면 뒤에서) wd요일」
  const nthWeekday = (y: number, m: number, n: number, wd: number) => {
    if (n > 0) {
      const first = new Date(y, m, 1).getDay();
      const d = 1 + ((wd - first + 7) % 7) + (n - 1) * 7;
      return d <= new Date(y, m + 1, 0).getDate() ? at(y, m, d) : null;
    }
    const lastDay = new Date(y, m + 1, 0);
    const d = lastDay.getDate() - ((lastDay.getDay() - wd + 7) % 7) + (n + 1) * 7;
    return d >= 1 ? at(y, m, d) : null;
  };

  const out: Date[] = [];
  let made = 0;
  for (let step = 0; step < 6000; step++) {
    let cands: Date[] = [];
    if (freq === "DAILY") cands = [at(start.getFullYear(), start.getMonth(), start.getDate() + step * interval)];
    else if (freq === "WEEKLY") {
      const weekStart = start.getDate() - start.getDay() + step * 7 * interval;
      const days = byDay.length ? byDay.map((b) => b.wd) : [start.getDay()];
      cands = days.sort((a, b) => a - b).map((wd) => at(start.getFullYear(), start.getMonth(), weekStart + wd));
    } else if (freq === "MONTHLY") {
      const y = start.getFullYear();
      const m = start.getMonth() + step * interval;
      if (byDay.length) cands = byDay.map((b) => nthWeekday(y, m, b.n || 1, b.wd)).filter((d): d is Date => d !== null);
      else
        cands = (byMonthDay.length ? byMonthDay : [start.getDate()])
          .map((d) => (d > 0 ? at(y, m, d) : at(y, m + 1, d + 1)))
          .filter((d) => d.getMonth() === ((m % 12) + 12) % 12);
    } else if (freq === "YEARLY") {
      const d = at(start.getFullYear() + step * interval, start.getMonth(), start.getDate());
      cands = d.getMonth() === start.getMonth() ? [d] : []; // 2월 29일은 윤년에만
    } else return [start];

    cands.sort((a, b) => a.getTime() - b.getTime());
    for (const c of cands) {
      if (c < start) continue;
      if (c > end || made >= count) return out;
      made++;
      if (c >= from) out.push(c);
    }
    if (cands.length && cands[0] > end) return out;
  }
  return out;
}

export function parseIcs(text: string): CalEvent[] {
  // 75자마다 접힌 줄(다음 줄이 빈칸으로 시작)을 이어 붙여요
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const raws: RawEvent[] = [];
  let cur: RawEvent | null = null;
  let nested = 0; // 일정 안의 알림(VALARM) 같은 묶음. 그 안의 SUMMARY(「Alarm notification」)가 일정 제목을 덮지 않게 건너뛰어요
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      nested = 0;
    } else if (line === "END:VEVENT" && cur) {
      raws.push(cur);
      cur = null;
    } else if (cur && line.startsWith("BEGIN:")) nested++;
    else if (cur && line.startsWith("END:")) nested = Math.max(0, nested - 1);
    else if (cur && !nested) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const [name, ...params] = line.slice(0, i).split(";");
      const prop = { value: line.slice(i + 1), params: params.join(";") };
      if (name.toUpperCase() === "EXDATE") (cur._exdates ??= []).push(prop); // 반복 중 빠진 날은 여러 줄일 수 있어요
      else cur[name.toUpperCase()] = prop;
    }
  }

  // 반복 일정 중 하루만 바꾼 것(RECURRENCE-ID)은 따로 들어 있어요. 원래 날짜 자리를 그걸로 바꿔요.
  const moved = new Set<string>();
  for (const e of raws) {
    if (!e["RECURRENCE-ID"]) continue;
    const r = icsDate(e["RECURRENCE-ID"].value, e["RECURRENCE-ID"].params);
    if (r) moved.add(`${e.UID?.value}|${occKey(r.date, r.allDay)}`);
  }

  const now = new Date();
  const from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const to = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
  const events: CalEvent[] = [];
  for (const e of raws) {
    if (e.STATUS?.value === "CANCELLED") continue;
    const start = e.DTSTART && icsDate(e.DTSTART.value, e.DTSTART.params);
    if (!start) continue;
    const endRaw = e.DTEND && icsDate(e.DTEND.value, e.DTEND.params);
    const length = (endRaw ? endRaw.date.getTime() : start.date.getTime() + (start.allDay ? 86400000 : 3600000)) - start.date.getTime();
    const uid = e.UID?.value ?? "";
    const info = [unescapeIcs(e.SUMMARY?.value ?? ""), unescapeIcs(e.LOCATION?.value ?? ""), unescapeIcs(e.DESCRIPTION?.value ?? "")] as const;

    if (!e.RRULE || e["RECURRENCE-ID"]) {
      events.push(fromRange(`${uid}|${e.DTSTART.value}`, info[0], start.date, new Date(start.date.getTime() + length), start.allDay, info[1], info[2]));
      continue;
    }
    const skip = new Set(
      (e._exdates ?? []).flatMap((p) =>
        p.value.split(",").map((v) => {
          const d = icsDate(v, p.params);
          return d ? occKey(d.date, start.allDay) : "";
        }),
      ),
    );
    for (const d of expand(start.date, e.RRULE.value, from, to)) {
      const key = occKey(d, start.allDay);
      if (skip.has(key) || moved.has(`${uid}|${key}`)) continue;
      events.push(fromRange(`${uid}|${key}`, info[0], d, new Date(d.getTime() + length), start.allDay, info[1], info[2]));
    }
  }
  return events.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

// ---------- ③ 비공개 주소(iCal) ----------
// 구글 캘린더 설정의 「iCal 형식의 비공개 주소」를 한 번 넣어 두면, 누를 때마다 최신 일정을 읽어요 (보기 전용).
// 주소는 비밀번호처럼 다뤄야 해서 이 브라우저에만 저장하고, 읽을 때 우리 서버 통로(/api/ical)로만 보내요.

const ICAL_KEY = "lecture-room:gcal-ical-url";
export const loadIcalUrl = () => {
  try {
    return localStorage.getItem(ICAL_KEY) ?? "";
  } catch {
    return "";
  }
};
export const saveIcalUrl = (url: string) => {
  try {
    if (url.trim()) localStorage.setItem(ICAL_KEY, url.trim());
    else localStorage.removeItem(ICAL_KEY);
  } catch {
    // 저장이 막힌 브라우저면 이번에만 써요
  }
};
export const isIcalUrl = (url: string) => /^https:\/\/calendar\.google\.com\/calendar\/ical\/.+\.ics$/.test(url.trim());

// 비공개 주소의 일정을 전부 읽어요. 읽은 일정은 이 브라우저에 보관해 두고(달력에 바로 보이게), 다음에 읽으면 새것으로 바꿔요.
const EVENTS_KEY = "lecture-room:gcal-events";
export async function fetchIcal(url: string): Promise<CalEvent[]> {
  const res = await fetch("/api/ical", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({ error: "upstream" }))) as { error?: string };
    throw new Error(error ?? "upstream");
  }
  const events = parseIcs(await res.text());
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify({ at: new Date().toISOString(), events }));
  } catch {
    // 보관이 안 되면 이번 화면에서만 보여요
  }
  return events;
}

export function loadSavedEvents(): { at: string; events: CalEvent[] } {
  try {
    const v = JSON.parse(localStorage.getItem(EVENTS_KEY) ?? "null") as { at?: string; events?: CalEvent[] } | null;
    return { at: v?.at ?? "", events: Array.isArray(v?.events) ? v.events : [] };
  } catch {
    return { at: "", events: [] };
  }
}
export const clearSavedEvents = () => {
  try {
    localStorage.removeItem(EVENTS_KEY);
  } catch {
    // 괜찮아요
  }
};

export const icalError = (code: string) =>
  code === "not-ical"
    ? "구글 캘린더의 「iCal 형식의 비공개 주소」가 아니에요. https://calendar.google.com/calendar/ical/… .ics 로 된 주소를 넣어 주세요."
    : code === "not-found"
      ? "주소를 찾지 못했어요. 구글 캘린더에서 비공개 주소를 「재설정」했다면 새 주소를 넣어 주세요."
      : "일정을 읽지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.";

// ---------- ① 구글 계정 연결 ----------

const CLIENT_KEY = "lecture-room:gcal-client-id";
export const loadClientId = () => {
  try {
    return localStorage.getItem(CLIENT_KEY) ?? "";
  } catch {
    return "";
  }
};
export const saveClientId = (id: string) => {
  try {
    localStorage.setItem(CLIENT_KEY, id.trim());
  } catch {
    // 저장이 막힌 브라우저면 이번에만 써요
  }
};

type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void };
type Gis = {
  accounts: {
    oauth2: {
      initTokenClient: (c: { client_id: string; scope: string; callback: (r: { access_token?: string; error?: string }) => void; error_callback?: (e: { type?: string }) => void }) => TokenClient;
    };
  };
};

function loadGis(): Promise<Gis> {
  const w = window as unknown as { google?: Gis };
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => (w.google ? resolve(w.google) : reject(new Error("gis")));
    s.onerror = () => reject(new Error("gis"));
    document.head.appendChild(s);
  });
}

// 구글 로그인 창을 띄워 「일정 보기」만 허락받고, 토큰을 돌려줘요
export async function googleToken(clientId: string): Promise<string> {
  const gis = await loadGis();
  return new Promise((resolve, reject) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/calendar.events.readonly",
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error || "denied"))),
      error_callback: (e) => reject(new Error(e.type || "closed")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

type GEvent = {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

// 기본 캘린더에서 30일 전 ~ 6개월 뒤 일정을 읽어요 (반복 일정은 날짜마다 따로)
export async function fetchGoogleEvents(token: string): Promise<CalEvent[]> {
  const now = Date.now();
  const params = new URLSearchParams({
    timeMin: new Date(now - 30 * 86400000).toISOString(),
    timeMax: new Date(now + 183 * 86400000).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`calendar ${res.status}`);
  const data = (await res.json()) as { items?: GEvent[] };
  return (data.items ?? [])
    .filter((e) => e.status !== "cancelled" && (e.start?.dateTime || e.start?.date))
    .map((e) => {
      const allDay = !e.start?.dateTime;
      const start = allDay ? new Date(`${e.start!.date}T00:00:00`) : new Date(e.start!.dateTime!);
      const end = allDay ? new Date(`${e.end?.date ?? e.start!.date}T00:00:00`) : new Date(e.end?.dateTime ?? e.start!.dateTime!);
      const description = (e.description ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim(); // 구글 메모는 HTML 이 섞여 와요
      return fromRange(`g:${e.id}`, e.summary ?? "", start, end, allDay, e.location ?? "", description);
    });
}
