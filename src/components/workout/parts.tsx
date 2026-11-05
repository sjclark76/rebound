"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { Sheet } from "@/components/ui/sheet";

/** A big number field with – and + buttons, sized for one-handed use. */
export function Stepper({
  label,
  unit,
  value,
  onChange,
  step,
  decimal = false,
}: {
  label: string;
  unit?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  decimal?: boolean;
}) {
  const id = `stepper-${label}`;
  const bump = (d: number) => onChange(Math.max(0, Math.round(((value ?? 0) + d) * 100) / 100));
  const btn = "grid size-[52px] shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground active:translate-y-px";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] leading-5 font-bold text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} aria-label={`Decrease ${label.toLowerCase()}`} onClick={() => bump(-step)}>
          <MinusIcon className="size-5" aria-hidden />
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            inputMode={decimal ? "decimal" : "numeric"}
            value={value === null ? "" : String(value)}
            onChange={(e) => {
              const t = e.target.value.trim();
              if (t === "") return onChange(null);
              const n = Number(t);
              if (!Number.isNaN(n) && n >= 0) onChange(n);
            }}
            className="h-[52px] w-full rounded-xl border-[1.5px] border-input bg-card text-center font-heading text-[32px] font-bold tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {unit && (
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
        <button type="button" className={btn} aria-label={`Increase ${label.toLowerCase()}`} onClick={() => bump(step)}>
          <PlusIcon className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Asks before something that can't be undone. The confirm action is the first button. */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  confirmIcon,
  destructive = false,
  cancelLabel,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  confirmIcon: React.ReactNode;
  destructive?: boolean;
  cancelLabel: string;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={body}>
      <button
        type="button"
        disabled={pending}
        onClick={onConfirm}
        className={cn(
          "flex min-h-14 items-center justify-center gap-2 rounded-xl px-4 font-heading text-lg font-bold disabled:opacity-60",
          destructive ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {confirmIcon}
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="min-h-14 rounded-xl bg-secondary px-4 text-base font-bold text-secondary-foreground"
      >
        {cancelLabel}
      </button>
    </Sheet>
  );
}
