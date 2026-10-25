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
