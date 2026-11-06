// 커리큘럼을 워드(.docx) 파일로 만들어요. 워드 문서도 zip 안의 xml 묶음이에요.

import { CurriculumDoc, ROMAN, SECTIONS, esc } from "./curriculumDoc";
import { makeZip } from "./zipWrite";

const FONT = "맑은 고딕";
const W = 9638; // A4 너비 - 좌우 여백 20mm (단위: 1/20pt)

type RunOpt = { b?: boolean; sz?: number; color?: string };
type ParaOpt = { align?: "left" | "center" | "both"; hanging?: boolean; after?: number; before?: number };
type Borders = Partial<Record<"top" | "bottom" | "left" | "right", string>>;

const run = (text: string, o: RunOpt = {}) =>
  `<w:r><w:rPr>${o.b ? "<w:b/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}<w:sz w:val="${o.sz ?? 22}"/><w:szCs w:val="${o.sz ?? 22}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

const para = (runs: string, o: ParaOpt = {}) =>
  `<w:p><w:pPr><w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 60}" w:line="300" w:lineRule="auto"/>${
    o.hanging ? '<w:ind w:left="300" w:hanging="300"/>' : ""
  }<w:jc w:val="${o.align ?? "both"}"/></w:pPr>${runs}</w:p>`;

const border = (spec: string | undefined) => {
  if (!spec) return 'w:val="nil"';
  const [sz, color] = spec.split(" ");
  return `w:val="single" w:sz="${sz}" w:space="0" w:color="${color}"`;
};

function cell(width: number, content: string, o: { shade?: string; borders?: Borders; span?: number; vAlign?: string } = {}) {
  const b = o.borders;
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${o.span ? `<w:gridSpan w:val="${o.span}"/>` : ""}${
    b
      ? `<w:tcBorders>${(["top", "left", "bottom", "right"] as const).map((k) => `<w:${k} ${border(b[k])}/>`).join("")}</w:tcBorders>`
      : ""
  }${o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : ""}<w:vAlign w:val="${o.vAlign ?? "center"}"/></w:tcPr>${content}</w:tc>`;
}

// 표 줄은 쪽 사이에서 쪼개지지 않게 하고, 첫 줄(머리줄)은 다음 쪽에도 다시 보여요
function table(widths: number[], rows: string[], allBorders: boolean) {
  const b = allBorders ? 'w:val="single" w:sz="4" w:space="0" w:color="000000"' : 'w:val="nil"';
  return `<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((k) => `<w:${k} ${b}/>`)
    .join("")}</w:tblBorders><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths
    .map((w) => `<w:gridCol w:w="${w}"/>`)
    .join("")}</w:tblGrid>${rows
    .map((r, i) => `<w:tr><w:trPr><w:cantSplit/>${allBorders && i === 0 ? "<w:tblHeader/>" : ""}</w:trPr>${r}</w:tr>`)
    .join("")}</w:tbl>`;
}

function heading(i: number) {
  return (
    table(
      [560, 3400, W - 3960],
      [
        cell(560, para(run(ROMAN[i], { b: true, sz: 24 }), { align: "center", after: 0 }), { shade: "E7E6E6", borders: {} }) +
          cell(3400, para(run(SECTIONS[i], { b: true, sz: 26 }), { align: "left", after: 0 }), { borders: { bottom: "8 000000" } }) +
          cell(W - 3960, para(""), { borders: {} }),
      ],
      false,
    ) + para("", { after: 60 })
  );
}

const bullets = (items: string[]) => items.map((s) => para(run(`• ${s}`), { hanging: true, after: 80 })).join("") || para(run("(아직 비어 있음)", { color: "888888" }));

function body(doc: CurriculumDoc) {
  const out: string[] = [];
  out.push(
    table(
      [W],
      [cell(W, para(run(doc.title, { b: true, sz: 32 }), { align: "center", after: 0, before: 0 }), { shade: "F2F2F2", borders: { top: "24 1F5FBF", bottom: "24 C00000" } })],
      false,
    ),
  );
  out.push(para(run(doc.info.join("   ·   "), { sz: 19, color: "555555" }), { align: "center", before: 120, after: 240 }));

  out.push(heading(0), bullets(doc.goals), para("", { after: 120 }));
  out.push(heading(1), bullets(doc.flows), para("", { after: 120 }));

  out.push(heading(2));
  const widths = [620, 1700, W - 2320];
  // 칸에 색을 칠하면 표 테두리가 가려지기도 해서, 색 칸은 테두리를 직접 그려요
  const GRID: Borders = { top: "4 000000", bottom: "4 000000", left: "4 000000", right: "4 000000" };
  const head = cell(widths[0] + widths[1], para(run("시간", { b: true, sz: 20 }), { align: "center", after: 0 }), { shade: "DCE6F1", span: 2, borders: GRID }) +
    cell(widths[2], para(run("세부 내용", { b: true, sz: 20 }), { align: "center", after: 0 }), { shade: "DCE6F1", borders: GRID });
  const rows = doc.rows.map((r) => {
    const content = r.isBreak
      ? para(run(r.label, { sz: 20, color: "777777" }), { align: "left", after: 0 })
      : para(run(`▶ ${r.label}`, { b: true, sz: 20 }), { align: "left", after: 20 }) + r.subs.map((s) => para(run(`- ${s}`, { sz: 20 }), { align: "left", after: 0 })).join("");
    return (
      cell(widths[0], para(run(r.no, { sz: 20 }), { align: "center", after: 0 })) +
      cell(widths[1], para(run(r.time, { sz: 20 }), { align: "center", after: 0 })) +
      cell(widths[2], content, r.isBreak ? { shade: "F7F7F7", borders: GRID } : {})
    );
  });
  out.push(table(widths, [head, ...(rows.length ? rows : [cell(W, para(run("(시간표가 비어 있음)")), { span: 3 })])], true));
  out.push(para(run(doc.note, { sz: 19, color: "1F5FBF" }), { align: "center", before: 120, after: 240 }));

  out.push(heading(3), bullets(doc.effects));
  return out.join("");
}

export function curriculumDocx(doc: CurriculumDoc): Blob {
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body(doc)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/><w:sz w:val="22"/><w:lang w:val="ko-KR" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults></w:styles>`;
  return makeZip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    {
      name: "word/_rels/document.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: "word/document.xml", data: document },
    { name: "word/styles.xml", data: styles },
  ]);
}
