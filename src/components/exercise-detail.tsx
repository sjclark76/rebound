import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { ExercisePhotos } from "@/components/exercise-photos";
import type { CatalogueExercise } from "@/lib/generator";

type DetailExercise = CatalogueExercise & { instructions: string[]; images: string[] };

const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * One exercise's dose, photos and steps. A full screen on phones (with a back link);
 * the right-hand panel of the home page on wide screens.
 */
export function ExerciseDetail({
  exercise,
  dose,
  context,
  backHref,
}: {
  exercise: DetailExercise;
  dose?: string;
  context: string;
  backHref: string;
}) {
  return (
    <section aria-label="Exercise detail" className="flex flex-col gap-6 lg:gap-5 lg:rounded-2xl lg:bg-card lg:p-6 lg:shadow-sm lg:ring-1 lg:ring-border lg:dark:shadow-none">
      <Link
        href={backHref}
        className="-mt-2 -ml-3 inline-flex min-h-12 items-center gap-1 self-start rounded-xl pr-3 pl-1 text-base font-bold hover:bg-muted lg:hidden"
      >
        <ChevronLeftIcon className="size-6" aria-hidden />
        Today
      </Link>
      <div className="flex flex-col gap-3">
        <p className="text-[15px] leading-5 font-bold text-muted-foreground">{context}</p>
        <h2 className="font-heading text-3xl font-bold tracking-tight">{exercise.name}</h2>
        <div className="flex flex-wrap gap-2">
          {dose && (
            <span className="inline-flex min-h-10 items-center rounded-full bg-secondary px-3.5 font-heading text-lg font-bold tabular-nums">
              {dose}
            </span>
          )}
          <span className="inline-flex min-h-10 items-center rounded-full bg-secondary px-3.5 text-[15px] font-bold">
            {capitalise(exercise.equipment ?? "body only")}
          </span>
        </div>
      </div>

      <ExercisePhotos images={exercise.images} name={exercise.name} />

      <div className="flex flex-col gap-3 lg:gap-2.5">
        <h3 className="font-heading text-[22px] leading-7 font-bold lg:text-lg lg:leading-6">How to do it</h3>
        <ol className="flex list-decimal flex-col gap-2.5 pl-6 text-lg leading-[26px] lg:gap-2">
          {exercise.instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
