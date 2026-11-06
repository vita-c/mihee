"use client";

import { useRef, useState } from "react";
import { Store, parseStore } from "@/lib/storage";
import { Button, useConfirm } from "./ui";

export function Settings({ store, onImport, dataFile }: { store: Store; onImport: (s: Store) => void; dataFile: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const { ask, dialog } = useConfirm();

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
      const ok = await ask(
        `강의 ${parsed.lectures.length}개 · 내 자료 ${parsed.materials.length}개를 불러올게요.\n지금 기록은 이걸로 바뀌어요. 계속할까요?`,
        "불러오기",
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
      {dialog}
      <h2 className="text-xl font-bold">백업</h2>
      <div className="mt-3 rounded-2xl border border-leaf-300 bg-leaf-50 p-4 text-sm">
        <div className="font-semibold text-leaf-800">💾 기록은 이 컴퓨터의 파일에 저장돼요</div>
        <p className="mt-1 break-all text-ink-500">{dataFile || "(파일 위치를 아직 못 읽었어요)"}</p>
        <p className="mt-2 text-xs text-ink-500">
          고칠 때마다 자동으로 저장되고, 하루에 한 번 같은 폴더의 <b>backups</b> 에 그날 기록이 복사돼요(30일치). OneDrive 폴더에 있으면 클라우드에도 자동으로 올라가요.
        </p>
      </div>
      <p className="mt-4 text-sm text-ink-500">
        아래 내보내기는 기록을 따로 한 벌 더 받아 두거나, 다른 컴퓨터로 옮길 때 써요.
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
