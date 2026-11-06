"use client";

// 💰 강의료 탭: 날짜 · 기관 · 강의료를 기록하고, 해마다 기관별로 모아 봐요. 입금 여부도 체크해요.
// 캘린더에서 구글 일정을 누르면 「강의료 기록」으로 날짜 · 기관이 채워진 채 이 창(FeeDialog)이 열려요.

import { useState } from "react";
import { Fee, newId } from "@/lib/storage";
import { Button, inputClass, useConfirm } from "./ui";
import { Bar, Legend, MonthChart, OrgChart } from "./FeeCharts";

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

// 「캠틱-최상민과장님」 「군장대-고창(이지현교수님)」 → 「캠틱」 「군장대」: 일정 제목의 앞부분을 기관 이름으로 제안해요
export const guessOrg = (title: string) => title.split(/[-(（·/]/)[0].trim() || title.trim();

export function FeeDialog({ fee, orgs, onSave, onDelete, onClose }: { fee: Fee; orgs: string[]; onSave: (f: Fee) => void; onDelete?: () => void; onClose: () => void }) {
  const [f, setF] = useState(fee);
  const [amountText, setAmountText] = useState(fee.amount ? fee.amount.toLocaleString("ko-KR") : "");
  const amount = Number(amountText.replace(/[^\d]/g, "")) || 0;
  const ok = f.org.trim() && f.date; // 금액은 아직 모르면 비워 둬도 돼요 (「금액 미정」)
  const save = () => ok && onSave({ ...f, org: f.org.trim(), amount, memo: f.memo.trim() });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold">💰 강의료 {onDelete ? "고치기" : "기록"}</h3>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-blossom-700">강의한 날</span>
            <input type="date" className={`${inputClass} mt-1`} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-blossom-700">기관</span>
            <input className={`${inputClass} mt-1`} list="fee-orgs" value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} placeholder="예: 캠틱종합기술원" />
            <datalist id="fee-orgs">
              {orgs.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
            <span className="mt-1 block text-xs text-ink-500">같은 기관은 같은 이름으로 적어야 기관별로 모여요</span>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-blossom-700">강의료</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                autoFocus
                inputMode="numeric"
                className={`${inputClass} text-right`}
                value={amountText}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[^\d]/g, ""));
                  setAmountText(n ? n.toLocaleString("ko-KR") : "");
                }}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="300,000"
              />
              <span className="shrink-0 text-sm text-ink-500">원</span>
            </div>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-leaf-600" checked={f.paid} onChange={(e) => setF({ ...f, paid: e.target.checked })} />
              입금 완료
            </label>
            {f.paid && (
              <label className="flex items-center gap-2 text-xs text-ink-500">
                입금일
                <input type="date" className="rounded-lg border border-blossom-200 px-2 py-1 text-sm" value={f.paidDate} onChange={(e) => setF({ ...f, paidDate: e.target.value })} />
              </label>
            )}
          </div>
          <input className={inputClass} value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} placeholder="메모 (예: 4시간 · 원천징수 3.3%)" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          {onDelete && (
            <Button variant="ghost" className="text-blossom-700" onClick={onDelete}>
              지우기
            </Button>
          )}
          <Button variant="ghost" className="ml-auto" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save} disabled={!ok}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

export const blankFee = (o: Partial<Fee> = {}): Fee => ({ id: newId(), date: "", org: "", amount: 0, paid: false, paidDate: "", memo: "", calendarId: "", ...o });

export function FeeView({ fees, onChange }: { fees: Fee[]; onChange: (f: Fee[]) => void }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [org, setOrg] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null); // "01" ~ "12"
  const [editing, setEditing] = useState<Fee | null>(null);
  const { ask, dialog } = useConfirm();
  const orgs = [...new Set(fees.map((f) => f.org))].sort((a, b) => a.localeCompare(b, "ko"));

  const yearFees = fees.filter((f) => f.date.startsWith(String(year)));
  const sum = (list: Fee[]) => list.reduce((s, f) => s + f.amount, 0);
  const total = sum(yearFees);
  const unpaid = sum(yearFees.filter((f) => !f.paid));

  // 기관별 모아 보기: 합계 큰 순서
  const byOrg = [...yearFees.reduce((m, f) => m.set(f.org, [...(m.get(f.org) ?? []), f]), new Map<string, Fee[]>())]
    .map(([name, list]) => ({ name, list, total: sum(list), unpaid: sum(list.filter((f) => !f.paid)) }))
    .sort((a, b) => b.total - a.total);
  // 월별: 1~12월. 고른 기관이 있으면 그 기관만
  const monthBars: Bar[] = Array.from({ length: 12 }, (_, i) => {
    const mm = String(i + 1).padStart(2, "0");
    const inM = yearFees.filter((f) => f.date.slice(5, 7) === mm && (!org || f.org === org));
    return { key: mm, label: `${year}년 ${i + 1}월`, paid: sum(inM.filter((f) => f.paid)), unpaid: sum(inM.filter((f) => !f.paid)) };
  });
  // 기관별: 고른 달이 있으면 그 달만
  const orgBars: Bar[] = byOrg
    .map((o) => {
      const inM = o.list.filter((f) => !month || f.date.slice(5, 7) === month);
      return { key: o.name, label: o.name, paid: sum(inM.filter((f) => f.paid)), unpaid: sum(inM.filter((f) => !f.paid)) };
    })
    .filter((b) => b.paid + b.unpaid > 0)
    .sort((a, b) => b.paid + b.unpaid - (a.paid + a.unpaid));
  const list = yearFees.filter((f) => (!org || f.org === org) && (!month || f.date.slice(5, 7) === month)).sort((a, b) => b.date.localeCompare(a.date));

  const save = (f: Fee) => {
    onChange(fees.some((x) => x.id === f.id) ? fees.map((x) => (x.id === f.id ? f : x)) : [...fees, f]);
    setEditing(null);
  };
  const remove = async (f: Fee) => {
    if (!(await ask(`${f.date} ${f.org} ${won(f.amount)}\n이 강의료 기록을 지울까요?`, "지우기"))) return;
    onChange(fees.filter((x) => x.id !== f.id));
    setEditing(null);
  };

  return (
    <div className="max-w-4xl">
      {dialog}
      {editing && (
        <FeeDialog
          fee={editing}
          orgs={orgs}
          onSave={save}
          onDelete={fees.some((x) => x.id === editing.id) ? () => remove(editing) : undefined}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold">강의료</h2>
        <Button variant="ghost" aria-label="이전 해" onClick={() => setYear(year - 1)}>
          ◀
        </Button>
        <span className="font-semibold">{year}년</span>
        <Button variant="ghost" aria-label="다음 해" onClick={() => setYear(year + 1)}>
          ▶
        </Button>
        <Button className="ml-auto" onClick={() => setEditing(blankFee({ date: `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}` }))}>
          + 강의료 기록
        </Button>
      </div>
      <p className="mt-1 text-xs text-ink-500">캘린더 탭에서 구글 일정을 누르고 「강의료 기록」을 고르면 날짜 · 기관이 채워져요.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["올해 합계", total, "text-blossom-700"],
          ["입금 완료", total - unpaid, "text-leaf-800"],
          ["아직 안 들어온 돈", unpaid, unpaid ? "text-blossom-700" : "text-ink-500"],
        ].map(([label, n, color]) => (
          <div key={label as string} className="rounded-2xl border border-blossom-200 bg-white p-4">
            <div className="text-xs text-ink-500">{label}</div>
            <div className={`mt-1 text-2xl font-bold ${color}`}>{won(n as number)}</div>
          </div>
        ))}
      </div>

      {byOrg.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-blossom-200 p-6 text-center text-sm text-ink-500">{year}년 강의료 기록이 아직 없어요.</p>
      ) : (
        <>
          <section className="mt-6 rounded-2xl border border-blossom-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-blossom-700">월별 강의료{org && ` · ${org}`}</h3>
              <span className="text-xs text-ink-500">막대를 누르면 그 달만 봐요</span>
              <span className="ml-auto">
                <Legend />
              </span>
            </div>
            <MonthChart bars={monthBars} selected={month} onSelect={setMonth} />
          </section>

          <section className="mt-4 rounded-2xl border border-blossom-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-blossom-700">기관별 강의료{month && ` · ${Number(month)}월`}</h3>
              <span className="text-xs text-ink-500">막대를 누르면 그 기관만 봐요</span>
              <span className="ml-auto">
                <Legend />
              </span>
            </div>
            {orgBars.length ? <OrgChart bars={orgBars} selected={org} onSelect={setOrg} /> : <p className="text-sm text-ink-500">이 달에는 기록이 없어요.</p>}
          </section>

          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-ink-500">기관별 표로 보기 (횟수 · 합계 · 미입금)</summary>
          <div className="mt-2 overflow-hidden rounded-2xl border border-blossom-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-blossom-50 text-xs text-ink-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">기관</th>
                  <th className="px-3 py-2 text-right font-semibold">횟수</th>
                  <th className="px-3 py-2 text-right font-semibold">합계</th>
                  <th className="px-3 py-2 text-right font-semibold">미입금</th>
                </tr>
              </thead>
              <tbody>
                {byOrg.map((o) => (
                  <tr
                    key={o.name}
                    onClick={() => setOrg(org === o.name ? null : o.name)}
                    className={`cursor-pointer border-t border-blossom-100 hover:bg-blossom-50 ${org === o.name ? "bg-blossom-100" : ""}`}
                  >
                    <td className="px-3 py-2 font-semibold">{o.name}</td>
                    <td className="px-3 py-2 text-right">{o.list.length}회</td>
                    <td className="px-3 py-2 text-right font-semibold">{won(o.total)}</td>
                    <td className={`px-3 py-2 text-right ${o.unpaid ? "text-blossom-700" : "text-ink-500"}`}>{o.unpaid ? won(o.unpaid) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </details>
        </>
      )}

      {yearFees.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-blossom-700">
              {[month && `${Number(month)}월`, org].filter(Boolean).join(" · ") || "전체"} 기록 <span className="font-normal text-ink-500">{list.length}건 · {won(sum(list))}</span>
            </h3>
            {(org || month) && (
              <button
                type="button"
                className="text-xs text-ink-500 underline"
                onClick={() => {
                  setOrg(null);
                  setMonth(null);
                }}
              >
                전체 보기
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {list.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-blossom-100 bg-white px-3 py-2 text-sm">
                <span className="w-24 shrink-0 text-ink-500">{f.date}</span>
                <button type="button" className="min-w-0 flex-1 truncate text-left font-semibold hover:underline" onClick={() => setEditing(f)}>
                  {f.org}
                  {f.memo && <span className="ml-2 font-normal text-ink-500">{f.memo}</span>}
                </button>
                <span className={`shrink-0 font-semibold ${f.amount ? "" : "text-ink-500"}`}>{f.amount ? won(f.amount) : "금액 미정"}</span>
                <span className="hidden w-20 shrink-0 text-right text-xs text-ink-500 sm:block">{f.paidDate && `입금 ${Number(f.paidDate.slice(5, 7))}/${Number(f.paidDate.slice(8))}`}</span>
                <label className="flex shrink-0 cursor-pointer items-center gap-1 text-xs text-ink-500">
                  <input type="checkbox" className="accent-leaf-600" checked={f.paid} onChange={() => save({ ...f, paid: !f.paid })} />
                  입금
                </label>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
