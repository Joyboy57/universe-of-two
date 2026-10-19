# Phase 5: Zoomable calendar, countdown, memories, stats

## 1. Run the migration
Supabase > SQL Editor > New query > paste `supabase/migrations/0005_zoom.sql` > Run.
(Adds "in person" and an optional end date to every date.)

## 2. Restart
Ctrl+C, then `npm run dev`. No new packages.

## 3. Try it
1. **Add > new date.** Tick "We'll be together in person". Pick a start date in the future and an
   "Ends on" date a few days later. Save.
2. **Home:** a countdown card shows the days until you're together, with a progress bar once you have
   a past visit. On the visit days it switches to "Together now, day 2 of 5".
3. **Calendar:** use the **Month | Year | All time** tabs. Tap a month in Year view, or a year/month in
   All time, to zoom in. On a phone, pinch in/out on the calendar; on a computer hold Ctrl and scroll.
   Multi-day visits show a bar across their days.
4. **Memories tab:** a timeline by year with your first photo as each cover, and a Stats page.

## Done when
- [ ] Countdown on Home matches your next in-person date
- [ ] All three calendar zoom levels work and tapping zooms in
- [ ] A 5-day visit shows a bar across 5 days and counts as 5 days together in Stats
- [ ] Timeline shows covers from your photos
