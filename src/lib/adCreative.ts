import { supabase } from "@/integrations/supabase/client";

export const AD_BUCKET = "ad-creatives";

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 60;
const MIN_VIDEO_SECONDS = 3;

export interface CreativeCheck {
  ok: boolean;
  reason?: string;
  durationSeconds?: number;
}

const probeDuration = (file: File) =>
  new Promise<number | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const d = el.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? d : null);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    el.src = url;
  });

/** Format / size / duration checks run before anything is uploaded. */
export const checkCreative = async (file: File): Promise<CreativeCheck> => {
  const isVideo = VIDEO_TYPES.includes(file.type);
  const isImage = IMAGE_TYPES.includes(file.type);
  if (!isVideo && !isImage) {
    return { ok: false, reason: "Use an MP4, WebM or MOV video, or a JPG, PNG or WebP image." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: `File is ${(file.size / 1048576).toFixed(1)} MB — the limit is 50 MB.` };
  }
  if (!isVideo) return { ok: true };

  const duration = await probeDuration(file);
  if (duration == null) return { ok: false, reason: "That video file could not be read." };
  if (duration < MIN_VIDEO_SECONDS) {
    return { ok: false, reason: `Video is ${duration.toFixed(1)}s — ads must be at least ${MIN_VIDEO_SECONDS}s.` };
  }
  if (duration > MAX_VIDEO_SECONDS) {
    return { ok: false, reason: `Video is ${Math.round(duration)}s — ads must be ${MAX_VIDEO_SECONDS}s or shorter.` };
  }
  return { ok: true, durationSeconds: duration };
};

/** Uploads into the advertiser's own folder and returns the stored object path. */
export const uploadCreative = async (advertiserId: string, file: File) => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${advertiserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(AD_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
};

/**
 * Creatives live in a private bucket, so stored values are object paths.
 * Full http(s) URLs are passed through unchanged.
 */
export const resolveCreativeUrl = async (value: string): Promise<string | null> => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data } = await supabase.storage.from(AD_BUCKET).createSignedUrl(value, 60 * 60);
  return data?.signedUrl ?? null;
};
