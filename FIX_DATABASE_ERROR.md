# Fix: Database Error Saving New User

## Problem

When a new user signs up via magic link, they get a "Database error saving new user" error.

## Root Cause

The trigger `link_entitlement_to_user()` runs when a new user is created and tries to update the `entitlements` table. This can fail if:
1. RLS policies block the update
2. The function encounters an error
3. The entitlements table doesn't exist or has issues

## Solution

I've updated the trigger function to:
1. **Add error handling** - Catches errors and logs them as warnings
2. **Prevent user creation failure** - User creation succeeds even if entitlement linking fails
3. **Use SECURITY DEFINER** - Runs with elevated privileges to bypass RLS

## How to Fix

### Option 1: Run the Fixed Migration (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
-- Drop and recreate the trigger function with error handling
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
DROP FUNCTION IF EXISTS link_entitlement_to_user();

CREATE OR REPLACE FUNCTION link_entitlement_to_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    UPDATE entitlements
    SET user_id = NEW.id
    WHERE email = LOWER(NEW.email) AND user_id IS NULL;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to link entitlement for user %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_entitlement_to_user();
```

### Option 2: Temporarily Disable the Trigger

If you need a quick fix, you can temporarily disable the trigger:

```sql
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
```

**Note**: This means entitlements won't be automatically linked, but users can still sign up.

### Option 3: Fix RLS Policies

If the issue is RLS blocking the update, ensure the function can bypass RLS:

```sql
-- Grant necessary permissions
GRANT UPDATE ON entitlements TO postgres;
```

## Verification

After applying the fix:

1. Try signing up with a new email
2. Check Supabase Dashboard → Authentication → Users
3. User should be created successfully
4. Check Supabase Dashboard → Logs for any warnings

## For Whitelisted Email

The whitelisted email `terrep263@gmail.com` should work regardless, but fixing the trigger ensures all users can sign up properly.

## Testing

1. Go to `/login`
2. Enter a test email (not `terrep263@gmail.com`)
3. Click "Send Magic Link"
4. Check email and click link
5. User should be created without errors

If you still get errors, check:
- Supabase Dashboard → Logs → Database
- Look for the specific error message
- Verify the `entitlements` table exists and has correct structure

