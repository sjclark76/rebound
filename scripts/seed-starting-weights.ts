// Gives a user a starting weight for every weighted exercise they haven't logged. Targets the database in .env.local.
// These are rough defaults by equipment; the initial strength assessment will replace them.
// Usage: npm run db:seed:weights -- <email>
import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: [".env.local", ".env"], quiet: true });

const KG_BY_EQUIPMENT: Record<string, number> = {
  dumbbell: 10,
  barbell: 20,
  cable: 20,
  machine: 20,
  kettlebells: 12,
  "e-z curl bar": 15,
  "medicine ball": 4,
  "exercise ball": 0,
  bands: 0,
  "foam roll": 0,
  other: 10,
};

async function main() {
  const [email] = process.argv.slice(2);
  if (!email) throw new Error("Usage: db:seed:weights <email>");
  const { db, pool } = await import("../src/db");
  const { exercise, startingWeight, user } = await import("../src/db/schema");

  const [u] = await db.select().from(user).where(eq(user.email, email));
  if (!u) throw new Error(`No user with email ${email}`);

  const rows = (await db.select({ id: exercise.id, equipment: exercise.equipment, category: exercise.category }).from(exercise))
    .filter((e) => e.category === "strength" && e.equipment && e.equipment !== "body only")
    .map((e) => ({ userId: u.id, exerciseId: e.id, weightKg: KG_BY_EQUIPMENT[e.equipment!] ?? 10 }));

  for (let i = 0; i < rows.length; i += 200) {
    await db.insert(startingWeight).values(rows.slice(i, i + 200)).onConflictDoNothing();
  }
  console.log(`Starting weights set for ${rows.length} weighted exercises for ${email}.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
