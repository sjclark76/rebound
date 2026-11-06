import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, SkipForwardIcon } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { SignOutButton } from "@/components/sign-out-button";
import { StatusChip } from "@/components/status-chip";
import { SPLIT_NAMES, type Split } from "@/lib/generator";
import type { Unit } from "@/db/vocab";
import { requireSession } from "@/lib/session";
import { loadSuggestion } from "@/lib/suggestion";
import { getInjuryChips, loadWorkout } from "@/lib/workout-data";
import { formatSet, summarise } from "@/lib/workout";

export default function SummaryPage({ params }: PageProps<"/workout/[id]/summary">) {
  return (
    <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-2xl bg-muted" />}>
      <Summary params={params} />
    </Suspense>
  );
}

const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1);

async function Summary({ params }: Pick<PageProps<"/workout/[id]/summary">, "params">) {
  const { user } = await requireSession();
  const { id } = await params;
  const w = Number.isInteger(Number(id)) ? await loadWorkout(user.id, Number(id)) : null;
  if (!w || !w.completedAt) notFound();
  const [chips, { recovering }] = await Promise.all([getInjuryChips(user.id), loadSuggestion(user.id, new Date())]);
  const s = summarise(w.plan, w.sets, w.startedAt, w.completedAt);
  const time = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  const stat = (label: string, value: string, note?: string) => (
    <div className="flex flex-col gap-1 rounded-2xl bg-card p-4 ring-1 ring-border">
      <span className="text-base font-bold text-muted-foreground">{label}</span>
      <span className="font-heading text-3xl font-bold tabular-nums">{value}</span>
      {note && <span className="text-base text-muted-foreground">{note}</span>}
    </div>
  );
  return (
    <div className="flex flex-1 flex-col">
      <header className="lg:border-b">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between pt-[env(safe-area-inset-top)] pr-2 pl-4 lg:h-18 lg:max-w-[1200px] lg:px-8">
          <span className="flex items-center gap-2">
            <LogoMark className="size-7 lg:size-8" />
            <span className="font-heading text-[22px] font-bold tracking-tight lg:text-2xl">rebound</span>
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 lg:max-w-[720px] lg:pb-12">
        <div className="flex flex-col gap-3">
          <span className="grid size-16 place-items-center rounded-full bg-secondary">
            <CheckIcon className="size-8 text-primary" aria-hidden />
          </span>
          <p className="text-[15px] font-bold text-muted-foreground">
            {w.startedAt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {SPLIT_NAMES[w.split as Split]}
          </p>
          <h1 className="font-heading text-4xl leading-10 font-bold tracking-tight">Workout done. Rest well.</h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {stat("Exercises", `${s.exercisesDone} of ${s.exercisesTotal}`, s.skipped ? `${s.skipped} skipped` : undefined)}
          {stat("Sets", String(s.sets))}
          {stat("Volume", `${Math.round(s.volume).toLocaleString("en-GB")} kg`, "Weighted sets only")}
          {stat("Duration", `${s.minutes} min`, `${time(w.startedAt)}–${time(w.completedAt)}`)}
        </div>
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-bold">Recovering now</h2>
          <p className="text-base text-muted-foreground">Rebound steers around these until they&apos;ve rested.</p>
          <div className="flex flex-wrap gap-2">
            {chips.resting.map((m) => <StatusChip key={m} kind="rest">{capitalise(m)} · resting</StatusChip>)}
            {chips.rehab.map((m) => <StatusChip key={m} kind="rehab">{capitalise(m)} · rehab</StatusChip>)}
            {recovering.length > 0 && <StatusChip kind="recovering">Recovering: {recovering.join(", ")}</StatusChip>}
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-bold">What you did</h2>
          <ol className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            {w.plan.map((p) => {
              const logged = w.sets.filter((x) => x.exerciseId === p.exerciseId);
              const skipped = p.skipped || logged.length === 0;
              return (
                <li key={p.exerciseId} className="flex min-h-[72px] items-center gap-3 border-t px-4 py-3 first:border-t-0">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-lg leading-6 font-bold">{p.name}</span>
                    <span className="text-[15px] leading-5 text-muted-foreground">{skipped ? "Not logged" : summaryLine(p.kind, logged)}</span>
                  </span>
                  <span className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[15px] font-bold ${skipped ? "bg-muted text-muted-foreground" : "bg-secondary"}`}>
                    {skipped ? <SkipForwardIcon className="size-4" aria-hidden /> : <CheckIcon className="size-4" aria-hidden />}
                    {skipped ? "Skipped" : "Done"}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
        <div className="sticky bottom-0 -mx-4 mt-auto border-t bg-background px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:border-0 lg:p-0">
          <Link href="/" className="grid min-h-16 place-items-center rounded-xl bg-primary font-heading text-xl font-bold text-primary-foreground">
            Done
          </Link>
        </div>
      </main>
    </div>
  );
}

/** "4 sets · 22.5 kg × 10, 9, 8, 8" / "3 sets · 12, 12, 11 reps" / "3 sets · 45, 40, 35 sec". */
function summaryLine(kind: "weighted" | "bodyweight" | "timed", sets: { weight: number | null; unit: Unit; reps: number | null; durationSec: number | null }[]) {
  const head = `${sets.length} set${sets.length === 1 ? "" : "s"}`;
  if (kind === "timed") return `${head} · ${sets.map((s) => s.durationSec).join(", ")} sec`;
  if (kind === "bodyweight") return `${head} · ${sets.map((s) => s.reps).join(", ")} reps`;
  const weights = new Set(sets.map((s) => `${s.weight}${s.unit}`));
  return weights.size === 1
    ? `${head} · ${formatSet("weighted", { ...sets[0], reps: null }).replace(/ × 0$/, "")} × ${sets.map((s) => s.reps).join(", ")}`
    : `${head} · ${sets.map((s) => formatSet("weighted", s)).join(", ")}`;
}
