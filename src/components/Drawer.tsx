"use client";

import { useState } from "react";
import { Material, MaterialKind, MATERIAL_KINDS, newId } from "@/lib/storage";
import { Button, Field, inputClass } from "./ui";

export function Drawer({
  materials,
  onChange,
}: {
  materials: Material[];
  onChange: (m: Material[]) => void;
}) {
  const [tab, setTab] = useState<MaterialKind>("intro");
  const [editing, setEditing] = useState<Material | null>(null);
  const list = materials.filter((m) => m.kind === tab);
  const current = MATERIAL_KINDS.find((k) => k.kind === tab)!;

  function save() {
    if (!editing) return;
    const exists = materials.some((m) => m.id === editing.id);
    onChange(exists ? materials.map((m) => (m.id === editing.id ? editing : m)) : [...materials, editing]);
    setEditing(null);
  }

  function remove(id: string) {
    if (!window.confirm("이 자료를 지울까요? 강의 카드에서도 빠져요.")) return;
    onChange(materials.filter((m) => m.id !== id));
  }

  return (
    <div>
      <h2 className="text-xl font-bold">내 자료 서랍</h2>
      <p className="mt-1 text-sm text-ink-500">자주 꺼내 쓰는 자료를 넣어 두면, 강의 카드에서 체크만 해서 넣을 수 있어요.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {MATERIAL_KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => {
              setTab(k.kind);
              setEditing(null);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === k.kind ? "bg-blossom-500 text-white" : "bg-white text-blossom-700 ring-1 ring-blossom-200"
            }`}
          >
            {k.emoji} {k.label} <span className="opacity-70">{materials.filter((m) => m.kind === k.kind).length}</span>
          </button>
        ))}
      </div>

      {editing ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-blossom-200 bg-white p-5">
          <Field label="제목">
            <input className={inputClass} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="예: 강사 소개 (짧은 버전)" />
          </Field>
          <Field label="내용">
            <textarea
              className={`${inputClass} min-h-48 resize-y leading-relaxed`}
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            />
          </Field>
          <div className="flex gap-2">
            <Button onClick={save}>저장</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              취소
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map((m) => (
            <div key={m.id} className="rounded-2xl border border-blossom-200 bg-white p-4">
              <div className="flex items-start gap-2">
                <div className="font-semibold">{m.title || "제목 없음"}</div>
                <Button variant="ghost" className="ml-auto px-2 py-1 text-xs" onClick={() => setEditing(m)}>
                  고치기
                </Button>
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => remove(m.id)}>
                  지우기
                </Button>
              </div>
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-ink-500">{m.body}</p>
            </div>
          ))}
          {list.length === 0 && (
            <p className="rounded-2xl border border-dashed border-blossom-200 p-6 text-center text-sm text-ink-500">
              {current.emoji} {current.label} 자료가 아직 없어요.
            </p>
          )}
          <Button variant="soft" onClick={() => setEditing({ id: newId(), kind: tab, title: "", body: "" })}>
            + {current.label} 추가
          </Button>
        </div>
      )}
    </div>
  );
}
