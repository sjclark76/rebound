import { count } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { exercise } from "@/db/schema";

/** Liveness + database check. */
export async function GET() {
  await connection(); // always run at request time
  try {
    const [{ exercises }] = await db.select({ exercises: count() }).from(exercise);
    return Response.json({ ok: true, db: "up", exercises });
  } catch (err) {
    console.error("health check failed", err);
    return Response.json({ ok: false, db: "down" }, { status: 503 });
  }
}
