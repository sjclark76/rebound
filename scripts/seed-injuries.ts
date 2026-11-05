// Adds, resolves or lists a user's injuries. Targets the database in .env.local.
// Usage:
//   npm run db:seed:injuries -- <email> add <muscle> <rest|rehab> [severity 1-5] [notes...]
//   npm run db:seed:injuries -- <email> resolve <muscle>
//   npm run db:seed:injuries -- <email> list
import { config } from "dotenv";
import { and, eq, isNull } from "drizzle-orm";
import { INJURY_MODES, MUSCLES, type InjuryMode } from "../src/db/vocab";
import { injury, user } from "../src/db/schema";

config({ path: [".env.local", ".env"], quiet: true });

const USAGE = `Usage:
  db:seed:injuries <email> add <muscle> <rest|rehab> [severity 1-5] [notes...]
  db:seed:injuries <email> resolve <muscle>
  db:seed:injuries <email> list
Muscles: ${MUSCLES.join(", ")}`;

function checkMuscle(m: string | undefined): string {
  if (!m || !(MUSCLES as readonly string[]).includes(m)) {
    throw new Error(`Unknown muscle: ${m ?? "(none)"}\n${USAGE}`);
  }
  return m;
}

async function main() {
  const [email, action, ...rest] = process.argv.slice(2);
  if (!email || !["add", "resolve", "list"].includes(action)) throw new Error(USAGE);

  // Imported after env is loaded, because the pool reads DATABASE_URL on import.
  const { db, pool } = await import("../src/db");
  const host = new URL(process.env.DATABASE_URL!).host;
  console.log(`Database: ${host} (NEON_BRANCH=${process.env.NEON_BRANCH ?? "unset"})`);

  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (!u) throw new Error(`No user with email ${email}. Sign in once first to create the account.`);

  const active = and(eq(injury.userId, u.id), isNull(injury.resolvedAt));

  if (action === "add") {
    const muscle = checkMuscle(rest[0]);
    const mode = rest[1];
    if (!(INJURY_MODES as readonly string[]).includes(mode)) {
      throw new Error(`Mode must be one of: ${INJURY_MODES.join(", ")}`);
    }
    const hasSeverity = rest[2] !== undefined && /^\d+$/.test(rest[2]);
    const severity = hasSeverity ? Number(rest[2]) : 3;
    if (severity < 1 || severity > 5) throw new Error("Severity must be 1-5");
    const notes = rest.slice(hasSeverity ? 3 : 2).join(" ") || null;

    // One active injury per muscle: replace rather than stack duplicates.
    await db.delete(injury).where(and(active, eq(injury.muscle, muscle)));
    await db.insert(injury).values({ userId: u.id, muscle, mode: mode as InjuryMode, severity, notes });
    console.log(`Added: ${muscle} (${mode}, severity ${severity})`);
  } else if (action === "resolve") {
    const muscle = checkMuscle(rest[0]);
    const res = await db
      .update(injury)
      .set({ resolvedAt: new Date() })
      .where(and(active, eq(injury.muscle, muscle)))
      .returning({ id: injury.id });
    console.log(res.length ? `Resolved: ${muscle}` : `No active injury for ${muscle}`);
  }

  const rows = await db.select().from(injury).where(active);
  console.log(rows.length ? "Active injuries:" : "No active injuries.");
  for (const r of rows) console.log(`  ${r.muscle} — ${r.mode}, severity ${r.severity}${r.notes ? ` (${r.notes})` : ""}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
