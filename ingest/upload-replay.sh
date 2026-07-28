#!/usr/bin/env bash
# nginx-rtmp exec_record_done handler.
# Args: $1 = full path to .flv recording, $2 = stream key (nginx `name`)
#
# Requires env (set in docker-compose):
#   SUPABASE_URL              e.g. https://<ref>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY service role key (for Storage upload)
#   REPLAY_WEBHOOK_URL        https://<ref>.supabase.co/functions/v1/stream-replay-uploaded
#   REPLAY_BUCKET             storage bucket (default: videos)
#
# Requires binaries: ffmpeg, curl, jq

set -euo pipefail

FLV="$1"
KEY="$2"
BUCKET="${REPLAY_BUCKET:-videos}"

if [[ ! -f "$FLV" ]]; then
  echo "[upload-replay] missing file: $FLV" >&2
  exit 0
fi

TS=$(date +%s)
MP4="/tmp/replay-${KEY}-${TS}.mp4"
OBJECT="live-replays/${KEY}-${TS}.mp4"

echo "[upload-replay] transcoding $FLV -> $MP4"
ffmpeg -y -i "$FLV" -c copy -movflags +faststart "$MP4" >/dev/null 2>&1 || {
  echo "[upload-replay] copy remux failed, re-encoding"
  ffmpeg -y -i "$FLV" -c:v libx264 -preset veryfast -c:a aac -movflags +faststart "$MP4"
}

DURATION=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$MP4" | awk '{printf "%d\n", $1}')

echo "[upload-replay] uploading to ${BUCKET}/${OBJECT}"
curl -sS -X POST \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: video/mp4" \
  -H "x-upsert: true" \
  --data-binary "@${MP4}" \
  "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${OBJECT}" >/dev/null

PUBLIC_URL="${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${OBJECT}"

echo "[upload-replay] notifying ${REPLAY_WEBHOOK_URL}"
curl -sS -X POST \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg k "$KEY" --arg u "$PUBLIC_URL" --argjson d "${DURATION:-0}" \
        '{stream_key:$k, video_url:$u, duration:$d}')" \
  "${REPLAY_WEBHOOK_URL}" || echo "[upload-replay] webhook failed (non-fatal)"

rm -f "$MP4"
echo "[upload-replay] done"
