"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { btnGhost } from "@/lib/ui";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={signOut} disabled={loading} className={btnGhost} title="Sign out">
      <LogOut className="size-4" />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
