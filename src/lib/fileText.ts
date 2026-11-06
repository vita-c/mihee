// 올린 파일에서 글자만 꺼내요. 파일은 브라우저 안에서만 읽고 밖으로 보내지 않아요.
// 워드(.docx) · 파워포인트(.pptx) · 한글(.hwpx)은 zip 묶음이라, 안의 xml을 풀어서 글자를 모아요.
// 예전 한글(.hwp)은 묶음 형식이 달라서 hwpText 에서 따로 읽어요.

import { hwpText } from "./hwpText";

export const ACCEPT = ".txt,.md,.csv,.docx,.pptx,.hwp,.hwpx";
const MAX_FILE = 20 * 1024 * 1024;

export type FileTextResult = { text: string } | { error: string };

export async function readFileText(file: File): Promise<FileTextResult> {
  if (file.size > MAX_FILE) return { error: "파일이 너무 커요 (20MB까지)." };
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  try {
    if (ext === "txt" || ext === "md" || ext === "csv") return { text: (await file.text()).trim() };
    if (ext === "docx") return { text: await docxText(file) };
    if (ext === "pptx") return { text: await pptxText(file) };
    if (ext === "hwpx") return { text: await hwpxText(file) };
    if (ext === "hwp") return { text: await hwpText(new Uint8Array(await file.arrayBuffer())) };
    if (ext === "pdf" || ext === "doc" || ext === "ppt")
      return { error: "이 파일은 아직 못 읽어요. 워드(.docx) · 한글로 저장하거나, 내용을 복사해서 붙여 넣어 주세요." };
    return { error: "읽을 수 있는 파일: 한글(.hwp · .hwpx) · 워드(.docx) · 파워포인트(.pptx) · 메모장(.txt · .md · .csv)" };
  } catch (e) {
    if (e instanceof Error && e.message === "locked")
      return { error: "암호가 걸렸거나 배포용으로 잠긴 한글 파일이라 못 읽어요. 내용을 복사해서 붙여 넣어 주세요." };
    return { error: "파일을 읽지 못했어요. 파일이 열리는지 확인하고 다시 올려 주세요." };
  }
}

export async function hwpxText(file: File) {
  const files = await unzip(file, (name) => /^Contents\/section\d+\.xml$/.test(name));
  const no = (name: string) => Number(name.match(/section(\d+)\.xml$/)![1]);
  if (!files.size) throw new Error("no section");
  return [...files.keys()]
    .sort((a, b) => no(a) - no(b))
    .map((name) => paragraphs(files.get(name)!, "hp:p", "hp:t"))
    .join("\n");
}

async function docxText(file: File) {
  const files = await unzip(file, (name) => name === "word/document.xml");
  const xml = files.get("word/document.xml");
  if (!xml) throw new Error("no document");
  return paragraphs(xml, "w:p", "w:t");
}

async function pptxText(file: File) {
  const files = await unzip(file, (name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  const slideNo = (name: string) => Number(name.match(/slide(\d+)\.xml$/)![1]);
  return [...files.keys()]
    .sort((a, b) => slideNo(a) - slideNo(b))
    .map((name) => `[슬라이드 ${slideNo(name)}]\n${paragraphs(files.get(name)!, "a:p", "a:t")}`)
    .join("\n\n");
}

// 한글은 표 안의 문단이 바깥 문단 속에 들어 있어서, 글자마다 가장 가까운 문단에만 붙여요.
function paragraphs(xml: string, pTag: string, tTag: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const nearestP = (el: Element) => {
    let cur = el.parentElement;
    while (cur && cur.tagName !== pTag) cur = cur.parentElement;
    return cur;
  };
  return Array.from(doc.getElementsByTagName(pTag))
    .map((p) =>
      Array.from(p.getElementsByTagName(tTag))
        .filter((t) => nearestP(t) === p)
        .map((t) => t.textContent ?? "")
        .join(""),
    )
    .filter((line) => line.trim())
    .join("\n");
}

// 필요한 파일만 골라 푸는 작은 zip 읽개예요. 글자 파일용(unzip)과 그림처럼 바이트 그대로 필요할 때(unzipBytes).
async function unzip(file: File, want: (name: string) => boolean) {
  const bytes = await unzipBytes(file, want);
  const decoder = new TextDecoder();
  return new Map([...bytes].map(([name, data]) => [name, decoder.decode(data)]));
}

export async function unzipBytes(file: File, want: (name: string) => boolean) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(buf.buffer);
  let end = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("not a zip");

  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const out = new Map<string, Uint8Array<ArrayBuffer>>();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method = view.getUint16(pos + 10, true);
    const size = view.getUint32(pos + 20, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const local = view.getUint32(pos + 42, true);
    const name = decoder.decode(buf.subarray(pos + 46, pos + 46 + nameLen));
    pos += 46 + nameLen + extraLen + commentLen;
    if (!want(name)) continue;

    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = buf.subarray(start, start + size);
    if (method === 0) out.set(name, data.slice());
    else if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      out.set(name, new Uint8Array(await new Response(stream).arrayBuffer()));
    }
  }
  return out;
}
