import { SuggestedWorkoutPage } from "@/components/workout/suggested-workout";

export default function TodaysWorkout({ searchParams }: PageProps<"/today">) {
  return <SuggestedWorkoutPage mode="today" searchParams={searchParams} />;
}
