"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushPermission } from "@/hooks/usePushPermission";
import { useToast } from "@/components/ui/toaster";

// Inline nudge to enable push. Hides itself once subscribed or unsupported.
export function PushPermissionPrompt() {
  const { state, subscribe } = usePushPermission();
  const toast = useToast();

  if (state === "subscribed" || state === "unsupported" || state === "denied") {
    return null;
  }

  return (
    <div className="rounded-lg border bg-amber-50 border-amber-200 p-3 flex items-center justify-between gap-3">
      <div className="flex items-start gap-2">
        <Bell className="h-4 w-4 text-amber-700 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-900">Skru på varsler</p>
          <p className="text-xs text-amber-800">
            Få beskjed når statusen endres eller du får en ny melding.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          const ok = await subscribe();
          if (ok) toast({ title: "Varsler aktivert", variant: "success" });
        }}
      >
        Skru på
      </Button>
    </div>
  );
}
