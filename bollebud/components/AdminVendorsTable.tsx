"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";

type Row = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  owner_id: string;
};

export function AdminVendorsTable() {
  const supabase = getSupabaseBrowserClient();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [working, setWorking] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("vendors")
      .select("id, name, description, is_active, owner_id")
      .order("created_at", { ascending: false });
    if (data) setRows(data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(row: Row) {
    setWorking(row.id);
    const { error } = await supabase
      .from("vendors")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Feilet", description: error.message, variant: "destructive" });
    } else {
      toast({ title: row.is_active ? "Deaktivert" : "Aktivert" });
      await load();
    }
    setWorking(null);
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-md border p-4">
        Ingen utsalg registrert.
      </p>
    );
  }

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="p-3">Navn</th>
            <th className="p-3 hidden sm:table-cell">Beskrivelse</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Handling</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-3 font-medium">{r.name}</td>
              <td className="p-3 hidden sm:table-cell text-muted-foreground">
                {r.description ?? "—"}
              </td>
              <td className="p-3">
                <Badge variant={r.is_active ? "success" : "secondary"}>
                  {r.is_active ? "Aktiv" : "Deaktivert"}
                </Badge>
              </td>
              <td className="p-3 text-right">
                <Button
                  size="sm"
                  variant={r.is_active ? "outline" : "default"}
                  onClick={() => toggle(r)}
                  disabled={working === r.id}
                >
                  {r.is_active ? "Deaktiver" : "Aktiver"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
