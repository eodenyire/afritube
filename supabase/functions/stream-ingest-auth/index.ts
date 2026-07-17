// Called by nginx-rtmp `on_publish` (and optionally `on_publish_done`).
// nginx-rtmp POSTs application/x-www-form-urlencoded with fields like
// `name` (stream key), `app`, `addr`, `clientid`, etc.
// Return HTTP 2xx to accept ingest, non-2xx to reject.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

async function parseBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return Object.fromEntries(new URLSearchParams(text));
  }
  if (ct.includes("application/json")) {
    try { return await req.json(); } catch { return {}; }
  }
  // Fall back to query string if nginx passes it that way
  const url = new URL(req.url);
  return Object.fromEntries(url.searchParams);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const body = await parseBody(req);
  const url = new URL(req.url);
  const streamKey =
    body.name || body.key || body.stream_key ||
    url.searchParams.get("name") || url.searchParams.get("key") || "";
  const event = (url.searchParams.get("event") || "publish").toLowerCase();

  if (!streamKey) {
    return new Response("missing stream key", { status: 400, headers: cors });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: stream, error } = await admin
    .from("live_streams")
    .select("id, user_id, status, scheduled_at")
    .eq("stream_key", streamKey)
    .maybeSingle();

  if (error || !stream) {
    console.log("[ingest-auth] reject: unknown key", { error });
    return new Response("invalid stream key", { status: 403, headers: cors });
  }

  if (event === "publish_done" || event === "done") {
    await admin
      .from("live_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", stream.id);
    return new Response("ok", { status: 200, headers: cors });
  }

  // publish: flip to live
  await admin
    .from("live_streams")
    .update({
      status: "live",
      started_at: new Date().toISOString(),
    })
    .eq("id", stream.id);

  // Return the stream id so nginx can use it as the HLS output folder
  return new Response(stream.id, {
    status: 200,
    headers: { ...cors, "content-type": "text/plain" },
  });
});
