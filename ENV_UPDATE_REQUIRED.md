# Environment Variables Update Required

## ✅ Current Status

Your `.env.local` file already has:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

## ❌ Missing Variable (Sprint 4)

You need to add `CRON_SECRET` for the cleanup cron job.

## 📝 Add This to `.env.local`

Add this line to your `.env.local` file:

```bash
# Cron Job Secret (Sprint 4) - Used to protect /api/cron/cleanup endpoint
CRON_SECRET=cf0879bf429c02804466ebd56644c3b040895280dffc2c6052e389223d7429bf
```

## 🔒 Security Note

The `CRON_SECRET` value above was randomly generated. You can:
1. **Use the one provided** (already generated and secure)
2. **Generate your own** using:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## ✅ After Adding

1. **Restart your dev server** (required for env changes)
2. Test the cleanup endpoint:
   ```bash
   curl -X GET http://localhost:3000/api/cron/cleanup \
     -H "Authorization: Bearer cf0879bf429c02804466ebd56644c3b040895280dffc2c6052e389223d7429bf"
   ```

## 📋 Complete `.env.local` Template

Your `.env.local` should now include:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://tzccopzxorocobxtoryy.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key_here"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"

# Cron Job Secret (Sprint 4)
CRON_SECRET=cf0879bf429c02804466ebd56644c3b040895280dffc2c6052e389223d7429bf
```

## 🚀 Next Steps

1. Add `CRON_SECRET` to `.env.local`
2. Restart your dev server
3. Test the cleanup endpoint (see above)
4. Deploy to Vercel and add `CRON_SECRET` to Vercel environment variables

