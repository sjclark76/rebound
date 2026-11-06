import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon, ChevronRightIcon, CircleCheckIcon, DumbbellIcon, LayoutGridIcon, PauseIcon } from "lucide-react";
import { cn } from "cn";
import { SPLIT_NAMES, type Split } from "@/lib/generator";
import { requireSession } from "@/lib/session";
import { loadSuggestion, parseOptions } from "@/lib/suggestion";
import { AutoClosedNotice } from "@/components/workout/today-client";
import { InProgressToday } from "@/components/workout/today-states";
import { AppHeader, BigLink, Chips, EmptyState, lastTrainedText, list, pathHref, sizeText } from "@/components/workout/suggestion-ui";
import { getActiveWorkout, getAutoClosedNotice, getCompletedToday, getInjuryChips, type LoadedWorkout } from "@/lib/workout-data";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-2xl bg-muted" />}>
        <Today searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Today({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { user } = await requireSession();
  const today = new Date();
  // An open workout takes over the page. Stale ones are closed first.
  const active = await getActiveWorkout(user.id);
  const [done, closed] = await Promise.all([active ? null : getCompletedToday(user.id, today), getAutoClosedNotice(user.id)]);
  const notice = closed && (
    <AutoClosedNotice
      workoutId={closed.id}
      text={`${closed.startedAt.toLocaleDateString("en-GB", { weekday: "long" })}'s workout was left open, so we saved it as finished (${closed.sets} sets).`}
    />
  );
  if (active) {
    const kicker = (
      <p className="text-[15px] leading-5 font-bold text-muted-foreground">
        {today.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · Today&apos;s workout
      </p>
    );
    return <>{notice}<InProgressToday w={active} kicker={kicker} chips={await getInjuryChips(user.id)} /></>;
  }
  return (
    <>
      {notice}
      <Recommendation searchParams={searchParams} userId={user.id} today={today} done={done} />
    </>
  );
}

const time = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

/** A workout finished today, kept small above the next recommendation. */
function DoneToday({ w }: { w: LoadedWorkout }) {
  const name = SPLIT_NAMES[w.split as Split] ?? "Workout";
  return (
    <section aria-label="Done today" className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border lg:w-full lg:max-w-[560px] dark:shadow-none">
      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-secondary text-primary">
        <CircleCheckIcon className="size-7" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] leading-5 font-bold text-muted-foreground">Done today</span>
        <span className="font-heading text-xl leading-7 font-bold">{name}</span>
        <span className="text-[15px] leading-5 text-muted-foreground tabular-nums">
          {time(w.completedAt!)} · {w.sets.length} {w.sets.length === 1 ? "set" : "sets"}
        </span>
      </div>
      <Link
        href={`/workout/${w.id}/summary`}
        className="inline-flex min-h-12 items-center gap-1 rounded-xl pl-2 text-base font-bold text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Summary
        <ChevronRightIcon className="size-5" aria-hidden />
      </Link>
    </section>
  );
}

/** Home: the recommendation and two ways on. */
async function Recommendation({
  searchParams,
  userId,
  today,
  done,
}: Pick<PageProps<"/">, "searchParams"> & { userId: string; today: Date; done: LoadedWorkout | null }) {
  const options = { ...parseOptions(await searchParams), split: undefined };
  const { suggestion, injuries, hasEquipment } = await loadSuggestion(userId, today, options);
  const date = (weekday: "short" | "long", month: "short" | "long") => today.toLocaleDateString("en-GB", { weekday, day: "numeric", month });
  const label = done ? "Next workout" : "Recommended";
  const kicker = (
    <p className="text-[15px] leading-5 font-bold text-muted-foreground">
      <span className="lg:hidden">{date("short", "short")}</span>
      <span className="hidden lg:inline">{date("long", "long")}</span> · {label}
    </p>
  );
  const resting = injuries.filter((i) => i.mode === "rest").map((i) => i.muscle);
  const rehab = injuries.filter((i) => i.mode === "rehab").map((i) => i.muscle);
  const doneCard = done && <DoneToday w={done} />;

  if (!hasEquipment && !options.bodyweightOnly) {
    return (
      <>
        {doneCard}
        <EmptyState
          kicker={kicker}
          icon={<DumbbellIcon className="size-8 text-primary" aria-hidden />}
          title="Add your equipment to get a workout"
          body="Rebound builds each session from what you own. Switch on your equipment in settings, or train with bodyweight for today."
          actions={
            <div className="flex flex-col gap-3 lg:flex-1 lg:flex-row">
              <BigLink href="/settings">Set up equipment</BigLink>
              <BigLink href={pathHref("/", { ...options, bodyweightOnly: true })}>Bodyweight only for today</BigLink>
            </div>
          }
        />
      </>
    );
  }

  if (!suggestion) {
    return (
      <>
        {doneCard}
        <EmptyState
          kicker={kicker}
          icon={<PauseIcon className="size-8 text-rest" aria-hidden />}
          iconClass="bg-rest-muted"
          title="Rest is today's workout"
          body="Between your injuries and recent training, nothing left is safe to load."
          chips={<Chips resting={resting} rehab={rehab} recovering={[]} />}
          actions={
            <BigLink href={pathHref("/choose", options)} secondary>
              <LayoutGridIcon className="size-5" aria-hidden />
              Choose a workout anyway
            </BigLink>
          }
        />
      </>
    );
  }

  const name = SPLIT_NAMES[suggestion.split];
  const finisher = suggestion.exercises.some((e) => e.exercise.primaryMuscles[0] === "abdominals");
  const count = suggestion.exercises.length - (finisher ? 1 : 0);
  const why = [
    `${name} muscles are the most rested.`,
    resting.length > 0 && `Nothing here loads your ${list(resting)}.`,
    rehab.length > 0 && `Your ${list(rehab)} only ${rehab.length > 1 ? "help" : "helps"} out, never leads.`,
  ].filter(Boolean);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 pt-2 pb-[max(1.75rem,env(safe-area-inset-bottom))] lg:max-w-[1200px] lg:items-center lg:gap-4 lg:px-8 lg:py-16">
      {doneCard}
      <div className="flex flex-1 flex-col lg:w-full lg:max-w-[560px] lg:flex-none lg:rounded-3xl lg:bg-card lg:p-10 lg:shadow-sm lg:ring-1 lg:ring-border lg:dark:shadow-none">
        <div className="flex flex-1 flex-col justify-center gap-4 py-8 lg:flex-none lg:pt-0 lg:pb-8">
          <div className="flex flex-col gap-1">
            {kicker}
            <h1 className="font-heading text-[72px] leading-[76px] font-bold tracking-tight lg:text-[80px]">{name}</h1>
            <p className="text-base text-muted-foreground">
              {lastTrainedText(suggestion.lastTrainedDays)} · {sizeText(count, finisher)}
            </p>
          </div>
          <p className="text-lg leading-[26px]">{why.join(" ")}</p>
          <Chips resting={resting} rehab={rehab} recovering={suggestion.recovering} />
          {options.bodyweightOnly && (
            <p className="text-base text-muted-foreground">
              Bodyweight only today.{" "}
              <Link href={pathHref("/", { ...options, bodyweightOnly: false })} className="font-bold text-primary underline-offset-4 hover:underline">
                Use my equipment
              </Link>
            </p>
          )}
        </div>
        <div className={cn("flex flex-col gap-3 lg:flex-row")}>
          <BigLink href={pathHref("/today", options)}>
            See {name.toLowerCase()} workout
            <ArrowRightIcon className="size-5" aria-hidden />
          </BigLink>
          <BigLink href={pathHref("/choose", options)} secondary>
            <LayoutGridIcon className="size-5" aria-hidden />
            Choose a workout
          </BigLink>
        </div>
      </div>
    </main>
  );
}
