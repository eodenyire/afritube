
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'ready';

CREATE INDEX IF NOT EXISTS idx_videos_visibility ON public.videos(visibility);
CREATE INDEX IF NOT EXISTS idx_videos_processing_status ON public.videos(processing_status);
CREATE INDEX IF NOT EXISTS idx_videos_publish_at ON public.videos(publish_at);

UPDATE public.videos SET visibility = 'public' WHERE visibility IS NULL;
UPDATE public.videos SET processing_status = 'ready' WHERE processing_status IS NULL;
