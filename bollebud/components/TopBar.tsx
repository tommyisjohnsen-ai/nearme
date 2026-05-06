"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/types/domain";

type Props = { role: UserRole | null; signedIn: boolean };

export function TopBar({ role, signedIn }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
      <Link href="/" className="flex items-center gap-2 text-lg font-bold">
        <span aria-hidden>🥐</span>
        <span>Bollebud</span>
      </Link>
      <nav className="flex items-center gap-2">
        {role === "vendor" && (
          <Link href="/vendor/dashboard" className="text-sm hover:underline">
            Mitt utsalg
          </Link>
        )}
        {role === "admin" && (
          <Link href="/admin" className="text-sm hover:underline">
            Admin
          </Link>
        )}
        {signedIn ? (
          <Button variant="ghost" size="sm" onClick={signOut} disabled={pending}>
            Logg ut
          </Button>
        ) : (
          <Link href="/login">
            <Button size="sm">Logg inn</Button>
          </Link>
        )}
      </nav>
    </header>
  );
}
