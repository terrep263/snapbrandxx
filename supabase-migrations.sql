-- Supabase Migration: Font Library Setup
-- Run this in your Supabase SQL Editor

-- Create fonts table
CREATE TABLE IF NOT EXISTS fonts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  family_name TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on family_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_fonts_family_name ON fonts(family_name);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_fonts_created_at ON fonts(created_at DESC);

-- Create storage bucket for fonts (run in Supabase Dashboard > Storage)
-- Or use the Supabase client:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('fonts', 'fonts', true);

-- Set bucket to public (run in Supabase Dashboard > Storage > fonts > Settings)
-- Or via SQL (if you have the right permissions):
-- UPDATE storage.buckets SET public = true WHERE id = 'fonts';

-- Optional: Add RLS policies if needed
-- ALTER TABLE fonts ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Fonts are viewable by everyone" ON fonts FOR SELECT USING (true);
-- CREATE POLICY "Fonts are insertable by authenticated users" ON fonts FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Fonts are deletable by authenticated users" ON fonts FOR DELETE USING (true);

-- ============================================
-- SPRINT 2: Entitlements Table for Gumroad Licensing
-- ============================================

-- Entitlements table to track Gumroad purchases
CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('licensed', 'revoked')),
  gumroad_order_id TEXT UNIQUE,
  purchased_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entitlements_email ON entitlements(email);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON entitlements(status);

-- RLS policies
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- Users can only read their own entitlement
DROP POLICY IF EXISTS entitlements_select_own ON entitlements;
CREATE POLICY entitlements_select_own ON entitlements
  FOR SELECT
  USING (auth.uid() = user_id OR email = auth.jwt() ->> 'email');

-- Only service role can insert/update (via webhook)
DROP POLICY IF EXISTS entitlements_service_write ON entitlements;
CREATE POLICY entitlements_service_write ON entitlements
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to automatically link user_id when user signs up
CREATE OR REPLACE FUNCTION link_entitlement_to_user()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new user signs up, link any existing entitlement
  -- Use exception handling to prevent user creation from failing
  BEGIN
    UPDATE entitlements
    SET user_id = NEW.id
    WHERE email = LOWER(NEW.email) AND user_id IS NULL;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log warning but don't fail user creation
      -- This allows users to sign up even if entitlement linking fails
      RAISE WARNING 'Failed to link entitlement for user %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_entitlement_to_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entitlements_updated_at ON entitlements;
CREATE TRIGGER entitlements_updated_at
  BEFORE UPDATE ON entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_entitlements_updated_at();

-- ============================================
-- SPRINT 3: User Designs Table for Template Management
-- ============================================

-- User designs table - stores watermark templates
CREATE TABLE IF NOT EXISTS user_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layers JSONB NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_designs_user_id ON user_designs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_designs_created_at ON user_designs(created_at DESC);

-- RLS Policies
ALTER TABLE user_designs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own designs
DROP POLICY IF EXISTS user_designs_select ON user_designs;
CREATE POLICY user_designs_select ON user_designs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own designs
DROP POLICY IF EXISTS user_designs_insert ON user_designs;
CREATE POLICY user_designs_insert ON user_designs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own designs
DROP POLICY IF EXISTS user_designs_update ON user_designs;
CREATE POLICY user_designs_update ON user_designs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own designs
DROP POLICY IF EXISTS user_designs_delete ON user_designs;
CREATE POLICY user_designs_delete ON user_designs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at (reuse existing function or create new)
CREATE OR REPLACE FUNCTION update_user_designs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_designs_updated_at ON user_designs;
CREATE TRIGGER user_designs_updated_at
  BEFORE UPDATE ON user_designs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_designs_updated_at();

-- ============================================
-- SPRINT 4: User Sessions Table for Temporary Image Storage (24-Hour TTL)
-- ============================================

-- User sessions table - tracks uploaded image batches
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  images_folder TEXT NOT NULL, -- storage path: users/{user_id}/sessions/{session_id}/originals/
  exports_folder TEXT, -- storage path for watermarked exports
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  image_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, expires_at) 
  WHERE expires_at > NOW();

-- RLS Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
DROP POLICY IF EXISTS user_sessions_select ON user_sessions;
CREATE POLICY user_sessions_select ON user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own sessions
DROP POLICY IF EXISTS user_sessions_insert ON user_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own sessions
DROP POLICY IF EXISTS user_sessions_update ON user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own sessions
DROP POLICY IF EXISTS user_sessions_delete ON user_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket RLS policies (run after creating bucket in Supabase Dashboard)
-- Note: These policies must be created after the 'user-sessions' bucket is created
-- Users can only upload to their own folder
-- CREATE POLICY "Users can upload to own session folder"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'user-sessions' AND
--   (storage.foldername(name))[1] = 'users' AND
--   (storage.foldername(name))[2] = auth.uid()::text
-- );

-- Users can only read from their own folder
-- CREATE POLICY "Users can read own session files"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'user-sessions' AND
--   (storage.foldername(name))[1] = 'users' AND
--   (storage.foldername(name))[2] = auth.uid()::text
-- );

-- Users can only delete from their own folder
-- CREATE POLICY "Users can delete own session files"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'user-sessions' AND
--   (storage.foldername(name))[1] = 'users' AND
--   (storage.foldername(name))[2] = auth.uid()::text
-- );

-- Cleanup function for expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
DECLARE
  expired_session RECORD;
BEGIN
  -- Get all expired sessions
  FOR expired_session IN 
    SELECT id, images_folder, exports_folder
    FROM user_sessions
    WHERE expires_at < NOW()
  LOOP
    -- Note: Storage deletion must happen via Supabase API
    -- This function only deletes the session record
    -- Storage cleanup will happen via scheduled job
    
    DELETE FROM user_sessions WHERE id = expired_session.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Enable pg_cron extension and schedule cleanup (if available)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'cleanup-expired-sessions',
--   '0 * * * *', -- Every hour
--   $$SELECT cleanup_expired_sessions()$$
-- );

