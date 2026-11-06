import { SuggestedWorkoutPage } from "@/components/workout/suggested-workout";

export default function ChooseWorkout({ searchParams }: PageProps<"/choose">) {
  return <SuggestedWorkoutPage mode="choose" searchParams={searchParams} />;
}
