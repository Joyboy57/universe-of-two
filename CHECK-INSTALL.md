# How to check the "install as app" part from your code editor

You don't need a phone for the first checks. Chrome on your computer shows everything.

## A. On your computer (2 minutes)
1. In VS Code's terminal run `npm run dev`. Leave it running.
2. Open **Google Chrome** (not VS Code's built-in browser) at http://localhost:3000 and sign in.
3. Press **F12** > **Application** tab (click `>>` if you don't see it).
4. Left list > **Manifest**:
   - You should see the name "A Universe of Two", the icon, and **Installability** with no red errors.
5. Left list > **Service workers**:
   - `sw.js` should say **activated and is running**.
6. **Fake a notification:** in that same Service workers panel, find the **Push** box, paste
   `{"title":"Test","body":"Hello ♥","url":"/"}` and click **Push**. A notification should appear.
7. **Install it:** look for the install icon (a small monitor with a down arrow) at the right end of Chrome's
   address bar, or menu **⋮ > Cast, save, and share > Install page as app**. It opens in its own window.
8. In the installed window go to **Settings > Turn on notifications here > Send me a test** (needs your VAPID keys).
9. To try again: open `chrome://apps`, right-click the app, **Remove from Chrome**.

## B. Your Android phone, still using your computer (no deploy needed)
1. On the phone: Settings > About > tap **Build number** 7 times, then Developer options > **USB debugging** on.
2. Plug in the phone. On your computer open Chrome at `chrome://inspect/#devices`.
3. **Port forwarding** > add `3000` > `localhost:3000` > Enable.
4. On the phone's Chrome open `http://localhost:3000`. Phones treat this as secure, so install and push work.

## C. iPhone
iPhones need a real https address, so test on your deployed Vercel site:
1. Push your code to GitHub; Vercel redeploys on its own.
2. On the iPhone, open the site in **Safari** > Share > **Add to Home Screen**.
3. Open the new icon, sign in again, then Settings > Turn on notifications.

## If something is wrong
| You see | Do this |
|---|---|
| No install icon | Open Application > Manifest and read the Installability warnings. Make sure you used Chrome and http://localhost:3000. |
| Service worker not running | Application > Service workers > tick **Update on reload**, then reload. |
| "Send me a test" says keys are missing | Check the 4 variables in `.env.local`, then restart `npm run dev`. |
| Push button in DevTools shows nothing | Your browser/OS notifications are blocked: allow them for localhost. |
