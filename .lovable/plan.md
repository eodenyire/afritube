# Live streaming end-to-end — proposed plan

## Reality check on "our own streaming service"

Lovable Cloud runs your app on a client-side React bundle + Supabase (Postgres, Storage, Edge Functions). It does **not** provide:

- A persistent, always-on server that can accept **RTMP** ingest on port 1935 (OBS needs this).
- A **SFU / TURN** server for WebRTC fan-out to thousands of viewers.
- Live **transcoding** (ffmpeg → HLS/DASH ladder) or an **HLS origin + CDN**.

Edge Functions are short-lived HTTP handlers — they cannot hold an RTMP socket or transcode a video stream. So "AfriTube runs its own RTMP+HLS media server" is not something we can ship inside this project alone. It would require you (or us) to run a separate always-on server (a VPS / Kubernetes node) with `nginx-rtmp` + `ffmpeg`, and then point AfriTube at it.

**Two honest paths forward — pick one:**

- **Path A — Own media server (VPS you control).** I scaffold everything on the AfriTube side (schema, UI, chat, super chats, presence, replay ingest, discovery). You stand up one small VPS running `nginx-rtmp` + `ffmpeg` + HLS output (I'll give you a ready-to-run Docker Compose file). AfriTube generates a per-stream RTMP key that OBS uses; browser "Go Live" uses WHIP → the same server. Viewers watch the resulting HLS URL via hls.js. This is the closest thing to "our own service" that will actually work.
- **Path B — Managed provider today, own server later.** Same AfriTube-side build, but the ingest/playback URLs come from Cloudflare Stream Live or Mux. Ships in hours, costs pennies per viewer-hour, and the schema I'm building already stores `ingest_url` / `playback_url` / `stream_key` so we can swap in your own server later with zero UI rewrite.

I strongly recommend we build **Path A's AfriTube side now** (it's identical either way) and only decide server-vs-provider at the ingest step. Everything below assumes that.

## Scope (from your answers)

- Ingest: WebRTC (browser Go Live) **and** RTMP (OBS).
- Viewer features: live chat + emoji reactions, super chats, viewer presence, auto replay/VOD.
- Discovery: home-feed "Live now" rail + LIVE badge on creator profiles.

## Phased build

### Phase 1 — Data model & keys (this turn)
Migration adds to `live_streams`: `stream_key` (unique, secret), `ingest_url`, `playback_url`, `latency_mode` (`low`/`normal`), `record_replay` (bool), `peak_viewer_count`, `total_super_chat_cents`. Add `emoji_reactions` table (stream_id, user_id, emoji, created_at) and enable Realtime on `live_chat_messages`, `emoji_reactions`, `live_streams`. RPC `rotate_stream_key(stream_id)` for creators.

### Phase 2 — Creator "Go Live" console (`/live/studio/:id`)
- Shows RTMP URL + stream key (copy buttons, rotate, "reveal" toggle) — for OBS.
- "Start browser broadcast" — captures `getUserMedia` (camera+mic) or `getDisplayMedia` (screen), previews locally. When you click Go Live, we POST to an edge function `stream-start` that flips status to `live`, sets `started_at`, and (Path B) returns a WHIP endpoint / (Path A) the WHIP URL of your server.
- Stream health panel: connected/idle indicator (updated by ingest heartbeat), current viewer count (Realtime presence), chat moderation link.
- "End stream" button → edge function `stream-end` → status=`ended`, `ended_at`, and (if `record_replay`) creates a `videos` row from the recording URL.

### Phase 3 — Viewer player (`/live/:id` rewrite)
- `hls.js` player pointed at `playback_url`; native HLS on Safari/iOS.
- Realtime chat pane (already scaffolded) + floating emoji reactions that animate up over the player (subscribed via Realtime broadcast, not DB-persisted for every tap — DB only stores aggregated counts every N seconds).
- Super Chat composer that opens Stripe checkout (Lovable's built-in Stripe payments); on `payment.succeeded` webhook we insert into `live_super_chats` and it appears pinned in chat, color-coded by amount tier ($2/$5/$10/$50/$100).
- Presence: `channel.track({ user_id })` on join → viewer count updates in real time, `peak_viewer_count` persisted every 30 s.
- Auto-scroll chat, slow-mode toggle for creator, block/report menu.

### Phase 4 — Discovery
- `LiveRail` component on `/` (Index): fetch `live_streams` where `status='live'` ordered by `viewer_count desc`, red "LIVE" badge, viewer count overlay, links to `/live/:id`. Only renders when at least one is live.
- `CreatorProfile.tsx`: query "is this creator live right now?"; when true, show a pulsing LIVE chip that links to the stream and pin the live card above their videos.
- `Navbar` "Live" nav item gets a red dot when any stream is live.

### Phase 5 — Replay / VOD
- On `stream-end`, if `record_replay=true`:
  - **Path B (provider):** provider gives us a recording URL → insert into `videos` with `video_url`, `thumbnail_url` (auto-generated), `title` = stream title, link back via `replay_video_id`.
  - **Path A (own server):** `nginx-rtmp` writes an `.mp4` to disk; a small cron on the VPS uploads it to Supabase Storage `videos` bucket and calls an edge function `stream-replay-uploaded` with the resulting URL.

### Phase 6 — Payments wiring for super chats
Requires enabling Lovable's built-in Stripe payments (Pro plan). I'll walk you through the enable step when we get here; a super-chat send calls edge function `create-super-chat-checkout` which returns a Stripe session URL, and `stripe-webhook` confirms + inserts the row.

## Ingest server (only if you choose Path A)

I'll deliver a `docker-compose.yml` + `nginx.conf` you run on any small Ubuntu box:
- `nginx-rtmp` listens on 1935 (RTMP) and 8080 (WHIP+HLS).
- On `publish`, nginx calls `https://<edge-fn>/stream-ingest-auth?key=<stream_key>` — we verify the key matches an active `live_streams` row, else reject.
- ffmpeg transcodes into a 3-rung HLS ladder (360p/720p/1080p) written to `/hls`.
- Playback URL is `https://<your-host>/hls/<stream_id>/index.m3u8`.
- On `publish_done`, nginx uploads the recording and pings `stream-replay-uploaded`.

That's the entire "own streaming service." Everything else is AfriTube code we control.

## What I'll build first (this turn)

1. Phase 1 migration (schema + Realtime + RPCs).
2. Phase 2 creator studio at `/live/studio/:id` with RTMP key display + browser-preview capture (broadcast wiring stubbed until you pick A vs B).
3. Phase 3 viewer player with `hls.js`, live chat, emoji reactions, presence viewer count. Playback URL comes from `live_streams.playback_url` — empty until ingest is wired.
4. Phase 4 LiveRail on home + LIVE badge on creator profile.

Super chats (needs Stripe enable) and replay upload (needs ingest choice) come in follow-up turns once you decide A vs B.

## Please confirm

- **A** (own VPS running nginx-rtmp — I ship AfriTube side + Docker Compose) or **B** (managed provider — I ship AfriTube side + wire Cloudflare Stream or Mux; you add the API key)?
- OK to proceed with Phases 1–4 immediately, and handle payments (Phase 6) + replay (Phase 5) after you pick A/B?
