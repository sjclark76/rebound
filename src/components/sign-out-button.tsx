"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      className="h-12 rounded-xl px-3 text-[15px] font-bold"
      onClick={() => authClient.signOut().then(() => router.push("/login"))}
    >
      Sign out
    </Button>
  );
}
