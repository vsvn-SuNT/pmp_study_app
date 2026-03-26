-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add user_id column to study_sessions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='study_sessions' AND column_name='user_id') THEN
    ALTER TABLE study_sessions ADD COLUMN user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Create index for user sessions lookup
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON study_sessions(user_id);

-- Create composite index for user + exam_set lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_exam ON study_sessions(user_id, exam_set_id);

-- Create unique constraint: user can have only one in-progress session per exam
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_exam_inprogress 
ON study_sessions(user_id, exam_set_id) 
WHERE status = 'in_progress';

