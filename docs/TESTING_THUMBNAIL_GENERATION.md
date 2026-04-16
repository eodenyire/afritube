# Testing Thumbnail & Cover Art Generation

## Quick Start

### Prerequisites
- Application running locally or deployed
- Logged in as a user
- Test files ready (video, audio, blog content)

## Test Cases

### Test 1: Video Upload with Auto-Generated Thumbnail

**Steps**:
1. Navigate to `/upload` page
2. Click "Video" tab
3. Select a video file (MP4, WebM, or MOV)
4. **Do NOT upload a thumbnail** (leave it empty)
5. Fill in:
   - Title: "Test Video"
   - Description: "Testing auto-generated thumbnail"
   - Category: "General"
6. Click "Publish Video"

**Expected Results**:
- ✅ Video uploads successfully
- ✅ Thumbnail is auto-generated from video frame
- ✅ Toast shows "Video uploaded! 🎬"
- ✅ Redirects to home page
- ✅ Video appears with thumbnail on home page

**Debug**:
- Open browser DevTools (F12)
- Go to Console tab
- Look for logs starting with "Starting video upload:"
- Should see: "Thumbnail generated successfully"

---

### Test 2: Video Upload with Manual Thumbnail

**Steps**:
1. Navigate to `/upload` page
2. Click "Video" tab
3. Select a video file
4. **Upload a thumbnail image** (JPG or PNG)
5. Fill in title, description, category
6. Click "Publish Video"

**Expected Results**:
- ✅ Video uploads successfully
- ✅ Manual thumbnail is used (not auto-generated)
- ✅ Video appears with your custom thumbnail

**Debug**:
- Console should show: "Uploading thumbnail: {name: ..., size: ...}"

---

### Test 3: Audio Upload with Auto-Generated Cover Art

**Steps**:
1. Navigate to `/upload` page
2. Click "Audio" tab
3. Select an audio file (MP3, WAV, or M4A)
4. **Do NOT upload cover art** (leave it empty)
5. Fill in:
   - Title: "Test Track"
   - Artist Name: "Test Artist"
   - Genre: "Afrobeats"
6. Click "Publish Track"

**Expected Results**:
- ✅ Audio uploads successfully
- ✅ Cover art is auto-generated with gradient background
- ✅ Toast shows "Track uploaded! 🎵"
- ✅ Redirects to home page
- ✅ Audio appears with generated cover on music page

**Debug**:
- Console should show: "Audio cover art generated: {name: ..., size: ...}"
- Cover should have orange-to-blue gradient with music note

---

### Test 4: Audio Upload with Manual Cover Art

**Steps**:
1. Navigate to `/upload` page
2. Click "Audio" tab
3. Select an audio file
4. **Upload a cover image** (JPG or PNG)
5. Fill in title, artist name, genre
6. Click "Publish Track"

**Expected Results**:
- ✅ Audio uploads successfully
- ✅ Manual cover art is used
- ✅ Audio appears with your custom cover

---

### Test 5: Blog Upload with Auto-Generated Cover Image

**Steps**:
1. Navigate to `/upload` page
2. Click "Blog" tab
3. **Do NOT upload a cover image** (leave it empty)
4. Fill in:
   - Title: "My Amazing Blog Post"
   - Excerpt: "This is a test blog post"
   - Content: "Lorem ipsum dolor sit amet..."
   - Category: "Technology"
5. Click "Publish Blog Post"

**Expected Results**:
- ✅ Blog publishes successfully
- ✅ Cover image is auto-generated with category-specific colors
- ✅ Toast shows "Blog published! ✍️"
- ✅ Redirects to home page
- ✅ Blog appears with generated cover on blogs page

**Debug**:
- Console should show: "Blog cover image generated: {name: ..., size: ...}"
- Cover should have blue gradient (Technology category)
- Title should be visible on cover
- Category badge should appear in top-left

---

### Test 6: Blog Upload with Different Categories

**Steps**:
Repeat Test 5 with different categories and verify colors:

| Category | Expected Colors |
|----------|-----------------|
| Fashion | Hot pink to light pink |
| Art & Culture | Brown to tan |
| Technology | Blue to sky blue |
| Food | Orange to gold |
| Travel | Green to light green |
| Music | Purple to plum |
| Sports | Crimson to tomato |
| Opinion | Royal blue to cornflower |
| Lifestyle | Hot pink to light pink |
| General | Gray to dark gray |

---

### Test 7: Blog Upload with Manual Cover Image

**Steps**:
1. Navigate to `/upload` page
2. Click "Blog" tab
3. **Upload a cover image** (JPG or PNG)
4. Fill in title, excerpt, content, category
5. Click "Publish Blog Post"

**Expected Results**:
- ✅ Blog publishes successfully
- ✅ Manual cover image is used
- ✅ Blog appears with your custom cover

---

## Troubleshooting

### Issue: Thumbnail not appearing on video

**Possible causes**:
1. Storage bucket "thumbnails" doesn't exist
2. RLS policies prevent upload
3. Browser console shows errors

**Solution**:
- Check Supabase dashboard → Storage → Buckets
- Verify "thumbnails" bucket exists
- Check RLS policies allow authenticated uploads
- Look at console errors (F12 → Console)

### Issue: Audio cover art not generating

**Possible causes**:
1. Canvas API not supported (unlikely)
2. Storage bucket issue
3. Database field not accepting NULL

**Solution**:
- Try uploading a manual cover to test storage
- Check database schema: `audio_tracks.cover_url` should allow NULL
- Check console for specific error messages

### Issue: Blog cover image has wrong colors

**Possible causes**:
1. Category name doesn't match exactly
2. Browser cache issue

**Solution**:
- Verify category spelling matches exactly
- Clear browser cache (Ctrl+Shift+Delete)
- Try with "General" category first

### Issue: Upload fails with storage error

**Possible causes**:
1. Not authenticated
2. Storage bucket doesn't exist
3. RLS policies too restrictive
4. File too large

**Solution**:
- Verify you're logged in
- Check Supabase Storage buckets exist
- Check RLS policies in Supabase dashboard
- Try with smaller file (< 100MB)

---

## Console Debug Output Examples

### Successful Video Upload
```
Starting video upload: {fileName: "video.mp4", size: 5242880}
Video duration: 120
Uploading video to: 12345/1713312000000-video.mp4
Video uploaded successfully: https://...
Generating thumbnail...
Video metadata loaded: {duration: 120, targetTime: 1}
Video seeked to: 1
Thumbnail generated successfully: {name: "video-thumbnail.jpg", size: 45678}
Uploading thumbnail: {name: "video-thumbnail.jpg", size: 45678}
Thumbnail uploaded successfully: https://...
Saving video to database: {title: "Test Video", thumbnailUrl: "https://..."}
Video saved to database successfully
```

### Successful Audio Upload
```
Starting audio upload: {fileName: "track.mp3", size: 3145728}
Audio duration: 180
Uploading audio to: 12345/1713312000000-track.mp3
Audio uploaded successfully: https://...
Audio cover art generated: {name: "audio-cover.jpg", size: 12345}
Uploading cover art: {name: "audio-cover.jpg", size: 12345}
Cover art uploaded successfully: https://...
Saving audio to database: {title: "Test Track", coverUrl: "https://..."}
Audio saved to database successfully
```

### Successful Blog Upload
```
Starting blog upload: {title: "My Blog", category: "Technology"}
Blog cover image generated: {name: "blog-cover.jpg", size: 67890}
Uploading cover image: {name: "blog-cover.jpg", size: 67890}
Cover image uploaded successfully: https://...
Saving blog to database: {title: "My Blog", coverUrl: "https://..."}
Blog saved to database successfully
```

---

## Performance Notes

- Video thumbnail generation: ~500ms - 2s (depends on video size)
- Audio cover art generation: ~100ms
- Blog cover image generation: ~200ms
- Storage upload: ~1-5s (depends on file size and connection)
- Database insert: ~100-500ms

Total upload time: 2-10 seconds (mostly storage upload)

---

## Next Steps

After testing:
1. Verify thumbnails/covers appear correctly on home, music, and blogs pages
2. Test on mobile app (if applicable)
3. Test with different file formats
4. Test with large files (> 100MB)
5. Test with slow internet connection
