"use client";

import { useState } from "react";
import { Material, MaterialKind, MATERIAL_KINDS, newId } from "@/lib/storage";
import { ACCEPT, readFileText } from "@/lib/fileText";
import { Button, Field, inputClass, useConfirm } from "./ui";

const MAX_BODY = 20000;

export function Drawer({
  materials,
  onChange,
}: {
  materials: Material[];
  onChange: (m: Material[]) => void;
}) {
  const [tab, setTab] = useState<MaterialKind>("intro");
  const [editing, setEditing] = useState<Material | null>(null);
  const [fileMsg, setFileMsg] = useState("");
  const { ask, dialog } = useConfirm();
  const list = materials.filter((m) => m.kind === tab);
  const current = MATERIAL_KINDS.find((k) => k.kind === tab)!;

  function startEdit(m: Material | null) {
    setEditing(m);
    setFileMsg("");
  }

  async function attach(file: File | undefined) {
    if (!file || !editing) return;
    setFileMsg("파일 읽는 중…");
    const result = await readFileText(file);
    if ("error" in result) {
      setFileMsg(result.error);
      return;
    }
    if (!result.text) {
      setFileMsg("파일에서 글자를 찾지 못했어요. 그림으로만 된 파일인지 확인해 주세요.");
      return;
    }
    const cut = result.text.length > MAX_BODY;
    setEditing({
      ...editing,
      title: editing.title || file.name.replace(/\.[^.]+$/, ""),
      body: result.text.slice(0, MAX_BODY),
      fileName: file.name,
    });
    setFileMsg(cut ? `내용이 길어서 앞부분 ${MAX_BODY.toLocaleString()}자만 넣었어요.` : "파일 내용을 넣었어요. 아래에서 고칠 수 있어요.");
  }

  function save() {
    if (!editing) return;
    const exists = materials.some((m) => m.id === editing.id);
    onChange(exists ? materials.map((m) => (m.id === editing.id ? editing : m)) : [...materials, editing]);
    startEdit(null);
  }

  async function remove(id: string) {
    if (!(await ask("이 자료를 지울까요?\n강의 카드에서도 빠져요.", "지우기"))) return;
    onChange(materials.filter((m) => m.id !== id));
  }

  return (
    <div>
      {dialog}
      <h2 className="text-xl font-bold">내 자료 서랍</h2>
      <p className="mt-1 text-sm text-ink-500">자주 꺼내 쓰는 자료를 넣어 두면, 강의 카드에서 체크만 해서 넣을 수 있어요.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {MATERIAL_KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => {
              setTab(k.kind);
              startEdit(null);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === k.kind ? "bg-blossom-500 text-white" : "bg-white text-blossom-700 ring-1 ring-blossom-200"
            }`}
          >
            {k.emoji} {k.label} <span className="opacity-70">{materials.filter((m) => m.kind === k.kind).length}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-ink-500">
        {current.emoji} {current.desc}
      </p>

      {editing ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-blossom-200 bg-white p-5">
          {editing.kind === "curriculum" && (
            <div className="rounded-xl bg-blossom-50 p-3">
              <label className="inline-block cursor-pointer rounded-xl bg-blossom-100 px-4 py-2 text-sm font-semibold text-blossom-700 hover:bg-blossom-200">
                📎 파일에서 불러오기
                <input
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  onChange={(e) => {
                    attach(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <span className="ml-2 text-xs text-ink-500">한글(.hwp · .hwpx) · 워드(.docx) · 파워포인트(.pptx) · 메모장(.txt · .md)</span>
              {editing.fileName && <p className="mt-2 text-xs text-ink-500">📄 {editing.fileName}</p>}
              {fileMsg && <p className="mt-2 text-sm text-blossom-700">{fileMsg}</p>}
            </div>
          )}
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
            <Button variant="ghost" onClick={() => startEdit(null)}>
              취소
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map((m) => (
            <div key={m.id} className="rounded-2xl border border-blossom-200 bg-white p-4">
              <div className="flex items-start gap-2">
                <div className="font-semibold">
                  {m.title || "제목 없음"}
                  {m.fileName && <span className="ml-2 text-xs font-normal text-ink-500">📄 {m.fileName}</span>}
                </div>
                <Button variant="ghost" className="ml-auto px-2 py-1 text-xs" onClick={() => startEdit(m)}>
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
          <Button variant="soft" onClick={() => startEdit({ id: newId(), kind: tab, title: "", body: "" })}>
            + {current.label} 추가
          </Button>
        </div>
      )}
    </div>
  );
}
