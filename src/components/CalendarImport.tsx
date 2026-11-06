"use client";

// 「캘린더에서 가져오기」 창. 구글 계정 연결 또는 .ics 파일로 일정을 읽고, 고른 일정을 강의 카드로 만들어요.

import { useState } from "react";
import { Lecture } from "@/lib/storage";
import {
  CalEvent,
  clearSavedEvents,
  eventToLecture,
  fetchGoogleEvents,
  fetchIcal,
  googleToken,
  icalError,
  isIcalUrl,
  loadClientId,
  loadIcalUrl,
  parseIcs,
  saveClientId,
  saveIcalUrl,
} from "@/lib/calendarImport";
import { Button, inputClass } from "./ui";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const when = (e: CalEvent) => {
  const d = new Date(`${e.date}T00:00:00`);
  const time = e.startTime ? ` ${e.startTime} · ${Math.floor(e.minutes / 60) ? `${Math.floor(e.minutes / 60)}시간` : ""}${e.minutes % 60 ? ` ${e.minutes % 60}분` : ""}` : " 종일";
  return `${e.date.slice(5).replace("-", "/")}(${WEEK[d.getDay()]})${time}`;
};

export function CalendarImport({ lectures, onImport, onClose }: { lectures: Lecture[]; onImport: (l: Lecture[]) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"ical" | "google" | "ics">("ical");
  const [icalUrl, setIcalUrl] = useState(loadIcalUrl);
  const [editingUrl, setEditingUrl] = useState(!loadIcalUrl());
  const [clientId, setClientId] = useState(loadClientId);
  const [editingId, setEditingId] = useState(!loadClientId());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [cutoff] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)); // 창을 연 때 기준 30일 전
  const imported = new Set(lectures.map((l) => l.calendarId).filter(Boolean));

  function show(list: CalEvent[], from: string) {
    setEvents(list);
    setPicked([]);
    setMsg(list.length ? `${from}에서 일정 ${list.length}개를 읽었어요. 강의 일정을 골라 주세요.` : `${from}에 일정이 없어요.`);
  }

  async function connect() {
    if (!clientId.trim()) return;
    // 클라이언트 ID는 「숫자-영문.apps.googleusercontent.com」 모양이에요. 다르면 구글이 invalid_client 로 막아요
    if (!/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId.trim())) {
      setEditingId(true);
      setMsg(
        clientId.includes("@")
          ? "여기는 메일 주소가 아니라, 구글 클라우드에서 만든 「클라이언트 ID」를 넣는 칸이에요. 메일 주소는 3단계 「테스트 사용자」에 넣어요. 위 1~5단계를 먼저 해 주세요."
          : clientId.trim().startsWith("GOCSPX")
            ? "붙여 넣은 값은 「클라이언트 보안 비밀」이에요. 그 위의 「클라이언트 ID」(…apps.googleusercontent.com)를 넣어 주세요."
            : "클라이언트 ID 모양이 아니에요. 「숫자-영문.apps.googleusercontent.com」 전체를 복사해서 넣어 주세요. (예시 글자는 지우고)",
      );
      return;
    }
    saveClientId(clientId);
    setEditingId(false);
    setBusy(true);
    setMsg("구글 로그인 창이 열려요. 계정을 고르고 「일정 보기」를 허용해 주세요.");
    try {
      const token = await googleToken(clientId.trim());
      show(await fetchGoogleEvents(token), "구글 캘린더(30일 전 ~ 6개월 뒤)");
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setMsg(
        m === "gis"
          ? "구글 로그인 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요."
          : m.startsWith("calendar")
            ? "일정을 읽지 못했어요. 구글 클라우드에서 「Google Calendar API」를 켰는지 확인해 주세요."
            : "연결이 취소됐거나 막혔어요. 아래 안내의 2~4단계(허용 주소 · 테스트 사용자)를 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function readIcal() {
    if (!isIcalUrl(icalUrl)) {
      setEditingUrl(true);
      setMsg(icalError("not-ical"));
      return;
    }
    saveIcalUrl(icalUrl);
    setEditingUrl(false);
    setBusy(true);
    setMsg("구글 캘린더에서 일정을 읽는 중…");
    try {
      show(await fetchIcal(icalUrl), "구글 캘린더 전체");
    } catch (e) {
      setMsg(icalError(e instanceof Error ? e.message : ""));
    } finally {
      setBusy(false);
    }
  }

  async function readIcs(file: File | undefined) {
    if (!file) return;
    try {
      show(parseIcs(await file.text()), `「${file.name}」`);
    } catch {
      setMsg("파일을 읽지 못했어요. 구글 캘린더에서 내보낸 .ics 파일인지 확인해 주세요.");
    }
  }

  const words = q.trim().toLowerCase();
  // 몇 년 치 일정이 다 들어오니, 기본은 30일 전부터 보여 주고 「지난 일정도 보기」로 전부 펼쳐요
  const pastCount = events.filter((e) => e.date < cutoff).length;
  const shown = events.filter((e) => (showPast || e.date >= cutoff) && (!words || `${e.title} ${e.location}`.toLowerCase().includes(words)));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center">
          <h3 className="text-lg font-bold">📅 캘린더에서 강의 가져오기</h3>
          <Button variant="ghost" className="ml-auto" onClick={onClose}>
            닫기
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          {(
            [
              ["ical", "비공개 주소 (간단)"],
              ["ics", ".ics 파일"],
              ["google", "구글 계정 연결"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === k ? "bg-blossom-500 text-white" : "bg-white text-blossom-700 ring-1 ring-blossom-200"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {tab === "ical" ? (
            <div className="space-y-3">
              {editingUrl ? (
                <>
                  <ol className="list-decimal space-y-1.5 rounded-xl bg-blossom-50 p-4 pl-8 text-sm leading-relaxed">
                    <li>구글 캘린더(calendar.google.com) → 오른쪽 위 ⚙ → <b>설정</b>.</li>
                    <li>
                      왼쪽 「내 캘린더의 설정」에서 강의 일정이 있는 캘린더(보통 내 이름)를 눌러요.
                    </li>
                    <li>
                      아래로 내려 「캘린더 통합」의 <b>iCal 형식의 비공개 주소</b> 옆 복사 버튼을 눌러요.
                    </li>
                    <li>아래 칸에 붙여 넣고 「일정 읽기」. 다음부터는 버튼만 누르면 최신 일정을 읽어요.</li>
                  </ol>
                  <label className="block">
                    <span className="text-sm font-semibold text-blossom-700">iCal 형식의 비공개 주소</span>
                    <input
                      className={`${inputClass} mt-1`}
                      type="password"
                      autoComplete="off"
                      value={icalUrl}
                      onChange={(e) => setIcalUrl(e.target.value)}
                      placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                    />
                  </label>
                  <p className="text-xs text-ink-500">
                    ⚠ 이 주소를 아는 사람은 내 캘린더를 볼 수 있어요. 남에게 보내지 마세요. 강의실은 이 컴퓨터 브라우저에만 저장해요. 새어 나갔다면 구글 캘린더 같은 자리에서 「재설정」을 누르면 예전 주소는 막혀요.
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink-500">
                  비공개 주소가 저장돼 있어요.{" "}
                  <button type="button" className="underline" onClick={() => setEditingUrl(true)}>
                    주소 바꾸기
                  </button>{" "}
                  ·{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      saveIcalUrl("");
                      clearSavedEvents();
                      setIcalUrl("");
                      setEditingUrl(true);
                      setEvents([]);
                      setMsg("저장된 주소를 지웠어요.");
                    }}
                  >
                    연결 끊기
                  </button>
                </p>
              )}
              <Button onClick={readIcal} disabled={busy || !icalUrl.trim()}>
                {busy ? "읽는 중…" : editingUrl ? "일정 읽기" : "🔄 최신 일정 읽기"}
              </Button>
            </div>
          ) : tab === "google" ? (
            <div className="space-y-3">
              {editingId ? (
                <>
                  <ol className="list-decimal space-y-1.5 rounded-xl bg-blossom-50 p-4 pl-8 text-sm leading-relaxed">
                    <li>
                      <b>console.cloud.google.com</b> 에서 새 프로젝트를 만들어요 (무료).
                    </li>
                    <li>
                      「API 및 서비스 → 라이브러리」에서 <b>Google Calendar API</b>를 「사용」으로 켜요.
                    </li>
                    <li>
                      「OAuth 동의 화면」에서 외부 · 앱 이름만 적고, <b>테스트 사용자</b>에 내 구글 메일을 넣어요.
                    </li>
                    <li>
                      「사용자 인증 정보 → OAuth 클라이언트 ID」 → 웹 애플리케이션 → 승인된 자바스크립트 원본에 <b>{typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}</b> 추가.
                    </li>
                    <li>만들어진 <b>클라이언트 ID</b>(…apps.googleusercontent.com)를 아래에 붙여 넣어요. 비밀 키(시크릿)는 필요 없어요.</li>
                  </ol>
                  <label className="block">
                    <span className="text-sm font-semibold text-blossom-700">클라이언트 ID</span>
                    <span className="ml-2 text-xs text-ink-500">메일 주소 아님 · 5단계에서 복사한 값</span>
                    <input className={`${inputClass} mt-1`} value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="123456789012-abcd….apps.googleusercontent.com" />
                  </label>
                </>
              ) : (
                <p className="text-sm text-ink-500">
                  연결 설정이 저장돼 있어요.{" "}
                  <button type="button" className="underline" onClick={() => setEditingId(true)}>
                    클라이언트 ID 바꾸기
                  </button>
                </p>
              )}
              <Button onClick={connect} disabled={busy || !clientId.trim()}>
                {busy ? "읽는 중…" : "구글 계정으로 연결해서 일정 읽기"}
              </Button>
              <p className="text-xs text-ink-500">일정은 「보기」 권한으로만 읽어요. 연결 정보는 이 창에서만 쓰고 저장하지 않아요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <ol className="list-decimal space-y-1.5 rounded-xl bg-blossom-50 p-4 pl-8 text-sm leading-relaxed">
                <li>구글 캘린더 → 오른쪽 위 ⚙ 설정 → 「가져오기/내보내기」 → 「내보내기」를 눌러요.</li>
                <li>내려받은 zip 파일을 풀면 캘린더별 .ics 파일이 나와요.</li>
                <li>강의 일정이 있는 .ics 파일을 아래에서 골라요.</li>
              </ol>
              <label className="inline-block cursor-pointer rounded-xl bg-blossom-100 px-4 py-2 text-sm font-semibold text-blossom-700 hover:bg-blossom-200">
                📎 .ics 파일 고르기
                <input
                  type="file"
                  accept=".ics,text/calendar"
                  className="sr-only"
                  onChange={(e) => {
                    readIcs(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-xs text-ink-500">반복 일정은 첫 날짜만 들어와요. 파일은 브라우저 안에서만 읽어요.</p>
            </div>
          )}

          {msg && <p className="mt-3 text-sm text-blossom-700">{msg}</p>}

          {events.length > 0 && (
            <div className="mt-3">
              <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="일정 찾기 (예: 강의, 특강, 교육)" />
              {pastCount > 0 && (
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-ink-500">
                  <input type="checkbox" className="accent-blossom-500" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
                  한 달보다 지난 일정도 보기 ({pastCount}개)
                </label>
              )}
              <div className="mt-2 space-y-1">
                {shown.map((e) => {
                  const done = imported.has(e.id);
                  return (
                    <label key={e.id} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${done ? "opacity-50" : "cursor-pointer hover:bg-blossom-50"}`}>
                      <input type="checkbox" className="mt-1 accent-blossom-500" disabled={done} checked={picked.includes(e.id)} onChange={() => toggle(e.id)} />
                      <span className="min-w-0">
                        <span className="font-semibold">{e.title}</span>
                        <span className="block text-xs text-ink-500">
                          {when(e)}
                          {e.location && ` · ${e.location}`}
                          {done && " · 이미 가져옴"}
                        </span>
                      </span>
                    </label>
                  );
                })}
                {shown.length === 0 && <p className="text-sm text-ink-500">찾는 일정이 없어요.</p>}
              </div>
            </div>
          )}
        </div>

        {events.length > 0 && (
          <div className="mt-3 flex items-center gap-2 border-t border-blossom-100 pt-3">
            <span className="text-sm text-ink-500">{picked.length}개 골랐어요</span>
            <Button
              className="ml-auto"
              disabled={!picked.length}
              onClick={() => {
                onImport(events.filter((e) => picked.includes(e.id)).map(eventToLecture));
                onClose();
              }}
            >
              강의 카드 만들기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
