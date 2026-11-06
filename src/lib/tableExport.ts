// 제목 + 표로 된 문서 여러 개(달마다 하나)를 한글(.hwpx) · Word(.docx) · 엑셀(.xlsx) · PDF 로 저장해요.
// 캘린더 일정 · 할 일 내보내기가 같이 써요. 문서가 여러 개면 한글 · Word · PDF 는 새 쪽, 엑셀은 새 시트로 나눠요.
// 한글은 exportHwpx 의 tableHwpx 를 써요.

import { esc } from "./curriculumDoc";
import { tableHwpx } from "./exportHwpx";
import { download, makeZip } from "./zipWrite";

export type TableDoc = {
  title: string;
  subtitle: string;
  columns: { label: string; width: number; align?: "left" | "center" }[]; // width 는 비율
  rows: string[][];
  minLines?: number; // 칸 최소 높이(줄 수) — 달력 표처럼 칸을 넉넉히 보여 줄 때
  sheet?: string; // 엑셀 시트 이름
};

export type ExportKind = "pdf" | "hwpx" | "docx" | "xlsx";
export const EXPORT_KINDS: { kind: ExportKind; label: string }[] = [
  { kind: "pdf", label: "PDF" },
  { kind: "hwpx", label: "한글" },
  { kind: "docx", label: "Word" },
  { kind: "xlsx", label: "엑셀" },
];

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, " ").trim();

// ---------- Word ----------
export function tableDocx(docs: TableDoc[]): Blob {
  const W = 9638;
  const run = (t: string, b = false, sz = 20, color = "") =>
    `<w:r><w:rPr>${b ? "<w:b/>" : ""}${color ? `<w:color w:val="${color}"/>` : ""}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
  const para = (runs: string, jc = "left", after = 0) => `<w:p><w:pPr><w:spacing w:before="0" w:after="${after}" w:line="264" w:lineRule="auto"/><w:jc w:val="${jc}"/></w:pPr>${runs}</w:p>`;
  const border = 'w:val="single" w:sz="4" w:space="0" w:color="000000"';

  const one = (doc: TableDoc) => {
    const total = doc.columns.reduce((s, c) => s + c.width, 0);
    const widths = doc.columns.map((c) => Math.round((c.width / total) * W));
    const cell = (w: number, text: string, o: { head?: boolean; align?: string } = {}) =>
      `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.head ? '<w:shd w:val="clear" w:color="auto" w:fill="DCE6F1"/>' : ""}<w:vAlign w:val="${doc.minLines ? "top" : "center"}"/></w:tcPr>${(text || " ")
        .split("\n")
        .map((l, k) => para(run(l, o.head || (!!doc.minLines && k === 0), o.head ? 20 : doc.minLines ? 16 : 19), o.head ? "center" : o.align === "left" ? "left" : "center"))
        .join("")}</w:tc>`;
    const minH = doc.minLines ? `<w:trHeight w:val="${doc.minLines * 260}" w:hRule="atLeast"/>` : "";
    const rows = [
      `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${doc.columns.map((c, i) => cell(widths[i], c.label, { head: true })).join("")}</w:tr>`,
      ...(doc.rows.length ? doc.rows : [["(내용 없음)"]]).map(
        (r) => `<w:tr><w:trPr><w:cantSplit/>${minH}</w:trPr>${doc.columns.map((c, i) => cell(widths[i], r[i] ?? "", { align: c.align })).join("")}</w:tr>`,
      ),
    ];
    return `${para(run(doc.title, true, 32), "center", 80)}${para(run(doc.subtitle, false, 19, "555555"), "center", 200)}<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map((k) => `<w:${k} ${border}/>`).join("")}</w:tblBorders><w:tblCellMar><w:top w:w="50" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
  };

  const pageBreak = `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  const body = docs.map(one).join(pageBreak);
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  return makeZip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/_rels/document.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    {
      name: "word/document.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1134" w:bottom="1000" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`,
    },
    {
      name: "word/styles.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="맑은 고딕" w:hAnsi="맑은 고딕" w:eastAsia="맑은 고딕" w:cs="맑은 고딕"/><w:sz w:val="20"/><w:lang w:val="ko-KR" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults></w:styles>`,
    },
  ]);
}

// ---------- 엑셀 ----------
// 문서 하나 = 시트 하나. 1줄 제목, 2줄 부제, 4줄 머리줄(굵게 · 색), 그 아래 내용. 목록은 머리줄 고정 + 필터.
export function tableXlsx(docs: TableDoc[]): Blob {
  const col = (i: number) => String.fromCharCode(65 + i);
  const cellXml = (ref: string, v: string, s = 0) => `<c r="${ref}" t="inlineStr"${s ? ` s="${s}"` : ""}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  const names: string[] = [];
  const sheetName = (d: TableDoc) => {
    let base = (d.sheet ?? d.title).replace(/[\\/?*[\]:']/g, " ").slice(0, 28).trim() || "시트";
    while (names.includes(base)) base = `${base} `;
    names.push(base);
    return base;
  };
  const sheets = docs.map((doc) => {
    const grid = !!doc.minLines;
    const rowsXml = [
      `<row r="1">${cellXml("A1", doc.title, 1)}</row>`,
      `<row r="2">${cellXml("A2", doc.subtitle, 0)}</row>`,
      `<row r="4">${doc.columns.map((c, i) => cellXml(`${col(i)}4`, c.label, 2)).join("")}</row>`,
      ...doc.rows.map(
        (r, ri) =>
          `<row r="${ri + 5}"${grid ? ` ht="${Math.max(60, (doc.minLines ?? 4) * 15)}" customHeight="1"` : ""}>${doc.columns.map((_, i) => cellXml(`${col(i)}${ri + 5}`, r[i] ?? "", grid ? 4 : 3)).join("")}</row>`,
      ),
    ].join("");
    const total = doc.columns.reduce((s, c) => s + c.width, 0);
    const cols = doc.columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(8, Math.round((c.width / total) * (grid ? 150 : 110)))}" customWidth="1"/>`).join("");
    const last = `${col(doc.columns.length - 1)}${doc.rows.length + 4}`;
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rowsXml}</sheetData>${grid || !doc.rows.length ? "" : `<autoFilter ref="A4:${last}"/>`}</worksheet>`;
    return { name: sheetName(doc), xml, filter: !grid && doc.rows.length ? `$A$4:$${col(doc.columns.length - 1)}$${doc.rows.length + 4}` : "" };
  });
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="14"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs></styleSheet>`;
  return makeZip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join("")}</sheets>${
        sheets.some((s) => s.filter)
          ? `<definedNames>${sheets
              .map((s, i) => (s.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(s.name)}'!${s.filter}</definedName>` : ""))
              .join("")}</definedNames>`
          : ""
      }</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml })),
    { name: "xl/styles.xml", data: styles },
  ]);
}

// ---------- PDF ----------
// HTML 쪽 묶음(달마다 하나)을 그림으로 찍어 A4 에 담아요. 묶음마다 새 쪽에서 시작하고,
// 한 묶음이 길면 표 줄 경계에서 끊어 다음 쪽으로 넘겨요.
export async function htmlPdf(pages: string[], fileName: string, landscape = false) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const pageW = landscape ? 297 : 210;
  const pageH = landscape ? 210 : 297;
  const margin = 10;
  const cssW = landscape ? 1120 : 760;
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" });
  let first = true;
  for (const html of pages) {
    const host = document.createElement("div");
    host.style.cssText = `position:fixed;left:-20000px;top:0;width:${cssW}px;background:#fff;padding:0;font-family:"맑은 고딕","Malgun Gothic",sans-serif;color:#111`;
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      const scale = 2;
      const canvas = await html2canvas(host, { scale, backgroundColor: "#ffffff" });
      const mmPerPx = (pageW - margin * 2) / canvas.width;
      const pageHpx = Math.floor((pageH - margin * 2) / mmPerPx);
      const top = host.getBoundingClientRect().top;
      const cuts = [...host.querySelectorAll("tr")].map((el) => Math.round((el.getBoundingClientRect().bottom - top) * scale)).sort((a, b) => a - b);
      let y = 0;
      while (y < canvas.height - 2) {
        let end = Math.min(canvas.height, y + pageHpx);
        if (end < canvas.height) {
          const cut = cuts.filter((c) => c > y + 50 && c <= end).pop();
          if (cut) end = cut;
        }
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = end - y;
        slice.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, end - y, 0, 0, canvas.width, end - y);
        if (!first) pdf.addPage();
        pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, pageW - margin * 2, (end - y) * mmPerPx);
        first = false;
        y = end;
      }
    } finally {
      host.remove();
    }
  }
  pdf.save(fileName);
}

export function tableHtml(doc: TableDoc) {
  const total = doc.columns.reduce((s, c) => s + c.width, 0);
  return `<div style="padding:4px 2px">
<div style="text-align:center;font-size:20px;font-weight:700;border-top:3px solid #1F5FBF;border-bottom:3px solid #C00000;background:#F2F2F2;padding:8px">${esc(doc.title)}</div>
<div style="text-align:center;font-size:12px;color:#555;margin:6px 0 12px">${esc(doc.subtitle)}</div>
<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;line-height:1.45">
<colgroup>${doc.columns.map((c) => `<col style="width:${(c.width / total) * 100}%">`).join("")}</colgroup>
<tr>${doc.columns.map((c) => `<th style="border:1px solid #333;background:#DCE6F1;padding:5px 6px">${esc(c.label)}</th>`).join("")}</tr>
${(doc.rows.length ? doc.rows : [["(내용 없음)"]])
  .map(
    (r) =>
      `<tr>${doc.columns.map((c, i) => `<td style="border:1px solid #333;padding:5px 6px;vertical-align:middle;text-align:${c.align === "left" ? "left" : "center"};white-space:pre-line;word-break:keep-all;overflow-wrap:anywhere">${esc(r[i] ?? "")}</td>`).join("")}</tr>`,
  )
  .join("")}
</table></div>`;
}

// 고른 형식으로 저장. pdfPages 가 있으면 PDF 는 그 HTML(예: 화면 같은 달력)로 만들어요.
export async function saveTables(kind: ExportKind, docs: TableDoc[], fileBase: string, o: { pdfPages?: string[]; landscape?: boolean } = {}) {
  const name = `${safeName(fileBase)}.${kind}`;
  if (kind === "pdf") return htmlPdf(o.pdfPages ?? docs.map(tableHtml), name, o.landscape);
  const blob = kind === "hwpx" ? await tableHwpx(docs) : kind === "docx" ? tableDocx(docs) : tableXlsx(docs);
  download(blob, name);
}
