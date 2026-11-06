// Adds the Bowflex, fingerboard and TRX exercises to the catalogue. Safe to re-run: existing rows are updated.
// Targets the database in .env.local; run it on production at release, like the migrations.
// Usage: npm run db:seed:gear
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { GEAR_EXERCISES } from "./data/gear-exercises";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const { db, pool } = await import("../src/db");
  const { exercise } = await import("../src/db/schema");
  await db
    .insert(exercise)
    .values(GEAR_EXERCISES)
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
  console.log(`Seeded ${GEAR_EXERCISES.length} gear exercises`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
