# Phase 6: Today (daily question + photo of the day) and our playlist

## 1. Run the migration FIRST
Supabase > SQL Editor > New query > paste `supabase/migrations/0006_daily.sql` > Run.
It creates the tables, the private `daily` photo bucket, and the playlist columns. Expect "Success".
(If you push to Vercel, run this before the new code goes live.)

## 2. Restart
Ctrl+C, then `npm run dev`. No new packages.

## 3. Try it (use two browsers/accounts to see the reveal)
1. Bottom bar > **Today**. You'll see a question and the photo card.
2. Account A answers. Account B's Today page says "A has already answered". A's answer is NOT visible to B.
3. Account B answers: both answers appear, hearts float, and A gets a notification (if turned on).
4. Same for the photo: each person shares one; they appear side by side only when both have.
5. Paste a Spotify/YouTube link in **Our playlist**. It shows on Home as a 🎧 chip.
6. Add a date with the floating **+** button on Home, Calendar or Memories (it replaced the Add tab).
7. Settings has a new switch for the daily nudge.

## Done when
- [ ] B cannot see A's answer or photo until B has shared their own
- [ ] Both are revealed side by side once both have shared
- [ ] You can change your answer/photo until the other person shares
- [ ] The 🎧 playlist chip opens your music app
