# Environment Variables Reference

This document lists all required environment variables for the SnapBrandXX project.

## Required Variables

Add these to your `.env.local` file (create it if it doesn't exist):

```bash
# ============================================
# Supabase Configuration (Sprint 1)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# ============================================
# Supabase Service Role Key (Sprint 2)
# ============================================
# Required for server-side API routes
# Get this from: Supabase Dashboard > Settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ============================================
# Cron Job Secret (Sprint 4)
# ============================================
# Used to protect the cleanup cron endpoint
# Generate a secure random string (see below)
CRON_SECRET=your_random_secret_string_here
```

## How to Get These Values

### Supabase Variables

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **KEEP SECRET**

### Generate CRON_SECRET

Generate a secure random string for `CRON_SECRET`:

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Using OpenSSL:**
```bash
openssl rand -hex 32
```

**Using PowerShell (Windows):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

## Security Notes

⚠️ **IMPORTANT:**
- `.env.local` is in `.gitignore` - **never commit it to git**
- `SUPABASE_SERVICE_ROLE_KEY` has admin access - **never expose in client code**
- `CRON_SECRET` protects your cleanup endpoint - **keep it secret**
- Only `NEXT_PUBLIC_*` variables are exposed to the browser
- All other variables are server-side only

## Variable Usage by Sprint

| Variable | Sprint | Used In | Client/Server |
|----------|--------|---------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | 1 | All Supabase clients | Client & Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 1 | All Supabase clients | Client & Server |
| `SUPABASE_SERVICE_ROLE_KEY` | 2 | API routes | Server only |
| `CRON_SECRET` | 4 | `/api/cron/cleanup` | Server only |

## Verification

After setting up your `.env.local` file, verify it's working:

1. **Restart your dev server** (required for env changes)
2. Check console for warnings about missing variables
3. Test API endpoints to ensure they work

## Example `.env.local` File

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.example

# Cron Secret
CRON_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

## Troubleshooting

### "Missing Supabase environment variables" warning
- Check that `.env.local` exists in the project root
- Verify variable names are spelled correctly
- Restart your dev server after changes

### API routes return 500 errors
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify the service role key is correct (not the anon key)
- Check server logs for specific error messages

### Cleanup cron returns 401 Unauthorized
- Verify `CRON_SECRET` is set in environment variables
- Check that the Authorization header matches: `Bearer ${CRON_SECRET}`
- If using Vercel, ensure `CRON_SECRET` is set in Vercel dashboard

