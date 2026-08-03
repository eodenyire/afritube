// Called by nginx-rtmp `on_publish` (and optionally `on_publish_done`).
// nginx-rtmp POSTs application/x-www-form-urlencoded with fields like
// `name` (stream key), `app`, `addr`, `clientid`, etc.
// Return HTTP 2xx to accept ingest, non-2xx to reject.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Optional: public base URL where the ingest server serves HLS.
// Example: https://ingest.afritube.example
// If set, playback_url auto-populates on first publish as
//   ${HLS_BASE_URL}/hls/<stream_id>/index.m3u8
const HLS_BASE_URL = (Deno.env.get("HLS_BASE_URL") || "").replace(/\/+$/, "");

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

  const { data: cred } = await admin
    .from("live_stream_credentials")
    .select("stream_id")
    .eq("stream_key", streamKey)
    .maybeSingle();

  const { data: stream, error } = cred
    ? await admin
        .from("live_streams")
        .select("id, creator_id, status, playback_url")
        .eq("id", cred.stream_id)
        .maybeSingle()
    : { data: null, error: new Error("unknown stream key") };

  if (error || !stream) {
    console.log("[ingest-auth] reject: unknown key", { error });
    return new Response("invalid stream key", { status: 403, headers: cors });
  }

  const now = new Date().toISOString();

  if (event === "publish_done" || event === "done") {
    await admin
      .from("live_streams")
      .update({
        status: "ended",
        ended_at: now,
        last_publish_done_at: now,
        hls_ready: false,
      })
      .eq("id", stream.id);
    return new Response("ok", { status: 200, headers: cors });
  }

  // publish: flip to live and record ingest health
  const patch: Record<string, unknown> = {
    status: "live",
    started_at: now,
    last_publish_at: now,
    hls_ready: true,
  };
  if (HLS_BASE_URL && !stream.playback_url) {
    patch.playback_url = `${HLS_BASE_URL}/hls/${stream.id}/index.m3u8`;
  }

  await admin.from("live_streams").update(patch).eq("id", stream.id);

  // Return the stream id so nginx can use it as the HLS output folder
  return new Response(stream.id, {
    status: 200,
    headers: { ...cors, "content-type": "text/plain" },
  });
});
