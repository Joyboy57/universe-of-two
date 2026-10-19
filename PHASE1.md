# Phase 1 Setup: Auth + Pairing

## 1. Run the migration
Supabase dashboard > SQL Editor > New query > paste `supabase/migrations/0001_couples_members.sql` > Run.

## 2. Make emails send a code (not just a link)
Why: on iPhone, a link opens in Safari while your installed app is a separate sandbox, so the login would land in the wrong place. A typed code works everywhere.

Authentication > Emails > edit **both** templates, "Magic Link" and "Confirm signup". Add this line to each body:
```html
<h2>Your code</h2>
<p style="font-size:28px;letter-spacing:6px"><b>{{ .Token }}</b></p>
```
Authentication > Sign In / Providers > Email: keep **Confirm email** on and **OTP length** at 6.

## 3. URLs
Authentication > URL Configuration: set **Site URL** to your Vercel URL and add `http://localhost:3000` to Redirect URLs.

## 4. Email delivery
Supabase's built-in email sender allows only a few emails per hour. For real use, add SMTP (Resend is free): Authentication > Emails > SMTP Settings.

## 5. Pair up
1. You: open the site > enter email > enter code > "Start our space" > share the code.
2. Your person: open the site > email + code > "I have a code" > enter it.
3. **Then lock the door:** Authentication > Sign In / Providers > turn OFF **Allow new users to sign up**. No third person can ever create an account.

## Done when
- [ ] Both of you can sign in with an emailed code
- [ ] Home shows both names (and days together if you set a date)
- [ ] A third account cannot join (try the used code: it should say invalid)
- [ ] Sign-ups are disabled in Supabase
