import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts a JPEG frame from a video URL using a hidden <video> element + canvas.
 * Returns the captured Blob, or null on failure.
 *
 * Note: requires the video URL to be CORS-accessible (public Supabase storage works).
 */
export const extractVideoFrame = (
  videoUrl: string,
  seekSeconds = 1,
  jpegQuality = 0.85,
  timeoutMs = 8000,
): Promise<Blob | null> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    let settled = false;

    const cleanup = () => {
      video.removeAttribute("src");
      try { video.load(); } catch { /* noop */ }
    };

    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      cleanup();
      resolve(blob);
    };

    const timeoutId = window.setTimeout(() => finish(null), timeoutMs);

    const capture = () => {
      if (!video.videoWidth || !video.videoHeight) return finish(null);
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return finish(null);
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        // Likely a CORS taint
        console.warn("Failed to draw video frame (likely CORS):", err);
        return finish(null);
      }
      canvas.toBlob((blob) => finish(blob), "image/jpeg", jpegQuality);
    };

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = videoUrl;

    video.addEventListener("loadedmetadata", () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const t = Math.min(Math.max(duration / 2, 0), seekSeconds);
      if (t > 0) {
        try {
          video.currentTime = t;
        } catch {
          capture();
        }
      } else {
        capture();
      }
    }, { once: true });

    video.addEventListener("seeked", () => capture(), { once: true });
    video.addEventListener("error", () => finish(null), { once: true });
  });

/**
 * Backfills a missing thumbnail for a video: extracts a frame from the video,
 * uploads it to the thumbnails bucket, and updates the videos row.
 *
 * Requires the caller to be authenticated AND own the video (RLS enforces).
 * Returns the new thumbnail URL or null if it failed.
 */
export const backfillVideoThumbnail = async (
  videoId: string,
  videoUrl: string,
  ownerUserId: string,
): Promise<string | null> => {
  // Only the owner can update the row (RLS); skip early if not signed in as owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== ownerUserId) return null;

  const blob = await extractVideoFrame(videoUrl);
  if (!blob) return null;

  const path = `${ownerUserId}/auto-${videoId}.jpg`;
  const { error: upErr } = await supabase.storage
    .from("thumbnails")
    .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

  if (upErr) {
    console.warn("Thumbnail upload failed:", upErr);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage.from("thumbnails").getPublicUrl(path);

  const { error: updErr } = await supabase
    .from("videos")
    .update({ thumbnail_url: publicUrl })
    .eq("id", videoId);

  if (updErr) {
    console.warn("Failed to update video thumbnail_url:", updErr);
    return null;
  }

  console.log("✓ Auto-thumbnail saved:", publicUrl);
  return publicUrl;
};
