// 커리큘럼을 한글(.hwpx) 파일로 만들어요.
// 한글 파일의 글꼴 · 글자 모양 · 테두리 정의(header.xml)는 실제 한글 문서에서 가져온 바탕(public/hwpx-base)을 쓰고,
// 이 문서에 필요한 모양만 뒤에 덧붙여요. 본문(section0.xml)은 여기서 새로 써요.

import { CurriculumDoc, ROMAN, SECTIONS, esc } from "./curriculumDoc";
import type { TableDoc } from "./tableExport";
import { makeZip } from "./zipWrite";

const W = 48190; // A4 너비 59528 - 좌우 여백 20mm × 2 (HWPUNIT)

// 바탕 header.xml 에는 글자 모양 0~14, 문단 모양 0~27, 테두리 1~6 이 있어요. 그 뒤 번호를 써요.
const CP = { title: 15, heading: 16, roman: 17, body: 18, info: 19, th: 20, cell: 21, cellBold: 22, note: 23, breakCell: 24 };
const PP = { center: 28, left: 29, bullet: 30, cell: 31 };
const BF = { none: 7, title: 8, roman: 9, headingLine: 10, grid: 11, gridHead: 12, gridBreak: 13 };

function charPr(id: number, height: number, font: Record<string, number>, o: { bold?: boolean; color?: string } = {}) {
  const ref = ["hangul", "latin", "hanja", "japanese", "other", "symbol", "user"].map((k) => `${k}="${font[k] ?? 0}"`).join(" ");
  const all = (v: number) => ["hangul", "latin", "hanja", "japanese", "other", "symbol", "user"].map((k) => `${k}="${v}"`).join(" ");
  return `<hh:charPr id="${id}" height="${height}" textColor="${o.color ?? "#000000"}" shadeColor="none" useFontSpace="0" useKerning="0" symMark="NONE" borderFillIDRef="2"><hh:fontRef ${ref}/><hh:ratio ${all(100)}/><hh:spacing ${all(0)}/><hh:relSz ${all(100)}/><hh:offset ${all(0)}/>${
    o.bold ? "<hh:bold/>" : ""
  }<hh:underline type="NONE" shape="SOLID" color="#000000"/><hh:strikeout shape="NONE" color="#000000"/><hh:outline type="NONE"/><hh:shadow type="NONE" color="#C0C0C0" offsetX="10" offsetY="10"/></hh:charPr>`;
}

function paraPr(id: number, align: string, o: { intent?: number; left?: number; after?: number; line?: number } = {}) {
  const margin = `<hh:margin><hc:intent value="${o.intent ?? 0}" unit="HWPUNIT"/><hc:left value="${o.left ?? 0}" unit="HWPUNIT"/><hc:right value="0" unit="HWPUNIT"/><hc:prev value="0" unit="HWPUNIT"/><hc:next value="${o.after ?? 0}" unit="HWPUNIT"/></hh:margin><hh:lineSpacing type="PERCENT" value="${o.line ?? 150}" unit="HWPUNIT"/>`;
  return `<hh:paraPr id="${id}" tabPrIDRef="0" condense="0" fontLineHeight="0" snapToGrid="1" suppressLineNumbers="0" checked="0" textDir="LTR"><hh:align horizontal="${align}" vertical="BASELINE"/><hh:heading type="NONE" idRef="0" level="0"/><hh:breakSetting breakLatinWord="KEEP_WORD" breakNonLatinWord="BREAK_WORD" widowOrphan="0" keepWithNext="0" keepLines="0" pageBreakBefore="0" lineWrap="BREAK"/><hh:autoSpacing eAsianEng="0" eAsianNum="0"/><hp:switch><hp:case hp:required-namespace="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar">${margin}</hp:case><hp:default>${margin}</hp:default></hp:switch><hh:border borderFillIDRef="2" offsetLeft="0" offsetRight="0" offsetTop="0" offsetBottom="0" connect="0" ignoreMargin="0"/></hh:paraPr>`;
}

type Side = "left" | "right" | "top" | "bottom";
function borderFill(id: number, sides: Partial<Record<Side, string>>, fill = "none") {
  const b = (k: Side) => {
    const s = sides[k];
    if (!s) return `<hh:${k}Border type="NONE" width="0.1 mm" color="#000000"/>`;
    const [width, color] = s.split(" ");
    return `<hh:${k}Border type="SOLID" width="${width} mm" color="${color}"/>`;
  };
  return `<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="NONE" breakCellSeparateLine="0"><hh:slash type="NONE" Crooked="0" isCounter="0"/><hh:backSlash type="NONE" Crooked="0" isCounter="0"/>${b("left")}${b("right")}${b("top")}${b("bottom")}<hh:diagonal type="NONE" width="0.1 mm" color="#000000"/><hc:fillBrush><hc:winBrush faceColor="${fill}" hatchColor="#999999" alpha="0"/></hc:fillBrush></hh:borderFill>`;
}

// 바탕 header.xml 에 맑은 고딕 글꼴과 이 문서용 모양을 덧붙여요
function patchHeader(header: string) {
  const font: Record<string, number> = {};
  header = header.replace(/<hh:fontface lang="(\w+)" fontCnt="(\d+)">([\s\S]*?)<\/hh:fontface>/g, (_, lang: string, cnt: string, inner: string) => {
    const id = Number(cnt);
    font[lang.toLowerCase()] = id;
    return `<hh:fontface lang="${lang}" fontCnt="${id + 1}">${inner}<hh:font id="${id}" face="맑은 고딕" type="TTF" isEmbedded="0"><hh:typeInfo familyType="FCAT_GOTHIC" weight="6" proportion="4" contrast="0" strokeVariation="1" armStyle="1" letterform="1" midline="1" xHeight="1"/></hh:font></hh:fontface>`;
  });

  const grid = { left: "0.12 #000000", right: "0.12 #000000", top: "0.12 #000000", bottom: "0.12 #000000" };
  const fills = [
    borderFill(BF.none, {}),
    borderFill(BF.title, { top: "0.7 #1F5FBF", bottom: "0.7 #C00000" }, "#F2F2F2"),
    borderFill(BF.roman, {}, "#E7E6E6"),
    borderFill(BF.headingLine, { bottom: "0.4 #000000" }),
    borderFill(BF.grid, grid),
    borderFill(BF.gridHead, grid, "#DCE6F1"),
    borderFill(BF.gridBreak, grid, "#F7F7F7"),
  ];
  const chars = [
    charPr(CP.title, 1600, font, { bold: true }),
    charPr(CP.heading, 1300, font, { bold: true }),
    charPr(CP.roman, 1200, font, { bold: true }),
    charPr(CP.body, 1100, font),
    charPr(CP.info, 950, font, { color: "#555555" }),
    charPr(CP.th, 1000, font, { bold: true }),
    charPr(CP.cell, 1000, font),
    charPr(CP.cellBold, 1000, font, { bold: true }),
    charPr(CP.note, 950, font, { color: "#1F5FBF" }),
    charPr(CP.breakCell, 1000, font, { color: "#777777" }),
  ];
  const paras = [
    paraPr(PP.center, "CENTER", { line: 130 }),
    paraPr(PP.left, "LEFT", { line: 130 }),
    paraPr(PP.bullet, "JUSTIFY", { intent: -1100, left: 0, after: 300, line: 160 }),
    paraPr(PP.cell, "LEFT", { line: 130 }),
  ];
  const append = (tag: string, items: string[]) => {
    header = header.replace(new RegExp(`<hh:${tag} itemCnt="(\\d+)">`), (_, n: string) => `<hh:${tag} itemCnt="${Number(n) + items.length}">`);
    header = header.replace(`</hh:${tag}>`, `${items.join("")}</hh:${tag}>`);
  };
  append("borderFills", fills);
  append("charProperties", chars);
  append("paraProperties", paras);
  return header;
}

// 커리큘럼 문서, 또는 제목 + 표 하나짜리 목록 문서(캘린더 · 할 일 내보내기)
function section(doc: CurriculumDoc | TableDoc[]) {
  let pid = 1;
  let tid = 1;
  const run = (cp: number, text: string) => `<hp:run charPrIDRef="${cp}">${text ? `<hp:t>${esc(text)}</hp:t>` : "<hp:t/>"}</hp:run>`;
  const p = (pp: number, runs: string) => `<hp:p id="${pid++}" paraPrIDRef="${pp}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">${runs}</hp:p>`;
  const line = (pp: number, cp: number, text: string) => p(pp, run(cp, text));

  // 칸 높이는 글자가 들어갈 만큼 넉넉히 잡아요 (10pt 글자 · 줄 간격 130% ≈ 한 줄 1400)
  type Cell = { paras: string; bf: number; span?: number; lines?: number; lineH?: number };
  // split: 글자처럼 붙이지 않고 문단 아래 놓아서, 쪽이 넘어가면 줄 단위로 나뉘어요 (시간표처럼 긴 표)
  const table = (widths: number[], rows: Cell[][], cellMargin = 283, split = false, top = false) => {
    const heights = rows.map((r) => Math.max(...r.map((c) => (c.lines ?? 1) * (c.lineH ?? 1400) + 2 * 283)));
    const body = rows
      .map((cells, ri) => {
        let col = 0;
        return `<hp:tr>${cells
          .map((c) => {
            const span = c.span ?? 1;
            const w = widths.slice(col, col + span).reduce((a, b) => a + b, 0);
            const tc = `<hp:tc name="" header="${split && ri === 0 ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="1" borderFillIDRef="${c.bf}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="${top ? "TOP" : "CENTER"}" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${c.paras}</hp:subList><hp:cellAddr colAddr="${col}" rowAddr="${ri}"/><hp:cellSpan colSpan="${span}" rowSpan="1"/><hp:cellSz width="${w}" height="${heights[ri]}"/><hp:cellMargin left="${cellMargin}" right="${cellMargin}" top="283" bottom="283"/></hp:tc>`;
            col += span;
            return tc;
          })
          .join("")}</hp:tr>`;
      })
      .join("");
    const tbl = `<hp:tbl id="${2000000000 + tid++}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="${top ? "NONE" : "CELL"}" repeatHeader="1" rowCnt="${rows.length}" colCnt="${widths.length}" cellSpacing="0" borderFillIDRef="${BF.none}" noAdjust="0"><hp:sz width="${W}" widthRelTo="ABSOLUTE" height="${heights.reduce((a, b) => a + b, 0)}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="${split ? 0 : 1}" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="${split ? 566 : 0}"/><hp:inMargin left="0" right="0" top="0" bottom="0"/>${body}</hp:tbl>`;
    return p(PP.left, `<hp:run charPrIDRef="${CP.body}">${tbl}<hp:t/></hp:run>`);
  };

  const heading = (i: number) =>
    table(
      [2200, 12000, W - 14200],
      [
        [
          { paras: line(PP.center, CP.roman, ROMAN[i]), bf: BF.roman, lineH: 1800 },
          { paras: line(PP.left, CP.heading, SECTIONS[i]), bf: BF.headingLine, lineH: 1800 },
          { paras: line(PP.left, CP.body, ""), bf: BF.none },
        ],
      ],
    ) + line(PP.left, CP.body, "");

  const bullets = (items: string[]) => (items.length ? items : ["(아직 비어 있음)"]).map((s) => line(PP.bullet, CP.body, `• ${s}`)).join("");

  const out: string[] = [];
  if (Array.isArray(doc)) {
    // 목록 · 달력 문서 여러 개(달마다 하나): 제목 상자 → 부제 → 머리줄 있는 표. 두 번째부터는 새 쪽에서 시작해요
    doc.forEach((d, n) => {
      if (n > 0) out.push(`<hp:p id="${pid++}" paraPrIDRef="${PP.left}" styleIDRef="0" pageBreak="1" columnBreak="0" merged="0">${run(CP.body, "")}</hp:p>`);
      out.push(table([W], [[{ paras: line(PP.center, CP.title, d.title), bf: BF.title, lineH: 3000 }]]));
      out.push(line(PP.center, CP.info, d.subtitle), line(PP.left, CP.body, ""));
      const total = d.columns.reduce((s, c) => s + c.width, 0);
      const widths = d.columns.map((c) => Math.round((c.width / total) * W));
      widths[widths.length - 1] += W - widths.reduce((a, b) => a + b, 0);
      // 칸 높이 어림: 줄마다 칸 너비에 들어가는 글자 수로 나눠 몇 줄이 될지 세요
      const linesOf = (v: string, w: number) => v.split("\n").reduce((s, l) => s + Math.max(1, Math.ceil(l.length / Math.max(3, Math.floor(w / 950)))), 0);
      const rows: Cell[][] = [
        d.columns.map((c) => ({ paras: line(PP.center, CP.th, c.label), bf: BF.gridHead })),
        ...(d.rows.length ? d.rows : [d.columns.map((_, i) => (i === 0 ? "(내용 없음)" : ""))]).map((r) =>
          r.map((v, i) => ({
            paras: v
              .split("\n")
              .map((s) => line(d.columns[i].align === "left" ? PP.cell : PP.center, CP.cell, s))
              .join(""),
            bf: BF.grid,
            lines: Math.max(d.minLines ?? 1, linesOf(v, widths[i])),
          })),
        ),
      ];
      // 달력 표(minLines)는 칸 위쪽부터 채우고, 한 주가 두 쪽으로 갈라지지 않게 줄째로 넘겨요
      out.push(table(widths, rows, 200, true, !!d.minLines));
    });
  } else {
  out.push(table([W], [[{ paras: line(PP.center, CP.title, doc.title), bf: BF.title, lineH: 3000 }]]));
  out.push(line(PP.center, CP.info, doc.info.join("   ·   ")), line(PP.left, CP.body, ""));
  out.push(heading(0), bullets(doc.goals), line(PP.left, CP.body, ""));
  out.push(heading(1), bullets(doc.flows), line(PP.left, CP.body, ""));

  out.push(heading(2));
  const widths = [2600, 7600, W - 10200];
  const rows: Cell[][] = [
    [
      { paras: line(PP.center, CP.th, "시간"), bf: BF.gridHead, span: 2 },
      { paras: line(PP.center, CP.th, "세부 내용"), bf: BF.gridHead },
    ],
    ...doc.rows.map((r) => [
      { paras: line(PP.center, CP.cell, r.no), bf: BF.grid },
      { paras: line(PP.center, CP.cell, r.time), bf: BF.grid },
      r.isBreak
        ? { paras: line(PP.cell, CP.breakCell, r.label), bf: BF.gridBreak }
        : {
            paras: line(PP.cell, CP.cellBold, `▶ ${r.label}`) + r.subs.map((s) => line(PP.cell, CP.cell, `- ${s}`)).join(""),
            bf: BF.grid,
            lines: 1 + r.subs.length,
          },
    ]),
  ];
  out.push(table(widths, rows, 200, true));
  out.push(line(PP.center, CP.note, doc.note), line(PP.left, CP.body, ""));
  out.push(heading(3), bullets(doc.effects));
  }

  const secPr = `<hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0"><hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/><hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/><hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/><hp:lineNumberShape restartType="0" countBy="0" distance="0" startNumber="0"/><hp:pagePr landscape="WIDELY" width="59528" height="84186" gutterType="LEFT_ONLY"><hp:margin header="2835" footer="2835" gutter="0" left="5669" right="5669" top="4252" bottom="4252"/></hp:pagePr><hp:footNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="-1" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="283" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="EACH_COLUMN" beneathText="0"/></hp:footNotePr><hp:endNotePr><hp:autoNumFormat type="DIGIT" userChar="" prefixChar="" suffixChar=")" supscript="0"/><hp:noteLine length="14692344" type="SOLID" width="0.12 mm" color="#000000"/><hp:noteSpacing betweenNotes="0" belowLine="567" aboveLine="850"/><hp:numbering type="CONTINUOUS" newNum="1"/><hp:placement place="END_OF_DOCUMENT" beneathText="0"/></hp:endNotePr><hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill><hp:pageBorderFill type="EVEN" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill><hp:pageBorderFill type="ODD" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill></hp:secPr>`;
  const first = `<hp:p id="${pid++}" paraPrIDRef="${PP.left}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${CP.body}">${secPr}<hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl></hp:run></hp:p>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><hs:sec ${NS}>${first}${out.join("")}</hs:sec>`;
}

const NS = [
  'xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"',
  'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph"',
  'xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph"',
  'xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"',
  'xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"',
  'xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head"',
].join(" ");

export const curriculumHwpx = (doc: CurriculumDoc) => packageHwpx(doc.title, section(doc));
export const tableHwpx = (docs: TableDoc[]) => packageHwpx(docs[0]?.title ?? "문서", section(docs));

async function packageHwpx(title: string, sectionXml: string): Promise<Blob> {
  const res = await fetch("/hwpx-base/header.xml");
  if (!res.ok) throw new Error("hwpx base missing");
  const header = patchHeader(await res.text());
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const contentHpf = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><opf:package xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" version="" unique-identifier="" id=""><opf:metadata><opf:title>${esc(title)}</opf:title><opf:language>ko</opf:language><opf:meta name="creator" content="text">사과꽃 강의실</opf:meta><opf:meta name="CreatedDate" content="text">${now}</opf:meta><opf:meta name="ModifiedDate" content="text">${now}</opf:meta></opf:metadata><opf:manifest><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/><opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/><opf:item id="settings" href="settings.xml" media-type="application/xml"/></opf:manifest><opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>`;
  return makeZip([
    { name: "mimetype", data: "application/hwp+zip" },
    {
      name: "version.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="Hancom Office Hangul" appVersion="13, 0, 0, 1408 WIN32LEWindows_10"/>`,
    },
    {
      name: "META-INF/container.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/></ocf:rootfiles></ocf:container>`,
    },
    { name: "META-INF/manifest.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>` },
    { name: "Contents/content.hpf", data: contentHpf },
    { name: "Contents/header.xml", data: header },
    { name: "Contents/section0.xml", data: sectionXml },
    {
      name: "settings.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"><ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/></ha:HWPApplicationSetting>`,
    },
  ]);
}
