/*
# Create School Management System Tables

## 1. New Tables

### profiles
- `id` (uuid, primary key, references auth.users)
- `username` (text, unique, not null)
- `full_name` (text)
- `role` (user_role enum: 'admin', 'teacher', 'user')
- `profile_picture` (text, URL to profile picture)
- `assigned_subject_id` (text, references subjects.id)
- `is_active` (boolean, default true)
- `created_at` (timestamptz, default now())

### subjects
- `id` (text, primary key)
- `name` (text, not null)
- `description` (text)
- `created_at` (timestamptz, default now())

### content
- `id` (uuid, primary key, default gen_random_uuid())
- `title` (text, not null)
- `body` (text)
- `type` (content_type enum: 'news', 'preparation', 'material')
- `subject_id` (text, references subjects.id, nullable for news)
- `author_id` (uuid, references profiles.id)
- `media_urls` (jsonb, array of media URLs)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## 2. Security

### RLS Policies:
- **profiles**: 
  - Public can read all profiles (for displaying author info)
  - Users can update their own profile (except role)
  - Admins have full access
  
- **subjects**:
  - Public read access (everyone can see subjects)
  - Only admins can create/update/delete
  
- **content**:
  - Public read access (everyone can see all content)
  - Teachers can create content for their assigned subject
  - Admins can create/update/delete any content
  - Authors can update/delete their own content

## 3. Notes
- All content is publicly readable (school-wide visibility)
- Teachers are restricted to their assigned subject
- Admins have full control
- Profile pictures stored as URLs
- First registered user becomes admin automatically
*/

-- Create enums
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'user');
CREATE TYPE content_type AS ENUM ('news', 'preparation', 'material');

-- Create subjects table first (no dependencies)
CREATE TABLE IF NOT EXISTS subjects (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  profile_picture text,
  assigned_subject_id text REFERENCES subjects(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create content table
CREATE TABLE IF NOT EXISTS content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  type content_type NOT NULL,
  subject_id text REFERENCES subjects(id) ON DELETE SET NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  media_urls jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_subject_id ON content(subject_id);
CREATE INDEX IF NOT EXISTS idx_content_author_id ON content(author_id);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at DESC);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;

-- Helper function to get user's assigned subject
CREATE OR REPLACE FUNCTION get_user_subject(uid uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER AS $$
  SELECT assigned_subject_id FROM profiles WHERE id = uid;
$$;

-- Auto-sync new users to profiles table
-- First user becomes admin, others become regular users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  new_username text;
BEGIN
  -- Count existing profiles
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- Extract username from email (format: username@miaoda.com)
  new_username := split_part(NEW.email, '@', 1);
  
  -- Insert new profile
  INSERT INTO profiles (id, username, role)
  VALUES (
    NEW.id,
    new_username,
    CASE WHEN user_count = 0 THEN 'admin'::user_role ELSE 'user'::user_role END
  );
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-sync users after email confirmation
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- Profiles policies
CREATE POLICY "Public can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL USING (is_admin(auth.uid()));

-- Subjects policies
CREATE POLICY "Public can view all subjects" ON subjects
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage subjects" ON subjects
  FOR ALL USING (is_admin(auth.uid()));

-- Content policies
CREATE POLICY "Public can view all content" ON content
  FOR SELECT USING (true);

CREATE POLICY "Teachers can create content for their subject" ON content
  FOR INSERT WITH CHECK (
    is_admin(auth.uid()) OR
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'::user_role AND
      (subject_id IS NULL OR subject_id = get_user_subject(auth.uid()))
    )
  );

CREATE POLICY "Authors can update own content" ON content
  FOR UPDATE USING (
    is_admin(auth.uid()) OR author_id = auth.uid()
  );

CREATE POLICY "Authors can delete own content" ON content
  FOR DELETE USING (
    is_admin(auth.uid()) OR author_id = auth.uid()
  );

-- Insert default subjects
INSERT INTO subjects (id, name, description) VALUES
  ('1', 'رياضيات', 'Mathematics'),
  ('2', 'عربي', 'Arabic Language'),
  ('3', 'إنكليزي', 'English Language'),
  ('4', 'أمن الشبكات', 'Network Security'),
  ('5', 'حماية أنظمة التشغيل', 'Operating System Protection'),
  ('6', 'القرآن الكريم', 'Holy Quran'),
  ('7', 'التطبيقات', 'Applications'),
  ('8', 'أساسيات الأمن السيبراني', 'Cybersecurity Fundamentals')
ON CONFLICT (id) DO NOTHING;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on content changes
CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create public view for profiles (for sharing)
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  id,
  username,
  full_name,
  profile_picture,
  assigned_subject_id,
  created_at
FROM profiles
WHERE is_active = true;