import { Suspense } from "react";
import Link from "next/link";
import { ChevronRightIcon, DumbbellIcon, PauseIcon, PlayIcon, RotateCcwIcon, SettingsIcon } from "lucide-react";
import { cn } from "cn";
import { ExerciseDetail } from "@/components/exercise-detail";
import { LogoMark } from "@/components/logo-mark";
import { SignOutButton } from "@/components/sign-out-button";
import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { type Split, SPLIT_NAMES, SPLITS } from "@/lib/generator";
import { requireSession } from "@/lib/session";
import { loadSuggestion, optionsQuery, parseOptions, type SuggestionOptions } from "@/lib/suggestion";
import { startWorkout } from "@/app/workout/actions";
import { AutoClosedNotice } from "@/components/workout/today-client";
import { CompletedToday, InProgressToday } from "@/components/workout/today-states";
import { getActiveWorkout, getAutoClosedNotice, getCompletedToday, getInjuryChips } from "@/lib/workout-data";

const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1);
const list = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** Home page link that keeps the suggestion options and, optionally, selects an exercise. */
function homeHref(options: SuggestionOptions, exercise?: string) {
  const q = new URLSearchParams(optionsQuery(options));
  if (exercise) q.set("exercise", exercise);
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="lg:border-b">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between pt-[env(safe-area-inset-top)] pr-2 pl-4 lg:h-18 lg:max-w-[1200px] lg:px-8">
          <span className="flex items-center gap-2 lg:gap-2.5">
            <LogoMark className="size-7 lg:size-8" />
            <span className="font-heading text-[22px] font-bold tracking-tight lg:text-2xl">rebound</span>
          </span>
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              aria-label="Settings"
              className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl px-3 text-[15px] font-bold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <SettingsIcon className="size-6" aria-hidden />
              <span className="hidden lg:inline">Settings</span>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <Suspense fallback={<div className="m-4 h-96 animate-pulse rounded-2xl bg-muted" />}>
        <Today searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Today({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { user } = await requireSession();
  const today = new Date();
  // An open workout takes over today's page; so does one finished today. Stale ones are closed first.
  const active = await getActiveWorkout(user.id);
  const [completed, closed] = await Promise.all([active ? null : getCompletedToday(user.id, today), getAutoClosedNotice(user.id)]);
  const notice = closed && (
    <AutoClosedNotice
      workoutId={closed.id}
      text={`${closed.startedAt.toLocaleDateString("en-GB", { weekday: "long" })}'s workout was left open, so we saved it as finished (${closed.sets} sets).`}
    />
  );
  if (active || completed) {
    const w = (active ?? completed)!;
    const kicker = (
      <p className="text-[15px] leading-5 font-bold text-muted-foreground">
        {today.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · Today&apos;s workout
      </p>
    );
    const base = await getInjuryChips(user.id);
    if (active) return <>{notice}<InProgressToday w={w} kicker={kicker} chips={base} /></>;
    const { recovering } = await loadSuggestion(user.id, today);
    return <>{notice}<CompletedToday w={w} kicker={kicker} chips={{ ...base, recovering }} /></>;
  }
  return (
    <>
      {notice}
      <Suggestion searchParams={searchParams} userId={user.id} today={today} />
    </>
  );
}

async function Suggestion({ searchParams, userId, today }: Pick<PageProps<"/">, "searchParams"> & { userId: string; today: Date }) {
  const user = { id: userId };
  const params = await searchParams;
  const options = parseOptions(params);
  const { suggestion, injuries, hasEquipment } = await loadSuggestion(user.id, today, options);
  const date = (weekday: "short" | "long", month: "short" | "long") =>
    today.toLocaleDateString("en-GB", { weekday, day: "numeric", month });
  const kicker = (
    <p className="text-[15px] leading-5 font-bold text-muted-foreground">
      <span className="lg:hidden">{date("short", "short")}</span>
      <span className="hidden lg:inline">{date("long", "long")}</span> · Today&apos;s workout
    </p>
  );
  const resting = injuries.filter((i) => i.mode === "rest").map((i) => i.muscle);
  const rehab = injuries.filter((i) => i.mode === "rehab").map((i) => i.muscle);

  if (!hasEquipment && !options.bodyweightOnly) {
    return (
      <EmptyState
        kicker={kicker}
        icon={<DumbbellIcon className="size-8 text-primary" aria-hidden />}
        title="Add your equipment to get a workout"
        body="Rebound builds each session from what you own. Switch on your equipment in settings, or train with bodyweight for today."
        actions={
          <div className="flex flex-col gap-3 lg:flex-1 lg:flex-row">
            <BigLink href="/settings">Set up equipment</BigLink>
            <BigLink href={homeHref({ ...options, bodyweightOnly: true })}>Bodyweight only for today</BigLink>
          </div>
        }
      />
    );
  }

  if (!suggestion) {
    return (
      <EmptyState
        kicker={kicker}
        icon={<PauseIcon className="size-8 text-rest" aria-hidden />}
        iconClass="bg-rest-muted"
        title="Rest is today's workout"
        body="Between your injuries and recent training, nothing left is safe to load."
        chips={<Chips resting={resting} rehab={rehab} recovering={[]} />}
        actions={<SessionPicker options={options} label="Choose a session anyway" />}
      />
    );
  }

  const main = suggestion.exercises.filter((e) => e.exercise.primaryMuscles[0] !== "abdominals");
  const core = suggestion.exercises.find((e) => e.exercise.primaryMuscles[0] === "abdominals");
  const name = SPLIT_NAMES[suggestion.split];
  const days = suggestion.lastTrainedDays;
  const why = [
    options.split ? `You chose ${name.toLowerCase()} today.` : `${name} muscles are the most rested.`,
    resting.length > 0 && `Nothing here loads your ${list(resting)}.`,
    rehab.length > 0 && `Your ${list(rehab)} only ${rehab.length > 1 ? "help" : "helps"} out, never leads.`,
  ].filter(Boolean);

  // Phones show the selected exercise as its own screen; wide screens always show one beside the list.
  const requested = typeof params.exercise === "string" ? params.exercise : undefined;
  const selected = suggestion.exercises.find((e) => e.exercise.id === requested);
  const detail = selected ?? suggestion.exercises[0];
  const detailIndex = main.indexOf(detail);
  const onDetail = selected ? "max-lg:hidden" : "";

  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-2",
        selected ? "pb-6" : "pb-0",
        "lg:grid lg:max-w-[1200px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-6 lg:px-8 lg:pt-8 lg:pb-12",
      )}
    >
      <section aria-label="Today's session" className={cn("flex flex-col gap-6 lg:col-start-1 lg:row-start-1", onDetail)}>
        <div className="flex flex-col gap-1">
          {kicker}
          <h1 className="font-heading text-[44px] leading-12 font-bold tracking-tight lg:text-7xl lg:leading-[72px]">{name}</h1>
          <p className="text-base text-muted-foreground">
            {days === null ? "Not trained this week" : days === 0 ? "Last trained today" : `Last trained ${days} day${days === 1 ? "" : "s"} ago`}
          </p>
        </div>
        <p className="text-lg leading-[26px]">{why.join(" ")}</p>
        <Chips resting={resting} rehab={rehab} recovering={suggestion.recovering} stack />
        {options.bodyweightOnly && (
          <p className="text-base text-muted-foreground">
            Bodyweight only today.{" "}
            <Link href={homeHref({ ...options, bodyweightOnly: false })} className="font-bold text-primary underline-offset-4 hover:underline">
              Use my equipment
            </Link>
          </p>
        )}
      </section>

      <section aria-label="Exercises" className={cn("flex flex-col gap-3 lg:col-start-2 lg:row-span-4 lg:row-start-1", onDetail)}>
        <h2 className="font-heading text-lg font-bold">
          {main.length} exercise{main.length === 1 ? "" : "s"}
        </h2>
        <ol className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border dark:shadow-none">
          {main.map((e, i) => (
            <li key={e.exercise.id} className="border-t first:border-t-0">
              <ExerciseRow href={homeHref(options, e.exercise.id)} number={i + 1} item={e} current={e === detail} />
            </li>
          ))}
        </ol>
        {core && (
          <>
            <h2 className="mt-3 font-heading text-lg font-bold">Core finisher</h2>
            <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border dark:shadow-none">
              <ExerciseRow href={homeHref(options, core.exercise.id)} item={core} current={core === detail} />
            </div>
          </>
        )}
      </section>

      <div className={cn("lg:col-start-1 lg:row-start-3", onDetail)}>
        <SessionPicker options={options} label="Choose a different session" />
      </div>

      <div
        className={cn(
          "sticky bottom-0 -mx-4 border-t bg-background px-4 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(22,33,29,0.08)] dark:shadow-none",
          "lg:static lg:col-start-1 lg:row-start-2 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none",
          onDetail,
        )}
      >
        <form action={startWorkout.bind(null, Object.fromEntries(new URLSearchParams(optionsQuery(options))))}>
          <Button type="submit" className="h-16 w-full rounded-xl font-heading text-xl font-bold">
            <PlayIcon className="size-5.5 fill-current" aria-hidden />
            Start workout
          </Button>
        </form>
      </div>

      <div className={cn("lg:col-start-3 lg:row-span-4 lg:row-start-1", !selected && "max-lg:hidden")}>
        <ExerciseDetail
          exercise={detail.exercise}
          dose={`${detail.sets} × ${detail.reps}${detail.exercise.force === "static" ? " s" : ""}`}
          context={
            detailIndex >= 0
              ? `Exercise ${detailIndex + 1} of ${main.length} · ${name}`
              : `Core finisher · ${name}`
          }
          backHref={homeHref(options)}
        />
      </div>
    </main>
  );
}

function Chips({
  resting,
  rehab,
  recovering,
  stack = false,
}: {
  resting: string[];
  rehab: string[];
  recovering: string[];
  stack?: boolean;
}) {
  if (!resting.length && !rehab.length && !recovering.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", stack && "lg:flex-col lg:items-start")}>
      {resting.map((m) => (
        <StatusChip key={m} kind="rest">{capitalise(m)} · resting</StatusChip>
      ))}
      {rehab.map((m) => (
        <StatusChip key={m} kind="rehab">{capitalise(m)} · rehab</StatusChip>
      ))}
      {recovering.length > 0 && <StatusChip kind="recovering">Recovering: {recovering.join(", ")}</StatusChip>}
    </div>
  );
}

type Item = { exercise: { name: string; equipment: string | null; force: string | null }; sets: number; reps: string };

function ExerciseRow({ href, number, item, current }: { href: string; number?: number; item: Item; current: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className="group flex min-h-18 items-center gap-3 py-3 pr-3 pl-4 hover:bg-muted/50 lg:aria-[current]:bg-accent"
    >
      {number !== undefined && (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary font-heading text-base font-bold tabular-nums lg:group-aria-[current]:bg-accent-foreground lg:group-aria-[current]:text-accent">
          {number}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-lg leading-6 font-bold">{item.exercise.name}</span>
        <span className="text-[15px] leading-5 text-muted-foreground tabular-nums">
          {item.sets} × {item.reps}{item.exercise.force === "static" ? " s" : ""} · {capitalise(item.exercise.equipment ?? "body only")}
        </span>
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

/** Lets the user override the suggested split; keeps other options. */
function SessionPicker({ options, label }: { options: SuggestionOptions; label: string }) {
  return (
    <details className="group w-full">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-center gap-2 rounded-xl bg-secondary text-base font-bold text-secondary-foreground">
        <RotateCcwIcon className="size-5" aria-hidden />
        {label}
      </summary>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(Object.keys(SPLITS) as Split[]).map((s) => (
          <Link
            key={s}
            href={homeHref({ ...options, split: s })}
            aria-current={options.split === s ? "true" : undefined}
            className="grid min-h-12 place-items-center rounded-xl border-[1.5px] border-input bg-card font-bold aria-[current]:border-primary aria-[current]:text-primary"
          >
            {SPLIT_NAMES[s]}
          </Link>
        ))}
      </div>
      {options.split && (
        <Link href={homeHref({ ...options, split: undefined })} className="mt-3 block text-center text-base font-bold text-primary">
          Back to the suggestion
        </Link>
      )}
    </details>
  );
}

function BigLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="grid min-h-16 place-items-center rounded-xl bg-primary px-4 font-heading text-xl font-bold text-primary-foreground lg:flex-1">
      {children}
    </Link>
  );
}

function EmptyState({
  kicker,
  icon,
  iconClass = "bg-secondary",
  title,
  body,
  chips,
  actions,
}: {
  kicker: React.ReactNode;
  icon: React.ReactNode;
  iconClass?: string;
  title: string;
  body: string;
  chips?: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-2 pb-[max(1.75rem,env(safe-area-inset-bottom))] lg:max-w-[1200px] lg:items-center lg:px-8 lg:py-16">
      <div className="flex flex-1 flex-col lg:w-full lg:max-w-[560px] lg:flex-none lg:gap-4 lg:rounded-3xl lg:bg-card lg:p-10 lg:shadow-sm lg:ring-1 lg:ring-border lg:dark:shadow-none">
        {kicker}
        <div className="flex flex-1 flex-col justify-center gap-4 py-8 lg:py-0">
          <span className={cn("grid size-16 place-items-center rounded-full", iconClass)}>{icon}</span>
          <h1 className="font-heading text-3xl font-bold tracking-tight lg:text-[40px] lg:leading-11">{title}</h1>
          <p className="text-lg leading-[26px] text-muted-foreground">{body}</p>
          {chips}
        </div>
        <div className="lg:mt-2 lg:flex lg:gap-3">{actions}</div>
      </div>
    </main>
  );
}
