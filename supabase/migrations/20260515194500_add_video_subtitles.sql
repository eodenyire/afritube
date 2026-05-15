-- Subtitle storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('subtitles', 'subtitles', true)
ON CONFLICT (id) DO NOTHING;

-- Subtitle storage policies
CREATE POLICY "Anyone can view subtitle files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'subtitles');

CREATE POLICY "Authenticated users can upload subtitle files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'subtitles');

-- Video subtitle URL
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS subtitle_url TEXT;
