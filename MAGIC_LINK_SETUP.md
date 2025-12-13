# Magic Link Email Setup

## How It Works

Yes, the system **sends magic link emails** via Supabase. Here's the flow:

1. User enters email on `/login` page
2. System calls `supabase.auth.signInWithOtp({ email })`
3. Supabase sends a magic link email to that address
4. User clicks the link in their email
5. User is automatically logged in and redirected to `/app/designs`

## Supabase Email Configuration

For magic links to work, Supabase needs to be configured to send emails:

### Option 1: Supabase Default Email (Development)

Supabase provides a default email service that works out of the box:
- **Works immediately** - no configuration needed
- **Limited to development** - emails may go to spam
- **Rate limited** - Supabase has limits on free tier

### Option 2: Custom SMTP (Production)

For production, configure custom SMTP in Supabase Dashboard:

1. Go to **Authentication** → **Email Templates**
2. Configure **SMTP Settings**:
   - SMTP Host (e.g., `smtp.gmail.com`)
   - SMTP Port (e.g., `587`)
   - SMTP User (your email)
   - SMTP Password (app-specific password)
   - From Email (sender address)

### Option 3: Supabase Email Service (Recommended)

Use Supabase's built-in email service:
- Go to **Settings** → **Auth** → **Email Templates**
- Customize the magic link email template
- Emails are sent automatically

## Testing Magic Links

### For `terrep263@gmail.com` (Whitelisted)

1. Go to `/login`
2. Enter `terrep263@gmail.com`
3. Click "Send Magic Link"
4. Check your email inbox (and spam folder)
5. Click the magic link in the email
6. You'll be automatically logged in with full access

### Email Template

The magic link email will contain:
- A secure login link
- Expiration time (usually 1 hour)
- Redirect URL: `http://localhost:3000/app/designs` (or your domain)

## Troubleshooting

### Email Not Received?

1. **Check spam folder** - Magic links often go to spam
2. **Check Supabase Dashboard** - Go to Authentication → Users → check if email was sent
3. **Verify SMTP settings** - If using custom SMTP, verify credentials
4. **Check rate limits** - Supabase free tier has email sending limits
5. **Check Supabase logs** - Look for email sending errors

### Development Testing

If emails aren't working in development:
- Supabase may require SMTP configuration
- Or use Supabase's email testing feature
- Check Supabase Dashboard → Authentication → Email Templates

## Email Content

The magic link email typically contains:
```
Subject: Confirm your signup

Click the link below to sign in:
[Magic Link Button]

Or copy this URL:
https://your-project.supabase.co/auth/v1/verify?token=...

This link expires in 1 hour.
```

## Security

- Magic links expire after 1 hour (default)
- Links are single-use (can't be reused)
- Links are cryptographically secure
- Only work for the specific email address

## Next Steps

1. **Test the magic link** with `terrep263@gmail.com`
2. **Check your email** (including spam)
3. **Click the link** to log in
4. **You should have full access** (whitelisted)

If you don't receive the email, check:
- Supabase Dashboard → Authentication → Email Templates
- Supabase Dashboard → Settings → SMTP (if configured)
- Your email spam folder

