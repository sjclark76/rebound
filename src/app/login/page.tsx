"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

const isDev = process.env.NODE_ENV !== "production";

/** Dev-only: signs in, creating the account on first use. */
function DevLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const signIn = await authClient.signIn.email({ email, password });
    if (!signIn.error) {
      window.location.href = "/";
      return;
    }
    const signUp = await authClient.signUp.email({ email, password, name: email.split("@")[0] });
    if (signUp.error) setError(signUp.error.message ?? "Sign-in failed");
    else window.location.href = "/";
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2 border-t pt-4">
      <p className="text-xs text-muted-foreground">Dev login (not available in production)</p>
      <input
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        type="password"
        placeholder="Password (min 8 chars)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" variant="secondary" type="submit">
        Dev sign in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Rebound</CardTitle>
          <CardDescription>Sign in to get your next workout.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            size="lg"
            onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
          >
            Continue with Google
          </Button>
          {isDev && <DevLogin />}
        </CardContent>
      </Card>
    </main>
  );
}
