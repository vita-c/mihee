"use client";

// 👩‍🏫 강사들 탭: 함께 일하는 강사를 「강사 이력카드」 양식으로 모아 둬요.
// 카드를 누르면 이력카드 한 장 보기(인쇄 · PDF), 고치기 창은 이력카드의 칸을 그대로 채워요.
// 강사 프로필 · 이력카드 파일(.hwp · .hwpx · .pdf)을 올리면 칸과 사진을 자동으로 채워요.

import { useState } from "react";
import { CoSession, Education, Instructor, Job, blankInstructor } from "@/lib/storage";
import { PROFILE_ACCEPT, readProfile, shrinkPhoto } from "@/lib/profileImport";
import { CARD_CSS, cardHtml, downloadCardPdf, printCard } from "@/lib/instructorCard";
import { Button, inputClass, useConfirm } from "./ui";

// 사진 칸: 사진이 없으면 이름 첫 글자
function Photo({ p, size }: { p: Instructor; size: string }) {
  return p.photo ? (
    // eslint-disable-next-line @next/next/no-img-element -- 브라우저에 저장한 작은 data URL 사진이라 next/image 가 필요 없어요
    <img src={p.photo} alt={`${p.name} 사진`} className={`${size} shrink-0 rounded-xl object-cover ring-1 ring-black/10`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-blossom-100 text-xl font-bold text-blossom-700`}>{p.name.slice(0, 1) || "?"}</span>
  );
}

// 「생성형 AI, 엑셀 · 창업」 → ["생성형 AI", "엑셀", "창업"]
const splitFields = (s: string) => [...new Set(s.split(/[,，·/\n]+/).map((x) => x.trim()).filter(Boolean))];

const hoursText = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)}시간`;

// 함께한 수업 모아 보기: 해마다 몇 회 · 몇 시간, 장소마다 몇 회 · 몇 시간
function sessionSummary(list: CoSession[]) {
  const group = (key: (s: CoSession) => string) =>
    [...list.reduce((m, s) => m.set(key(s), [...(m.get(key(s)) ?? []), s]), new Map<string, CoSession[]>())].map(([k, v]) => ({
      key: k,
      count: v.length,
      hours: v.reduce((t, s) => t + s.hours, 0),
    }));
  return {
    byYear: group((s) => (s.date ? `${s.date.slice(0, 4)}년` : "날짜 없음")).sort((a, b) => b.key.localeCompare(a.key)),
    byPlace: group((s) => s.place || "(장소 없음)").sort((a, b) => b.count - a.count || b.hours - a.hours),
    total: { count: list.length, hours: list.reduce((t, s) => t + s.hours, 0) },
  };
}

// 이력카드 한 장 보기 (인쇄와 같은 모양) + 아래에 나만 보는 기록(코멘트 · 함께한 수업 — 인쇄 안 됨)
function CardView({ person: p, onEdit, onClose }: { person: Instructor; onEdit: () => void; onClose: () => void }) {
  const [pdfMsg, setPdfMsg] = useState("");
  const sum = sessionSummary(p.sessions);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3" onClick={onClose}>
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <style>{CARD_CSS}</style>
          {/* 값은 cardHtml 안에서 모두 글자로 바꿔(escape) 넣어요 */}
          <div dangerouslySetInnerHTML={{ __html: cardHtml(p) }} />

          <div className="mt-6 rounded-2xl border border-dashed border-leaf-300 bg-leaf-50 p-4">
            <div className="text-sm font-bold text-leaf-800">🔒 나만 보는 기록 <span className="font-normal text-ink-500">(인쇄 · PDF에는 안 나와요)</span></div>
            <div className="mt-2 text-sm">
              <span className="font-semibold">💬 코멘트</span>
              <p className="mt-1 whitespace-pre-line text-ink-500">{p.comment || "아직 없어요. 「고치기」에서 적어요."}</p>
            </div>
            <div className="mt-3 text-sm">
              <span className="font-semibold">🤝 함께한 수업</span>{" "}
              <span className="text-ink-500">
                모두 {sum.total.count}회 · {hoursText(sum.total.hours)}
              </span>
              {p.sessions.length > 0 ? (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <table className="w-full text-xs">
                    <thead className="text-ink-500">
                      <tr>
                        <th className="text-left font-semibold">연도</th>
                        <th className="text-right font-semibold">횟수</th>
                        <th className="text-right font-semibold">시간</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sum.byYear.map((y) => (
                        <tr key={y.key} className="border-t border-leaf-100">
                          <td className="py-1">{y.key}</td>
                          <td className="text-right">{y.count}회</td>
                          <td className="text-right">{hoursText(y.hours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <table className="w-full text-xs">
                    <thead className="text-ink-500">
                      <tr>
                        <th className="text-left font-semibold">어디서</th>
                        <th className="text-right font-semibold">횟수</th>
                        <th className="text-right font-semibold">시간</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sum.byPlace.map((y) => (
                        <tr key={y.key} className="border-t border-leaf-100">
                          <td className="py-1">{y.key}</td>
                          <td className="text-right">{y.count}회</td>
                          <td className="text-right">{hoursText(y.hours)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-1 text-ink-500">아직 없어요. 「고치기」의 「함께한 수업」에 날짜 · 장소 · 시간을 적어요.</p>
              )}
            </div>
          </div>
        </div>
        {pdfMsg && <p className="px-5 text-sm text-blossom-700">{pdfMsg}</p>}
        <div className="flex flex-wrap items-center gap-2 border-t border-blossom-100 px-5 py-3">
          <Button
            onClick={async () => {
              setPdfMsg("PDF 만드는 중…");
              try {
                await downloadCardPdf(p);
                setPdfMsg("PDF를 내려받았어요. 다운로드 폴더를 확인하세요.");
              } catch {
                setPdfMsg("PDF를 만들지 못했어요. 다시 눌러 주세요.");
              }
            }}
          >
            📄 PDF 저장
          </Button>
          <Button variant="soft" onClick={() => printCard(p)} title="크롬 · 엣지에서 열었을 때 인쇄 창이 떠요">
            🖨 인쇄
          </Button>
          <Button variant="ghost" className="ml-auto" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={onEdit}>고치기</Button>
        </div>
      </div>
    </div>
  );
}

const small = `${inputClass} py-1.5 text-sm`;

function Text({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-blossom-700">{label}</span>
      <input className={`${small} mt-0.5`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Area({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-blossom-700">{label}</span>
      {hint && <span className="ml-2 text-xs text-ink-500">{hint}</span>}
      <textarea className={`${inputClass} mt-0.5 min-h-24 resize-y text-sm leading-relaxed`} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

// 학력 · 경력처럼 여러 줄짜리 표를 고치는 칸
function RowsEditor<T extends Record<string, string>>({
  title,
  rows,
  columns,
  blank,
  onChange,
}: {
  title: string;
  rows: T[];
  columns: { key: keyof T & string; label: string; width: string }[];
  blank: T;
  onChange: (rows: T[]) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-blossom-700">{title}</div>
      <div className="mt-1 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-xs text-ink-500">
              {columns.map((c) => (
                <th key={c.key} className="px-1 pb-1 text-left font-normal" style={{ width: c.width }}>
                  {c.label}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className="px-0.5 py-0.5">
                    <input className={small} value={r[c.key]} onChange={(e) => onChange(rows.map((x, k) => (k === i ? { ...x, [c.key]: e.target.value } : x)))} />
                  </td>
                ))}
                <td>
                  <button type="button" className="px-2 text-ink-500 hover:text-blossom-700" aria-label="이 줄 지우기" onClick={() => onChange(rows.filter((_, k) => k !== i))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="mt-1 text-xs font-semibold text-blossom-700" onClick={() => onChange([...rows, { ...blank }])}>
        + 줄 추가
      </button>
    </div>
  );
}

function InstructorDialog({
  person,
  allFields,
  onSave,
  onDelete,
  onClose,
}: {
  person: Instructor;
  allFields: string[];
  onSave: (p: Instructor) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [p, setP] = useState(person);
  const [fieldsText, setFieldsText] = useState(person.fields.join(", "));
  const [fileMsg, setFileMsg] = useState("");
  const fields = splitFields(fieldsText);
  const set = <K extends keyof Instructor>(k: K, v: Instructor[K]) => setP((cur) => ({ ...cur, [k]: v }));
  const save = () => p.name.trim() && onSave({ ...p, name: p.name.trim(), fields });
  const addField = (f: string) => !fields.includes(f) && setFieldsText([...fields, f].join(", "));

  // 파일로 채우기: 파일에서 찾은 칸만 바꾸고, 못 찾은 칸은 그대로 둬요
  async function fillFrom(file: File | undefined) {
    if (!file) return;
    setFileMsg("파일 읽는 중…");
    try {
      const d = await readProfile(file);
      const found: string[] = [];
      setP((cur) => {
        const next = { ...cur };
        for (const [k, val] of Object.entries(d) as [keyof Instructor, unknown][]) {
          if (k === "fields") continue;
          if ((typeof val === "string" && val.trim()) || (Array.isArray(val) && val.length)) (next as Record<string, unknown>)[k] = val;
        }
        return next;
      });
      if (d.fields?.length) setFieldsText(d.fields.join(", "));
      const label: [keyof typeof d, string][] = [
        ["name", "성명"],
        ["birth", "생년월일"],
        ["org", "소속"],
        ["fields", "전문 분야"],
        ["mobile", "휴대폰"],
        ["email", "메일"],
        ["education", "학력"],
        ["jobs", "주요경력"],
        ["certs", "자격 · 교육이수"],
        ["writings", "논문 · 저서"],
        ["consulting", "컨설팅 · 자문"],
        ["career", "이력"],
        ["photo", "사진"],
      ];
      for (const [k, l] of label) {
        const val = d[k];
        if ((typeof val === "string" && val.trim()) || (Array.isArray(val) && val.length)) found.push(l);
      }
      setFileMsg(found.length ? `「${file.name}」에서 ${found.join(" · ")}을 채웠어요. 맞는지 보고 고쳐 주세요.` : "글자는 읽었지만 칸을 찾지 못했어요. 직접 적어 주세요.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setFileMsg(
        m === "locked"
          ? "암호 · 배포용으로 잠긴 한글 파일이라 못 읽어요."
          : m === "too-big"
            ? "파일이 너무 커요 (20MB까지)."
            : "파일을 읽지 못했어요. 한글(.hwp · .hwpx) · PDF 파일인지 확인해 주세요. (스캔한 그림 PDF는 글자를 못 읽어요)",
      );
    }
  }

  async function setPhotoFile(file: File | undefined) {
    if (!file) return;
    try {
      set("photo", await shrinkPhoto(file));
    } catch {
      setFileMsg("사진을 읽지 못했어요. JPG · PNG 사진을 골라 주세요.");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-3" onClick={onClose}>
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold">👩‍🏫 강사 이력카드 {onDelete ? "고치기" : "추가"}</h3>
        <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="rounded-xl bg-blossom-50 p-3">
            <label className="inline-block cursor-pointer rounded-xl bg-blossom-100 px-4 py-2 text-sm font-semibold text-blossom-700 hover:bg-blossom-200">
              📎 강사 프로필 · 이력카드 파일로 채우기
              <input
                type="file"
                accept={PROFILE_ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  fillFrom(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <span className="ml-2 text-xs text-ink-500">한글(.hwp · .hwpx) · PDF — 사진이 있으면 사진도 가져와요</span>
            {fileMsg && <p className="mt-2 text-sm text-blossom-700">{fileMsg}</p>}
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1">
              <Photo p={p} size="h-32 w-24" />
              <label className="cursor-pointer text-xs text-ink-500 underline">
                {p.photo ? "사진 바꾸기" : "사진 넣기"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    setPhotoFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {p.photo && (
                <button type="button" className="text-xs text-ink-500 underline" onClick={() => set("photo", "")}>
                  사진 빼기
                </button>
              )}
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-blossom-700">성명 *</span>
                <input autoFocus className={`${small} mt-0.5`} value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="예: 홍길동" />
              </label>
              <Text label="생년월일" value={p.birth} onChange={(x) => set("birth", x)} placeholder="1980.01.01" />
              <Text label="소속" value={p.org} onChange={(x) => set("org", x)} />
              <Text label="직위" value={p.position} onChange={(x) => set("position", x)} />
              <Text label="근무 지역" value={p.region} onChange={(x) => set("region", x)} placeholder="예: 전북" />
              <label className="block">
                <span className="text-xs font-semibold text-blossom-700">전문 분야</span>
                <input className={`${small} mt-0.5`} value={fieldsText} onChange={(e) => setFieldsText(e.target.value)} placeholder="예: AI, IT (쉼표로)" />
              </label>
            </div>
          </div>
          {allFields.filter((f) => !fields.includes(f)).length > 0 && (
            <div className="-mt-2 flex flex-wrap justify-end gap-1">
              {allFields
                .filter((f) => !fields.includes(f))
                .map((f) => (
                  <button key={f} type="button" onClick={() => addField(f)} className="rounded-full bg-blossom-50 px-2 py-0.5 text-xs text-blossom-700 hover:bg-blossom-100">
                    + {f}
                  </button>
                ))}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Text label="주소 · 직장" value={p.addrWork} onChange={(x) => set("addrWork", x)} />
            <Text label="주소 · 자택" value={p.addrHome} onChange={(x) => set("addrHome", x)} />
            <Text label="연락처 · 직장" value={p.telWork} onChange={(x) => set("telWork", x)} />
            <Text label="연락처 · 자택" value={p.telHome} onChange={(x) => set("telHome", x)} />
            <Text label="FAX" value={p.fax} onChange={(x) => set("fax", x)} />
            <Text label="휴대폰" value={p.mobile} onChange={(x) => set("mobile", x)} placeholder="010-0000-0000" />
            <Text label="E-mail" value={p.email} onChange={(x) => set("email", x)} />
            <Text label="계좌번호" value={p.account} onChange={(x) => set("account", x)} placeholder="은행 · 번호" />
          </div>

          <RowsEditor<Education>
            title="학력사항"
            rows={p.education}
            blank={{ start: "", end: "", school: "", major: "", degree: "" }}
            columns={[
              { key: "start", label: "입학년월", width: "15%" },
              { key: "end", label: "졸업년월", width: "15%" },
              { key: "school", label: "출신학교명", width: "26%" },
              { key: "major", label: "전공학과", width: "24%" },
              { key: "degree", label: "학위", width: "14%" },
            ]}
            onChange={(rows) => set("education", rows)}
          />
          <RowsEditor<Job>
            title="주요경력"
            rows={p.jobs}
            blank={{ org: "", period: "", position: "", duties: "" }}
            columns={[
              { key: "org", label: "기관(기업)명", width: "30%" },
              { key: "period", label: "근무기간", width: "22%" },
              { key: "position", label: "직위", width: "14%" },
              { key: "duties", label: "주요 업무", width: "30%" },
            ]}
            onChange={(rows) => set("jobs", rows)}
          />

          <Area label="자격/면허 · 교육이수" hint="한 줄에 하나 · [교육이수] 처럼 묶음 제목도 돼요" value={p.certs} onChange={(x) => set("certs", x)} />
          <Area label="논문 및 저서" value={p.writings} onChange={(x) => set("writings", x)} />
          <Area label="컨설팅 및 자문 등 이력" value={p.consulting} onChange={(x) => set("consulting", x)} />
          <Area label="기타 이력" hint="위 칸에 안 맞는 것" value={p.career} onChange={(x) => set("career", x)} />

          <div className="space-y-3 rounded-2xl border border-dashed border-leaf-300 bg-leaf-50 p-3">
            <div className="text-sm font-bold text-leaf-800">
              🔒 나만 보는 기록 <span className="font-normal text-ink-500">(인쇄 · PDF에는 안 나와요)</span>
            </div>
            <Area label="💬 나만의 코멘트" hint="수업 스타일 · 잘하는 것 · 다음에 부탁할 일" value={p.comment} onChange={(x) => set("comment", x)} />
            <div>
              <div className="text-xs font-semibold text-blossom-700">🤝 함께한 수업</div>
              <div className="mt-1 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-xs text-ink-500">
                      <th className="w-[22%] px-1 pb-1 text-left font-normal">날짜</th>
                      <th className="w-[34%] px-1 pb-1 text-left font-normal">어디서</th>
                      <th className="w-[12%] px-1 pb-1 text-left font-normal">시간</th>
                      <th className="px-1 pb-1 text-left font-normal">메모</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {p.sessions.map((s, i) => {
                      const patch = (q: Partial<CoSession>) => set("sessions", p.sessions.map((x, k) => (k === i ? { ...x, ...q } : x)));
                      return (
                        <tr key={i}>
                          <td className="px-0.5 py-0.5">
                            <input type="date" className={small} value={s.date} onChange={(e) => patch({ date: e.target.value })} />
                          </td>
                          <td className="px-0.5 py-0.5">
                            <input className={small} value={s.place} onChange={(e) => patch({ place: e.target.value })} placeholder="예: 캠틱" />
                          </td>
                          <td className="px-0.5 py-0.5">
                            <input type="number" min={0} step={0.5} className={small} value={s.hours || ""} onChange={(e) => patch({ hours: Math.max(0, Number(e.target.value) || 0) })} />
                          </td>
                          <td className="px-0.5 py-0.5">
                            <input className={small} value={s.memo} onChange={(e) => patch({ memo: e.target.value })} placeholder="과정 이름 등" />
                          </td>
                          <td>
                            <button type="button" className="px-2 text-ink-500 hover:text-blossom-700" aria-label="이 줄 지우기" onClick={() => set("sessions", p.sessions.filter((_, k) => k !== i))}>
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-blossom-700"
                onClick={() => set("sessions", [...p.sessions, { date: "", place: p.sessions.at(-1)?.place ?? "", hours: p.sessions.at(-1)?.hours ?? 0, memo: "" }])}
              >
                + 수업 추가
              </button>
            </div>
          </div>
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
          <Button onClick={save} disabled={!p.name.trim()}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

// 강사 카드 한 장: 누르면 이력카드 보기, 오른쪽 위 ✏ 는 바로 고치기
function InstructorCard({ p, field, onView, onEdit }: { p: Instructor; field: string | null; onView: () => void; onEdit: () => void }) {
  const recent = p.jobs.slice(0, 3);
  const sum = sessionSummary(p.sessions);
  return (
    <div className="relative rounded-2xl border border-blossom-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blossom-500 hover:shadow-md">
      <button type="button" onClick={onView} title="누르면 강사 이력카드 보기" className="flex w-full flex-col p-4 pr-12 text-left">
        <span className="flex items-center gap-3">
          <Photo p={p} size="h-16 w-12" />
          <span className="min-w-0">
            <span className="block text-lg font-bold">{p.name}</span>
            {(p.org || p.position) && <span className="block truncate text-xs text-ink-500">{[p.org, p.position].filter(Boolean).join(" · ")}</span>}
          </span>
        </span>
        {p.fields.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1">
            {p.fields.map((f) => (
              <span key={f} className={`rounded-full px-2 py-0.5 text-xs ${f === field ? "bg-blossom-500 text-white" : "bg-blossom-50 text-blossom-700"}`}>
                {f}
              </span>
            ))}
          </span>
        )}
        {recent.length > 0 && (
          <span className="mt-2 block space-y-0.5 text-sm text-ink-500">
            {recent.map((j, i) => (
              <span key={i} className="block truncate">
                · {j.org} {j.duties && `(${j.duties})`}
              </span>
            ))}
            {p.jobs.length > 3 && <span className="block text-xs">외 경력 {p.jobs.length - 3}곳</span>}
          </span>
        )}
        {p.comment && <span className="mt-2 block truncate rounded-lg bg-leaf-50 px-2 py-1 text-xs text-leaf-800">💬 {p.comment.split("\n")[0]}</span>}
        <span className="mt-2 flex flex-wrap gap-x-3 text-xs text-ink-500">
          {p.mobile && <span>☎ {p.mobile}</span>}
          {sum.total.count > 0 && (
            <span>
              🤝 함께 {sum.total.count}회 · {hoursText(sum.total.hours)}
            </span>
          )}
        </span>
      </button>
      <button type="button" onClick={onEdit} className="absolute right-2 top-2 rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 hover:bg-blossom-50 hover:text-blossom-700" aria-label={`${p.name} 고치기`}>
        ✏ 고치기
      </button>
    </div>
  );
}

export function InstructorView({ instructors, onChange }: { instructors: Instructor[]; onChange: (p: Instructor[]) => void }) {
  const [mode, setMode] = useState<"cards" | "fields">("cards");
  const [q, setQ] = useState("");
  const [field, setField] = useState<string | null>(null);
  const [editing, setEditing] = useState<Instructor | null>(null);
  const [viewing, setViewing] = useState<Instructor | null>(null);
  const { ask, dialog } = useConfirm();

  // 분야별 강사 수 (많은 순)
  const counts = instructors.flatMap((p) => p.fields).reduce((m, f) => m.set(f, (m.get(f) ?? 0) + 1), new Map<string, number>());
  const allFields = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b, "ko"));
  const words = q.trim().toLowerCase();
  const searchText = (p: Instructor) =>
    [p.name, p.org, p.position, p.region, p.fields.join(" "), p.certs, p.writings, p.consulting, p.career, ...p.jobs.flatMap((j) => [j.org, j.duties]), ...p.education.map((e) => e.school)]
      .join(" ")
      .toLowerCase();
  const shown = instructors
    .filter((p) => (!field || p.fields.includes(field)) && (!words || searchText(p).includes(words)))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const save = (p: Instructor) => {
    onChange(instructors.some((x) => x.id === p.id) ? instructors.map((x) => (x.id === p.id ? p : x)) : [...instructors, p]);
    setEditing(null);
  };
  const remove = async (p: Instructor) => {
    if (!(await ask(`「${p.name}」 강사를 지울까요?`, "지우기"))) return;
    onChange(instructors.filter((x) => x.id !== p.id));
    setEditing(null);
  };

  return (
    <div>
      {dialog}
      {viewing && (
        <CardView
          person={viewing}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
          onClose={() => setViewing(null)}
        />
      )}
      {editing && (
        <InstructorDialog
          person={editing}
          allFields={allFields}
          onSave={save}
          onDelete={instructors.some((x) => x.id === editing.id) ? () => remove(editing) : undefined}
          onClose={() => setEditing(null)}
        />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <h2 className="text-xl font-bold">강사들</h2>
        <span className="text-sm text-ink-500">{instructors.length}명</span>
        <input className={`${inputClass} sm:ml-4 sm:max-w-xs`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 소속 · 경력 · 분야로 찾기" />
        <div className="flex rounded-full bg-white p-0.5 ring-1 ring-blossom-200">
          {(
            [
              ["cards", "카드"],
              ["fields", "분야별"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === k ? "bg-blossom-500 text-white" : "text-blossom-700"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <Button className="sm:ml-auto" onClick={() => setEditing(blankInstructor({ fields: field ? [field] : [] }))}>
          + 강사 추가
        </Button>
      </div>

      {allFields.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setField(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${!field ? "bg-blossom-500 text-white" : "bg-white text-blossom-700 ring-1 ring-blossom-200"}`}
          >
            전체 {instructors.length}
          </button>
          {allFields.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setField(field === f ? null : f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${field === f ? "bg-blossom-500 text-white" : "bg-white text-blossom-700 ring-1 ring-blossom-200"}`}
            >
              {f} {counts.get(f)}
            </button>
          ))}
        </div>
      )}

      {instructors.length === 0 ? (
        <div className="mx-auto mt-12 max-w-md rounded-3xl border border-blossom-200 bg-white p-8 text-center">
          <div className="text-5xl">👩‍🏫</div>
          <h3 className="mt-4 text-lg font-bold">함께 일하는 강사를 모아 둬요</h3>
          <p className="mt-2 text-sm text-ink-500">강사 이력카드 양식으로 적어 두거나, 강사 프로필 · 이력카드 파일을 올려 채워요. 분야별로 찾아서 강의를 나누거나 추천할 때 꺼내 보세요.</p>
        </div>
      ) : mode === "cards" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <InstructorCard key={p.id} p={p} field={field} onView={() => setViewing(p)} onEdit={() => setEditing(p)} />
          ))}
          {shown.length === 0 && <p className="text-sm text-ink-500">찾는 강사가 없어요.</p>}
        </div>
      ) : (
        // 분야별: 분야마다 묶어서 보여 줘요 (한 강사가 여러 분야면 여러 곳에 나와요)
        <div className="mt-4 space-y-6">
          {[...allFields.filter((f) => !field || f === field), ...(!field && shown.some((p) => !p.fields.length) ? [""] : [])].map((f) => {
            const list = shown.filter((p) => (f ? p.fields.includes(f) : !p.fields.length));
            if (!list.length) return null;
            return (
              <section key={f || "-"}>
                <h3 className="mb-2 flex items-baseline gap-2 border-b border-blossom-200 pb-1">
                  <span className="text-base font-bold text-blossom-700">{f || "분야 없음"}</span>
                  <span className="text-xs text-ink-500">{list.length}명</span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((p) => (
                    <InstructorCard key={p.id} p={p} field={f || null} onView={() => setViewing(p)} onEdit={() => setEditing(p)} />
                  ))}
                </div>
              </section>
            );
          })}
          {shown.length === 0 && <p className="text-sm text-ink-500">찾는 강사가 없어요.</p>}
        </div>
      )}
    </div>
  );
}
