// 「강사 이력카드」 한 장을 HTML 로 그려요. 화면의 이력카드 보기와 인쇄(PDF)가 같은 모양을 써요.
// 양식: 제목 → 기본 정보 표(사진) → 학력사항 → 주요경력 → 자격/면허 · 교육이수 → 논문 및 저서 → 컨설팅 및 자문 등 이력

import { Instructor } from "./storage";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const v = (s: string) => esc(s.trim()) || "&nbsp;";
const lines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/^[\[【].*[\]】]$/.test(l) ? `<div class="rc-h">${esc(l)}</div>` : `<div>${/^[·•\-]/.test(l) ? esc(l) : `· ${esc(l)}`}</div>`))
    .join("") || "&nbsp;";

// 화면 · 인쇄 모두 .rc 안쪽에만 적용되는 모양
export const CARD_CSS = `
.rc { font-family: "맑은 고딕", "Malgun Gothic", sans-serif; color: #111; font-size: 10.5pt; line-height: 1.45; }
.rc h1 { text-align: center; font-size: 22pt; letter-spacing: 0.35em; margin: 4pt 0 14pt; }
.rc h1 span { border-bottom: 2pt solid #111; padding: 0 6pt 2pt; }
.rc table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: -1px; }
.rc td, .rc th { border: 1px solid #333; padding: 4pt 6pt; vertical-align: middle; word-break: keep-all; overflow-wrap: anywhere; }
.rc th { background: #efefef; font-weight: 700; text-align: center; white-space: nowrap; }
.rc td.c { text-align: center; }
.rc td.photo { padding: 4pt; text-align: center; }
.rc td.photo img { width: 100%; max-width: 32mm; aspect-ratio: 3 / 4; object-fit: cover; display: block; margin: 0 auto; }
.rc td.photo .ph { aspect-ratio: 3 / 4; max-width: 32mm; margin: 0 auto; background: #f4f4f4; color: #999; display: flex; align-items: center; justify-content: center; font-size: 9pt; }
.rc td.body { padding: 6pt 8pt; } .rc td.body div { margin: 1pt 0; } .rc .rc-h { font-weight: 700; margin-top: 4pt !important; }
.rc .rc-page2 { margin-top: 14pt; }
.rc .rc-page2 td.body { padding: 10pt 10pt; }
`;

export function cardHtml(p: Instructor) {
  const photo = p.photo.startsWith("data:image/") ? `<img src="${p.photo}" alt="">` : `<div class="ph">사진</div>`;
  const edu = p.education.length ? p.education : [{ start: "", end: "", school: "", major: "", degree: "" }];
  const jobs = p.jobs.length ? p.jobs : [{ org: "", period: "", position: "", duties: "" }];
  const section = (label: string, body: string) => `<table><colgroup><col style="width:13%"><col></colgroup><tr><th>${label}</th><td class="body">${lines(body)}</td></tr></table>`;

  // 두 쪽: 1쪽 = 기본 정보 · 학력 · 경력, 2쪽 = 자격 · 저서 · 컨설팅 (보내 주신 양식처럼)
  return `<div class="rc">
<div class="rc-page">
<h1><span>강사이력카드</span></h1>
<table>
<colgroup><col style="width:13%"><col style="width:13%"><col style="width:18%"><col style="width:14%"><col style="width:22%"><col style="width:20%"></colgroup>
<tr><th>성 명</th><td class="c" colspan="2">${v(p.name)}</td><th>생년월일</th><td class="c">${v(p.birth)}</td><td class="photo" rowspan="5">${photo}</td></tr>
<tr><th>소 속</th><td class="c" colspan="2">${v(p.org)}</td><th>직 위</th><td class="c">${v(p.position)}</td></tr>
<tr><th>근무 지역</th><td class="c" colspan="2">${v(p.region)}</td><th>전문 분야</th><td class="c">${v(p.fields.join(", "))}</td></tr>
<tr><th rowspan="2">주 소</th><th>직 장</th><td colspan="3">${v(p.addrWork)}</td></tr>
<tr><th>자 택</th><td colspan="3">${v(p.addrHome)}</td></tr>
<tr><th rowspan="2">연 락 처</th><th>직 장</th><td class="c">${v(p.telWork)}</td><th>F A X</th><td class="c" colspan="2">${v(p.fax)}</td></tr>
<tr><th>자 택</th><td class="c">${v(p.telHome)}</td><th>휴대폰</th><td class="c" colspan="2">${v(p.mobile)}</td></tr>
<tr><th>E-mail</th><td class="c" colspan="2">${v(p.email)}</td><th>계좌번호</th><td class="c" colspan="2">${v(p.account)}</td></tr>
<tr><th rowspan="${edu.length + 1}">학력사항</th><th>입학년월</th><th>졸업년월</th><th>출신학교명</th><th>전공학과</th><th>학 위</th></tr>
${edu.map((e) => `<tr><td class="c">${v(e.start)}</td><td class="c">${v(e.end)}</td><td class="c">${v(e.school)}</td><td class="c">${v(e.major)}</td><td class="c">${v(e.degree)}</td></tr>`).join("")}
<tr><th rowspan="${jobs.length + 1}">주요경력</th><th colspan="2">기관(기업)명</th><th>근무기간</th><th>직 위</th><th>주요 업무</th></tr>
${jobs.map((j) => `<tr><td class="c" colspan="2">${v(j.org)}</td><td class="c">${v(j.period)}</td><td class="c">${v(j.position)}</td><td class="c">${v(j.duties)}</td></tr>`).join("")}
</table>
</div>
<div class="rc-page rc-page2">
${section("자격/면허<br>교육이수", p.certs)}
${section("논문 및<br>저서", p.writings)}
${section("컨설팅<br>및 자문 등<br>이력", p.consulting)}
${p.career.trim() ? section("기타 이력", p.career) : ""}
</div>
</div>`;
}

// PDF 파일로 바로 내려받기: 쪽마다 그림으로 찍어 A4 한 장씩 넣어요 (인쇄 창이 안 뜨는 곳에서도 돼요)
export async function downloadCardPdf(p: Instructor) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:760px;background:#fff;padding:0";
  host.innerHTML = `<style>${CARD_CSS} .rc-page { background:#fff; padding: 8px; }</style>${cardHtml(p)}`;
  document.body.appendChild(host);
  try {
    await Promise.all([...host.querySelectorAll("img")].map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))));
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pages = [...host.querySelectorAll<HTMLElement>(".rc-page")];
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff" });
      const maxW = 186;
      const maxH = 273;
      let w = maxW;
      let h = (canvas.height / canvas.width) * w;
      if (h > maxH) {
        h = maxH;
        w = (canvas.width / canvas.height) * h;
      }
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (210 - w) / 2, 12, w, h);
    }
    pdf.save(`${(p.name || "강사").replace(/[\\/:*?"<>|]/g, " ")} 강사이력카드.pdf`);
  } finally {
    host.remove();
  }
}

// 인쇄 창 → 프린터에서 「PDF로 저장」을 고르면 PDF 파일이 돼요
export function printCard(p: Instructor) {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(p.name)} 강사 이력카드</title><style>@page { size: A4; margin: 14mm; } body { margin: 0; } table { break-inside: auto; } tr { break-inside: avoid; } ${CARD_CSS} .rc .rc-page2 { break-before: page; margin-top: 0; }</style></head><body>${cardHtml(p)}</body></html>`;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60000);
  };
  document.body.appendChild(frame);
}
