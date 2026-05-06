import webpush from "web-push";
import { getServerEnv, env } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const { vapidPrivateKey, vapidContactEmail } = getServerEnv();
  webpush.setVapidDetails(
    vapidContactEmail,
    env.vapidPublicKey,
    vapidPrivateKey,
  );
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string; // deep link opened when notification is clicked
  tag?: string; // collapses duplicate notifs
};

// Sends a notification to every subscription a user has. Removes dead ones.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureConfigured();
  const supabase = getSupabaseAdminClient();

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) throw error;
  if (!subs || subs.length === 0) return { sent: 0 };

  const body = JSON.stringify(payload);
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err: unknown) {
        // 404/410 means the subscription is permanently gone — clean it up.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          dead.push(sub.id);
        } else {
          console.error("[push] send failed", err);
        }
      }
    }),
  );

  if (dead.length) {
    await supabase.from("push_subscriptions").delete().in("id", dead);
  }

  return { sent: subs.length - dead.length, removed: dead.length };
}
