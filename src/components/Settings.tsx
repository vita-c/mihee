"use client";

import { useRef, useState } from "react";
import { Store, parseStore } from "@/lib/storage";
import { Button } from "./ui";

export function Settings({ store, onImport }: { store: Store; onImport: (s: Store) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  function exportFile() {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `사과꽃강의실-백업-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("백업 파일을 내려받았어요.");
  }

  async function importFile(file: File) {
    try {
      const parsed = parseStore(JSON.parse(await file.text()));
      if (!parsed) {
        setMsg("백업 파일이 아니에요.");
        return;
      }
      const ok = window.confirm(
        `강의 ${parsed.lectures.length}개 · 내 자료 ${parsed.materials.length}개를 불러올게요. 지금 기록은 이걸로 바뀌어요. 계속할까요?`,
      );
      if (!ok) return;
      onImport(parsed);
      setMsg("불러왔어요.");
    } catch {
      setMsg("백업 파일이 아니에요.");
    }
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-bold">백업</h2>
      <p className="mt-2 text-sm text-ink-500">
        기록은 이 컴퓨터의 브라우저 안에 저장돼요. 브라우저 기록을 지우면 같이 지워질 수 있어서, 가끔 내보내기를 해 두면 안전해요.
        다른 컴퓨터로 옮길 때도 이 파일을 쓰면 돼요.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={exportFile}>⬇ 파일로 내보내기</Button>
        <Button variant="soft" onClick={() => fileRef.current?.click()}>
          ⬆ 파일에서 가져오기
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {msg && <p className="mt-4 text-sm font-semibold text-leaf-800">{msg}</p>}
    </div>
  );
}
