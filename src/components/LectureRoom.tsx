"use client";

import { useEffect, useRef, useState } from "react";
import { Lecture, Store, blankLecture, emptyStore, loadStore, saveStore } from "@/lib/storage";
import { isEmptyStore, isSynced, loadFromFile, markSynced, mergeStores, saveToFile } from "@/lib/fileStore";
import { Board } from "./Board";
import { Drawer } from "./Drawer";
import { LectureEditor } from "./LectureEditor";
import { Settings } from "./Settings";
import { CalendarView } from "./CalendarView";
import { TodoView } from "./TodoView";
import { FeeView } from "./FeeView";
import { InstructorView } from "./InstructorView";

type View =
  | { name: "board" }
  | { name: "lecture"; id: string }
  | { name: "calendar" }
  | { name: "todos" }
  | { name: "fees" }
  | { name: "instructors" }
  | { name: "drawer" }
  | { name: "settings" };

export function LectureRoom() {
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  const [view, setView] = useState<View>({ name: "board" });

  // 기록은 내 컴퓨터의 파일에 저장해요. 브라우저 저장 공간은 빠른 사본.
  const [fileState, setFileState] = useState<"loading" | "saved" | "saving" | "error">("loading");
  const [dataFile, setDataFile] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const writeFile = async (s: Store) => {
    setFileState("saving");
    const ok = await saveToFile(s);
    setFileState(ok ? "saved" : "error");
    if (ok) markSynced();
    return ok;
  };

  useEffect(() => {
    (async () => {
      const local = loadStore();
      const file = await loadFromFile();
      setDataFile(file.file);
      if (file.status === "found" && file.store) {
        // 이 브라우저에만 있던 기록이 있으면 처음 한 번 합쳐서 옮겨요
        const merged = !isSynced() && !isEmptyStore(local.store) ? mergeStores(file.store, local.store) : file.store;
        setStore(merged);
        saveStore(merged);
        if (merged !== file.store) await writeFile(merged);
        else {
          markSynced();
          setFileState("saved");
        }
      } else if (file.status === "none") {
        // 파일이 아직 없어요: 브라우저 기록이 있으면 파일로 옮기고, 비어 있으면 첫 기록 때 만들어요
        setStore(local.store);
        setWarning(local.warning ?? "");
        if (!isEmptyStore(local.store)) await writeFile(local.store);
        else setFileState("saved");
      } else {
        setStore(local.store);
        setWarning("기록 파일을 읽지 못해서 이 브라우저에 있는 기록으로 열었어요. 고친 내용은 파일에 저장되지 않을 수 있어요.");
        setFileState("error");
      }
      setReady(true);
    })();
  }, []);

  function update(next: Store) {
    setStore(next);
    saveStore(next); // 빠른 사본 (가득 차도 파일이 진짜라 괜찮아요)
    // 연달아 고칠 때는 잠깐 모았다가 한 번에 파일로
    if (timer.current) clearTimeout(timer.current);
    setFileState("saving");
    timer.current = setTimeout(() => {
      writeFile(next).then((ok) => !ok && setWarning("기록 파일에 저장하지 못했어요. 강의실 서버가 켜져 있는지 확인하고, 「백업」에서 내보내 두세요."));
    }, 500);
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

  const importLectures = (added: Lecture[]) => update({ ...store, lectures: [...store.lectures, ...added] });
  const openLecture = (id: string) => setView({ name: "lecture", id });

  const current = view.name === "lecture" ? store.lectures.find((l) => l.id === view.id) : undefined;
  const openTodos = store.todos.filter((t) => !t.done).length;

  const tabs: { label: string; view: View; active: boolean }[] = [
    { label: "강의 모아 보기", view: { name: "board" }, active: view.name === "board" || view.name === "lecture" },
    { label: "캘린더", view: { name: "calendar" }, active: view.name === "calendar" },
    { label: openTodos ? `할 일 ${openTodos}` : "할 일", view: { name: "todos" }, active: view.name === "todos" },
    { label: "강의료", view: { name: "fees" }, active: view.name === "fees" },
    { label: "강사들", view: { name: "instructors" }, active: view.name === "instructors" },
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
        <span
          className={`text-xs ${fileState === "error" ? "font-semibold text-blossom-700" : "text-ink-500"}`}
          title={dataFile ? `기록 파일: ${dataFile}` : undefined}
        >
          {{ loading: "💾 불러오는 중…", saving: "💾 저장 중…", saved: "💾 파일에 저장됨", error: "⚠ 파일 저장 안 됨" }[fileState]}
        </span>
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
      ) : view.name === "calendar" ? (
        <CalendarView
          lectures={store.lectures}
          todos={store.todos}
          onOpen={openLecture}
          onImport={importLectures}
          onToggleTodo={(id) => update({ ...store, todos: store.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })}
          onSaveTodo={(t) =>
            update({ ...store, todos: store.todos.some((x) => x.id === t.id) ? store.todos.map((x) => (x.id === t.id ? t : x)) : [...store.todos, t] })
          }
          onDeleteTodo={(id) => update({ ...store, todos: store.todos.filter((t) => t.id !== id) })}
          fees={store.fees}
          onSaveFee={(f) =>
            update({ ...store, fees: store.fees.some((x) => x.id === f.id) ? store.fees.map((x) => (x.id === f.id ? f : x)) : [...store.fees, f] })
          }
        />
      ) : view.name === "fees" ? (
        <FeeView fees={store.fees} onChange={(fees) => update({ ...store, fees })} />
      ) : view.name === "instructors" ? (
        <InstructorView instructors={store.instructors} onChange={(instructors) => update({ ...store, instructors })} />
      ) : view.name === "todos" ? (
        <TodoView todos={store.todos} lectures={store.lectures} onChange={(todos) => update({ ...store, todos })} onOpen={openLecture} />
      ) : view.name === "drawer" ? (
        <Drawer materials={store.materials} onChange={(materials) => update({ ...store, materials })} />
      ) : view.name === "settings" ? (
        <Settings store={store} onImport={update} dataFile={dataFile} />
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
        <Board
          lectures={store.lectures}
          onOpen={openLecture}
          onNew={newLecture}
          onImport={importLectures}
        />
      )}
    </div>
  );
}
