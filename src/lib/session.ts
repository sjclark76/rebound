import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Returns the signed-in session or redirects to /login. Use in server components/actions. */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}
