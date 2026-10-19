# Phase 7: Lists, app lock, backup, home screen widget, song playlist

## 1. Install + migrate
```
npm install          # one new package: fflate (for backups)
```
Supabase > SQL Editor > run `supabase/migrations/0007_lists_songs_widget.sql`.
Then restart: Ctrl+C, `npm run dev`.

## 2. What to try
- **Lists** (bottom bar): "Start with the basics", add items, tick one, then "Add to our calendar".
- **Playlist** (More > Our playlist): type a song name > Find > Add. Tap a song to open Spotify.
  Paste a Spotify link instead and it opens that exact song. On a result that opens Spotify's search,
  use "Set the exact Spotify link" to pin the exact song.
- **App lock** (More > App lock): set a PIN, tap Lock now, unlock. Close and reopen the app.
- **Widget** (More > Home screen widget): create the link on your LIVE site (not localhost).
  iPhone: follow the Scriptable steps. Share your photo on Today first, then check the widget.
- **Backup** (More > Backup): download "Everything written", unzip, open index.html.
- Long-press the installed app icon on Android: shortcuts for Today, Add, Calendar.

## 3. Optional: exact Spotify song search
Without setup, search uses Apple's free catalog and links open Spotify's search.
For exact Spotify links add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET (Spotify developer dashboard).
Spotify now requires the app owner to have Premium for this, so it's optional.

## Done when
- [ ] A list item ticked off can become a calendar date
- [ ] Tapping a song opens Spotify
- [ ] The app asks for your PIN after you close and reopen it
- [ ] The widget image shows their photo with yours small in the corner (after you both post)
- [ ] A backup ZIP opens offline in your browser
