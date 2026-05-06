// Used by deployment platforms / playwright preflight to check the app is up.
export function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
