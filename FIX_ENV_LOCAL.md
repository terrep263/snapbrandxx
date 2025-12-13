# Fix .env.local Format Issues

## Problem
Your `.env.local` file has formatting issues that prevent environment variables from being read correctly.

## Issue Found
- **Space after `=` sign**: `NEXT_PUBLIC_SUPABASE_URL= https://...` (has space after `=`)
- This causes the value to start with a space, which can break parsing

## Fix Instructions

### Option 1: Manual Fix (Recommended)

1. Open `.env.local` in your editor
2. Find these lines and **remove the space after the `=`**:

**Before (WRONG):**
```bash
NEXT_PUBLIC_SUPABASE_URL= https://tzccopzxorocobxtoryy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**After (CORRECT):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://tzccopzxorocobxtoryy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

3. Make sure there are **NO spaces** before or after the `=` sign
4. Make sure `SUPABASE_SERVICE_ROLE_KEY` is on a **single line** (not split)
5. Save the file

### Option 2: PowerShell Fix (Quick)

Run this in PowerShell to fix the spaces:

```powershell
# Backup first
Copy-Item .env.local .env.local.backup

# Fix spaces after =
(Get-Content .env.local) -replace '=\s+', '=' | Set-Content .env.local
```

## After Fixing

1. **Restart the dev server completely**:
   - Stop it (Ctrl+C)
   - Start it again: `npm run dev`

2. **Test the endpoint**:
   ```bash
   curl -X GET http://localhost:3000/api/cron/cleanup -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

3. **Check server logs** - you should see the debug output showing the variables are loaded

## Correct .env.local Format

Your `.env.local` should look like this (no spaces, no quotes needed):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tzccopzxorocobxtoryy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
CRON_SECRET=cf0879bf429c02804466ebd56644c3b040895280dffc2c6052e389223d7429bf
```

**Important:**
- No spaces around `=`
- No quotes needed (but they're OK if you want them)
- Each variable on its own line
- Long values should be on a single line (don't split them)

