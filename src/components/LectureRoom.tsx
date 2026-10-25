"use client";

import { useEffect, useState } from "react";
import { Lecture, Store, blankLecture, emptyStore, loadStore, saveStore } from "@/lib/storage";
import { Board } from "./Board";
import { Drawer } from "./Drawer";
import { LectureEditor } from "./LectureEditor";
import { Settings } from "./Settings";

type View = { name: "board" } | { name: "lecture"; id: string } | { name: "drawer" } | { name: "settings" };

export function LectureRoom() {
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  const [view, setView] = useState<View>({ name: "board" });

  useEffect(() => {
    const { store: loaded, warning: w } = loadStore();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소는 화면이 뜬 뒤에만 읽을 수 있어요
    setStore(loaded);
    setWarning(w ?? "");
    setReady(true);
  }, []);

  function update(next: Store) {
    setStore(next);
    if (!saveStore(next)) setWarning("저장하지 못했어요. 저장 공간이 꽉 찼는지 확인하고, 백업을 내보내 주세요.");
  }

  function updateLecture(l: Lecture) {
    const stamped = { ...l, updatedAt: new Date().toISOString() };
    update({ ...store, lectures: store.lectures.map((x) => (x.id === l.id ? stamped : x)) });
  }

  function newLecture() {
    const l = blankLecture();
    update({ ...store, lectures: [...store.lectures, l] });
    setView({ name: "lecture", id: l.id });
  }

  const current = view.name === "lecture" ? store.lectures.find((l) => l.id === view.id) : undefined;

  const tabs: { label: string; view: View; active: boolean }[] = [
    { label: "강의 모아 보기", view: { name: "board" }, active: view.name === "board" || view.name === "lecture" },
    { label: "내 자료 서랍", view: { name: "drawer" }, active: view.name === "drawer" },
    { label: "백업", view: { name: "settings" }, active: view.name === "settings" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      <header className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center">
        <button type="button" onClick={() => setView({ name: "board" })} className="text-left">
          <h1 className="text-2xl font-extrabold text-blossom-700">🍎🌸 사과꽃 강의실</h1>
          <p className="text-xs text-ink-500">강의 요청 → 커리큘럼 → PPT, 한 카드에서 이어서</p>
        </button>
        <nav className="flex gap-1 sm:ml-auto">
          {tabs.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setView(t.view)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                t.active ? "bg-blossom-100 text-blossom-700" : "text-ink-500 hover:bg-blossom-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {warning && (
        <div className="mb-4 rounded-xl bg-blossom-100 px-4 py-3 text-sm text-blossom-700">
          {warning}
          <button type="button" className="ml-3 underline" onClick={() => setWarning("")}>
            닫기
          </button>
        </div>
      )}

      {!ready ? (
        <p className="text-sm text-ink-500">불러오는 중…</p>
      ) : view.name === "drawer" ? (
        <Drawer materials={store.materials} onChange={(materials) => update({ ...store, materials })} />
      ) : view.name === "settings" ? (
        <Settings store={store} onImport={update} />
      ) : current ? (
        <LectureEditor
          lecture={current}
          others={store.lectures.filter((l) => l.id !== current.id)}
          materials={store.materials}
          onChange={updateLecture}
          onBack={() => setView({ name: "board" })}
          onDelete={() => {
            update({ ...store, lectures: store.lectures.filter((l) => l.id !== current.id) });
            setView({ name: "board" });
          }}
        />
      ) : (
        <Board lectures={store.lectures} onOpen={(id) => setView({ name: "lecture", id })} onNew={newLecture} />
      )}
    </div>
  );
}
