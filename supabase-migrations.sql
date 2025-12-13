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



