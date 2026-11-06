// 구글 캘린더 「iCal 형식의 비공개 주소」를 대신 읽어 주는 통로예요.
// 브라우저는 보안 규칙(CORS) 때문에 구글 캘린더 주소를 바로 못 읽어서, 이 서버가 받아서 넘겨줘요.
// 아무 주소나 읽어 주면 위험하니, 구글 캘린더의 iCal 주소만 받아요. 주소는 저장하지 않고 기록도 남기지 않아요.

const MAX = 5 * 1024 * 1024;

export async function POST(req: Request) {
  let raw = "";
  try {
    raw = String(((await req.json()) as { url?: unknown }).url ?? "").trim();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return Response.json({ error: "not-ical" }, { status: 400 });
  }
  if (url.protocol !== "https:" || url.hostname !== "calendar.google.com" || !url.pathname.startsWith("/calendar/ical/") || !url.pathname.endsWith(".ics")) {
    return Response.json({ error: "not-ical" }, { status: 400 });
  }

  try {
    const res = await fetch(url, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!res.ok) return Response.json({ error: res.status === 404 ? "not-found" : "upstream" }, { status: 502 });
    const text = await res.text();
    if (text.length > MAX || !text.includes("BEGIN:VCALENDAR")) return Response.json({ error: "not-ical" }, { status: 502 });
    return new Response(text, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
