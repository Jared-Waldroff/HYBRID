-- Add liability waiver tracking to athlete_profiles
-- This stores the timestamp of when the user agreed to the AI Coach terms

ALTER TABLE athlete_profiles 
ADD COLUMN IF NOT EXISTS agreed_to_terms_at TIMESTAMPTZ;

-- Comment for clarity
COMMENT ON COLUMN athlete_profiles.agreed_to_terms_at IS 'Timestamp when user agreed to liability waiver/medical disclaimer';
