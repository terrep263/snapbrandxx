-- Fix for "Database error saving new user"
-- This fixes the trigger that runs when a new user signs up

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
DROP FUNCTION IF EXISTS link_entitlement_to_user();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION link_entitlement_to_user()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new user signs up, link any existing entitlement
  -- Use a transaction-safe approach with error handling
  BEGIN
    UPDATE entitlements
    SET user_id = NEW.id
    WHERE email = LOWER(NEW.email) AND user_id IS NULL;
    
    -- If no rows were updated, that's fine - user just doesn't have an entitlement yet
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail user creation
      RAISE WARNING 'Failed to link entitlement for user %: %', NEW.email, SQLERRM;
      -- Continue anyway - user creation should succeed even if entitlement linking fails
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_entitlement_to_user();

-- Verify the trigger was created
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table, 
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_user_created';

