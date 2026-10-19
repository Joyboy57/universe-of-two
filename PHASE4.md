# Phase 4: Installable app + notifications

## 1. Install the new package and make your keys
```
npm install
npx web-push generate-vapid-keys
```
Copy the **Public Key** and **Private Key** it prints. Add to `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:your-real-email@gmail.com
CRON_SECRET=<any long random text, e.g. 40 random letters and digits>
```
Never share the private key or CRON_SECRET.

## 2. Run the migration
Supabase > SQL Editor > New query > paste `supabase/migrations/0004_notifications.sql` > Run.

## 3. Restart and test on your computer
Ctrl+C, `npm run dev`. In Chrome open http://localhost:3000/settings (works on localhost).
- "Turn on notifications here" > Allow > "Send me a test". A notification should pop up.

## 4. Deploy (phones need the https site)
- Add the 4 new variables to Vercel > Settings > Environment Variables, then **redeploy**.
- `vercel.json` already schedules the daily job (about 9:30 to 10:30 AM India time).

## 5. Install on each phone
- **Android (Chrome):** menu > Install app / Add to Home screen.
- **iPhone (Safari only):** Share > Add to Home Screen. Open the new icon and **sign in again**
  (the installed app has its own separate login). Notifications only work from this installed icon.
Then open Settings > "Turn on notifications here" > Allow > "Send me a test".

## 6. Test the daily logic without waiting
Add a date for **tomorrow**, then run (PowerShell/cmd on Windows use curl.exe):
```
curl.exe -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3000/api/cron/daily?force=1&dry=1"
```
It lists what would be sent to each of you. Remove `&dry=1` to really send it.
Also try a date exactly one year ago today to see "On this day".

## Done when
- [ ] Test notification arrives on your phone and on your person's phone
- [ ] Tapping a notification opens the app
- [ ] The dry run shows the right message for tomorrow's plan
- [ ] The app can be installed from both phones' browsers

## Good to know
- At most ONE notification per person per day. Plans first, then "on this day", then a Sunday memory.
- Free Vercel runs the job once a day. If you two are in far-apart timezones, use `optional/notify-hourly.yml`
  (instructions inside) so each of you gets it at your own hour.
- If a phone stops receiving notifications, turn them off and on again in Settings.
