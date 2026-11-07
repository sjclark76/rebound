// Drafts the fine muscle tags for every exercise and saves them, then lists the ones it had to guess.
// Usage: npm run db:tag:muscles
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { exercise } from "../src/db/schema";
import { tagMuscles } from "./data/muscle-tags";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const { db, pool } = await import("../src/db");
  const rows = await db.select().from(exercise);
  const review: string[] = [];
  for (const e of rows) {
    const t = tagMuscles(e);
    await db.update(exercise).set({ finePrimary: t.primary, fineSecondary: t.secondary, lengthened: t.lengthened }).where(eq(exercise.id, e.id));
    if (t.review) review.push(`${e.name} [${e.primaryMuscles.join(", ")}]: ${t.review} -> ${t.primary.join(", ")}`);
  }
  console.log(`Tagged ${rows.length} exercises. ${review.length} to review:`);
  for (const r of review) console.log(`  ${r}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
