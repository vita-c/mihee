"use client";

import { useState } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-blossom-700">{label}</span>
      {hint && <span className="ml-2 text-xs text-ink-500">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-blossom-200 bg-white px-3 py-2 text-[15px] outline-none focus:border-blossom-500 focus:ring-2 focus:ring-blossom-100";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "soft" | "leaf" | "ghost" }) {
  const styles = {
    primary: "bg-blossom-500 text-white hover:bg-blossom-700",
    soft: "bg-blossom-100 text-blossom-700 hover:bg-blossom-200",
    leaf: "bg-leaf-600 text-white hover:bg-leaf-800",
    ghost: "text-ink-500 hover:bg-blossom-50",
  }[variant];
  return (
    <button
      type="button"
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40 ${styles} ${className}`}
      {...props}
    />
  );
}

// 「정말 할까요?」 창이에요. 브라우저 기본 확인창(window.confirm)은 앱 안 브라우저 등에서 안 뜨고 그냥 넘어가기도 해서 직접 그려요.
// 쓰는 법: const { ask, dialog } = useConfirm(); … if (!(await ask("지울까요?", "지우기"))) return; … 화면 어딘가에 {dialog}
export function useConfirm() {
  const [pending, setPending] = useState<{ message: string; okLabel: string; resolve: (ok: boolean) => void } | null>(null);
  const ask = (message: string, okLabel = "확인") => new Promise<boolean>((resolve) => setPending({ message, okLabel, resolve }));
  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };
  const dialog = pending && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => close(false)}>
      <div role="alertdialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{pending.message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => close(false)}>
            취소
          </Button>
          <Button autoFocus onClick={() => close(true)}>
            {pending.okLabel}
          </Button>
        </div>
      </div>
    </div>
  );
  return { ask, dialog };
}

// 클립보드에 복사하고 "복사됐어요"를 잠깐 보여 줘요.
export function CopyButton({
  label,
  getText,
  variant = "leaf",
}: {
  label: string;
  getText: () => string;
  variant?: "leaf" | "soft";
}) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(getText());
      setState("done");
    } catch {
      setState("fail");
    }
    setTimeout(() => setState("idle"), 1800);
  }
  return (
    <Button variant={variant} onClick={copy}>
      {state === "done" ? "✓ 복사됐어요 · Claude 창에 붙여 넣으세요" : state === "fail" ? "복사가 막혔어요" : label}
    </Button>
  );
}
