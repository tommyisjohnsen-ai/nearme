"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { env } from "@/lib/env";

export default function LoginPage() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${env.appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast({
        title: "Kunne ikke sende lenke",
        description: err instanceof Error ? err.message : "Ukjent feil",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-sm py-12">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3" aria-hidden>🥐</div>
        <h1 className="text-2xl font-bold">Bollebud</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Boller, hjemkjørt eller hentet — i sanntid.
        </p>
      </div>

      {sent ? (
        <div className="rounded-lg border bg-card p-6 text-center space-y-3">
          <p className="text-lg">Sjekk e-posten din</p>
          <p className="text-sm text-muted-foreground">
            Vi sendte en innloggingslenke til <strong>{email}</strong>.
            Trykk på lenka for å logge inn.
          </p>
          <Button variant="outline" onClick={() => setSent(false)}>
            Bruk en annen e-post
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-postadresse</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@example.no"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sender…" : "Send innloggingslenke"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Vi sender deg en magisk lenke. Ingen passord å huske.
          </p>
        </form>
      )}
    </div>
  );
}
