# Sprint 2: Gumroad Licensing Setup Guide

## Overview

This guide covers the setup and testing of the Gumroad licensing system for SnapBrandXX.

## Prerequisites

- Supabase project configured (from Sprint 1)
- Gumroad product created
- Environment variables configured

## Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the contents of `supabase-migrations.sql` (the entitlements table section)
4. Run the migration
5. Verify the `entitlements` table was created:
   ```sql
   SELECT * FROM entitlements;
   ```

## Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase (from Sprint 1)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# NEW - Service role key for server-side operations (REQUIRED)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Gumroad (optional but recommended)
NEXT_PUBLIC_GUMROAD_PRODUCT_URL=https://gumroad.com/l/your-product
GUMROAD_WEBHOOK_SECRET=your_webhook_secret_here
```

**Important**: 
- `SUPABASE_SERVICE_ROLE_KEY` is **PRIVATE** - never expose in client code
- Get it from Supabase Dashboard → Settings → API → `service_role` key

## Step 3: Configure Gumroad Webhook

### For Production:

1. Log in to your Gumroad account
2. Go to your product → **Edit** → **Advanced** tab
3. Find **"Ping URL"** or **"Webhook URL"** field
4. Enter: `https://your-domain.com/api/gumroad/webhook`
5. Save changes

### For Local Development:

Use a tunneling service like ngrok:

```bash
# Install ngrok (if not installed)
# Then run:
ngrok http 3000

# Use the ngrok URL in Gumroad webhook:
# https://your-ngrok-id.ngrok.io/api/gumroad/webhook
```

### Webhook Events

Gumroad will POST to your webhook on:
- **New purchase** → Creates/updates entitlement with `status: 'licensed'`
- **Refund** → Updates entitlement to `status: 'revoked'`
- **Chargeback** → Updates entitlement to `status: 'revoked'`

### Webhook Payload Format

Gumroad sends form-encoded data. The webhook handler expects:
- `sale_id` - Unique order ID
- `email` - Customer email (must match login email)
- `refunded` - "true" if refunded
- `disputed` - "true" if chargeback

## Step 4: Manual License Granting (Testing)

For testing without making actual purchases, you can manually grant licenses:

### Option 1: SQL Editor (Recommended)

Run this in Supabase SQL Editor:

```sql
-- Grant license to a test email
INSERT INTO entitlements (email, status, gumroad_order_id, purchased_at)
VALUES ('your-email@example.com', 'licensed', 'dev-test-001', NOW())
ON CONFLICT (email) DO UPDATE SET status = 'licensed';
```

### Option 2: Test Webhook

Use curl or Postman to simulate a purchase:

```bash
curl -X POST http://localhost:3000/api/gumroad/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sale_id": "test-123",
    "email": "test@example.com",
    "refunded": "false",
    "disputed": "false"
  }'
```

### Revoke License (Testing)

```sql
UPDATE entitlements 
SET status = 'revoked', revoked_at = NOW()
WHERE email = 'test@example.com';
```

## Step 5: Testing Checklist

### Test 1: Licensed User Flow

1. ✅ Manually grant yourself a license (use SQL above)
2. ✅ Log in with that email
3. ✅ Navigate to `/app` or `/app/designs`
4. ✅ Should see the app (not "Purchase Required" page)

### Test 2: Unlicensed User Flow

1. ✅ Log in with an email that has NO entitlement
2. ✅ Try to access `/app` or `/app/designs`
3. ✅ Should see "Purchase Required" page
4. ✅ Verify your email is displayed correctly
5. ✅ Click "Buy on Gumroad" - should open product page

### Test 3: Revoked License

1. ✅ Manually revoke a license in database
2. ✅ Log in with that email
3. ✅ Should be blocked (sees purchase page)

### Test 4: Webhook (Manual Test)

1. ✅ Use curl/Postman to send test webhook
2. ✅ Check database to verify entitlement was created
3. ✅ Test refund webhook (set `refunded: "true"`)
4. ✅ Verify entitlement status changed to 'revoked'

## Troubleshooting

### License check always returns false?

- ✅ Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly in `.env.local`
- ✅ Verify entitlements table has RLS policies enabled
- ✅ Check user's email matches entitlement email exactly (case-insensitive, but stored lowercase)
- ✅ Check browser console for API errors
- ✅ Verify `/api/auth/check-license` endpoint works (test with Postman)

### Webhook not receiving events?

- ✅ Verify Gumroad product has webhook URL configured
- ✅ Check webhook URL is publicly accessible (use ngrok for local dev)
- ✅ Look at Gumroad's webhook logs for delivery status
- ✅ Check server logs for webhook errors
- ✅ Verify webhook endpoint returns 200 status

### Infinite loading on license check?

- ✅ Check network tab for API errors
- ✅ Verify `/api/auth/check-license` endpoint works
- ✅ Check browser console for JavaScript errors
- ✅ Verify Supabase client is configured correctly

### User can't access after purchase?

- ✅ Verify email in Gumroad purchase matches login email exactly
- ✅ Check webhook was received (check server logs)
- ✅ Manually check entitlements table for the email
- ✅ Try manually linking user_id:
  ```sql
  UPDATE entitlements 
  SET user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com')
  WHERE email = 'user@example.com';
  ```

## Security Notes

- ✅ Service role key is **NEVER** exposed in client code
- ✅ License check happens **server-side** (API route)
- ✅ Client cannot manipulate licensed state
- ✅ RLS policies prevent cross-user data access
- ✅ Entitlement status is checked on every protected route load

## Next Steps

After Sprint 2 is complete and tested:
- ✅ Proceed to **Sprint 3: User Ownership & My Designs**
- ✅ This will build the actual "My Designs" page where users manage their watermark templates

## Additional Notes

- In production, consider adding webhook signature verification
- Consider adding a "pending" status for purchases awaiting confirmation
- Gumroad processes refunds asynchronously - webhook may be delayed
- Store email in lowercase to avoid case-sensitivity issues
- The `link_entitlement_to_user()` function automatically links entitlements when users sign up

