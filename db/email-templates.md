# Supabase auth email templates (Bloom)

These replace the default "Supabase Auth" wording. Paste each into
**Supabase → Authentication → Email Templates**, picking the matching
template from the dropdown.

⚠️ **Shared project:** this Supabase project is shared across all Bloom
apps (Bloomcup, Bloomgarden, …) because they share `auth.users`. These
templates are therefore **global** — every Bloom app uses them. That's
why the wording says "Bloom" rather than naming a single product.

Supabase template variables used below:
- `{{ .ConfirmationURL }}` — the action link the user clicks
- `{{ .Email }}` — the recipient's email

---

## Confirm signup

**Subject:**
```
Confirm your email for Bloom
```

**Body:**
```html
<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #2d2438;">
  <div style="font-size: 28px; font-weight: 800; margin-bottom: 8px;">🌸 Bloom</div>
  <h1 style="font-size: 22px; margin: 0 0 16px;">One quick step</h1>
  <p style="font-size: 15px; line-height: 1.5; color: #6b6478; margin: 0 0 24px;">
    Tap the button below to confirm your email and get started. If you didn't
    create a Bloom account, you can safely ignore this.
  </p>
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #ff8a8a; color: #fff; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 999px;">
    Confirm email →
  </a>
  <p style="font-size: 13px; color: #9b94a8; margin: 28px 0 0;">
    Trouble with the button? Paste this link into your browser:<br>
    <a href="{{ .ConfirmationURL }}" style="color: #ff8a8a; word-break: break-all;">{{ .ConfirmationURL }}</a>
  </p>
</div>
```

---

## Reset password

**Subject:**
```
Reset your Bloom password
```

**Body:**
```html
<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #2d2438;">
  <div style="font-size: 28px; font-weight: 800; margin-bottom: 8px;">🌸 Bloom</div>
  <h1 style="font-size: 22px; margin: 0 0 16px;">Reset your password</h1>
  <p style="font-size: 15px; line-height: 1.5; color: #6b6478; margin: 0 0 24px;">
    We got a request to reset the password for <strong>{{ .Email }}</strong>.
    Tap below to choose a new one. If this wasn't you, just ignore this email —
    your password won't change.
  </p>
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #ff8a8a; color: #fff; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 999px;">
    Choose a new password →
  </a>
  <p style="font-size: 13px; color: #9b94a8; margin: 28px 0 0;">
    Trouble with the button? Paste this link into your browser:<br>
    <a href="{{ .ConfirmationURL }}" style="color: #ff8a8a; word-break: break-all;">{{ .ConfirmationURL }}</a>
  </p>
</div>
```

---

## Magic Link (only if you enable it later)

**Subject:**
```
Your Bloom sign-in link
```

**Body:**
```html
<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #2d2438;">
  <div style="font-size: 28px; font-weight: 800; margin-bottom: 8px;">🌸 Bloom</div>
  <h1 style="font-size: 22px; margin: 0 0 16px;">Sign in to Bloom</h1>
  <p style="font-size: 15px; line-height: 1.5; color: #6b6478; margin: 0 0 24px;">
    Tap below to sign in. The link works once and expires shortly. If you
    didn't request it, you can ignore this email.
  </p>
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #ff8a8a; color: #fff; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 999px;">
    Sign in →
  </a>
</div>
```

---

## Change email address

**Subject:**
```
Confirm your new email for Bloom
```

**Body:**
```html
<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #2d2438;">
  <div style="font-size: 28px; font-weight: 800; margin-bottom: 8px;">🌸 Bloom</div>
  <h1 style="font-size: 22px; margin: 0 0 16px;">Confirm your new email</h1>
  <p style="font-size: 15px; line-height: 1.5; color: #6b6478; margin: 0 0 24px;">
    Tap below to confirm this as the new email for your Bloom account.
  </p>
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #ff8a8a; color: #fff; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 999px;">
    Confirm new email →
  </a>
</div>
```

---

## Note on the sender address

Editing these templates changes the **content** but the email still sends
from Supabase's shared address (e.g. `noreply@mail.app.supabase.io`). To
send from a Bloom address (e.g. `hello@bloom...`), set up custom SMTP under
**Project Settings → Authentication → SMTP** (Resend's free tier is the
easiest). That's also project-wide, so it would brand every Bloom app the
same way.
