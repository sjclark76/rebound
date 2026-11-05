// Replaces a user's owned equipment. Targets the database in .env.local.
// Usage: npm run db:seed:equipment -- <email> <equipment...>
//   e.g. npm run db:seed:equipment -- dev@rebound.local dumbbell "body only" bands
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { EQUIPMENT } from "../src/db/vocab";
import { user, userEquipment } from "../src/db/schema";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const [email, ...items] = process.argv.slice(2);
  if (!email || items.length === 0) {
    throw new Error(`Usage: db:seed:equipment <email> <equipment...>\nValid: ${EQUIPMENT.join(", ")}`);
  }
  const invalid = items.filter((i) => !(EQUIPMENT as readonly string[]).includes(i));
  if (invalid.length) {
    throw new Error(`Unknown equipment: ${invalid.join(", ")}\nValid: ${EQUIPMENT.join(", ")}`);
  }

  // Imported after env is loaded, because the pool reads DATABASE_URL on import.
  const { db, pool } = await import("../src/db");
  const host = new URL(process.env.DATABASE_URL!).host;
  console.log(`Database: ${host} (NEON_BRANCH=${process.env.NEON_BRANCH ?? "unset"})`);

  const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (!u) throw new Error(`No user with email ${email}. Sign in once first to create the account.`);

  const unique = [...new Set(items)];
  await db.transaction(async (tx) => {
    await tx.delete(userEquipment).where(eq(userEquipment.userId, u.id));
    await tx.insert(userEquipment).values(unique.map((equipment) => ({ userId: u.id, equipment })));
  });
  console.log(`Set ${email}'s equipment: ${unique.join(", ")}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
