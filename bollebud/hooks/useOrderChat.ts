"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { subscribeToOrderMessages } from "@/lib/realtime";

type Row = Database["public"]["Tables"]["order_messages"]["Row"];

// Fetches the message history for one order and keeps it live.
export function useOrderChat(orderId: string) {
  const [messages, setMessages] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("order_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (!cancelled && !error && data) {
        setMessages(data);
        setLoading(false);
      }
    }
    void load();

    const channel = subscribeToOrderMessages(supabase, orderId, (row) => {
      // Skip if we already have it (e.g. from optimistic insert).
      setMessages((prev) =>
        prev.some((m) => m.id === row.id) ? prev : [...prev, row],
      );
    });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  async function send(body: string) {
    const supabase = getSupabaseBrowserClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw new Error("Ikke innlogget");

    const { error } = await supabase.from("order_messages").insert({
      order_id: orderId,
      sender_id: userRes.user.id,
      body,
    });
    if (error) throw error;

    // Fire-and-forget push to the other participant. Do not block the UI on it.
    fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, kind: "message", bodyOverride: body }),
    }).catch(() => {});
  }

  return { messages, loading, send };
}
