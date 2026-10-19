# Phase 0 Setup: A Universe of Two

Do these in order. Each step ends with a check.

## 1. Run it locally
```bash
npm install
cp .env.example .env.local
npm run dev
```
Check: http://localhost:3000 shows the orbiting-dots home screen.

## 2. Git + GitHub
```bash
git init && git add . && git commit -m "Phase 0 scaffold"
```
Create a **private** GitHub repo and push.

## 3. Supabase
1. supabase.com > New project (pick the region closest to both of you).
2. Project Settings > API: copy **Project URL**, **anon key**, **service_role key** into `.env.local`.
3. Authentication > Providers: keep Email enabled. Authentication > Sign In: **turn OFF "Allow new users to sign up"** once both of you have accounts (Phase 1 handles this).
Check: `/api/health` reports `supabaseOk: true`.

## 4. Media storage (Supabase Storage, no card needed)
1. Supabase dashboard > Storage > New bucket.
2. Name it exactly `media`. Leave **Public bucket OFF** (private).
Check: `/api/health` reports `mediaBucketOk: true`.

## 5. Vercel
1. vercel.com > Add New Project > import the GitHub repo (framework auto-detects Next.js).
2. Settings > Environment Variables: add every variable from `.env.local` (Production + Preview). Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL.
3. Deploy.
4. Settings > Deployment Protection: leave **Vercel Authentication** on for previews.
Check: the deployed URL shows the home screen and `/api/health` returns `ok: true`.

## Phase 0 is done when
- [ ] Deployed URL shows the themed home screen
- [ ] `/api/health` returns `{"ok": true}`
- [ ] Repo is private, `.env.local` is not committed
