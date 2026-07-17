# AfriTube self-hosted ingest (Path A)

Runs an `nginx-rtmp` server that accepts RTMP from OBS, validates each
stream key against AfriTube via the `stream-ingest-auth` edge function,
and serves HLS to viewers.

## 1. Provision a VPS

Any Ubuntu 22.04+ box with Docker installed. Open ports:

| Port | Protocol | Purpose |
|------|----------|---------|
| 1935 | TCP | RTMP ingest (OBS -> server) |
| 8080 | TCP | HLS playback + stat page |

## 2. Deploy

```bash
git clone <this repo>
cd ingest
cp .env.example .env
# edit .env and set INGEST_AUTH_URL to your deployed edge function URL
docker compose up -d
docker compose logs -f
```

Health check: `curl http://<your-host>:8080/health`

## 3. Wire AfriTube

In the AfriTube Live Studio the creator sees:

- **RTMP URL:** `rtmp://<your-host>:1935/live`
- **Stream key:** the value from `live_streams.stream_key`

Set each stream's `playback_url` to:

```
http://<your-host>:8080/hls/<stream_key>/index.m3u8
```

(You can also serve behind Cloudflare / a reverse proxy for TLS.)

## 4. How auth works

On every RTMP publish, nginx-rtmp POSTs to
`stream-ingest-auth?event=publish` with the stream key in the `name`
field. The edge function looks it up in `live_streams`, flips status to
`live`, and returns 200 to accept (any other response rejects the
connection). On disconnect it fires `event=publish_done` and flips
status to `ended`.

## 5. Replays

Source recordings are written to `/var/rec` inside the container
(`recordings` volume). Upload them to Supabase Storage and call
`stream-replay-uploaded` to attach them as a `videos` row. A simple
uploader cron is left as an operator task (varies by hosting choice).

## 6. TLS (recommended)

Front the container with Caddy or nginx-proxy + Let's Encrypt for
HTTPS on the HLS port so browsers can play it from an HTTPS site
without mixed-content warnings.
