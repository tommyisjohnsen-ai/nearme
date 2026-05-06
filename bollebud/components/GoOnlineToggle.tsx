"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";

type Props = { vendorId: string };

// Owns the lifecycle of one vendor session: starts on "go online", pushes
// location updates while online, ends on "go offline".
export function GoOnlineToggle({ vendorId }: Props) {
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const online = sessionId !== null;

  const { state, shouldSync } = useGeolocation({
    enabled: online,
    minDistanceMeters: 10,
    minIntervalMs: 15_000,
  });

  // Push location to Supabase whenever the geolocation hook says it's worth it.
  useEffect(() => {
    if (!online || !sessionId) return;
    if (state.status !== "ok") return;
    if (!shouldSync(state.position)) return;

    void supabase.rpc("update_vendor_location", {
      p_session_id: sessionId,
      p_lat: state.position.lat,
      p_lng: state.position.lng,
    });
  }, [online, sessionId, state, shouldSync, supabase]);

  // Best-effort cleanup if the user closes the tab.
  useEffect(() => {
    if (!online) return;
    const handler = () => {
      void supabase.rpc("end_active_session", { p_vendor_id: vendorId });
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [online, vendorId, supabase]);

  async function goOnline() {
    setWorking(true);
    try {
      const pos = await getOnePosition();
      const { data, error } = await supabase.rpc("start_vendor_session", {
        p_vendor_id: vendorId,
        p_lat: pos.lat,
        p_lng: pos.lng,
      });
      if (error) throw error;
      setSessionId(data as unknown as string);
      toast({ title: "Du er online 🟢", variant: "success" });
    } catch (err) {
      toast({
        title: "Kunne ikke gå online",
        description: err instanceof Error ? err.message : "Sjekk lokasjonsrettigheter",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  }

  async function goOffline() {
    setWorking(true);
    try {
      const { error } = await supabase.rpc("end_active_session", {
        p_vendor_id: vendorId,
      });
      if (error) throw error;
      setSessionId(null);
      toast({ title: "Du er offline" });
    } catch (err) {
      toast({
        title: "Kunne ikke gå offline",
        description: err instanceof Error ? err.message : "Prøv igjen",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status</span>
          {online ? (
            <Badge variant="success">Online</Badge>
          ) : (
            <Badge variant="secondary">Offline</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {renderGeoState(state)}
        </div>
      </div>
      <Button
        variant={online ? "outline" : "default"}
        onClick={online ? goOffline : goOnline}
        disabled={working}
      >
        {working ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Power className="h-4 w-4" />
        )}
        {online ? "Gå offline" : "Gå online"}
      </Button>
    </div>
  );
}

function renderGeoState(s: ReturnType<typeof useGeolocation>["state"]): string {
  switch (s.status) {
    case "idle":
      return "Lokasjon ikke aktivert";
    case "requesting":
      return "Henter posisjon …";
    case "ok":
      return `±${Math.round(s.accuracy)} m nøyaktighet`;
    case "denied":
      return "Lokasjon avslått — slå på i nettleseren";
    case "unavailable":
      return s.message;
  }
}

// One-shot promise wrapper around getCurrentPosition — used to start the session.
function getOnePosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolokasjon støttes ikke"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}
