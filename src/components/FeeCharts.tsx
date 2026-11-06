"use client";

// 강의료 대시보드 그래프: 월별(세로 막대) · 기관별(가로 막대). 두 그래프 모두 입금 완료(초록) 위에 미입금(분홍)을 쌓아요.
// 색은 dataviz 검사(색약 · 대비)를 통과한 앱 색 두 개만 써요. 숫자는 글자색으로, 색은 막대에만.

import { useState } from "react";

export const PAID = "#5b8c46"; // leaf-600
export const UNPAID = "#d9677c"; // blossom-500

export type Bar = { key: string; label: string; paid: number; unpaid: number };

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const man = (n: number) => (n >= 10000 ? `${Math.round(n / 10000).toLocaleString("ko-KR")}만` : n ? `${n.toLocaleString("ko-KR")}` : "0");

// 눈금: 최댓값을 보기 좋은 숫자(1 · 2 · 5 × 10ⁿ)로 올려서 4칸
function niceMax(max: number) {
  if (max <= 0) return 100000;
  const step = max / 4;
  const p = 10 ** Math.floor(Math.log10(step));
  const n = [1, 2, 2.5, 5, 10].find((m) => m * p >= step)! * p;
  return n * 4;
}

export function Legend() {
  return (
    <div className="flex gap-4 text-xs text-ink-500">
      {[
        [PAID, "입금 완료"],
        [UNPAID, "미입금"],
      ].map(([c, l]) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
          {l}
        </span>
      ))}
    </div>
  );
}

function Tip({ bar }: { bar: Bar }) {
  return (
    <span className="pointer-events-none block rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-black/10">
      <span className="block font-semibold">{bar.label}</span>
      <span className="mt-1 block font-semibold">합계 {won(bar.paid + bar.unpaid)}</span>
      <span className="flex items-center gap-1.5 text-ink-500">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: PAID }} />
        입금 {won(bar.paid)}
      </span>
      <span className="flex items-center gap-1.5 text-ink-500">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: UNPAID }} />
        미입금 {won(bar.unpaid)}
      </span>
    </span>
  );
}

// 월별: 1~12월 세로 막대. 누르면 그 달 기록만 보여요.
export function MonthChart({ bars, selected, onSelect }: { bars: Bar[]; selected: string | null; onSelect: (key: string | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const top = niceMax(Math.max(...bars.map((b) => b.paid + b.unpaid)));
  const ticks = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);
  const H = 180;
  return (
    <div className="relative pl-10">
      {/* 눈금선 */}
      <div className="relative" style={{ height: H }}>
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-blossom-100" style={{ bottom: (t / top) * H }}>
            <span className="absolute -left-10 -translate-y-1/2 text-[10px] text-ink-500">{man(t)}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-1 sm:gap-2">
          {bars.map((b, i) => {
            const total = b.paid + b.unpaid;
            const on = selected === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(on ? null : b.key)}
                className={`relative flex h-full flex-1 flex-col justify-end rounded-t ${on ? "bg-blossom-50" : hover === i ? "bg-blossom-50/60" : ""}`}
                aria-label={`${b.label} 합계 ${won(total)}, 입금 ${won(b.paid)}, 미입금 ${won(b.unpaid)}`}
              >
                <span className="mx-auto flex w-3/5 max-w-8 flex-col justify-end gap-[2px]" style={{ height: `${(total / top) * 100}%` }}>
                  {b.unpaid > 0 && <span className="block rounded-t" style={{ flex: b.unpaid, background: UNPAID, minHeight: 2 }} />}
                  {b.paid > 0 && <span className={`block ${b.unpaid ? "" : "rounded-t"}`} style={{ flex: b.paid, background: PAID, minHeight: 2 }} />}
                </span>
                {hover === i && total > 0 && (
                  <span className={`absolute bottom-full z-10 mb-1 block w-max ${i > 8 ? "right-0" : i < 3 ? "left-0" : "left-1/2 -translate-x-1/2"}`}>
                    <Tip bar={b} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-1 sm:gap-2">
        {bars.map((b) => (
          <div key={b.key} className={`flex-1 text-center text-[11px] ${selected === b.key ? "font-bold text-blossom-700" : "text-ink-500"}`}>
            {b.label.replace(/^\d+년 /, "")}
            {/* 달마다 합계를 막대 아래에 (만원 단위) — 색 없이 글자색으로 */}
            <div className="font-semibold text-foreground">{b.paid + b.unpaid ? man(b.paid + b.unpaid) : "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 기관별: 합계 큰 순서 가로 막대. 막대 끝에 합계를 적어요. 누르면 그 기관 기록만.
export function OrgChart({ bars, selected, onSelect }: { bars: Bar[]; selected: string | null; onSelect: (key: string | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.paid + b.unpaid));
  return (
    <div className="space-y-1.5">
      {bars.map((b, i) => {
        const total = b.paid + b.unpaid;
        const on = selected === b.key;
        return (
          <button
            key={b.key}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() => onSelect(on ? null : b.key)}
            className={`relative flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left ${on ? "bg-blossom-100" : "hover:bg-blossom-50"}`}
            aria-label={`${b.label} 합계 ${won(total)}, 입금 ${won(b.paid)}, 미입금 ${won(b.unpaid)}`}
          >
            <span className="w-28 shrink-0 truncate text-sm font-semibold sm:w-40" title={b.label}>
              {b.label}
            </span>
            <span className="flex h-4 min-w-0 flex-1 items-center">
              <span className="flex h-full gap-[2px]" style={{ width: `${(total / max) * 100}%` }}>
                {b.paid > 0 && <span className={`h-full ${b.unpaid ? "rounded-l" : "rounded"}`} style={{ flex: b.paid, background: PAID, minWidth: 2 }} />}
                {b.unpaid > 0 && <span className={`h-full ${b.paid ? "rounded-r" : "rounded"}`} style={{ flex: b.unpaid, background: UNPAID, minWidth: 2 }} />}
              </span>
            </span>
            <span className="w-24 shrink-0 text-right text-sm font-semibold">{won(total)}</span>
            {hover === i && (
              <span className="absolute left-32 top-full z-10 mt-1 w-max sm:left-44">
                <Tip bar={b} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
