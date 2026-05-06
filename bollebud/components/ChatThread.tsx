"use client";

import { useEffect, useRef, useState } from "react";
import { useOrderChat } from "@/hooks/useOrderChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type Props = { orderId: string; currentUserId: string };

export function ChatThread({ orderId, currentUserId }: Props) {
  const { messages, send } = useOrderChat(orderId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pin to bottom whenever new messages land.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      await send(body);
      setDraft("");
    } catch (err) {
      toast({
        title: "Kunne ikke sende",
        description: err instanceof Error ? err.message : "Prøv igjen",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[60vh] rounded-lg border bg-card">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Ingen meldinger ennå. Si hei!
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                m.sender_id === currentUserId
                  ? "bg-primary text-primary-foreground ml-auto rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm",
              )}
            >
              {m.body}
            </div>
          ))
        )}
      </div>
      <form onSubmit={onSubmit} className="border-t p-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Skriv en melding…"
          maxLength={2000}
          disabled={sending}
        />
        <Button type="submit" disabled={!draft.trim() || sending}>
          Send
        </Button>
      </form>
    </div>
  );
}
