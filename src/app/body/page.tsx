import { Suspense } from "react";
import { BodyFigure } from "@/components/body/body-figure";
import { BodyScreen } from "@/components/body/body-screen";
import { ScreenHeader } from "@/components/workout/suggestion-ui";
import { lastTrainedLabel, summaryLine } from "@/lib/body";
import { loadBody } from "@/lib/fatigue-data";
import { requireSession } from "@/lib/session";

export default function BodyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="Body" current="body" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-10 lg:max-w-[1200px] lg:px-8 lg:pt-8">
        <Suspense fallback={<Skeleton />}>
          <Body />
        </Suspense>
      </main>
    </div>
  );
}

async function Body() {
  const { user } = await requireSession();
  const now = new Date();
  const { muscles, whole } = await loadBody(user.id, now);
  const readings = muscles.map((m) => ({ ...m, lastLabel: lastTrainedLabel(m.lastTrained, now) }));
  const empty = muscles.every((m) => !m.lastTrained);
  return (
    <BodyScreen
      readings={readings}
      whole={whole}
      dateLabel={now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
      summary={summaryLine(muscles, now)}
      empty={empty}
    />
  );
}

function Skeleton() {
  const bar = (cls: string) => <div className={`animate-pulse rounded-xl bg-muted ${cls}`} />;
  return (
    <div aria-busy="true" aria-label="Loading the body map" className="flex flex-col gap-6">
      {bar("h-20 w-48")}
      {bar("h-12")}
      <div className="flex justify-center rounded-2xl bg-card py-6 ring-1 ring-border">
        <BodyFigure side="front" readings={[]} selected={null} skeleton className="h-[420px]" />
      </div>
      {bar("h-72")}
    </div>
  );
}
