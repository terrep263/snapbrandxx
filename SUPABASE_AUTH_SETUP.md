# Supabase Authentication Setup Guide

This document outlines the Supabase dashboard configuration required for magic link authentication.

## Authentication URL Configuration

### Step 1: Configure Site URL

1. Go to Supabase Dashboard → Your Project → Authentication → URL Configuration
2. Set **Site URL**:
   - Development: `http://localhost:3000`
   - Production: `https://snapbrandxx.com` (or your production domain)

### Step 2: Configure Redirect URLs

Add the following **Redirect URLs** (one per line):

```
http://localhost:3000/app/designs
https://snapbrandxx.com/app/designs
```

This allows Supabase to redirect users back to your app after they click the magic link.

## Email Templates (Optional but Recommended)

### Step 3: Customize Magic Link Email

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Select **Magic Link** template
3. Customize the email with your branding:
   - Use brand colors (red: #C42A2A)
   - Include SnapBrandXX logo
   - Friendly, professional tone

**Example email content:**
```
Subject: Your SnapBrandXX login link

Hi there,

Click the link below to log in to your SnapBrandXX workspace:

{{ .ConfirmationURL }}

This link will expire in 1 hour.

If you didn't request this link, you can safely ignore this email.

Thanks,
The SnapBrandXX Team
```

## Environment Variables

Ensure your `.env.local` file contains:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Where to Find These Values

1. Go to Supabase Dashboard → Your Project → Settings → API
2. **Project URL** = `NEXT_PUBLIC_SUPABASE_URL`
3. **anon/public key** = `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Security Settings

### Email Auth Settings

1. Go to Authentication → Providers → Email
2. Ensure **Enable Email Provider** is ON
3. **Confirm email** can be OFF (magic link acts as verification)
4. **Secure email change** should be ON

### Rate Limiting

Supabase automatically rate limits magic link requests:
- Default: 3 requests per hour per email
- Adjust in Authentication → Rate Limits if needed

## Testing

After configuration:

1. Start your app: `npm run dev`
2. Go to `/login`
3. Enter your email
4. Check your inbox for the magic link
5. Click the link
6. Should redirect to `/app/designs`

## Troubleshooting

**Magic link not arriving?**
- Check spam/junk folder
- Verify email is valid
- Check Supabase Dashboard → Authentication → Users (should show email)
- Check Supabase Dashboard → Logs for errors

**Redirect not working?**
- Verify redirect URLs are configured correctly
- Check that Site URL matches your domain
- Ensure `emailRedirectTo` in code matches redirect URL

**Session not persisting?**
- Supabase uses localStorage by default
- Check browser console for localStorage errors
- Verify Supabase client is initialized correctly

## Production Checklist

Before deploying to production:

- [ ] Update Site URL to production domain
- [ ] Add production redirect URL
- [ ] Test magic link flow on production domain
- [ ] Verify email templates are customized
- [ ] Check rate limiting settings
- [ ] Review security settings

