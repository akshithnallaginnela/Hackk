-- Enable pg_trgm if necessary for indexing later, but standard arrays are fine for client-side comparison
-- Create a table for storing 128-dimensional face descriptors
CREATE TABLE user_face_descriptors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descriptor FLOAT8[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure only one descriptor set per user
  CONSTRAINT unique_user_descriptor UNIQUE (user_id)
);

-- Enable Row-Level Security
ALTER TABLE user_face_descriptors ENABLE ROW LEVEL SECURITY;

-- Create Policies

-- 1. Users can only read their own descriptor
CREATE POLICY "Users can view own descriptor"
ON user_face_descriptors
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Users can insert their own descriptor
CREATE POLICY "Users can insert own descriptor"
ON user_face_descriptors
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own descriptor
CREATE POLICY "Users can update own descriptor"
ON user_face_descriptors
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_face_descriptors_updated_at
BEFORE UPDATE ON user_face_descriptors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
