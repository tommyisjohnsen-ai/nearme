"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "destructive" | "success";
type Toast = {
  id: number;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastInput = Omit<Toast, "id">;

const ToastContext = React.createContext<{
  push: (t: ToastInput) => void;
}>({ push: () => {} });

let nextId = 1;

export function Toaster() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const push = React.useCallback((t: ToastInput) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  React.useEffect(() => {
    // Hang the push fn on window so non-React code (e.g. push handlers) can call it.
    (window as unknown as { __toast: typeof push }).__toast = push;
  }, [push]);

  return (
    <ToastContext.Provider value={{ push }}>
      <div
        className="fixed inset-x-0 bottom-4 z-[1000] mx-auto flex max-w-sm flex-col gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-md border bg-card px-4 py-3 shadow-lg",
              t.variant === "destructive" && "border-destructive bg-destructive text-destructive-foreground",
              t.variant === "success" && "border-emerald-600 bg-emerald-600 text-white",
            )}
          >
            <div className="font-semibold">{t.title}</div>
            {t.description && (
              <div className="text-sm opacity-90">{t.description}</div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  // Allow calls before the Toaster has mounted (no-op then).
  return React.useCallback((t: ToastInput) => {
    const win = window as unknown as { __toast?: (t: ToastInput) => void };
    win.__toast?.(t);
  }, []);
}
