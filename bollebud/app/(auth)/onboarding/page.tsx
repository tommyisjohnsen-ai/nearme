"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";

type Role = "customer" | "vendor";

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorDesc, setVendorDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Ikke innlogget");

      const { error: pErr } = await supabase
        .from("profiles")
        .update({ role, display_name: displayName || null })
        .eq("id", userRes.user.id);
      if (pErr) throw pErr;

      if (role === "vendor") {
        const { error: vErr } = await supabase.from("vendors").insert({
          owner_id: userRes.user.id,
          name: vendorName,
          description: vendorDesc || null,
        });
        if (vErr) throw vErr;
        router.push("/vendor/dashboard");
        return;
      }

      router.push("/");
    } catch (err) {
      toast({
        title: "Kunne ikke fullføre",
        description: err instanceof Error ? err.message : "Ukjent feil",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  }

  if (!role) {
    return (
      <div className="container max-w-sm py-10 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Hva vil du være?</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Du kan endre dette senere.
          </p>
        </div>
        <div className="grid gap-3">
          <Button
            size="lg"
            variant="outline"
            className="h-auto py-6 flex-col items-start text-left"
            onClick={() => setRole("customer")}
          >
            <span className="text-base font-semibold">Jeg vil kjøpe boller 🥐</span>
            <span className="text-sm text-muted-foreground font-normal">
              Finn nærmeste utsalg, bestill og chat.
            </span>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-auto py-6 flex-col items-start text-left"
            onClick={() => setRole("vendor")}
          >
            <span className="text-base font-semibold">Jeg selger boller 🚲</span>
            <span className="text-sm text-muted-foreground font-normal">
              Slå deg online, motta bestillinger.
            </span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="container max-w-sm py-10 space-y-5">
      <div>
        <button
          type="button"
          onClick={() => setRole(null)}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Tilbake
        </button>
      </div>
      <h1 className="text-2xl font-bold">
        {role === "customer" ? "Litt om deg" : "Litt om utsalget"}
      </h1>

      <div className="space-y-2">
        <Label htmlFor="displayName">Ditt navn</Label>
        <Input
          id="displayName"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Kari Nordmann"
        />
      </div>

      {role === "vendor" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="vendorName">Utsalgets navn</Label>
            <Input
              id="vendorName"
              required
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Sykkel-Sara"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendorDesc">Kort beskrivelse</Label>
            <Input
              id="vendorDesc"
              value={vendorDesc}
              onChange={(e) => setVendorDesc(e.target.value)}
              placeholder="Hjemmebakte kanelboller fra sykkelvogna"
            />
          </div>
        </>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Lagrer…" : "Fullfør oppsett"}
      </Button>
    </form>
  );
}
