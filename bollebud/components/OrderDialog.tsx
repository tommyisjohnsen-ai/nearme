"use client";

import { useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LatLng } from "@/lib/geo";
import type { NearbyVendor } from "@/types/domain";

type Props = {
  vendor: NearbyVendor;
  customerLocation: LatLng | null;
  onClose: () => void;
  onCreated: (orderId: string) => void;
};

const schema = z.object({
  bunCount: z.number().int().min(1).max(20),
  fulfillment: z.enum(["pickup", "delivery"]),
  customerNote: z.string().max(500).optional(),
});

export function OrderDialog({ vendor, customerLocation, onClose, onCreated }: Props) {
  const toast = useToast();
  const [bunCount, setBunCount] = useState(2);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ bunCount, fulfillment, customerNote: note });
    if (!parsed.success) {
      toast({ title: "Sjekk feltene", variant: "destructive" });
      return;
    }
    if (fulfillment === "delivery" && !customerLocation) {
      toast({
        title: "Trenger lokasjonen din for levering",
        description: "Slå på lokasjonstjenester eller velg 'Henter selv'.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Ikke innlogget");

      // PostGIS geography accepts WKT strings. Pass null for pickup orders.
      const locationWkt =
        fulfillment === "delivery" && customerLocation
          ? `SRID=4326;POINT(${customerLocation.lng} ${customerLocation.lat})`
          : null;

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_id: userRes.user.id,
          vendor_id: vendor.id,
          bun_count: bunCount,
          fulfillment,
          customer_note: note || null,
          customer_location: locationWkt,
        })
        .select("id")
        .single();
      if (error) throw error;

      onCreated(order.id);
    } catch (err) {
      toast({
        title: "Bestillingen feilet",
        description: err instanceof Error ? err.message : "Ukjent feil",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bestill fra {vendor.name}</DialogTitle>
          <DialogDescription>
            Send forespørselen, så får du svar her og varsel når status endres.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bunCount">Antall boller</Label>
            <Input
              id="bunCount"
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={bunCount}
              onChange={(e) => setBunCount(Number(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label>Henting</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={fulfillment === "pickup" ? "default" : "outline"}
                onClick={() => setFulfillment("pickup")}
              >
                Henter selv
              </Button>
              <Button
                type="button"
                variant={fulfillment === "delivery" ? "default" : "outline"}
                onClick={() => setFulfillment("delivery")}
              >
                Levering
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Melding til utsalget (valgfritt)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="F.eks. 'Vi står utenfor Bla bla bar'"
              maxLength={500}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Avbryt
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Sender …" : "Send bestilling"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
