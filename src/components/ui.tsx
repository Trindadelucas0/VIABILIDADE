"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Classification } from "../lib/types";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const buttonClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-accent text-white border-accent",
  secondary: "bg-surface text-ink border-line",
  ghost: "bg-transparent text-accent border-transparent",
  danger: "bg-surface text-danger border-danger",
};

export function Button({ variant = "primary", className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <label className="field grid gap-2" htmlFor={id}>
      <span className="text-sm font-semibold">{label}</span>
      {children(id)}
      {error ? <span className="text-sm text-danger">{error}</span> : null}
      {hint && !error ? <span className="text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "warn" | "danger" | "info" }) {
  const tones = {
    neutral: "bg-bg text-ink",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    info: "bg-accent-soft text-accent",
  };
  return <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-sm font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="grid gap-4 rounded-xl border border-dashed border-line bg-surface p-6">
      <p className="text-base font-semibold">{title}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-line/70 ${className}`} />;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="grid gap-3 rounded-xl border border-danger bg-danger-soft p-4" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}

const ToastContext = createContext<(message: string) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  function show(next: string) {
    setMessage(next);
    window.setTimeout(() => setMessage(null), 4000);
  }

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message ? (
        <div className="toast" role="status">
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="w-[min(100%-32px,420px)] rounded-xl border border-line bg-surface p-6 text-ink"
      onClose={onClose}
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 text-muted">{body}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

export function PageIntro({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6 grid gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
    </header>
  );
}

export function SectionCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="section-card">
      {title ? <h2 className="section-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function classificationSurface(classification: Classification): string {
  if (classification === "BOM" || classification === "EXCELENTE") return "bg-ok-soft border-ok/30";
  if (classification === "MEDIO") return "bg-accent-soft border-accent/30";
  if (classification === "FRACO") return "bg-warn-soft border-warn/30";
  return "bg-danger-soft border-danger/30";
}
