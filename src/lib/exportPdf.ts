// 커리큘럼을 PDF로 저장해요. 문서 모양을 그린 뒤 브라우저 인쇄 창을 열어요 → 프린터에서 「PDF로 저장」을 고르면 돼요.
// 한글 글꼴을 파일에 넣지 않아도 되고, 화면에서 보이는 모양 그대로 나와요.

import { CurriculumDoc, ROMAN, SECTIONS, esc } from "./curriculumDoc";

export function curriculumHtml(doc: CurriculumDoc) {
  const heading = (i: number) => `<div class="h"><span class="r">${ROMAN[i]}</span><span class="t">${SECTIONS[i]}</span></div>`;
  const bullets = (items: string[]) => `<ul>${(items.length ? items : ["(아직 비어 있음)"]).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`;
  const rows = doc.rows
    .map(
      (r) =>
        `<tr class="${r.isBreak ? "brk" : ""}"><td class="c">${r.no}</td><td class="c">${r.time}</td><td>${
          r.isBreak ? esc(r.label) : `<b>▶ ${esc(r.label)}</b>${r.subs.map((s) => `<div>- ${esc(s)}</div>`).join("")}`
        }</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>
@page { size: A4; margin: 15mm 20mm; }
* { box-sizing: border-box; }
body { font-family: "맑은 고딕", "Malgun Gothic", sans-serif; color: #000; font-size: 11pt; line-height: 1.6; margin: 0; }
.title { border-top: 2.5pt solid #1F5FBF; border-bottom: 2.5pt solid #C00000; background: #F2F2F2; text-align: center; font-size: 16pt; font-weight: 700; padding: 8pt; }
.info { text-align: center; color: #555; font-size: 9.5pt; margin: 6pt 0 14pt; }
.h { display: flex; align-items: stretch; margin: 16pt 0 6pt; }
.h .r { background: #E7E6E6; font-weight: 700; font-size: 12pt; width: 26pt; text-align: center; padding: 1pt 0; }
.h .t { font-weight: 700; font-size: 13pt; border-bottom: 1pt solid #000; padding: 1pt 8pt; min-width: 160pt; }
ul { margin: 0; padding-left: 14pt; } li { margin-bottom: 4pt; } li::marker { content: "• "; }
table { width: 100%; border-collapse: collapse; font-size: 10pt; line-height: 1.45; }
th, td { border: 0.75pt solid #000; padding: 4pt 7pt; vertical-align: middle; }
th { background: #DCE6F1; } td.c { text-align: center; white-space: nowrap; }
tr { break-inside: avoid; } tr.brk td { background: #F7F7F7; color: #777; }
.note { text-align: center; color: #1F5FBF; font-size: 9.5pt; margin: 8pt 0 0; }
</style></head><body>
<div class="title">${esc(doc.title)}</div>
<div class="info">${doc.info.map(esc).join("&nbsp;&nbsp;·&nbsp;&nbsp;")}</div>
${heading(0)}${bullets(doc.goals)}
${heading(1)}${bullets(doc.flows)}
${heading(2)}<table><colgroup><col style="width:6%"><col style="width:16%"><col></colgroup><thead><tr><th colspan="2">시간</th><th>세부 내용</th></tr></thead><tbody>${rows || '<tr><td colspan="3">(시간표가 비어 있음)</td></tr>'}</tbody></table>
<p class="note">${esc(doc.note)}</p>
${heading(3)}${bullets(doc.effects)}
</body></html>`;
}

// 보이지 않는 틀에 문서를 그리고 인쇄 창을 열어요
export function printCurriculum(doc: CurriculumDoc) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.srcdoc = curriculumHtml(doc);
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60000);
  };
  document.body.appendChild(frame);
}
