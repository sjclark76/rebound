"use client";

import { useState } from "react";
import { ClockIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { StatusChip } from "@/components/status-chip";
import type { FineMuscle } from "@/db/vocab";
import { AREAS, FATIGUE_GRADIENT, fatigueColor, muscleLabel, type Reading } from "@/lib/body";
import { bandOf, BANDS } from "@/lib/fatigue";
import { BodyFigure, sidesOf } from "./body-figure";

export type ScreenReading = Reading & { lastLabel: string };

const RANGES = ["0–24", "25–49", "50–74", "75–100"];
const SWATCH_AT = [10, 35, 60, 90];

const Swatch = ({ value, className }: { value: number | null; className?: string }) => (
  <span aria-hidden className={cn("inline-block size-5 shrink-0 rounded-md ring-1 ring-black/10", className)} style={{ background: value == null ? "var(--body-injured)" : fatigueColor(value) }} />
);

function Key({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div aria-hidden className="h-3 rounded-full" style={{ background: FATIGUE_GRADIENT }} />
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
        {BANDS.map((b, i) => (
          <li key={b} className="flex items-center gap-2">
            <Swatch value={SWATCH_AT[i]} />
            <span className="font-bold">{b}</span>
            <span className="font-mono text-muted-foreground">{RANGES[i]}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 font-bold"><StatusChip kind="rest" className="min-h-0 px-2.5 py-0.5 text-[15px]">Resting</StatusChip></li>
        <li className="flex items-center gap-2 font-bold"><StatusChip kind="rehab" className="min-h-0 px-2.5 py-0.5 text-[15px]">Rehab</StatusChip></li>
      </ul>
    </div>
  );
}

function Detail({ r, onClose }: { r: ScreenReading; onClose: () => void }) {
  return (
    <section aria-label={`${muscleLabel(r.muscle)} detail`} className="flex flex-col gap-4 rounded-2xl bg-card p-5 ring-2 ring-foreground">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-heading text-2xl font-bold">{muscleLabel(r.muscle)}</h2>
        <button type="button" onClick={onClose} aria-label="Close detail" className="-mt-2 -mr-2 grid size-12 place-items-center rounded-xl outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
          <XIcon className="size-6" aria-hidden />
        </button>
      </div>
      {r.injury ? (
        <>
          <StatusChip kind={r.injury} className="self-start">{r.injury === "rest" ? "Resting" : "Rehab"}</StatusChip>
          <p className="text-base text-muted-foreground">
            {r.injury === "rest"
              ? "Injured and resting. Rebound keeps it out of your workouts, so it isn't on the fatigue scale."
              : "Injured and in rehab. Rebound gives it gentle work only, so it isn't on the fatigue scale."}
          </p>
        </>
      ) : (
        <>
          <p className="flex items-center gap-3">
            <span className="font-heading text-6xl leading-none font-bold tabular-nums">{r.value}</span>
            <Swatch value={r.value} />
            <span className="text-xl font-bold">{bandOf(r.value ?? 0)}</span>
          </p>
          <div className="relative h-3 rounded-full" style={{ background: FATIGUE_GRADIENT }}>
            <span aria-hidden className="absolute top-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-card" style={{ left: `${Math.min(100, Math.max(0, r.value ?? 0))}%` }} />
          </div>
        </>
      )}
      <p className="flex items-center gap-2 text-base text-muted-foreground">
        <ClockIcon className="size-5" aria-hidden />
        {r.lastLabel}
      </p>
    </section>
  );
}

export function BodyScreen({
  readings,
  whole,
  dateLabel,
  summary,
  empty,
}: {
  readings: ScreenReading[];
  whole: number;
  dateLabel: string;
  summary: string | null;
  empty: boolean;
}) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [selected, setSelected] = useState<FineMuscle | null>(null);
  const pick = (m: FineMuscle) => {
    setSelected(m);
    if (!sidesOf(m).includes(side)) setSide(sidesOf(m)[0]);
  };
  const by = new Map(readings.map((r) => [r.muscle, r]));
  const current = selected ? by.get(selected) : undefined;
  const detail = current && <Detail r={current} onClose={() => setSelected(null)} />;
  return (
    <>
      <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[15px] font-bold text-muted-foreground">
            {dateLabel}<span className="lg:hidden"> · Whole-body fatigue</span>
          </p>
          <h1 className="font-heading text-4xl font-bold tracking-tight max-lg:sr-only">Body</h1>
        </div>
        <p className="flex items-center gap-3">
          <span className="text-[15px] font-bold text-muted-foreground max-lg:hidden">Whole-body fatigue</span>
          <span className="font-heading text-7xl leading-none font-bold tabular-nums lg:text-5xl">{whole}</span>
          <Swatch value={whole} />
          <span className="text-xl font-bold">{bandOf(whole)}</span>
        </p>
      </div>
      <p className="text-base text-muted-foreground">{empty ? "Nothing trained yet. The map fills in as you log workouts." : summary}</p>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="flex flex-col gap-4 lg:rounded-2xl lg:bg-card lg:p-6 lg:ring-1 lg:ring-border">
          <div role="group" aria-label="Body view" className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1 lg:hidden">
            {(["front", "back"] as const).map((s) => (
              <button key={s} type="button" aria-pressed={side === s} onClick={() => setSide(s)} className={cn("min-h-12 rounded-xl text-lg font-bold capitalize outline-none focus-visible:ring-3 focus-visible:ring-ring/50", side === s ? "bg-card shadow-sm" : "text-muted-foreground")}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex justify-center gap-10 rounded-2xl bg-[var(--body-card)] px-4 py-6 ring-1 ring-border lg:bg-transparent lg:ring-0">
            {(["front", "back"] as const).map((s) => (
              <figure key={s} className={cn("m-0 flex flex-col items-center gap-3", side !== s && "max-lg:hidden")}>
                <BodyFigure side={s} readings={readings} selected={selected} onPick={pick} className="h-[420px] lg:h-[480px]" />
                <figcaption className="text-[15px] font-bold text-muted-foreground">
                  <span className="capitalize">{s}</span>
                  <span className="lg:hidden"> · tap a muscle</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <Key className="max-lg:hidden lg:border-t lg:pt-5" />
        </div>
        <div className="flex flex-col gap-6">
          {detail}
          <Key className="lg:hidden" />
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-2xl font-bold">All muscles</h2>
        <div className="flex flex-col gap-5 lg:block lg:columns-3 lg:gap-6">
          {AREAS.map((a) => (
            <div key={a.name} className="flex flex-col gap-2 lg:mb-6 lg:break-inside-avoid">
              <h3 className="text-[15px] font-bold text-muted-foreground">{a.name}</h3>
              <ul className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
                {a.muscles.map((m) => {
                  const r = by.get(m)!;
                  return (
                    <li key={m} className="border-t first:border-t-0">
                      <button type="button" onClick={() => pick(m)} aria-pressed={selected === m} className={cn("flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50", selected === m && "bg-accent")}>
                        <Swatch value={r.injury ? null : r.value} />
                        <span className="min-w-0 flex-1 text-lg font-bold">{muscleLabel(m)}</span>
                        {r.injury ? (
                          <StatusChip kind={r.injury} className="min-h-9">{r.injury === "rest" ? "Resting" : "Rehab"}</StatusChip>
                        ) : empty ? (
                          <span className="text-[15px] text-muted-foreground">Not trained yet</span>
                        ) : (
                          <span className="text-[15px] text-muted-foreground"><b className="text-base text-foreground tabular-nums">{r.value}</b> · {bandOf(r.value ?? 0)}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
