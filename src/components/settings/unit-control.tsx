"use client";

import { CheckIcon } from "lucide-react";
import { cn } from "cn";
import type { Unit } from "@/db/vocab";

/** The kg | lb choice: two bordered segments, the selected one filled with a check so it is never colour alone. */
export function UnitControl({
  unit,
  onChange,
  name,
  legend,
  label,
  describedBy,
  className,
}: {
  unit: Unit;
  onChange: (to: Unit) => void;
  /** Radio group name; unique per control on the page. */
  name: string;
  /** Read by screen readers as the group's label. */
  legend: string;
  /** Shown beside the control ("Unit", "Default unit"). */
  label: string;
  describedBy?: string;
  className?: string;
}) {
  return (
    <fieldset aria-describedby={describedBy} className={cn("flex min-w-0 items-center gap-3 border-0 p-0", className)}>
      <legend className="sr-only">{legend}</legend>
      <span aria-hidden className="text-[15px] leading-5 font-bold text-muted-foreground">{label}</span>
      <span className="flex overflow-hidden rounded-xl ring-[1.5px] ring-input">
        {(["kg", "lb"] as const).map((u) => (
          <label
            key={u}
            className={cn(
              "relative grid min-h-12 w-[68px] cursor-pointer place-items-center text-base font-bold has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ring",
              unit === u ? "bg-secondary text-foreground" : "bg-card text-muted-foreground",
            )}
          >
            <input type="radio" name={name} value={u} checked={unit === u} onChange={() => u !== unit && onChange(u)} className="absolute inset-0 m-0 cursor-pointer opacity-0" />
            <span className="flex items-center gap-1">
              {unit === u && <CheckIcon className="size-4" strokeWidth={3} aria-hidden />}
              {u}
            </span>
          </label>
        ))}
      </span>
    </fieldset>
  );
}
