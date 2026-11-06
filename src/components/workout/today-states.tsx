import Link from "next/link";
import { CheckIcon, ClockIcon, PlayIcon, SkipForwardIcon } from "lucide-react";
import { cn } from "cn";
import { StatusChip } from "@/components/status-chip";
import { SPLIT_NAMES, type Split } from "@/lib/generator";
import { summarise } from "@/lib/workout";
import type { LoadedWorkout, PlanRow } from "@/lib/workout-data";
import { DiscardButton } from "./today-client";

const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1);
const time = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

type Chips = { resting: string[]; rehab: string[]; recovering?: string[] };

function ChipRow({ resting, rehab, recovering = [] }: Chips) {
  if (!resting.length && !rehab.length && !recovering.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {resting.map((m) => <StatusChip key={m} kind="rest">{capitalise(m)} · resting</StatusChip>)}
      {rehab.map((m) => <StatusChip key={m} kind="rehab">{capitalise(m)} · rehab</StatusChip>)}
      {recovering.length > 0 && <StatusChip kind="recovering">Recovering: {recovering.join(", ")}</StatusChip>}
    </div>
  );
}

function Pill({ p, sets }: { p: PlanRow; sets: number }) {
  const base = "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[15px] font-bold";
  if (p.skipped) return <span className={cn(base, "bg-muted text-muted-foreground")}><SkipForwardIcon className="size-4" aria-hidden />Skipped</span>;
  if (sets >= p.plannedSets) return <span className={cn(base, "bg-secondary")}><CheckIcon className="size-4" aria-hidden />Done</span>;
  if (sets > 0) return <span className={cn(base, "bg-secondary")}><ClockIcon className="size-4" aria-hidden />{sets} of {p.plannedSets}</span>;
  return null;
}

/** The saved plan as a list, with each exercise's progress. */
function PlanList({ w }: { w: LoadedWorkout }) {
  const row = (p: PlanRow, i: number) => {
    const sets = w.sets.filter((s) => s.exerciseId === p.exerciseId).length;
    return (
      <li key={p.exerciseId} className="flex min-h-18 items-center gap-3 border-t py-3 pr-3 pl-4 first:border-t-0">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-heading text-base font-bold tabular-nums">{i + 1}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-lg leading-6 font-bold">{p.name}</span>
          <span className="text-[15px] leading-5 text-muted-foreground tabular-nums">
            {p.plannedSets} × {p.reps}
            {p.kind === "timed" ? " s" : ""} · {capitalise(p.equipment ?? "body only")}
          </span>
        </span>
        <Pill p={p} sets={sets} />
      </li>
    );
  };
  const main = w.plan.filter((p) => !p.core);
  const core = w.plan.filter((p) => p.core);
  return (
    <>
      <h2 className="font-heading text-lg font-bold">{w.plan.length} exercises</h2>
      <ol className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border dark:shadow-none">{main.map((p) => row(p, w.plan.indexOf(p)))}</ol>
      {core.length > 0 && (
        <>
          <h2 className="mt-3 font-heading text-lg font-bold">Core finisher</h2>
          <ol className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border dark:shadow-none">{core.map((p) => row(p, w.plan.indexOf(p)))}</ol>
        </>
      )}
    </>
  );
}

function Shell({ kicker, children, footer }: { kicker: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-2 lg:max-w-[720px] lg:pt-8 lg:pb-12">
      {kicker}
      {children}
      {footer && (
        <div className="sticky bottom-0 -mx-4 mt-auto border-t bg-background px-4 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(22,33,29,0.08)] lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none">
          {footer}
        </div>
      )}
    </main>
  );
}

const Title = ({ split, sub }: { split: string | null; sub: string }) => (
  <div className="flex flex-col gap-1">
    <h1 className="font-heading text-[44px] leading-12 font-bold tracking-tight lg:text-7xl lg:leading-[72px]">{SPLIT_NAMES[split as Split] ?? "Workout"}</h1>
    <p className="text-base text-muted-foreground">{sub}</p>
  </div>
);

export function InProgressToday({ w, kicker, chips }: { w: LoadedWorkout; kicker: React.ReactNode; chips: Chips }) {
  const doneEx = w.plan.filter((p) => !p.skipped && w.sets.some((s) => s.exerciseId === p.exerciseId));
  const upNext = w.plan.find((p) => !p.skipped && w.sets.filter((s) => s.exerciseId === p.exerciseId).length < p.plannedSets);
  const status = (p: PlanRow) => w.sets.filter((s) => s.exerciseId === p.exerciseId).length;
  const remaining = w.plan.filter((p) => !p.skipped && status(p) === 0).length;
  return (
    <Shell
      kicker={kicker}
      footer={
        <Link href="/workout" className="flex min-h-16 items-center justify-center gap-2 rounded-xl bg-primary font-heading text-xl font-bold text-primary-foreground">
          <PlayIcon className="size-5.5 fill-current" aria-hidden />
          Resume workout
        </Link>
      }
    >
      <Title split={w.split} sub="Workout in progress" />
      <ChipRow {...chips} />
      <section aria-label="Workout in progress" className="flex flex-col gap-3 rounded-2xl border-2 border-primary bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary">
            <ClockIcon className="size-5 text-primary" aria-hidden />
          </span>
          <div className="flex flex-col">
            <h2 className="font-heading text-2xl leading-7 font-bold">Workout in progress</h2>
            <p className="text-base text-muted-foreground">
              Started {time(w.startedAt)} · {w.sets.length} {w.sets.length === 1 ? "set" : "sets"} logged · saved
            </p>
          </div>
        </div>
        <ul className="flex flex-col gap-1 text-[15px] font-bold">
          {doneEx.map((p) => {
            const n = status(p);
            const complete = n >= p.plannedSets;
            return (
              <li key={p.exerciseId} className="flex items-center gap-2">
                {complete ? <CheckIcon className="size-4" aria-hidden /> : <span aria-hidden>→</span>}
                {p.name}
                <span className="font-normal text-muted-foreground">
                  {complete ? ` · ${n} sets` : ` · ${n} of ${p.plannedSets} sets${upNext?.exerciseId === p.exerciseId ? ", up next" : ""}`}
                </span>
              </li>
            );
          })}
          {remaining > 0 && (
            <li className="flex items-center gap-2 font-normal text-muted-foreground">
              <span className="size-3.5 rounded-full border-[1.5px] border-current" aria-hidden />
              {remaining} more to do
            </li>
          )}
        </ul>
        <DiscardButton workoutId={w.id} sets={w.sets.length} />
      </section>
      <PlanList w={w} />
    </Shell>
  );
}

export function CompletedToday({ w, kicker, chips }: { w: LoadedWorkout; kicker: React.ReactNode; chips: Chips }) {
  const s = summarise(w.plan, w.sets, w.startedAt, w.completedAt!);
  const stat = (label: string, value: string) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[15px] font-bold text-muted-foreground">{label}</span>
      <span className="font-heading text-3xl leading-9 font-bold tabular-nums">{value}</span>
    </div>
  );
  return (
    <Shell kicker={kicker}>
      <Title split={w.split} sub="Done today" />
      <ChipRow {...chips} />
      <section aria-label="Workout complete" className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary">
            <CheckIcon className="size-6 text-primary" aria-hidden />
          </span>
          <div className="flex flex-col">
            <h2 className="font-heading text-2xl leading-7 font-bold">Workout complete</h2>
            <p className="text-base text-muted-foreground">Finished {time(w.completedAt!)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t pt-4">
          {stat("Sets", String(s.sets))}
          {stat("Volume", `${Math.round(s.volume).toLocaleString("en-GB")} kg`)}
          {stat("Duration", `${s.minutes} min`)}
        </div>
      </section>
      <PlanList w={w} />
    </Shell>
  );
}
