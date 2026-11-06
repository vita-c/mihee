"use client";

import { useState } from "react";
import { Lecture, curriculumDone, pptDone } from "@/lib/storage";
import { Button, inputClass } from "./ui";
import { CalendarImport } from "./CalendarImport";

function Badge({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        done ? "bg-leaf-100 text-leaf-800" : "bg-blossom-50 text-ink-500"
      }`}
    >
      {done ? "✓ " : "· "}
      {label}
    </span>
  );
}

export function Board({
  lectures,
  onOpen,
  onNew,
  onImport,
}: {
  lectures: Lecture[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onImport: (l: Lecture[]) => void;
}) {
  const [q, setQ] = useState("");
  const [cal, setCal] = useState(false);
  const calendar = cal && <CalendarImport lectures={lectures} onImport={onImport} onClose={() => setCal(false)} />;
  const calButton = (
    <Button variant="soft" onClick={() => setCal(true)}>
      📅 캘린더에서 가져오기
    </Button>
  );

  if (lectures.length === 0) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-3xl border border-blossom-200 bg-white p-8 text-center">
        {calendar}
        <div className="text-5xl">🌸</div>
        <h2 className="mt-4 text-xl font-bold">강의 요청이 오면 여기에 카드로 모아요</h2>
        <p className="mt-2 text-sm text-ink-500">
          키워드와 시간을 넣으면 커리큘럼부터 PPT 구성까지
          <br />한 카드 안에서 이어서 준비할 수 있어요.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={onNew}>+ 첫 강의 만들기</Button>
          {calButton}
        </div>
      </div>
    );
  }

  const words = q.trim().toLowerCase();
  const shown = [...lectures]
    .sort((a, b) => (b.date || b.updatedAt).localeCompare(a.date || a.updatedAt))
    .filter((l) =>
      !words ? true : [l.title, l.org, l.keyword, l.audience].join(" ").toLowerCase().includes(words),
    );

  return (
    <div>
      {calendar}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className={`${inputClass} sm:max-w-xs`}
          placeholder="강의 제목 · 강의처 · 키워드로 찾기"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex gap-2 sm:ml-auto">
          {calButton}
          <Button onClick={onNew}>+ 새 강의</Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onOpen(l.id)}
            className="rounded-2xl border border-blossom-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blossom-500 hover:shadow-md"
          >
            <div className="text-xs font-semibold text-blossom-700">{l.org || "강의처 미정"}</div>
            <div className="mt-1 line-clamp-2 text-lg font-bold">{l.title || l.keyword || "제목 없는 강의"}</div>
            <div className="mt-1 text-sm text-ink-500">
              {[l.date, l.audience, `${l.totalMinutes}분`].filter(Boolean).join(" · ")}
            </div>
            <div className="mt-4 flex gap-2">
              <Badge done={curriculumDone(l)} label="커리큘럼" />
              <Badge done={pptDone(l)} label="PPT" />
            </div>
          </button>
        ))}
        {shown.length === 0 && <p className="text-sm text-ink-500">찾는 강의가 없어요.</p>}
      </div>
    </div>
  );
}
