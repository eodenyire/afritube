// Fan-out alerting for streaming failures.
//
// POST body:
//   event_type: string   (e.g. "ingest_publish", "replay_upload")
//   status: string       ("error")
//   stream_id?: string
//   stream_key_hint?: string
//   error_message?: string
//   occurred_at?: string (ISO; defaults to now)
//
// Sends to Slack (SLACK_WEBHOOK_URL) and to every admin by email
// (via the send-transactional-email function, once an email domain is set up).
// Both channels are best-effort — a failing channel never blocks the other.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL") ?? "";
const APP_URL = (Deno.env.get("APP_URL") || "https://afritube.lovable.app").replace(/\/+$/, "");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LABELS: Record<string, string> = {
  ingest_publish: "Ingest publish",
  ingest_publish_done: "Ingest stopped",
  ingest_auth_failed: "Ingest rejected",
  replay_upload: "Replay upload",
  replay_failed: "Replay upload",
};

interface AlertPayload {
  event_type: string;
  status?: string;
  stream_id?: string | null;
  stream_key_hint?: string | null;
  error_message?: string | null;
  occurred_at?: string;
}

async function notifySlack(p: AlertPayload, label: string, when: string) {
  if (!SLACK_WEBHOOK_URL) return { channel: "slack", skipped: "no SLACK_WEBHOOK_URL" };
  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: `:rotating_light: AfriTube — ${label} failed`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `🚨 ${label} failed` },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Stream ID*\n\`${p.stream_id ?? p.stream_key_hint ?? "unknown"}\`` },
            { type: "mrkdwn", text: `*Last attempt*\n${when}` },
            { type: "mrkdwn", text: `*Event*\n${p.event_type}` },
            { type: "mrkdwn", text: `*Status*\n${p.status ?? "error"}` },
          ],
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Last error*\n\`\`\`${p.error_message ?? "Unknown error"}\`\`\`` },
        },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: `<${APP_URL}/admin/monitoring|Open monitoring dashboard>` }],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`slack ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { channel: "slack", ok: true };
}

async function notifyEmail(
  admin: ReturnType<typeof createClient>,
  p: AlertPayload,
  label: string,
  when: string,
) {
  const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  const ids = (roles ?? []).map((r: { user_id: string }) => r.user_id);
  if (ids.length === 0) return { channel: "email", skipped: "no admins" };

  const results: string[] = [];
  for (const id of ids) {
    const { data: u } = await admin.auth.admin.getUserById(id);
    const email = u?.user?.email;
    if (!email) continue;
    const { error } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "stream-failure-alert",
        recipientEmail: email,
        idempotencyKey: `stream-alert-${p.event_type}-${p.stream_id ?? p.stream_key_hint ?? "unknown"}-${when}`,
        templateData: {
          label,
          streamId: p.stream_id ?? p.stream_key_hint ?? "unknown",
          lastError: p.error_message ?? "Unknown error",
          lastAttempt: when,
          dashboardUrl: `${APP_URL}/admin/monitoring`,
        },
      },
    });
    results.push(error ? `${email}: ${error.message}` : `${email}: queued`);
  }
  return { channel: "email", results };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  let payload: AlertPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  if (!payload?.event_type) {
    return new Response(JSON.stringify({ error: "event_type is required" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const label = LABELS[payload.event_type] ?? payload.event_type;
  const when = payload.occurred_at ?? new Date().toISOString();

  const outcomes = await Promise.allSettled([
    notifySlack(payload, label, when),
    notifyEmail(admin, payload, label, when),
  ]);

  const summary = outcomes.map((o) =>
    o.status === "fulfilled" ? o.value : { error: String((o as PromiseRejectedResult).reason) },
  );
  console.log("[stream-alert]", JSON.stringify({ event: payload.event_type, summary }));

  return new Response(JSON.stringify({ delivered: summary }), {
    status: 200,
    headers: { ...cors, "content-type": "application/json" },
  });
});
