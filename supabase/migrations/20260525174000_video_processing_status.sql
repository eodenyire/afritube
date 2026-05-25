DO $$
BEGIN
  CREATE TYPE public.video_processing_status AS ENUM ('processing', 'ready', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS processing_status public.video_processing_status NOT NULL DEFAULT 'ready';

UPDATE public.videos
SET processing_status = 'ready'
WHERE processing_status IS NULL;
