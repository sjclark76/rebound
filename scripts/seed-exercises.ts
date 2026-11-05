// Loads the open-source free-exercise-db catalogue into the exercise table.
// Usage: npm run db:seed
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { exercise } from "../src/db/schema";

config({ path: [".env.local", ".env"], quiet: true });

const SOURCE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

type SourceExercise = {
  id: string;
  name: string;
  equipment: string | null;
  category: string;
  level: string;
  force: string | null;
  mechanic: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
};

async function main() {
  // Imported after env is loaded, because the pool reads DATABASE_URL on import.
  const { db, pool } = await import("../src/db");
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const rows = (await res.json()) as SourceExercise[];

  for (let i = 0; i < rows.length; i += 200) {
    await db
      .insert(exercise)
      .values(rows.slice(i, i + 200))
      .onConflictDoUpdate({
        target: exercise.id,
        set: {
          name: sql`excluded.name`,
          equipment: sql`excluded.equipment`,
          category: sql`excluded.category`,
          level: sql`excluded.level`,
          force: sql`excluded.force`,
          mechanic: sql`excluded.mechanic`,
          primaryMuscles: sql`excluded.primary_muscles`,
          secondaryMuscles: sql`excluded.secondary_muscles`,
          instructions: sql`excluded.instructions`,
          images: sql`excluded.images`,
        },
      });
  }
  console.log(`Seeded ${rows.length} exercises`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
