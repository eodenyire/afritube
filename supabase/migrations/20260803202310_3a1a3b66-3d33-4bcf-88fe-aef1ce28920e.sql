DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('videos','audio','thumbnails','blog-images','avatars')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('videos','audio','thumbnails','blog-images','avatars')
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id IN ('videos','audio','thumbnails','blog-images','avatars')
  AND auth.uid()::text = (storage.foldername(name))[1]
);