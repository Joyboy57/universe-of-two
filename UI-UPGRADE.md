# UI upgrade: 3D scene, liquid glass, time zones

## Install and run
```
npm install
npm run dev
```
(No database changes. Your .env.local stays as it is.)

## What you should see on the Home screen
- A 3D scene: two glowing spheres orbiting each other. Yours is warm and bright in YOUR daytime and
  cool and dim at YOUR night. Your person's sphere does the same for THEIR local time. Move your mouse
  or finger and the whole system tilts toward it.
- Two clock cards: your time and your person's time, with the day and part of day, and a line like
  "Alex is 3h 30m ahead of you". Their card says "Probably asleep" (11 PM to 7 AM their time, or their
  own quiet hours if set) or "Good time to message".
- The background glow shifts through dawn, day, dusk and night with your own clock.
- Cards across the app are now frosted glass.
- Clock cards switch to refracting WebGL glass (liquidGL) a second after the page loads.

## Settings > Appearance
Two switches (per device): the 3D scene and the liquid glass effect. Use them if something is slow.

## Please test and tell me
1. Home > Calendar > Home > Settings > Home, three times. If the glass doubles, flickers or the page
   slows down, turn off "Liquid glass" and tell me.
2. On your iPhone especially: Safari can be unstable with large liquid glass panes, so watch for flicker.
3. Change your person's timezone in their Settings (or yours) and check the clocks and the sphere colours follow.
