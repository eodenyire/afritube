// Called by the ingest VPS after nginx-rtmp finishes recording and the
// resulting mp4 has been uploaded (e.g. to Supabase Storage `videos` bucket).
//
// POST body (JSON or form):
//   stream_key: string   (required; matches live_streams.stream_key)
//   video_url:  string   (required; final mp4 URL)
//   thumbnail_url?: string
//   duration?: number    (seconds)
//
// On success: creates/updates a `videos` row and sets live_streams.replay_video_id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function parseBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { return await req.json(); } catch { return {}; }
  }
  if (ct.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(await req.text()));
  }
  return Object.fromEntries(new URL(req.url).searchParams);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  const body = await parseBody(req);
  const streamKey = String(body.stream_key || body.name || "");
  const videoUrl = String(body.video_url || "");
  const thumbnailUrl = body.thumbnail_url ? String(body.thumbnail_url) : null;
  const duration = body.duration ? Number(body.duration) : 0;

  if (!streamKey || !videoUrl) {
    return new Response(JSON.stringify({ error: "stream_key and video_url are required" }), {
      status: 400,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const logEvent = async (row: Record<string, unknown>) => {
    try {
      await admin.from("stream_events").insert(row);
    } catch (e) {
      console.log("[replay] failed to log event", e);
    }
  };

  const { data: cred } = await admin
    .from("live_stream_credentials")
    .select("stream_id")
    .eq("stream_key", streamKey)
    .maybeSingle();

  const { data: stream, error } = cred
    ? await admin
        .from("live_streams")
        .select("id, creator_id, title, description, visibility, thumbnail_url, replay_video_id, record_replay")
        .eq("id", cred.stream_id)
        .maybeSingle()
    : { data: null, error: new Error("unknown stream key") };

  if (error || !stream) {
    await logEvent({
      stream_id: null,
      stream_key_hint: streamKey.slice(0, 6) + "…",
      event_type: "replay_upload_failed",
      status: "error",
      error_message: "unknown stream key",
      metadata: { video_url: videoUrl },
    });
    return new Response(JSON.stringify({ error: "unknown stream key" }), {
      status: 403,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  if (!stream.record_replay) {
    return new Response(JSON.stringify({ ok: true, skipped: "record_replay=false" }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  let videoId = stream.replay_video_id as string | null;
  let opError: string | null = null;

  if (videoId) {
    const { error: uErr } = await admin.from("videos").update({
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl ?? stream.thumbnail_url,
      duration: duration || undefined,
      processing_status: "ready",
    }).eq("id", videoId);
    opError = uErr?.message ?? null;
  } else {
    const { data: inserted, error: iErr } = await admin.from("videos").insert({
      user_id: stream.creator_id,
      title: `${stream.title} — replay`,
      description: stream.description ?? null,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl ?? stream.thumbnail_url,
      duration: duration || 0,
      category: "Live",
      visibility: stream.visibility === "public" ? "public" : "unlisted",
      processing_status: "ready",
    }).select("id").maybeSingle();
    opError = iErr?.message ?? null;
    videoId = (inserted as any)?.id ?? null;
    if (videoId) {
      await admin.from("live_streams").update({ replay_video_id: videoId }).eq("id", stream.id);
    }
  }

  await logEvent({
    stream_id: stream.id,
    event_type: opError ? "replay_upload_failed" : "replay_uploaded",
    status: opError ? "error" : "success",
    error_message: opError,
    metadata: { video_url: videoUrl, video_id: videoId, duration },
  });

  if (opError) {
    return new Response(JSON.stringify({ error: opError }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, video_id: videoId }), {
    headers: { ...cors, "content-type": "application/json" },
  });
});
