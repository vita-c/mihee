// 기록 파일(내 컴퓨터) 읽기 · 쓰기. 서버 통로는 app/api/store 예요.
// 브라우저 저장 공간은 빠른 사본으로만 같이 써요 (파일이 진짜).

import { Store, parseStore } from "./storage";

export type FileLoad = { store: Store | null; file: string; status: "found" | "none" | "error" };

export async function loadFromFile(): Promise<FileLoad> {
  try {
    const res = await fetch("/api/store", { cache: "no-store" });
    const file = decodeURIComponent(res.headers.get("X-Data-File") ?? "");
    if (res.status === 404) return { store: null, file, status: "none" };
    if (!res.ok) return { store: null, file, status: "error" };
    const store = parseStore(await res.json());
    return store ? { store, file, status: "found" } : { store: null, file, status: "error" };
  } catch {
    return { store: null, file: "", status: "error" };
  }
}

export async function saveToFile(store: Store): Promise<boolean> {
  try {
    const res = await fetch("/api/store", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(store) });
    return res.ok;
  } catch {
    return false;
  }
}

// 브라우저에만 있던 기록과 파일 기록을 합쳐요 (같은 id 면 파일 쪽을 남겨요). 처음 옮길 때 한 번만 써요.
export function mergeStores(file: Store, local: Store): Store {
  const union = <T extends { id: string }>(a: T[], b: T[]) => [...a, ...b.filter((x) => !a.some((y) => y.id === x.id))];
  return {
    version: 1,
    lectures: union(file.lectures, local.lectures),
    materials: union(file.materials, local.materials),
    todos: union(file.todos, local.todos),
    fees: union(file.fees, local.fees),
    instructors: union(file.instructors, local.instructors),
  };
}

export const isEmptyStore = (s: Store) => !s.lectures.length && !s.materials.length && !s.todos.length && !s.fees.length && !s.instructors.length;

// 이 브라우저가 이미 파일로 옮겼는지 (옮긴 뒤로는 파일만 믿어요 — 지운 기록이 되살아나지 않게)
const SYNCED = "lecture-room:file-synced";
export const isSynced = () => {
  try {
    return localStorage.getItem(SYNCED) === "1";
  } catch {
    return false;
  }
};
export const markSynced = () => {
  try {
    localStorage.setItem(SYNCED, "1");
  } catch {
    // 괜찮아요
  }
};
