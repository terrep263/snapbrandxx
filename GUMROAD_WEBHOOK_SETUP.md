# GUMROAD WEBHOOK CONNECTION - Step-by-Step Instructions

## Overview

Gumroad webhooks automatically notify SnapBrandXX when someone purchases, gets refunded, or initiates a chargeback. This keeps your license database in sync.

---

## PART 1: Verify Your Webhook Endpoint Exists

### ✅ Step 1: Check the API Route

**File exists:** `src/app/api/gumroad/webhook/route.ts`

The webhook endpoint is already implemented and handles:
- ✅ New purchases (creates entitlement)
- ✅ Refunds (revokes entitlement)
- ✅ Chargebacks (revokes entitlement)
- ✅ Email normalization (lowercase)
- ✅ Automatic user linking (if user already exists)

### Step 2: Verify Environment Variables

**File:** `.env.local` (local) and Vercel Environment Variables (production)

Required variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Important: Server-side only!
GUMROAD_WEBHOOK_SECRET=your_secret_here  # You create this (optional but recommended)
```

**GUMROAD_WEBHOOK_SECRET:**
- You create this (random string)
- Example: `gumroad_webhook_snapbrandxx_2024_secure`
- Used to verify webhooks are actually from Gumroad
- Keep it secret!
- **Optional:** If not set, webhook will still work but without signature verification

**Generate a secret:**
```bash
# Option 1: Use online generator
# Go to: https://www.random.org/strings/

# Option 2: Command line (Mac/Linux)
openssl rand -hex 32

# Option 3: PowerShell (Windows)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Option 4: Just make one up
gumroad_snapbrandxx_webhook_$(date +%s)
```

### Step 3: Add Secret to Environment Variables

**Local (.env.local):**
```bash
GUMROAD_WEBHOOK_SECRET=your_generated_secret_here
```

**Vercel (Production):**
1. Go to Vercel Dashboard
2. Select your SnapBrandXX project
3. Settings → Environment Variables
4. Add new variable:
   - Name: `GUMROAD_WEBHOOK_SECRET`
   - Value: `your_generated_secret_here`
   - Environments: ✓ Production, ✓ Preview, ✓ Development
5. Click "Save"

### Step 4: Redeploy (if already deployed)

If your app is already live on Vercel:
```bash
# Trigger redeploy to pick up new env variable
git commit --allow-empty -m "Add Gumroad webhook secret"
git push
```

Or redeploy via Vercel dashboard:
- Deployments → Click "..." → Redeploy

---

## PART 2: Get Your Webhook URL

### Production URL (Live App)

**Format:**
```
https://your-domain.vercel.app/api/gumroad/webhook
```

**Examples:**
```
https://snapbrandxx.vercel.app/api/gumroad/webhook
https://snapbrandxx.com/api/gumroad/webhook  (if custom domain)
```

**Find your URL:**
1. Go to Vercel dashboard
2. Click your SnapBrandXX project
3. Look at "Domains" section
4. Copy your domain
5. Add `/api/gumroad/webhook` to the end

**Optional: Add secret to URL (alternative security method):**
```
https://your-domain.vercel.app/api/gumroad/webhook?secret=your_secret_here
```

### Testing Locally (Optional)

To test webhooks during development, use **ngrok** or **LocalTunnel**:

**Using ngrok:**
```bash
# Install ngrok
brew install ngrok  # Mac
# or download from ngrok.com

# Start your app
npm run dev  # Running on localhost:3000

# In another terminal, create tunnel
ngrok http 3000

# ngrok gives you a URL like:
# https://abc123.ngrok.io

# Your webhook URL becomes:
# https://abc123.ngrok.io/api/gumroad/webhook
```

**Note:** ngrok URLs change each time. Only use for testing.

---

## PART 3: Configure Gumroad Product

### Step 1: Go to Gumroad Product Settings

1. Log in to Gumroad
2. Go to Products
3. Find your SnapBrandXX product (or create it)
4. Click "Edit"

### Step 2: Find Webhook Settings

**Location varies by Gumroad UI version:**

**Option A (New UI):**
- Edit Product → Advanced → Webhooks

**Option B (Old UI):**
- Edit Product → Settings → Advanced → Ping URL

**Option C (Account-wide):**
- Settings → Advanced → Webhook URL

**Use Product-specific webhook (Option A) if available.**

### Step 3: Enter Webhook URL

**Webhook URL field:**
```
https://your-domain.vercel.app/api/gumroad/webhook
```

**Or with secret (if using URL parameter security):**
```
https://your-domain.vercel.app/api/gumroad/webhook?secret=your_secret_here
```

**Example:**
```
https://snapbrandxx.vercel.app/api/gumroad/webhook
```

**Important:**
- Must be HTTPS (not HTTP)
- Must be publicly accessible (not localhost)
- Include the full path with `/api/gumroad/webhook`

### Step 4: Save Webhook Settings

Click "Save" or "Update"

Gumroad will attempt to verify the webhook URL by sending a test ping.

---

## PART 4: Test Webhook Connection

### Method 1: Gumroad Test Mode

1. In Gumroad product settings, enable "Test Mode"
2. Make a test purchase using test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
3. Complete test purchase

**Check if it worked:**
- Go to Supabase Dashboard
- Database → Table Editor → `entitlements` table
- Look for new row with test purchase email
- Status should be "licensed"

### Method 2: Manual Webhook Test

**Send test webhook using curl:**

```bash
curl -X POST https://your-domain.vercel.app/api/gumroad/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sale_id": "test-123",
    "email": "test@example.com",
    "product_permalink": "snapbrandxx",
    "seller_id": "your-seller-id",
    "refunded": "false",
    "disputed": "false"
  }'
```

**With secret URL parameter:**
```bash
curl -X POST "https://your-domain.vercel.app/api/gumroad/webhook?secret=your_secret_here" \
  -H "Content-Type: application/json" \
  -d '{
    "sale_id": "test-123",
    "email": "test@example.com",
    "product_permalink": "snapbrandxx",
    "seller_id": "your-seller-id",
    "refunded": "false",
    "disputed": "false"
  }'
```

**Expected response:**
```json
{"success": true, "action": "licensed"}
```

**Check Supabase:**
- Should see new entitlement for `test@example.com`

### Method 3: Check Webhook Logs

**Gumroad side:**
1. Go to product settings → Webhooks
2. Look for "Recent Deliveries" or "Webhook Log"
3. Check if webhooks are being sent
4. Check response codes (200 = success)

**Vercel side:**
1. Vercel Dashboard → Your Project
2. Functions → `/api/gumroad/webhook`
3. View logs
4. Look for incoming requests and any errors

---

## PART 5: Webhook Security

### Current Implementation

The webhook endpoint supports two security methods:

1. **Signature Verification (if Gumroad sends it):**
   - Checks `x-gumroad-signature` header
   - Uses `GUMROAD_WEBHOOK_SECRET` to verify
   - Note: Gumroad may not always send signatures - check their latest API docs

2. **Secret URL Parameter:**
   - Add `?secret=your_secret_here` to webhook URL
   - Endpoint verifies secret matches `GUMROAD_WEBHOOK_SECRET`
   - Works even if Gumroad doesn't send signature headers

**Both methods are optional** - webhook will work without them, but it's recommended for production.

---

## PART 6: Webhook Events Reference

### Events Gumroad Sends

**Sale:**
```json
{
  "sale_id": "abc123",
  "email": "customer@example.com",
  "product_permalink": "snapbrandxx",
  "seller_id": "seller123",
  "refunded": "false",
  "disputed": "false",
  "price": "3900",  // cents
  "currency": "USD"
}
```

**Refund:**
```json
{
  "sale_id": "abc123",
  "email": "customer@example.com",
  "refunded": "true",
  "disputed": "false"
}
```

**Chargeback/Dispute:**
```json
{
  "sale_id": "abc123",
  "email": "customer@example.com",
  "refunded": "false",
  "disputed": "true"
}
```

### Your Handler Response

**Success:**
```json
{
  "success": true,
  "action": "licensed"  // or "revoked"
}
```

**Error:**
```json
{
  "error": "Error message here"
}
```

**Gumroad expects 200 status code for success.**

---

## PART 7: Testing Full User Flow

### End-to-End Test

1. **Purchase** (test mode):
   - Go to your Gumroad product page
   - Enable test mode
   - Make test purchase with email: `youremail+test@gmail.com`

2. **Check database:**
   - Supabase → entitlements table
   - Verify row exists with status "licensed"

3. **Log in:**
   - Go to SnapBrandXX.com
   - Click "Log In"
   - Enter: `youremail+test@gmail.com`
   - Check email for magic link
   - Click magic link

4. **Verify access:**
   - Should redirect to /app/designs
   - Should NOT see "Purchase Required" page
   - Should have full editor access

5. **Test refund:**
   - Go to Gumroad → Sales
   - Find test purchase
   - Issue refund

6. **Check revocation:**
   - Supabase → entitlements table
   - Status should change to "revoked"

7. **Verify blocked:**
   - Log out of SnapBrandXX
   - Log back in with same email
   - Should see "Purchase Required" page
   - Should NOT have editor access

---

## PART 8: Troubleshooting

### Webhook Not Receiving Events

**Check:**
- [ ] Webhook URL is correct (no typos)
- [ ] URL is HTTPS (not HTTP)
- [ ] URL is publicly accessible (not localhost)
- [ ] Endpoint is deployed (check Vercel functions)
- [ ] No firewall blocking Gumroad's servers

**Test:**
```bash
# Test if endpoint is accessible
curl https://your-domain.vercel.app/api/gumroad/webhook
# Should return 405 Method Not Allowed (POST required)
```

### Entitlement Not Created

**Check Vercel logs:**
1. Vercel Dashboard → Your Project → Functions
2. Find `/api/gumroad/webhook`
3. View recent invocations
4. Look for errors

**Common issues:**
- SUPABASE_SERVICE_ROLE_KEY not set
- Email normalization issue (check lowercase)
- Database RLS policy blocking insert

**Check Supabase logs:**
1. Supabase Dashboard → Logs
2. Filter by "postgres"
3. Look for INSERT errors

### User Can't Access After Purchase

**Check:**
1. **Email mismatch:**
   - Gumroad email: `User@Example.com`
   - Login email: `user@example.com`
   - Solution: Emails are normalized to lowercase in webhook handler ✅

2. **Entitlement not linked to user:**
   - Check entitlements table
   - user_id should be filled after login
   - If NULL, trigger function may not have run

3. **License check failing:**
   - Check `/api/auth/check-license` endpoint
   - Verify it returns `{"licensed": true}`

---

## PART 9: Production Checklist

Before launching:

**Gumroad:**
- [ ] Product created with correct copy
- [ ] Webhook URL configured correctly
- [ ] Test purchase successful
- [ ] Test refund revokes access
- [ ] Test mode disabled (when ready for real purchases)

**SnapBrandXX:**
- [ ] All environment variables set in Vercel
- [ ] Webhook endpoint deployed and accessible
- [ ] Database tables exist with RLS policies
- [ ] Test login with purchased email works
- [ ] License gate blocks unpurchased users
- [ ] GUMROAD_WEBHOOK_SECRET set (optional but recommended)

**Testing:**
- [ ] Complete end-to-end test purchase flow
- [ ] Verify access granted after purchase
- [ ] Verify access revoked after refund
- [ ] Check webhook logs for errors
- [ ] Monitor Supabase for data integrity

---

## PART 10: Monitoring & Maintenance

### Daily Monitoring

**Gumroad Dashboard:**
- Check sales
- Check refund rate (should be < 5%)
- Monitor webhook delivery success rate

**Supabase:**
- Check entitlements table growth
- Look for orphaned records (user_id = NULL after 24h)
- Monitor for duplicate entries

**Vercel:**
- Check function error rate
- Monitor webhook endpoint response time
- Look for 500 errors

### Weekly Maintenance

- Review support tickets related to access issues
- Check for patterns in webhook failures
- Update documentation based on common issues

### Red Flags

**High refund rate (>10%):**
- Product not meeting expectations
- Onboarding issues
- Technical problems

**Webhook failures:**
- Check Vercel logs
- Verify endpoint hasn't changed
- Test webhook URL manually

**Access issues:**
- Email mismatch problems
- Trigger function not running
- RLS policy too restrictive

---

## Quick Reference Commands

**Test webhook locally:**
```bash
curl -X POST http://localhost:3000/api/gumroad/webhook \
  -H "Content-Type: application/json" \
  -d '{"sale_id":"test","email":"test@example.com","refunded":"false","disputed":"false"}'
```

**Check entitlements in Supabase:**
```sql
SELECT * FROM entitlements ORDER BY created_at DESC LIMIT 10;
```

**Manually grant license (testing):**
```sql
INSERT INTO entitlements (email, status, gumroad_order_id, purchased_at)
VALUES ('test@example.com', 'licensed', 'manual-grant-001', NOW());
```

**Manually revoke license:**
```sql
UPDATE entitlements 
SET status = 'revoked', revoked_at = NOW()
WHERE email = 'test@example.com';
```

---

## Support Email Template

When users have access issues:

```
Hi [Name],

I see you purchased SnapBrandXX. Let's get you access!

The most common issue is email mismatch. 

You purchased with: [gumroad_email]
You're trying to log in with: [login_email]

These must match exactly (case-insensitive - we normalize to lowercase).

Solution:
1. Go to snapbrandxx.com
2. Click "Log In"
3. Enter: [gumroad_email]
4. Check that email inbox for magic link
5. Click the link

If that doesn't work, reply with:
- The email you used to purchase
- The email you're trying to log in with
- Any error messages you see

I'll get you sorted out!

Best,
SnapBrandXX Support
```

---

## You're Done!

Webhook connection is complete when:
- ✅ Webhook URL configured in Gumroad
- ✅ Test purchase creates entitlement
- ✅ User can log in with purchase email
- ✅ Access granted after purchase
- ✅ Access revoked after refund

Next: Launch your product!

