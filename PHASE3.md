# Phase 3: Photos & Videos

## 1. Run the migration
Supabase > SQL Editor > New query > paste `supabase/migrations/0003_media.sql` > Run.
Expect "Success". It also limits the `media` bucket to 50 MB per file and photo/video types only.

## 2. Check the global limit
Supabase > Storage > Settings (or "Storage Settings"): make sure **Global file size limit** is **50 MB**.
If it is lower, uploads of larger videos will be refused.

## 3. Restart
Ctrl+C, then `npm run dev`. No new packages.

## 4. Try it
1. Open any date > **Add photos & videos** > pick a few photos and one short video.
2. Photos shrink automatically (max 2000 px). Each row shows Preparing, Uploading, then Added.
3. Tap a thumbnail to open the full-screen viewer. Swipe or use the arrows. Play the video.
4. Sign in as your person (other device/window): they see the same files.
5. Delete one file, then delete a whole date. Check Storage > media: the files are gone too.
6. Home screen now shows how much of your 1 GB you've used.

## Known limits (free plan)
- 1 GB total storage, 50 MB per file: roughly 30 to 40 seconds of phone video.
- iPhone videos are HEVC by default and may not play on some Android phones.
  Fix on the iPhone: Settings > Camera > Formats > **Most Compatible**.
- Photo links expire after 2 hours; refresh the page if an old tab stops loading images.
