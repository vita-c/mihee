// 예전 한글 파일(.hwp, HWP 5.0)에서 글자만 꺼내요.
// .hwp 는 여러 조각(스트림)을 한 파일에 묶은 형식이에요. 본문은 BodyText/Section0, Section1 … 조각에
// 압축되어 들어 있어서, 묶음을 풀고 → 압축을 풀고 → 문단 글자 기록(PARA_TEXT)만 모아요.

const FREE = 0xffffffff;
const END = 0xfffffffe;

type Entry = { name: string; type: number; left: number; right: number; child: number; start: number; size: number };

export async function hwpText(buf: Uint8Array<ArrayBuffer>) {
  const cfb = readCfb(buf);
  const header = cfb.stream("FileHeader");
  if (!header || new TextDecoder().decode(header.subarray(0, 17)) !== "HWP Document File") throw new Error("not hwp");
  const flags = new DataView(header.buffer, header.byteOffset).getUint32(36, true);
  if (flags & 0b110) throw new Error("locked"); // 암호 · 배포용 문서
  const compressed = (flags & 1) === 1;

  const sections = cfb.children("BodyText").filter((n) => /^Section\d+$/.test(n));
  sections.sort((a, b) => Number(a.slice(7)) - Number(b.slice(7)));
  const out: string[] = [];
  for (const name of sections) {
    const raw = cfb.stream(name, "BodyText");
    if (!raw) continue;
    out.push(paraTexts(compressed ? await inflate(raw) : raw));
  }
  return out.join("\n").trim();
}

// 그림 파일의 첫 바이트로 종류를 알아봐요
export function imageMime(b: Uint8Array) {
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x42 && b[1] === 0x4d) return "image/bmp";
  return "";
}

// .hwp 안에 넣은 그림(BinData/BIN0001.jpg …)을 꺼내요. 프로필 사진 찾기에 써요.
// 그림 조각도 압축돼 있을 수 있어서, 그림 모양이 아니면 압축을 풀어 다시 봐요.
export async function hwpImages(buf: Uint8Array<ArrayBuffer>) {
  const cfb = readCfb(buf);
  const out: { name: string; data: Uint8Array<ArrayBuffer>; mime: string }[] = [];
  for (const name of cfb.children("BinData")) {
    let data = cfb.stream(name, "BinData");
    if (!data) continue;
    let mime = imageMime(data);
    if (!mime) {
      try {
        data = await inflate(data);
        mime = imageMime(data);
      } catch {
        continue;
      }
    }
    if (mime) out.push({ name, data, mime });
  }
  return out;
}

async function inflate(data: Uint8Array<ArrayBuffer>) {
  // 한글 파일은 압축 끝에 남는 바이트가 붙어 있기도 해요. 크롬은 그걸 오류로 보니, 그 전까지 푼 내용을 써요.
  const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const parts: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
    }
  } catch (e) {
    if (!parts.length) throw e;
  }
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

// 기록 하나 = 머리(4바이트: 종류 10비트 · 단계 10비트 · 길이 12비트) + 내용. 종류 67이 문단 글자예요.
function paraTexts(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const lines: string[] = [];
  let pos = 0;
  while (pos + 4 <= data.length) {
    const head = view.getUint32(pos, true);
    pos += 4;
    let size = head >>> 20;
    if (size === 0xfff) {
      size = view.getUint32(pos, true);
      pos += 4;
    }
    if ((head & 0x3ff) === 67) {
      const line = decodeParaText(view, pos, size);
      if (line.trim()) lines.push(line);
    }
    pos += size;
  }
  return lines.join("\n");
}

// 글자 사이사이에 표 · 그림 같은 조종 문자가 섞여 있어요. 한 칸짜리는 건너뛰고, 여덟 칸짜리는 통째로 건너뛰어요.
function decodeParaText(view: DataView, start: number, size: number) {
  let s = "";
  const end = Math.min(start + size, view.byteLength);
  for (let i = start; i + 1 < end; ) {
    const c = view.getUint16(i, true);
    if (c >= 32) {
      s += String.fromCharCode(c);
      i += 2;
    } else if (c === 0 || c === 10 || c === 13 || (c >= 24 && c <= 31)) {
      if (c === 10) s += "\n";
      if (c === 30 || c === 31) s += " "; // 묶음 빈칸 · 고정폭 빈칸
      i += 2;
    } else {
      if (c === 9) s += "\t";
      i += 16;
    }
  }
  return s;
}

// 마이크로소프트 복합 문서(CFB) 묶음을 읽는 작은 도구예요. 필요한 조각만 꺼내요.
function readCfb(buf: Uint8Array<ArrayBuffer>) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (view.getUint32(0, true) !== 0xe011cfd0 || view.getUint32(4, true) !== 0xe11ab1a1) throw new Error("not cfb");
  const ssz = 1 << view.getUint16(30, true);
  const mssz = 1 << view.getUint16(32, true);
  const cutoff = view.getUint32(56, true);
  const sector = (n: number) => buf.subarray((n + 1) * ssz, (n + 2) * ssz);
  const u32s = (b: Uint8Array) => {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return Array.from({ length: b.length >> 2 }, (_, i) => v.getUint32(i * 4, true));
  };

  // FAT 위치 목록(DIFAT): 머리에 109개, 넘치면 따로 이어진 칸에
  const difat: number[] = [];
  for (let i = 0; i < 109; i++) difat.push(view.getUint32(76 + i * 4, true));
  let next = view.getUint32(68, true);
  for (let guard = 0; next !== END && next !== FREE && guard < 10000; guard++) {
    const ids = u32s(sector(next));
    next = ids.pop()!;
    difat.push(...ids);
  }
  const fat = difat.filter((n) => n !== FREE && n !== END).flatMap((n) => u32s(sector(n)));

  const chain = (start: number, table: number[]) => {
    const ids: number[] = [];
    for (let n = start; n !== END && n !== FREE && n < table.length && ids.length <= table.length; n = table[n]) ids.push(n);
    return ids;
  };
  const join = (parts: Uint8Array[]) => {
    const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  };

  const dirBytes = join(chain(view.getUint32(48, true), fat).map(sector));
  const dv = new DataView(dirBytes.buffer);
  const entries: Entry[] = [];
  for (let off = 0; off + 128 <= dirBytes.length; off += 128) {
    const nameLen = Math.max(0, dv.getUint16(off + 64, true) - 2);
    entries.push({
      name: new TextDecoder("utf-16le").decode(dirBytes.subarray(off, off + nameLen)),
      type: dirBytes[off + 66],
      left: dv.getUint32(off + 68, true),
      right: dv.getUint32(off + 72, true),
      child: dv.getUint32(off + 76, true),
      start: dv.getUint32(off + 116, true),
      size: dv.getUint32(off + 120, true),
    });
  }
  const root = entries[0];
  const miniFat = join(chain(view.getUint32(60, true), fat).map(sector));
  const miniTable = u32s(miniFat);
  const miniStream = join(chain(root.start, fat).map(sector));

  // 한 폴더(storage) 안의 이름들은 나무 모양으로 이어져 있어요
  const kids = (parent: Entry) => {
    const found: Entry[] = [];
    const walk = (i: number, depth: number) => {
      if (i === FREE || i >= entries.length || depth > 64) return;
      const e = entries[i];
      walk(e.left, depth + 1);
      found.push(e);
      walk(e.right, depth + 1);
    };
    walk(parent.child, 0);
    return found;
  };
  const find = (name: string, parent: Entry) => kids(parent).find((e) => e.name === name);

  return {
    children(storage: string) {
      const dir = find(storage, root);
      return dir ? kids(dir).map((e) => e.name) : [];
    },
    stream(name: string, storage?: string) {
      const dir = storage ? find(storage, root) : root;
      const e = dir && find(name, dir);
      if (!e || e.type !== 2) return null;
      const data =
        e.size < cutoff
          ? join(chain(e.start, miniTable).map((n) => miniStream.subarray(n * mssz, (n + 1) * mssz)))
          : join(chain(e.start, fat).map(sector));
      return data.subarray(0, e.size);
    },
  };
}
