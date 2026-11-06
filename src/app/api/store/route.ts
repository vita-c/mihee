// 강의실 기록을 내 컴퓨터의 파일 하나에 읽고 써요. (브라우저 저장 공간 대신)
// 파일 위치: .env.local 의 LECTURE_ROOM_DATA (없으면 이 프로젝트의 data/lecture-room-data.json)
// 쓸 때마다: 임시 파일에 먼저 쓰고 바꿔치기(중간에 꺼져도 파일이 깨지지 않게) + 하루 한 번 backups/ 에 복사본(30일치).
// 강사 주소 · 계좌번호가 들어 있어서, 이 컴퓨터(localhost)에서 온 요청만 받아요.

import { promises as fs } from "node:fs";
import path from "node:path";

const FILE = process.env.LECTURE_ROOM_DATA || path.join(process.cwd(), "data", "lecture-room-data.json");
const BACKUPS = path.join(path.dirname(FILE), "backups");
const MAX = 30 * 1024 * 1024;
const KEEP_DAYS = 30;

function isLocal(req: Request) {
  const host = (req.headers.get("host") ?? "").split(":")[0];
  const origin = req.headers.get("origin");
  const okHost = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  const okOrigin = !origin || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
  return okHost && okOrigin;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Data-File": encodeURIComponent(FILE) } });

export async function GET(req: Request) {
  if (!isLocal(req)) return json({ error: "forbidden" }, 403);
  try {
    const text = await fs.readFile(FILE, "utf8");
    return new Response(text, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Data-File": encodeURIComponent(FILE) } });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return json({ error: "none", file: FILE }, 404);
    return json({ error: "read" }, 500);
  }
}

export async function PUT(req: Request) {
  if (!isLocal(req)) return json({ error: "forbidden" }, 403);
  const text = await req.text();
  if (text.length > MAX) return json({ error: "too-big" }, 413);
  try {
    const data = JSON.parse(text) as { lectures?: unknown; materials?: unknown };
    if (!Array.isArray(data.lectures) || !Array.isArray(data.materials)) return json({ error: "bad" }, 400);
  } catch {
    return json({ error: "bad" }, 400);
  }
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    // 오늘 첫 저장이면, 바꾸기 전 파일을 backups/날짜.json 으로 남겨요
    const today = new Date().toISOString().slice(0, 10);
    const backup = path.join(BACKUPS, `lecture-room-${today}.json`);
    try {
      await fs.access(backup);
    } catch {
      try {
        await fs.mkdir(BACKUPS, { recursive: true });
        await fs.copyFile(FILE, backup);
        const old = (await fs.readdir(BACKUPS)).filter((n) => /^lecture-room-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
        for (const n of old.slice(0, Math.max(0, old.length - KEEP_DAYS))) await fs.unlink(path.join(BACKUPS, n));
      } catch {
        // 아직 파일이 없으면(처음 저장) 복사할 게 없어요
      }
    }
    const tmp = `${FILE}.tmp`;
    await fs.writeFile(tmp, text, "utf8");
    await fs.rename(tmp, FILE);
    return json({ ok: true, savedAt: new Date().toISOString() });
  } catch {
    return json({ error: "write" }, 500);
  }
}
