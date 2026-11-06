// 강사 프로필 파일(.hwp · .hwpx · .pdf)을 읽어서 강사 양식(이름 · 분야 · 이력 · 연락처 · 사진)을 채워요.
// 파일은 브라우저 안에서만 읽고 밖으로 보내지 않아요. 글자를 꺼낸 뒤, 「성명」 「경력」 같은 칸 이름을 보고 나눠 담아요.
// 양식마다 모양이 달라서 완벽하지 않아요 — 채운 뒤 고쳐 쓰게 해요.

import { hwpImages, hwpText, imageMime } from "./hwpText";
import { hwpxText, unzipBytes } from "./fileText";
import { Education, Instructor, Job } from "./storage";

// 파일에서 찾은 칸만 들어 있어요 (못 찾은 칸은 빠져 있음)
export type ProfileDraft = Partial<Omit<Instructor, "id">>;

// ---------- 파일 → 글자 + 사진 ----------

async function fromHwp(file: File) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const [text, images] = await Promise.all([hwpText(buf), hwpImages(buf).catch(() => [])]);
  return { text, images: images.map((i) => new Blob([i.data], { type: i.mime })) };
}

async function fromHwpx(file: File) {
  const [text, bins] = await Promise.all([hwpxText(file), unzipBytes(file, (n) => /^BinData\//i.test(n))]);
  const images = [...bins.values()].map((d) => ({ d, mime: imageMime(d) })).filter((x) => x.mime);
  return { text, images: images.map((x) => new Blob([x.d], { type: x.mime })) };
}

// PDF: 글자는 줄 위치(y)로 묶어 줄을 만들고, 사진은 첫 쪽에서 가장 큰 그림을 골라요
async function fromPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"; // public 에 복사해 둔 파일 (pdfjs-dist 와 같은 판)
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), enableXfa: false });
  const doc = await task.promise;
  const lines: string[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, 5); p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // PDF 글자는 조각조각 나뉘어 와요. 같은 줄(y)끼리 모으고, 조각 사이가 실제로 떨어져 있을 때만 띄어 써요
    const rows: { y: number; parts: { x: number; w: number; h: number; s: string }[] }[] = [];
    for (const it of content.items) {
      if (!("str" in it) || !it.str) continue;
      const [x, y] = [it.transform[4], it.transform[5]];
      const part = { x, w: it.width, h: Math.abs(it.transform[3]) || 10, s: it.str };
      const row = rows.find((r) => Math.abs(r.y - y) < 3);
      if (row) row.parts.push(part);
      else rows.push({ y, parts: [part] });
    }
    rows.sort((a, b) => b.y - a.y);
    // 표는 한 줄에 여러 칸이 나란히 있어요. 글자 사이가 아주 멀면(글자 높이보다 넓으면) 다른 칸으로 보고 줄을 나눠요
    for (const r of rows) {
      const parts = r.parts.sort((a, b) => a.x - b.x);
      let line = "";
      const push = () => {
        const t = line.replace(/\s+/g, " ").trim();
        if (t) lines.push(t);
        line = "";
      };
      parts.forEach((q, i) => {
        const prev = parts[i - 1];
        const gap = prev ? q.x - (prev.x + prev.w) : 0;
        // 워드로 만든 PDF는 칸 사이를 넓은 빈칸 조각 하나로 채워요 — 그것도 칸 나눔으로 봐요
        if (!q.s.trim() && q.w > q.h * 1.2) return push();
        if (prev && gap > q.h * 1.2) push();
        else if (prev && gap > q.h * 0.15 && !line.endsWith(" ") && !q.s.startsWith(" ")) line += " ";
        line += q.s;
      });
      push();
    }
  }

  const images: Blob[] = [];
  try {
    const page = await doc.getPage(1);
    const ops = await page.getOperatorList();
    const ids = ops.fnArray.flatMap((fn, i) => (fn === pdfjs.OPS.paintImageXObject ? [ops.argsArray[i][0] as string] : []));
    let best: { area: number; blob: Blob } | null = null;
    for (const id of ids) {
      const img = await new Promise<{ width: number; height: number; bitmap?: ImageBitmap; data?: Uint8ClampedArray; kind?: number } | null>((resolve) => {
        try {
          page.objs.get(id, (o: unknown) => resolve(o as never));
        } catch {
          resolve(null);
        }
      });
      if (!img || img.width < 60 || img.height < 60) continue;
      const area = img.width * img.height;
      if (best && best.area >= area) continue;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      if (img.bitmap) ctx.drawImage(img.bitmap, 0, 0);
      else if (img.data) {
        const rgba = new Uint8ClampedArray(img.width * img.height * 4);
        const step = img.kind === 2 ? 3 : 4; // 2 = RGB, 3 = RGBA
        for (let s = 0, d = 0; d < rgba.length; s += step, d += 4) {
          rgba[d] = img.data[s];
          rgba[d + 1] = img.data[s + 1];
          rgba[d + 2] = img.data[s + 2];
          rgba[d + 3] = step === 4 ? img.data[s + 3] : 255;
        }
        ctx.putImageData(new ImageData(rgba, img.width, img.height), 0, 0);
      } else continue;
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
      if (blob) best = { area, blob };
    }
    if (best) images.push(best.blob);
  } catch {
    // 사진을 못 꺼내도 글자는 써요
  }
  await task.destroy();
  return { text: lines.join("\n"), images };
}

// 사진은 긴 쪽 320px 로 줄여 JPEG 로 저장해요 (브라우저 저장 공간을 아끼려고)
export async function shrinkPhoto(blob: Blob, max = 320): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

// 여러 그림 중 사진 같은 것: 너무 작거나(아이콘) 너무 넓은(로고 · 띠) 그림은 빼고, 가장 큰 것
async function pickPhoto(images: Blob[]) {
  let best: { area: number; blob: Blob } | null = null;
  for (const blob of images) {
    try {
      const bmp = await createImageBitmap(blob);
      const ratio = bmp.width / bmp.height;
      const area = bmp.width * bmp.height;
      if (bmp.width < 60 || bmp.height < 60 || ratio > 1.6 || ratio < 0.4) continue;
      if (!best || area > best.area) best = { area, blob };
    } catch {
      // 못 읽는 그림은 건너뛰어요
    }
  }
  return best ? shrinkPhoto(best.blob) : "";
}

// ---------- 글자 → 양식 ----------

const LABEL_ONLY = /^(성\s*명|이\s*름|강사\s*명|강\s*사|연락처|휴대\s*폰|전화(번호)?|이메일|e-?mail|주\s*소|생년월일|소\s*속|직\s*위|사진)$/i;
const CAREER_HEAD = /^[■□●○◆◇▶\-\s]*(주요\s*)?(경력|약력|이력|학력|강의\s*(경력|이력|실적)|주요\s*활동|활동|저서|자격(증)?|수상)/;
const FIELD_LABEL = /^(강의\s*분야|전문\s*분야|강의\s*주제|주요\s*강의|강의\s*과목|분\s*야)\s*[:：]?\s*(.*)$/;

// ---------- 「강사 이력카드」 양식 ----------
// 표 칸이 한 줄씩 나와요: 「성명」 → 「박○○」 → 「생년월일」 → … 칸 이름 바로 다음 줄을 값으로 읽고,
// 학력 · 경력 표는 날짜 · 기간 칸을 기준으로 줄을 나눠요. 빈 칸은 글자가 없어서 줄도 없어요.

const norm = (s: string) => s.replace(/[\s*＊]/g, "");
const CARD_LABELS = ["성명", "생년월일", "소속", "직위", "근무지역", "전문분야", "주소", "직장", "자택", "연락처", "FAX", "휴대폰", "E-mail", "이메일", "계좌번호", "학력사항", "주요경력"];
const isLabel = (s: string) => CARD_LABELS.some((l) => norm(s).toLowerCase() === l.toLowerCase());
const SECTION = [
  { key: "certs", re: /^자격\/?면허/, tail: ["교육이수"] },
  { key: "writings", re: /^논문/, tail: ["및", "저서", "및저서"] },
  { key: "consulting", re: /^컨설팅/, tail: ["및", "자문", "등", "이력", "및자문등", "및자문등이력", "자문등"] },
] as const;
const sectionOf = (s: string) => SECTION.find((x) => x.re.test(norm(s)));
const isDate = (s: string) => /^\d{4}\s*[.\-/년]\s*\d{1,2}/.test(s.trim());
const isPeriod = (s: string) => /\d{4}\s*[.\-]\s*\d{1,2}\s*[~∼\-]|~\s*(현재|\d{4})|현재$/.test(s);

function parseCard(lines: string[]): ProfileDraft {
  const out: ProfileDraft = {};
  const next = (i: number) => (lines[i + 1] && !isLabel(lines[i + 1]) && !sectionOf(lines[i + 1]) ? lines[i + 1] : "");
  let ctx: "addr" | "tel" | "" = "";
  let i = 0;
  for (; i < lines.length; i++) {
    const n = norm(lines[i]);
    if (n === "학력사항") break;
    if (n === "주소") ctx = "addr";
    else if (n === "연락처") ctx = "tel";
    else if (n === "성명") out.name = next(i).replace(/\s+/g, "");
    else if (n === "생년월일") out.birth = next(i);
    else if (n === "소속") out.org = next(i);
    else if (n === "직위") out.position = next(i);
    else if (n === "근무지역") out.region = next(i);
    else if (n === "전문분야") out.fields = next(i).split(/[,，·/]+/).map((s) => s.trim()).filter(Boolean);
    else if (n === "FAX") out.fax = next(i);
    else if (n === "휴대폰") out.mobile = next(i);
    else if (/^(e-?mail|이메일)$/i.test(n)) out.email = next(i);
    else if (n === "계좌번호") out.account = next(i);
    else if (n === "직장") {
      if (ctx === "addr") out.addrWork = next(i);
      else out.telWork = next(i);
    } else if (n === "자택") {
      if (ctx === "addr") out.addrHome = next(i);
      else out.telHome = next(i);
    }
  }

  // 학력사항: 머리 칸(입학년월 · 졸업년월 · 출신학교명 · 전공학과 · 학위)을 지나 「주요경력」까지
  const eduCells: string[] = [];
  for (i++; i < lines.length && norm(lines[i]) !== "주요경력"; i++) if (!/^(입학년월|졸업년월|출신학교명|전공학과|학위)$/.test(norm(lines[i]))) eduCells.push(lines[i]);
  const education: Education[] = [];
  let cur: string[] = [];
  const flushEdu = () => {
    if (!cur.length) return;
    const dates = cur.filter(isDate);
    const rest = cur.filter((c) => !isDate(c));
    education.push({ start: dates[0] ?? "", end: dates[1] ?? "", school: rest[0] ?? "", major: rest[1] ?? "", degree: rest.slice(2).join(" ") });
    cur = [];
  };
  for (const c of eduCells) {
    if (isDate(c) && cur.some((x) => !isDate(x))) flushEdu();
    cur.push(c);
  }
  flushEdu();
  if (education.length) out.education = education;

  // 주요경력: 머리 칸을 지나 다음 묶음(자격/면허 …)까지. 근무기간 칸을 기준으로 앞 = 기관, 뒤 = 직위 · 주요 업무
  const jobCells: string[] = [];
  for (i++; i < lines.length && !sectionOf(lines[i]); i++) if (!/^(기관\(기업\)명|기관명|근무기간|직위|주요업무)$/.test(norm(lines[i]))) jobCells.push(lines[i]);
  const periods = jobCells.map((c, k) => (isPeriod(c) ? k : -1)).filter((k) => k >= 0);
  const jobs: Job[] = periods.map((pk, n) => {
    const nextOrg = n + 1 < periods.length ? periods[n + 1] - 1 : jobCells.length;
    return { org: jobCells[pk - 1] ?? "", period: jobCells[pk], position: jobCells[pk + 1] ?? "", duties: jobCells.slice(pk + 2, nextOrg).join(" ") };
  });
  if (jobs.length) out.jobs = jobs;

  // 묶음 칸: 「자격/면허 교육이수」 「논문 및 저서」 「컨설팅 및 자문 등 이력」 — 칸 이름이 여러 줄로 쪼개져 나오기도 해요
  let key: (typeof SECTION)[number] | undefined;
  const buf: Record<string, string[]> = { certs: [], writings: [], consulting: [] };
  for (; i < lines.length; i++) {
    const s = sectionOf(lines[i]);
    if (s) {
      key = s;
      while (lines[i + 1] && (s.tail as readonly string[]).includes(norm(lines[i + 1]))) i++;
      continue;
    }
    // PDF는 칸 이름 조각(「및」 「저서」 「이력」…)이 내용 사이에 섞여 나오기도 해서 빼요
    const isTail = SECTION.some((x) => (x.tail as readonly string[]).includes(norm(lines[i])));
    if (key && !isTail) buf[key.key].push(lines[i].replace(/^[·•]\s*/, "· "));
  }
  for (const s of SECTION) if (buf[s.key].length) out[s.key] = buf[s.key].join("\n");
  return out;
}

export function parseProfile(text: string): ProfileDraft {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((l) => !/^[*＊]+$/.test(l)) // 필수 칸 표시 「*」만 따로 떨어진 줄
    .filter((l) => !/\d{6}\s*-\s*[1-4]\d{6}/.test(l)); // 주민등록번호가 든 줄은 아예 버려요

  // 「강사 이력카드」 양식이면 칸별로 읽어요
  if (lines.some((l) => norm(l) === "학력사항") && lines.some((l) => norm(l) === "성명")) return parseCard(lines);

  // 이름: 「성명: 홍길동」 또는 「성명」 다음 줄
  let name = "";
  for (let i = 0; i < lines.length && !name; i++) {
    const m = lines[i].match(/^(성\s*명|이\s*름|강사\s*명)\s*[:：]?\s*([가-힣]{2,5})(\s|$|\()/);
    if (m) name = m[2];
    else if (/^(성\s*명|이\s*름|강사\s*명)$/.test(lines[i]) && /^[가-힣]{2,5}(\s*\(.*\))?$/.test(lines[i + 1] ?? "")) name = lines[i + 1].replace(/\s*\(.*$/, "");
  }
  if (!name) name = lines.find((l) => /^[가-힣]{2,4}$/.test(l) && !/이력|프로필|소개|강사|경력|학력|성명|분야/.test(l)) ?? "";

  // 연락처: 휴대폰 · 메일
  const phone = (text.match(/01[016789]\s*[-.)]?\s*\d{3,4}\s*[-.]?\s*\d{4}/)?.[0] ?? "").replace(/\s+/g, "");
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";

  // 강의 분야: 「강의분야: A, B」 또는 그 다음 줄
  let fields: string[] = [];
  for (let i = 0; i < lines.length && !fields.length; i++) {
    const m = lines[i].match(FIELD_LABEL);
    if (!m) continue;
    const value = m[2].replace(/^[*＊\s]+/, "") || lines[i + 1] || "";
    fields = [...new Set(value.split(/[,，·/|]+/).map((s) => s.trim()).filter((s) => s && s.length <= 20))].slice(0, 10);
  }

  // 이력: 「경력」 「약력」 같은 제목이 처음 나온 곳부터 끝까지. 없으면 이름 · 연락처 줄을 뺀 전부.
  const start = lines.findIndex((l) => CAREER_HEAD.test(l));
  const body = (start >= 0 ? lines.slice(start) : lines).filter(
    (l) => !LABEL_ONLY.test(l) && l !== name && !FIELD_LABEL.test(l) && !(phone && l.includes(phone) && l.length < 40) && !(email && l.includes(email) && l.length < 50),
  );
  const career = body
    .map((l) => (CAREER_HEAD.test(l) && l.length <= 12 ? `【${l.replace(/^[■□●○◆◇▶\-\s]+/, "")}】` : l.replace(/^[-•·▪]\s*/, "")))
    .slice(0, 60)
    .join("\n");

  return { name, fields, career, mobile: phone, email };
}

export const PROFILE_ACCEPT = ".hwp,.hwpx,.pdf";

export async function readProfile(file: File): Promise<ProfileDraft> {
  if (file.size > 20 * 1024 * 1024) throw new Error("too-big");
  const ext = file.name.toLowerCase().split(".").pop();
  const { text, images } = ext === "hwp" ? await fromHwp(file) : ext === "hwpx" ? await fromHwpx(file) : ext === "pdf" ? await fromPdf(file) : { text: "", images: [] };
  if (!text.trim() && !images.length) throw new Error("empty");
  return { ...parseProfile(text), photo: await pickPhoto(images) };
}
