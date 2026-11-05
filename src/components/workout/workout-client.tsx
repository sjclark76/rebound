"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  FlagIcon,
  HistoryIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  SkipForwardIcon,
  SmartphoneIcon,
  Trash2Icon,
  WeightIcon,
} from "lucide-react";
import { cn } from "cn";
import { LogoMark } from "@/components/logo-mark";
import { SignOutButton } from "@/components/sign-out-button";
import { StatusChip } from "@/components/status-chip";
import { Sheet } from "@/components/ui/sheet";
import {
  deleteSet,
  discardWorkout,
  editSet,
  finishWorkout,
  logSet,
  setView,
  skipExercise,
  unskipExercise,
} from "@/app/workout/actions";
import type { PlanRow } from "@/lib/workout-data";
import { formatSet, type LoggedSet, nowSlot, num, prefillFor, type Prefill } from "@/lib/workout";
import { ConfirmSheet, Stepper } from "./parts";

type Draft = { weightKg: number | null; reps: number | null; durationSec: number | null };
type View = "focused" | "list";

const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1);
const dose = (p: PlanRow) =>
  `${p.plannedSets} × ${p.reps}${p.kind === "timed" ? " s" : ""} · ${capitalise(p.equipment ?? "body only")}`;

function sourceText(p: PlanRow, n: number, pf: Prefill, thisWorkout: LoggedSet[]) {
  const s = pf.source;
  if (s.rule === "last-time") {
    const l = p.lastTime?.sets.find((x) => x.setNumber === n);
    return `Pre-filled from last time, set ${n}: ${l ? formatSet(p.kind, l) : ""} (${p.lastTime?.dateLabel})`;
  }
  if (s.rule === "previous-set") {
    const from = thisWorkout.find((x) => x.setNumber === s.setNumber);
    const tail = s.lastTimeSets > 0 ? `You did ${s.lastTimeSets} sets last time.` : "No earlier workout to copy from.";
    return `Copied from set ${s.setNumber}${from ? `: ${formatSet(p.kind, from)}` : ""}. ${tail}`;
  }
  if (s.rule === "starting-weight") return `Starting weight: ${num(pf.weightKg)} kg. You haven't logged this exercise before.`;
  return `From today's plan: ${formatSet(p.kind, pf)}. No earlier workout to copy from.`;
}

function sourceIcon(rule: Prefill["source"]["rule"]) {
  const C = rule === "last-time" ? HistoryIcon : rule === "starting-weight" ? WeightIcon : CopyIcon;
  return <C className="mt-0.5 size-5 shrink-0" aria-hidden />;
}

function rowSub(p: PlanRow, n: number, pf: Prefill) {
  const s = pf.source;
  if (s.rule === "starting-weight") return "Starting weight";
  if (s.rule === "previous-set") return `Copied from set ${s.setNumber}`;
  if (s.rule === "last-time") return `Last time ${formatSet(p.kind, p.lastTime!.sets.find((x) => x.setNumber === n)!)}`;
  return "No history for this exercise yet";
}

function Fields({ kind, draft, onChange }: { kind: PlanRow["kind"]; draft: Draft; onChange: (d: Draft) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {kind === "weighted" && (
        <Stepper label="Weight" unit="kg" decimal step={2.5} value={draft.weightKg} onChange={(v) => onChange({ ...draft, weightKg: v })} />
      )}
      {kind !== "timed" && <Stepper label="Reps" step={1} value={draft.reps} onChange={(v) => onChange({ ...draft, reps: v })} />}
      {kind === "timed" && (
        <Stepper label="Hold" unit="sec" step={5} value={draft.durationSec} onChange={(v) => onChange({ ...draft, durationSec: v })} />
      )}
    </div>
  );
}

const valid = (kind: PlanRow["kind"], d: Draft) =>
  kind === "timed" ? !!d.durationSec : kind === "weighted" ? d.weightKg !== null && !!d.reps : !!d.reps;

function toValues(kind: PlanRow["kind"], d: Draft) {
  return {
    weightKg: kind === "weighted" ? d.weightKg : null,
    reps: kind === "timed" ? null : d.reps,
    durationSec: kind === "timed" ? d.durationSec : null,
  };
}

function CompleteButton({ label, onClick, disabled, icon }: { label: string; onClick: () => void; disabled?: boolean; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-heading text-xl font-bold text-primary-foreground disabled:opacity-60"
    >
      {icon ?? <CheckIcon className="size-5.5" aria-hidden />}
      {label}
    </button>
  );
}

export function WorkoutClient(props: {
  workoutId: number;
  split: string;
  dateLabel: string;
  startedLabel: string;
  minutes: number;
  plan: PlanRow[];
  sets: LoggedSet[];
  chips: { resting: string[]; rehab: string[] };
  initialView: View;
}) {
  const { workoutId, plan, sets, chips } = props;
  const [view, setViewState] = useState<View>(props.initialView);
  const [focusedId, setFocusedId] = useState(() => {
    const now = nowSlot(plan, sets);
    return now?.exerciseId ?? plan[0]?.exerciseId;
  });
  const [open, setOpen] = useState<{ exerciseId: string; n: number } | null>(null);
  const [added, setAdded] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<{ p: PlanRow; set: LoggedSet; draft: Draft } | null>(null);
  const [confirm, setConfirm] = useState<
    null | { kind: "delete"; p: PlanRow; set: LoggedSet } | { kind: "skip"; p: PlanRow } | { kind: "finish" } | { kind: "discard" }
  >(null);
  // Numbers being typed, per set. Kept here (not in the set cards) so typing never loses focus.
  const [drafts, setDrafts] = useState<Record<string, { init: string; draft: Draft }>>({});
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>, after?: () => void) =>
    start(async () => {
      await fn();
      after?.();
    });

  const setsOf = (id: string) => sets.filter((s) => s.exerciseId === id).sort((a, b) => a.setNumber - b.setNumber);
  const slotCount = (p: PlanRow) => Math.max(p.plannedSets, ...setsOf(p.exerciseId).map((s) => s.setNumber), added[p.exerciseId] ?? 0);
  const loggedAt = (p: PlanRow, n: number) => setsOf(p.exerciseId).find((s) => s.setNumber === n);
  const firstOpenSlot = (p: PlanRow) => {
    for (let n = 1; n <= slotCount(p); n++) if (!loggedAt(p, n)) return n;
    return null;
  };
  const prefillOf = (p: PlanRow, n: number) =>
    prefillFor({
      kind: p.kind,
      setNumber: n,
      plannedReps: p.reps,
      startingKg: p.startingKg,
      lastTime: p.lastTime?.sets ?? [],
      logged: setsOf(p.exerciseId),
    });

  const draftFor = (p: PlanRow, n: number) => {
    const pf = prefillOf(p, n);
    const initial: Draft = { weightKg: pf.weightKg, reps: pf.reps, durationSec: pf.durationSec };
    const key = `${p.exerciseId}:${n}`;
    const init = JSON.stringify([pf.source, initial]);
    const stored = drafts[key];
    const draft = stored && stored.init === init ? stored.draft : initial;
    return { pf, draft, setDraft: (d: Draft) => setDrafts((all) => ({ ...all, [key]: { init, draft: d } })) };
  };

  const now = nowSlot(plan, sets);
  const totalSlots = plan.filter((p) => !p.skipped).reduce((n, p) => n + p.plannedSets, 0);
  const loggedCount = sets.length;
  const focusedIdx = Math.max(0, plan.findIndex((p) => p.exerciseId === focusedId));
  const focused = plan[focusedIdx];
  const unlogged = plan.filter((p) => !p.skipped && setsOf(p.exerciseId).length === 0);

  const chooseView = (v: View) => {
    setViewState(v);
    void setView(v);
  };
  const finish = () => (unlogged.length ? setConfirm({ kind: "finish" }) : run(() => finishWorkout(workoutId)));

  const statusOf = (p: PlanRow) => {
    const n = setsOf(p.exerciseId).length;
    if (p.skipped) return "skipped" as const;
    if (n >= p.plannedSets) return "done" as const;
    return n > 0 ? ("partial" as const) : ("todo" as const);
  };

  function badge(p: PlanRow) {
    const st = statusOf(p);
    const n = setsOf(p.exerciseId).length;
    const base = "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[15px] font-bold";
    if (st === "done") return <span className={cn(base, "bg-secondary")}><CheckIcon className="size-4" aria-hidden />Done</span>;
    if (st === "skipped") return <span className={cn(base, "bg-muted text-muted-foreground")}><SkipForwardIcon className="size-4" aria-hidden />Skipped</span>;
    if (st === "partial") return <span className={cn(base, "bg-secondary")}><ClockIcon className="size-4" aria-hidden />{n} of {p.plannedSets}</span>;
    return <span className={cn(base, "border-[1.5px] border-input text-muted-foreground")}><span className="size-3.5 rounded-full border-[1.5px] border-current" aria-hidden />To do</span>;
  }

  /** One set in a sets table. */
  function row(p: PlanRow, n: number, onOpen?: () => void) {
    const done = loggedAt(p, n);
    const isNow = now?.exerciseId === p.exerciseId && now.setNumber === n;
    const pf = done ? null : prefillOf(p, n);
    const main = done ? formatSet(p.kind, done) : formatSet(p.kind, pf!);
    const last = p.lastTime?.sets.find((x) => x.setNumber === n);
    const sub = done
      ? last
        ? `Last time ${formatSet(p.kind, last)}`
        : p.lastTime
          ? `No set ${n} last time`
          : "No history for this exercise yet"
      : rowSub(p, n, pf!);
    const body = (
      <>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full",
            done ? "bg-secondary" : isNow ? "bg-primary text-primary-foreground" : "border-[1.5px] border-input",
          )}
          aria-hidden
        >
          {done ? <CheckIcon className="size-5" /> : isNow ? <ArrowRightIcon className="size-5" /> : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline gap-2">
            <span className="text-[15px] font-bold text-muted-foreground">Set {n}</span>
            <span className="font-heading text-xl font-bold tabular-nums">{main}</span>
          </span>
          <span className="text-[15px] leading-5 text-muted-foreground">{sub}</span>
        </span>
      </>
    );
    return (
      <li className={cn("flex min-h-[72px] items-center gap-3 border-t px-4 py-2 first:border-t-0", isNow && !done && "bg-accent")}>
        {onOpen && !done ? (
          <button type="button" onClick={onOpen} className="flex min-h-12 flex-1 items-center gap-3 text-left">
            {body}
          </button>
        ) : (
          <div className="flex flex-1 items-center gap-3">{body}</div>
        )}
        {isNow && (done || !onOpen) && !done ? <span className="text-[15px] font-bold">Now</span> : null}
        {!done && isNow && onOpen && (
          <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary px-3 text-[15px] font-bold text-primary-foreground">
            <ArrowRightIcon className="size-4" aria-hidden />
            Now
          </span>
        )}
        {done ? (
          <>
            {isNow && (
              <span className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary px-3 text-[15px] font-bold text-primary-foreground">
                <ArrowRightIcon className="size-4" aria-hidden />
                Now
              </span>
            )}
            <button
              type="button"
              aria-label={`Edit set ${n}`}
              className="grid size-12 shrink-0 place-items-center rounded-full"
              onClick={() => setEditing({ p, set: done, draft: { weightKg: done.weightKg, reps: done.reps, durationSec: done.durationSec } })}
            >
              <PencilIcon className="size-5" aria-hidden />
            </button>
          </>
        ) : (
          !isNow && <span className="text-[15px] font-bold text-muted-foreground">To do</span>
        )}
      </li>
    );
  }

  /** The card for the set being logged: source line, reserved suggestion slot, inputs. */
  function editor(p: PlanRow, n: number, withButton: boolean) {
    const { pf, draft, setDraft } = draftFor(p, n);
    const extra = n > p.plannedSets;
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-2xl font-bold">Set {n}</h3>
          {extra && (
            <span className="inline-flex min-h-7 items-center gap-1 rounded-full bg-secondary px-2.5 text-sm font-bold">
              <PlusIcon className="size-3.5" aria-hidden />
              Extra set
            </span>
          )}
        </div>
        <p className="flex gap-2 text-[15px] leading-5 text-muted-foreground">
          {sourceIcon(pf.source.rule)}
          <span>{sourceText(p, n, pf, setsOf(p.exerciseId))}</span>
        </p>
        {/* Reserved for the suggested weight (#22). Empty for now, keeps its height. */}
        {p.kind === "weighted" && <div className="h-14 rounded-xl border border-dashed border-input" aria-hidden />}
        <Fields kind={p.kind} draft={draft} onChange={setDraft} />
        {withButton && (
          <CompleteButton
            label={`Complete set ${n}`}
            disabled={pending || !valid(p.kind, draft)}
            onClick={() => run(() => logSet(workoutId, p.exerciseId, n, toValues(p.kind, draft)), () => setOpen(null))}
          />
        )}
      </div>
    );
  }

  function skippedCard(p: PlanRow) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <span className="inline-flex min-h-8 w-fit items-center gap-1.5 rounded-full bg-muted px-3 text-sm font-bold text-muted-foreground">
          <SkipForwardIcon className="size-4" aria-hidden />
          Skipped
        </span>
        <p className="text-base leading-6">You skipped this exercise. Nothing is logged for it.</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => unskipExercise(workoutId, p.exerciseId))}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-secondary px-4 font-bold"
        >
          <RotateCcwIcon className="size-5" aria-hidden />
          Log it anyway
        </button>
      </div>
    );
  }

  function addSkip(p: PlanRow, flush = false) {
    const btn = "flex min-h-12 flex-1 items-center justify-center gap-2 px-3 font-bold";
    return (
      <div className={cn("flex", flush ? "border-t" : "gap-3")}>
        <button
          type="button"
          onClick={() => setAdded((a) => ({ ...a, [p.exerciseId]: slotCount(p) + 1 }))}
          className={cn(btn, !flush && "rounded-xl bg-secondary")}
          disabled={firstOpenSlot(p) !== null && added[p.exerciseId] !== undefined && firstOpenSlot(p) === slotCount(p) && slotCount(p) === added[p.exerciseId]}
        >
          <PlusIcon className="size-5" aria-hidden />
          Add a set
        </button>
        <button type="button" onClick={() => setConfirm({ kind: "skip", p })} className={cn(btn, !flush && "rounded-xl bg-secondary")}>
          <SkipForwardIcon className="size-5" aria-hidden />
          Skip exercise
        </button>
      </div>
    );
  }

  const toggle = (
    <div role="group" aria-label="View" className="flex rounded-xl bg-muted p-1">
      {(["focused", "list"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => chooseView(v)}
          className={cn(
            "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[10px] text-base font-bold",
            view === v ? "border-[1.5px] border-foreground bg-card" : "text-muted-foreground",
          )}
        >
          {view === v ? <CheckIcon className="size-5" aria-hidden /> : v === "focused" ? <SmartphoneIcon className="size-5" aria-hidden /> : <ListIcon className="size-5" aria-hidden />}
          {capitalise(v)}
        </button>
      ))}
    </div>
  );

  const chipRow = (
    <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
      {chips.resting.map((m) => <StatusChip key={m} kind="rest">{capitalise(m)} · resting</StatusChip>)}
      {chips.rehab.map((m) => <StatusChip key={m} kind="rehab">{capitalise(m)} · rehab</StatusChip>)}
    </div>
  );

  const nextOf = plan[focusedIdx + 1];

  // ---- Focused panel -------------------------------------------------------------------------
  function focusedPanel(p: PlanRow) {
    const n = firstOpenSlot(p);
    const slots = slotCount(p);
    const complete = !p.skipped && n === null;
    const draft = n ? draftFor(p, n).draft : { weightKg: null, reps: null, durationSec: null };
    const primary = p.skipped || complete;
    return (
      <div className="flex flex-1 flex-col gap-4 lg:flex-none">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-bold text-muted-foreground">
            Exercise {focusedIdx + 1} of {plan.length} · {p.core ? "Core finisher" : capitalise(props.split)}
          </p>
          <div className="flex gap-2">
            {[-1, 1].map((d) => (
              <button
                key={d}
                type="button"
                aria-label={d < 0 ? "Previous exercise" : "Next exercise"}
                disabled={!plan[focusedIdx + d]}
                onClick={() => setFocusedId(plan[focusedIdx + d].exerciseId)}
                className="grid size-12 place-items-center rounded-xl bg-secondary disabled:opacity-40"
              >
                {d < 0 ? <ChevronLeftIcon className="size-5" aria-hidden /> : <ChevronRightIcon className="size-5" aria-hidden />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-[34px] leading-10 font-bold tracking-tight">{p.name}</h2>
          <p className="text-base text-muted-foreground">{dose(p)}</p>
        </div>
        <div className="lg:hidden">{chipRow}</div>
        {p.skipped ? (
          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            {skippedCard(p)}
          </div>
        ) : null}
        <section aria-label="Sets" className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="font-heading text-lg font-bold">Sets</h3>
            <span className="text-[15px] font-bold text-muted-foreground">{p.skipped ? "Skipped" : `${setsOf(p.exerciseId).length} of ${slots} done`}</span>
          </div>
          <ul className="border-t">
            {Array.from({ length: slots }, (_, i) => i + 1).map((i) => (
              <Fragment key={i}>{row(p, i)}</Fragment>
            ))}
          </ul>
        </section>
        {n && !p.skipped && (
          <section aria-label={`Set ${n}`} className="rounded-2xl border-2 border-primary bg-card">
            {editor(p, n, false)}
          </section>
        )}
        {complete && (
          <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
            <span className="inline-flex min-h-8 w-fit items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-bold">
              <CheckIcon className="size-4" aria-hidden />
              Exercise complete
            </span>
            <p className="text-lg">All {p.plannedSets} planned sets are logged.</p>
            <button
              type="button"
              onClick={() => setAdded((a) => ({ ...a, [p.exerciseId]: slots + 1 }))}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-secondary font-bold"
            >
              <PlusIcon className="size-5" aria-hidden />
              Add a set
            </button>
          </section>
        )}
        {!primary && addSkip(p)}
        <div className="sticky bottom-0 -mx-4 mt-auto border-t bg-background px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          {primary ? (
            nextOf ? (
              <CompleteButton label={`Next: ${nextOf.name}`} icon={<ArrowRightIcon className="size-5.5" aria-hidden />} onClick={() => setFocusedId(nextOf.exerciseId)} />
            ) : (
              <CompleteButton label="Finish workout" icon={<FlagIcon className="size-5.5" aria-hidden />} onClick={finish} />
            )
          ) : (
            <CompleteButton
              label={`Complete set ${n}`}
              disabled={pending || !valid(p.kind, draft)}
              onClick={() => run(() => logSet(workoutId, p.exerciseId, n!, toValues(p.kind, draft)))}
            />
          )}
        </div>
      </div>
    );
  }

  // ---- List view card ------------------------------------------------------------------------
  function card(p: PlanRow, i: number) {
    const slots = slotCount(p);
    const eff = open ?? (now ? { exerciseId: now.exerciseId, n: now.setNumber } : null);
    const current = eff?.exerciseId === p.exerciseId;
    return (
      <li className={cn("mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border dark:shadow-none", current && "ring-2 ring-primary")}>
        <div className="flex min-h-[72px] items-center gap-3 px-4 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-heading font-bold tabular-nums">{i + 1}</span>
          <div className="flex min-w-0 flex-1 flex-col">
            <h3 className="text-lg leading-6 font-bold">{p.name}</h3>
            <p className="text-[15px] leading-5 text-muted-foreground">{dose(p)}</p>
          </div>
          {badge(p)}
        </div>
        {p.skipped ? (
          <div className="border-t">
            {skippedCard(p)}
          </div>
        ) : null}
        <ul className="border-t">
          {Array.from({ length: slots }, (_, k) => k + 1).map((n) =>
            eff?.exerciseId === p.exerciseId && eff.n === n && !loggedAt(p, n) ? (
              <li key={n} className="border-t bg-accent first:border-t-0">
                {editor(p, n, true)}
              </li>
            ) : (
              <Fragment key={n}>{row(p, n, () => setOpen({ exerciseId: p.exerciseId, n }))}</Fragment>
            ),
          )}
        </ul>
        {!p.skipped && addSkip(p, true)}
      </li>
    );
  }

  const main = plan.filter((p) => !p.core);
  const core = plan.filter((p) => p.core);

  return (
    <div className="flex flex-1 flex-col">
      <header className="lg:border-b">
        <div className="mx-auto hidden h-18 max-w-[1200px] items-center justify-between px-8 lg:flex">
          <span className="flex items-center gap-2.5">
            <LogoMark className="size-8" />
            <span className="font-heading text-2xl font-bold tracking-tight">rebound</span>
          </span>
          <SignOutButton />
        </div>
        <div className="mx-auto flex min-h-16 max-w-md items-center gap-2 border-b px-2 pt-[env(safe-area-inset-top)] lg:hidden">
          <Link href="/" aria-label="Back to today" className="grid size-12 place-items-center">
            <ChevronLeftIcon className="size-6" aria-hidden />
          </Link>
          <div className="flex flex-1 flex-col">
            <span className="font-heading text-lg leading-5 font-bold">{capitalise(props.split)}</span>
            <span className="flex items-center gap-1.5 text-[15px] text-muted-foreground">
              <ClockIcon className="size-4" aria-hidden />
              {props.minutes} min · saved
            </span>
          </div>
          <button type="button" onClick={finish} className="flex min-h-12 items-center gap-2 rounded-xl bg-secondary px-4 font-bold">
            <FlagIcon className="size-5" aria-hidden />
            Finish
          </button>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-4 pb-0",
          "lg:grid lg:max-w-[1200px] lg:items-start lg:gap-x-8 lg:px-8 lg:pt-8 lg:pb-12",
          view === "focused" ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,2.3fr)]",
        )}
      >
        <aside className="flex flex-col gap-4 lg:gap-5">
          <div className="hidden flex-col gap-1 lg:flex">
            <p className="text-[15px] font-bold text-muted-foreground">{props.dateLabel} · Workout in progress</p>
            <h1 className="font-heading text-7xl leading-[72px] font-bold tracking-tight">{capitalise(props.split)}</h1>
            <p className="flex items-center gap-2 text-base text-muted-foreground">
              <ClockIcon className="size-5" aria-hidden />
              Started {props.startedLabel} · {props.minutes} min · saved
            </p>
          </div>
          <div className={cn(view === "focused" && "max-lg:hidden")}>{chipRow}</div>
          {toggle}
          <div className="hidden flex-col gap-3 lg:flex">
            <button type="button" onClick={finish} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-secondary font-bold">
              <FlagIcon className="size-5" aria-hidden />
              Finish workout
            </button>
            <button type="button" onClick={() => setConfirm({ kind: "discard" })} className="flex min-h-14 items-center justify-center gap-2 rounded-xl border-[1.5px] border-destructive font-bold text-destructive">
              <Trash2Icon className="size-5" aria-hidden />
              Discard workout
            </button>
          </div>
        </aside>

        {view === "focused" ? (
          <>
            <section aria-label="Exercises" className="hidden flex-col gap-3 lg:flex">
              <h2 className="font-heading text-lg font-bold">{plan.length} exercises · {loggedCount} of {totalSlots} sets</h2>
              <ol className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border dark:shadow-none">
                {plan.map((p, i) => (
                  <li key={p.exerciseId} className="border-t first:border-t-0">
                    <button
                      type="button"
                      aria-current={p.exerciseId === focused.exerciseId ? "true" : undefined}
                      onClick={() => setFocusedId(p.exerciseId)}
                      className="flex min-h-[72px] w-full items-center gap-3 py-3 pr-3 pl-4 text-left aria-[current]:bg-accent"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-heading font-bold tabular-nums">{i + 1}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-lg leading-6 font-bold">{p.name}</span>
                        <span className="text-[15px] leading-5 text-muted-foreground">{dose(p)}</span>
                      </span>
                      {badge(p)}
                    </button>
                  </li>
                ))}
              </ol>
            </section>
            <Fragment key={focused.exerciseId}>{focusedPanel(focused)}</Fragment>
          </>
        ) : (
          <section aria-label="Exercises" className="flex flex-col gap-3">
            <h2 className="font-heading text-lg font-bold">{plan.length} exercises · {loggedCount} of {totalSlots} sets done</h2>
            <ol className="lg:columns-2 lg:gap-x-6">
              {main.map((p, i) => <Fragment key={p.exerciseId}>{card(p, i)}</Fragment>)}
            </ol>
            {core.length > 0 && (
              <>
                <h2 className="font-heading text-lg font-bold">Core finisher</h2>
                <ol className="pb-6 lg:columns-2 lg:gap-x-6">
                  {core.map((p) => <Fragment key={p.exerciseId}>{card(p, plan.indexOf(p))}</Fragment>)}
                </ol>
              </>
            )}
          </section>
        )}
      </main>

      {/* Edit a logged set */}
      <Sheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing ? `Edit set ${editing.set.setNumber}` : ""}
        description={editing ? `${editing.p.name} · logged ${formatSet(editing.p.kind, editing.set)}` : undefined}
        closeButton
      >
        {editing && (
          <>
            <Fields kind={editing.p.kind} draft={editing.draft} onChange={(d) => setEditing({ ...editing, draft: d })} />
            <CompleteButton
              label="Save changes"
              icon={<SaveIcon className="size-5" aria-hidden />}
              disabled={pending || !valid(editing.p.kind, editing.draft)}
              onClick={() => run(() => editSet(workoutId, editing.set.id, toValues(editing.p.kind, editing.draft)), () => setEditing(null))}
            />
            <button
              type="button"
              onClick={() => {
                setConfirm({ kind: "delete", p: editing.p, set: editing.set });
                setEditing(null);
              }}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl border-[1.5px] border-destructive font-bold text-destructive"
            >
              <Trash2Icon className="size-5" aria-hidden />
              Delete set
            </button>
          </>
        )}
      </Sheet>

      <ConfirmSheet
        open={confirm?.kind === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === "delete" ? `Delete set ${confirm.set.setNumber}?` : ""}
        body={confirm?.kind === "delete" ? `${formatSet(confirm.p.kind, confirm.set)} is removed from this workout. This can't be undone.` : ""}
        confirmLabel="Delete set"
        confirmIcon={<Trash2Icon className="size-5" aria-hidden />}
        destructive
        cancelLabel="Keep it"
        pending={pending}
        onConfirm={() => confirm?.kind === "delete" && run(() => deleteSet(workoutId, confirm.set.id), () => setConfirm(null))}
      />
      <ConfirmSheet
        open={confirm?.kind === "skip"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === "skip" ? `Skip ${confirm.p.name.toLowerCase()}?` : ""}
        body="It shows as skipped in your summary. You can still log it before you finish."
        confirmLabel="Skip exercise"
        confirmIcon={<SkipForwardIcon className="size-5" aria-hidden />}
        cancelLabel="Keep it"
        pending={pending}
        onConfirm={() => confirm?.kind === "skip" && run(() => skipExercise(workoutId, confirm.p.exerciseId), () => setConfirm(null))}
      />
      <ConfirmSheet
        open={confirm?.kind === "finish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Finish now?"
        body={`${unlogged.map((p) => p.name).join(", ")} ${unlogged.length === 1 ? "isn't" : "aren't"} logged yet. Unlogged exercises show as skipped.`}
        confirmLabel="Finish workout"
        confirmIcon={<FlagIcon className="size-5" aria-hidden />}
        cancelLabel="Keep going"
        pending={pending}
        onConfirm={() => run(() => finishWorkout(workoutId))}
      />
      <ConfirmSheet
        open={confirm?.kind === "discard"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Discard this workout?"
        body={`The ${loggedCount} sets you logged are deleted and today goes back to not started. This can't be undone.`}
        confirmLabel="Discard workout"
        confirmIcon={<Trash2Icon className="size-5" aria-hidden />}
        destructive
        cancelLabel="Keep it"
        pending={pending}
        onConfirm={() => run(() => discardWorkout(workoutId))}
      />
    </div>
  );
}
