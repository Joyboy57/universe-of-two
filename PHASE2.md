# Phase 2: Calendar + Dates

## 1. Run the migration
Supabase > SQL Editor > New query > paste `supabase/migrations/0002_dates.sql` > Run.
Expect "Success. No rows returned".

## 2. Restart
Stop the server (Ctrl+C), then `npm run dev`. (No new packages to install.)

## 3. Try it
1. Sign in > bottom bar > **Add** (or Calendar > pick a day > "Add a date on this day").
2. Fill in a title, category, icon and notes > **Save to our universe**. Hearts float up from that day.
3. Tap the day: your date card appears. Tap it to open, edit or delete.
4. Add one for a future day: it gets a dashed outline (a plan).
5. Sign in as your person (private window): they see the same dates, marked "added by".

## Done when
- [ ] Dates you add show their icon on the right calendar day
- [ ] Hearts burst when you tap a day with dates (not if your device has "reduce motion" on)
- [ ] Your person sees, edits and deletes the same dates
- [ ] A third account (no pairing) can't see anything
