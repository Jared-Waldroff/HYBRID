-- =============================================
-- Squad Events & Accountability System
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. SQUAD EVENTS (Marathons, HYROX, CrossFit, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS squad_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Event Details
    name TEXT NOT NULL,                           -- "Seattle Marathon 2026"
    event_type TEXT NOT NULL,                     -- marathon, hyrox, crossfit, etc.
    description TEXT,
    event_date DATE NOT NULL,                     -- The actual event day
    cover_image_url TEXT,                         -- Optional event banner
    
    -- Privacy & Visibility
    is_private BOOLEAN DEFAULT false,             -- false = public (anyone can see), true = squad only
    
    -- Template Info (if created from template)
    template_id TEXT,                             -- e.g., 'marathon_beginner', 'hyrox_12week'
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_squad_events_creator ON squad_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_squad_events_type ON squad_events(event_type);
CREATE INDEX IF NOT EXISTS idx_squad_events_date ON squad_events(event_date);
CREATE INDEX IF NOT EXISTS idx_squad_events_active ON squad_events(is_active);

-- =============================================
-- 2. EVENT PARTICIPANTS
-- =============================================
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES squad_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification Preferences
    notification_frequency TEXT DEFAULT 'weekly' 
        CHECK (notification_frequency IN ('daily', 'weekly', 'biweekly', 'none')),
    
    -- Timestamps
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON event_participants(user_id);

-- =============================================
-- 3. EVENT TRAINING WORKOUTS (Training Plan)
-- =============================================
CREATE TABLE IF NOT EXISTS event_training_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES squad_events(id) ON DELETE CASCADE,
    
    -- Workout Definition
    name TEXT NOT NULL,                           -- "Long Run", "Tempo Run", "Zone 2 Easy"
    description TEXT,
    workout_type TEXT NOT NULL                    -- 'distance', 'time', 'weight', 'reps', 'zone', 'custom'
        CHECK (workout_type IN ('distance', 'time', 'weight', 'reps', 'zone', 'custom')),
    
    -- Target Metrics (what participants should aim for)
    target_value DECIMAL,                         -- e.g., 10 (km), 45 (minutes), 100 (kg)
    target_unit TEXT,                             -- 'km', 'miles', 'minutes', 'hours', 'kg', 'lbs', 'reps'
    target_zone TEXT                              -- 'zone1', 'zone2', 'zone3', 'zone4', 'zone5'
        CHECK (target_zone IS NULL OR target_zone IN ('zone1', 'zone2', 'zone3', 'zone4', 'zone5')),
    
    -- Additional target info for complex workouts
    target_notes TEXT,                            -- "4x800m repeats at 5K pace"
    
    -- Scheduling
    days_before_event INTEGER NOT NULL,           -- e.g., 30 = "30 days before event"
    is_required BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,                -- For ordering within same day
    
    -- Color coding
    color TEXT DEFAULT '#6366f1',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_workouts_event ON event_training_workouts(event_id);
CREATE INDEX IF NOT EXISTS idx_training_workouts_days ON event_training_workouts(days_before_event);

-- =============================================
-- 4. EVENT WORKOUT COMPLETIONS
-- =============================================
CREATE TABLE IF NOT EXISTS event_workout_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_workout_id UUID NOT NULL REFERENCES event_training_workouts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,  -- Link to actual workout log
    
    -- Actual Results
    actual_value DECIMAL,                         -- What they actually achieved
    actual_unit TEXT,
    actual_zone TEXT
        CHECK (actual_zone IS NULL OR actual_zone IN ('zone1', 'zone2', 'zone3', 'zone4', 'zone5')),
    duration_seconds INTEGER,                     -- How long the workout took
    
    -- Notes
    notes TEXT,
    feeling TEXT                                  -- 'great', 'good', 'ok', 'tough', 'struggled'
        CHECK (feeling IS NULL OR feeling IN ('great', 'good', 'ok', 'tough', 'struggled')),
    
    -- Completion
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(training_workout_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_completions_workout ON event_workout_completions(training_workout_id);
CREATE INDEX IF NOT EXISTS idx_completions_user ON event_workout_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_date ON event_workout_completions(completed_at);

-- =============================================
-- 5. ACTIVITY FEED POSTS
-- =============================================
CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES squad_events(id) ON DELETE CASCADE,
    completion_id UUID REFERENCES event_workout_completions(id) ON DELETE CASCADE,
    
    -- Post Content
    caption TEXT,
    photo_urls TEXT[] DEFAULT '{}',               -- Up to 5 photos
    
    -- Cached counts for performance
    lfg_count INTEGER DEFAULT 0,                  -- "Let's Fucking Go!" reactions
    comment_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_event ON activity_feed(event_id);
CREATE INDEX IF NOT EXISTS idx_feed_created ON activity_feed(created_at DESC);

-- =============================================
-- 6. FEED REACTIONS (LFG!)
-- =============================================
CREATE TABLE IF NOT EXISTS feed_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Currently only LFG, but room for expansion
    reaction_type TEXT DEFAULT 'lfg'
        CHECK (reaction_type IN ('lfg')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(post_id, user_id, reaction_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reactions_post ON feed_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON feed_reactions(user_id);

-- =============================================
-- 7. FEED COMMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS feed_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Comment content
    content TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_post ON feed_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON feed_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON feed_comments(created_at);

-- =============================================
-- 8. EVENT TEMPLATES (Pre-built training plans)
-- =============================================
CREATE TABLE IF NOT EXISTS event_templates (
    id TEXT PRIMARY KEY,                          -- 'marathon_beginner', 'hyrox_12week'
    
    -- Template Info
    name TEXT NOT NULL,                           -- "Marathon - Beginner (16 weeks)"
    event_type TEXT NOT NULL,
    description TEXT,
    duration_weeks INTEGER NOT NULL,
    difficulty TEXT DEFAULT 'intermediate'
        CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    
    -- The actual training plan as JSONB
    -- Format: [{ name, description, workout_type, target_value, target_unit, target_zone, days_before_event, is_required, color }]
    training_plan JSONB NOT NULL,
    
    -- Template metadata
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

ALTER TABLE squad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_training_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_workout_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;

-- SQUAD EVENTS: Public events visible to all, private events only to participants
CREATE POLICY "Anyone can view public events" ON squad_events
    FOR SELECT USING (is_private = false);

CREATE POLICY "Participants can view private events" ON squad_events
    FOR SELECT USING (
        is_private = true AND (
            creator_id = auth.uid() OR
            EXISTS (SELECT 1 FROM event_participants WHERE event_id = squad_events.id AND user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create events" ON squad_events
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their events" ON squad_events
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Creators can delete their events" ON squad_events
    FOR DELETE USING (creator_id = auth.uid());

-- EVENT PARTICIPANTS: Users can see participants of events they can see
CREATE POLICY "View participants of accessible events" ON event_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM squad_events 
            WHERE squad_events.id = event_participants.event_id
            AND (squad_events.is_private = false OR squad_events.creator_id = auth.uid() OR
                EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = squad_events.id AND ep.user_id = auth.uid()))
        )
    );

CREATE POLICY "Users can join events" ON event_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their participation" ON event_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can leave events" ON event_participants
    FOR DELETE USING (user_id = auth.uid());

-- TRAINING WORKOUTS: Visible to anyone who can see the event
CREATE POLICY "View training workouts of accessible events" ON event_training_workouts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM squad_events 
            WHERE squad_events.id = event_training_workouts.event_id
            AND (squad_events.is_private = false OR squad_events.creator_id = auth.uid() OR
                EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = squad_events.id AND ep.user_id = auth.uid()))
        )
    );

CREATE POLICY "Creators can manage training workouts" ON event_training_workouts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM squad_events WHERE squad_events.id = event_training_workouts.event_id AND squad_events.creator_id = auth.uid())
    );

-- WORKOUT COMPLETIONS: Users can see completions for events they can access
CREATE POLICY "View completions of accessible events" ON event_workout_completions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_training_workouts tw
            JOIN squad_events se ON se.id = tw.event_id
            WHERE tw.id = event_workout_completions.training_workout_id
            AND (se.is_private = false OR se.creator_id = auth.uid() OR
                EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = se.id AND ep.user_id = auth.uid()))
        )
    );

CREATE POLICY "Users can complete their own workouts" ON event_workout_completions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own completions" ON event_workout_completions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own completions" ON event_workout_completions
    FOR DELETE USING (user_id = auth.uid());

-- ACTIVITY FEED: Visible based on event privacy
CREATE POLICY "View feed of accessible events" ON activity_feed
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM squad_events 
            WHERE squad_events.id = activity_feed.event_id
            AND (squad_events.is_private = false OR squad_events.creator_id = auth.uid() OR
                EXISTS (SELECT 1 FROM event_participants ep WHERE ep.event_id = squad_events.id AND ep.user_id = auth.uid()))
        )
    );

CREATE POLICY "Users can create their own posts" ON activity_feed
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own posts" ON activity_feed
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts" ON activity_feed
    FOR DELETE USING (user_id = auth.uid());

-- FEED REACTIONS: Anyone who can see the post can react
CREATE POLICY "View reactions on accessible posts" ON feed_reactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM activity_feed WHERE activity_feed.id = feed_reactions.post_id)
    );

CREATE POLICY "Users can add reactions" ON feed_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their reactions" ON feed_reactions
    FOR DELETE USING (user_id = auth.uid());

-- FEED COMMENTS: Anyone who can see the post can comment
CREATE POLICY "View comments on accessible posts" ON feed_comments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM activity_feed WHERE activity_feed.id = feed_comments.post_id)
    );

CREATE POLICY "Users can add comments" ON feed_comments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments" ON feed_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON feed_comments
    FOR DELETE USING (user_id = auth.uid());

-- EVENT TEMPLATES: Everyone can view templates
CREATE POLICY "Anyone can view templates" ON event_templates
    FOR SELECT USING (true);

-- =============================================
-- TRIGGER: Update LFG count on reaction changes
-- =============================================
CREATE OR REPLACE FUNCTION update_lfg_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE activity_feed SET lfg_count = lfg_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE activity_feed SET lfg_count = GREATEST(0, lfg_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_lfg_count ON feed_reactions;
CREATE TRIGGER trigger_update_lfg_count
    AFTER INSERT OR DELETE ON feed_reactions
    FOR EACH ROW EXECUTE FUNCTION update_lfg_count();

-- =============================================
-- TRIGGER: Update comment count on comment changes
-- =============================================
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE activity_feed SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE activity_feed SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_comment_count ON feed_comments;
CREATE TRIGGER trigger_update_comment_count
    AFTER INSERT OR DELETE ON feed_comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- =============================================
-- TRIGGER: Auto-update updated_at timestamps
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_squad_events_updated ON squad_events;
CREATE TRIGGER trigger_squad_events_updated
    BEFORE UPDATE ON squad_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_activity_feed_updated ON activity_feed;
CREATE TRIGGER trigger_activity_feed_updated
    BEFORE UPDATE ON activity_feed
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_feed_comments_updated ON feed_comments;
CREATE TRIGGER trigger_feed_comments_updated
    BEFORE UPDATE ON feed_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- SEED: Event Templates
-- =============================================
INSERT INTO event_templates (id, name, event_type, description, duration_weeks, difficulty, training_plan) VALUES

-- Marathon Beginner (16 weeks)
('marathon_beginner', 'Marathon - Beginner (16 weeks)', 'marathon', 
'A gentle introduction to marathon training. Builds mileage gradually with plenty of rest days. Perfect for first-time marathoners.',
16, 'beginner',
'[
    {"name": "Easy Run", "workout_type": "distance", "target_value": 5, "target_unit": "km", "target_zone": "zone2", "days_before_event": 112, "is_required": true, "color": "#10b981"},
    {"name": "Easy Run", "workout_type": "distance", "target_value": 5, "target_unit": "km", "target_zone": "zone2", "days_before_event": 110, "is_required": true, "color": "#10b981"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 10, "target_unit": "km", "target_zone": "zone2", "days_before_event": 105, "is_required": true, "color": "#3b82f6"},
    {"name": "Easy Run", "workout_type": "distance", "target_value": 6, "target_unit": "km", "target_zone": "zone2", "days_before_event": 98, "is_required": true, "color": "#10b981"},
    {"name": "Tempo Run", "workout_type": "distance", "target_value": 5, "target_unit": "km", "target_zone": "zone3", "days_before_event": 96, "is_required": true, "color": "#f97316"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 13, "target_unit": "km", "target_zone": "zone2", "days_before_event": 91, "is_required": true, "color": "#3b82f6"},
    {"name": "Easy Run", "workout_type": "distance", "target_value": 8, "target_unit": "km", "target_zone": "zone2", "days_before_event": 84, "is_required": true, "color": "#10b981"},
    {"name": "Interval Training", "workout_type": "custom", "target_notes": "6x800m at 5K pace with 400m recovery", "days_before_event": 82, "is_required": true, "color": "#ef4444"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 16, "target_unit": "km", "target_zone": "zone2", "days_before_event": 77, "is_required": true, "color": "#3b82f6"},
    {"name": "Easy Run", "workout_type": "distance", "target_value": 10, "target_unit": "km", "target_zone": "zone2", "days_before_event": 70, "is_required": true, "color": "#10b981"},
    {"name": "Tempo Run", "workout_type": "distance", "target_value": 8, "target_unit": "km", "target_zone": "zone3", "days_before_event": 68, "is_required": true, "color": "#f97316"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 19, "target_unit": "km", "target_zone": "zone2", "days_before_event": 63, "is_required": true, "color": "#3b82f6"},
    {"name": "Recovery Run", "workout_type": "distance", "target_value": 5, "target_unit": "km", "target_zone": "zone1", "days_before_event": 56, "is_required": true, "color": "#115e59"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 22, "target_unit": "km", "target_zone": "zone2", "days_before_event": 49, "is_required": true, "color": "#3b82f6"},
    {"name": "Easy Run", "workout_type": "distance", "target_value": 10, "target_unit": "km", "target_zone": "zone2", "days_before_event": 42, "is_required": true, "color": "#10b981"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 26, "target_unit": "km", "target_zone": "zone2", "days_before_event": 35, "is_required": true, "color": "#3b82f6"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 29, "target_unit": "km", "target_zone": "zone2", "days_before_event": 28, "is_required": true, "color": "#3b82f6"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 32, "target_unit": "km", "target_zone": "zone2", "days_before_event": 21, "is_required": true, "color": "#3b82f6"},
    {"name": "Taper Run", "workout_type": "distance", "target_value": 16, "target_unit": "km", "target_zone": "zone2", "days_before_event": 14, "is_required": true, "color": "#115e59"},
    {"name": "Taper Run", "workout_type": "distance", "target_value": 10, "target_unit": "km", "target_zone": "zone2", "days_before_event": 7, "is_required": true, "color": "#115e59"},
    {"name": "Shakeout Run", "workout_type": "distance", "target_value": 3, "target_unit": "km", "target_zone": "zone1", "days_before_event": 1, "is_required": false, "color": "#115e59"}
]'::jsonb),

-- HYROX 12-Week Program
('hyrox_12week', 'HYROX - Race Ready (12 weeks)', 'hyrox',
'Complete HYROX preparation covering running, functional stations, and race simulation. Builds both engine and station-specific skills.',
12, 'intermediate',
'[
    {"name": "Zone 2 Run", "workout_type": "time", "target_value": 45, "target_unit": "minutes", "target_zone": "zone2", "days_before_event": 84, "is_required": true, "color": "#10b981"},
    {"name": "SkiErg Intervals", "workout_type": "custom", "target_notes": "5x500m with 90s rest", "days_before_event": 82, "is_required": true, "color": "#f97316"},
    {"name": "Sled Push Practice", "workout_type": "distance", "target_value": 200, "target_unit": "m", "target_zone": null, "days_before_event": 80, "is_required": true, "color": "#6366f1"},
    {"name": "Zone 2 Run", "workout_type": "time", "target_value": 50, "target_unit": "minutes", "target_zone": "zone2", "days_before_event": 77, "is_required": true, "color": "#10b981"},
    {"name": "Wall Balls", "workout_type": "reps", "target_value": 100, "target_unit": "reps", "days_before_event": 75, "is_required": true, "color": "#6366f1"},
    {"name": "Rowing Intervals", "workout_type": "custom", "target_notes": "4x1000m with 2min rest", "days_before_event": 73, "is_required": true, "color": "#f97316"},
    {"name": "Brick Workout", "workout_type": "custom", "target_notes": "1km run + 50 wall balls + 1km run + 50 lunges", "days_before_event": 70, "is_required": true, "color": "#ef4444"},
    {"name": "Zone 2 Run", "workout_type": "time", "target_value": 60, "target_unit": "minutes", "target_zone": "zone2", "days_before_event": 63, "is_required": true, "color": "#10b981"},
    {"name": "Farmers Carry", "workout_type": "distance", "target_value": 400, "target_unit": "m", "target_notes": "32kg/24kg KBs", "days_before_event": 61, "is_required": true, "color": "#6366f1"},
    {"name": "Burpee Broad Jumps", "workout_type": "reps", "target_value": 80, "target_unit": "reps", "days_before_event": 59, "is_required": true, "color": "#6366f1"},
    {"name": "Race Simulation", "workout_type": "custom", "target_notes": "Half HYROX: 4 stations with 1km runs between", "days_before_event": 49, "is_required": true, "color": "#ef4444"},
    {"name": "Zone 2 Run", "workout_type": "time", "target_value": 60, "target_unit": "minutes", "target_zone": "zone2", "days_before_event": 42, "is_required": true, "color": "#10b981"},
    {"name": "Full HYROX Simulation", "workout_type": "custom", "target_notes": "All 8 stations with 1km runs - race pace", "days_before_event": 28, "is_required": true, "color": "#ef4444"},
    {"name": "Easy Run", "workout_type": "time", "target_value": 30, "target_unit": "minutes", "target_zone": "zone2", "days_before_event": 14, "is_required": true, "color": "#115e59"},
    {"name": "Station Practice", "workout_type": "custom", "target_notes": "Light practice on weakest 2 stations", "days_before_event": 7, "is_required": false, "color": "#115e59"},
    {"name": "Shakeout", "workout_type": "time", "target_value": 20, "target_unit": "minutes", "target_zone": "zone1", "days_before_event": 1, "is_required": false, "color": "#115e59"}
]'::jsonb),

-- Half Marathon Intermediate
('half_marathon_intermediate', 'Half Marathon - Intermediate (12 weeks)', 'half_marathon',
'For runners with a solid base looking to improve their half marathon time. Includes tempo runs, intervals, and progressive long runs.',
12, 'intermediate',
'[
    {"name": "Easy Run", "workout_type": "distance", "target_value": 8, "target_unit": "km", "target_zone": "zone2", "days_before_event": 84, "is_required": true, "color": "#10b981"},
    {"name": "Tempo Run", "workout_type": "distance", "target_value": 6, "target_unit": "km", "target_zone": "zone3", "days_before_event": 82, "is_required": true, "color": "#f97316"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 14, "target_unit": "km", "target_zone": "zone2", "days_before_event": 77, "is_required": true, "color": "#3b82f6"},
    {"name": "Interval Training", "workout_type": "custom", "target_notes": "8x400m at 5K pace with 200m jog", "days_before_event": 75, "is_required": true, "color": "#ef4444"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 16, "target_unit": "km", "target_zone": "zone2", "days_before_event": 63, "is_required": true, "color": "#3b82f6"},
    {"name": "Tempo Run", "workout_type": "distance", "target_value": 8, "target_unit": "km", "target_zone": "zone3", "days_before_event": 54, "is_required": true, "color": "#f97316"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 18, "target_unit": "km", "target_zone": "zone2", "days_before_event": 49, "is_required": true, "color": "#3b82f6"},
    {"name": "Race Pace Run", "workout_type": "distance", "target_value": 10, "target_unit": "km", "target_zone": "zone3", "days_before_event": 35, "is_required": true, "color": "#f97316"},
    {"name": "Long Run", "workout_type": "distance", "target_value": 20, "target_unit": "km", "target_zone": "zone2", "days_before_event": 28, "is_required": true, "color": "#3b82f6"},
    {"name": "Taper Run", "workout_type": "distance", "target_value": 12, "target_unit": "km", "target_zone": "zone2", "days_before_event": 14, "is_required": true, "color": "#115e59"},
    {"name": "Taper Run", "workout_type": "distance", "target_value": 8, "target_unit": "km", "target_zone": "zone2", "days_before_event": 7, "is_required": true, "color": "#115e59"},
    {"name": "Shakeout", "workout_type": "distance", "target_value": 3, "target_unit": "km", "target_zone": "zone1", "days_before_event": 1, "is_required": false, "color": "#115e59"}
]'::jsonb),

-- CrossFit Open Prep
('crossfit_open_8week', 'CrossFit Open Prep (8 weeks)', 'crossfit',
'Get ready for the CrossFit Open with skill work, conditioning, and benchmark testing.',
8, 'intermediate',
'[
    {"name": "Gymnastics Skill Work", "workout_type": "custom", "target_notes": "15min EMOM: 3-5 Muscle-ups or progressions", "days_before_event": 56, "is_required": true, "color": "#6366f1"},
    {"name": "Conditioning", "workout_type": "custom", "target_notes": "3 RFT: 21-15-9 Thrusters (95/65) + Pull-ups", "days_before_event": 54, "is_required": true, "color": "#ef4444"},
    {"name": "Strength", "workout_type": "weight", "target_value": null, "target_unit": "kg", "target_notes": "Back Squat 5x5 at 75%", "days_before_event": 52, "is_required": true, "color": "#1e3a5f"},
    {"name": "Double-Under Practice", "workout_type": "time", "target_value": 15, "target_unit": "minutes", "target_notes": "Practice unbroken sets", "days_before_event": 49, "is_required": true, "color": "#6366f1"},
    {"name": "Hero WOD", "workout_type": "custom", "target_notes": "Murph (partitioned OK): 1mi run, 100 pull-ups, 200 push-ups, 300 squats, 1mi run", "days_before_event": 42, "is_required": true, "color": "#ef4444"},
    {"name": "Barbell Cycling", "workout_type": "custom", "target_notes": "EMOM 12: 3 Power Cleans + 3 Front Squats + 3 Push Jerks", "days_before_event": 35, "is_required": true, "color": "#f97316"},
    {"name": "Benchmark: Fran", "workout_type": "custom", "target_notes": "21-15-9 Thrusters (95/65) + Pull-ups - For Time", "days_before_event": 28, "is_required": true, "color": "#ef4444"},
    {"name": "Open Workout Practice", "workout_type": "custom", "target_notes": "2023 Open WOD of choice", "days_before_event": 21, "is_required": true, "color": "#6366f1"},
    {"name": "Mobility & Recovery", "workout_type": "time", "target_value": 30, "target_unit": "minutes", "target_notes": "Full body stretch and foam roll", "days_before_event": 7, "is_required": false, "color": "#115e59"}
]'::jsonb),

-- 5K Training Plan
('5k_beginner', '5K - Couch to 5K (8 weeks)', '5k',
'Go from zero to 5K in 8 weeks. Walk/run intervals that progressively build your running base.',
8, 'beginner',
'[
    {"name": "Walk/Run", "workout_type": "time", "target_value": 20, "target_unit": "minutes", "target_notes": "Alternate 60s jog / 90s walk", "days_before_event": 56, "is_required": true, "color": "#10b981"},
    {"name": "Walk/Run", "workout_type": "time", "target_value": 20, "target_unit": "minutes", "target_notes": "Alternate 90s jog / 90s walk", "days_before_event": 49, "is_required": true, "color": "#10b981"},
    {"name": "Walk/Run", "workout_type": "time", "target_value": 22, "target_unit": "minutes", "target_notes": "Alternate 3min jog / 90s walk", "days_before_event": 42, "is_required": true, "color": "#10b981"},
    {"name": "Walk/Run", "workout_type": "time", "target_value": 25, "target_unit": "minutes", "target_notes": "Alternate 5min jog / 2min walk", "days_before_event": 35, "is_required": true, "color": "#10b981"},
    {"name": "Continuous Run", "workout_type": "time", "target_value": 20, "target_unit": "minutes", "target_notes": "First continuous run!", "days_before_event": 28, "is_required": true, "color": "#3b82f6"},
    {"name": "Continuous Run", "workout_type": "time", "target_value": 25, "target_unit": "minutes", "target_zone": "zone2", "days_before_event": 21, "is_required": true, "color": "#3b82f6"},
    {"name": "Continuous Run", "workout_type": "time", "target_value": 30, "target_unit": "minutes", "target_zone": "zone2", "days_before_event": 14, "is_required": true, "color": "#3b82f6"},
    {"name": "Easy Run", "workout_type": "time", "target_value": 20, "target_unit": "minutes", "target_zone": "zone2", "days_before_event": 7, "is_required": true, "color": "#115e59"},
    {"name": "Shakeout", "workout_type": "time", "target_value": 10, "target_unit": "minutes", "target_zone": "zone1", "days_before_event": 1, "is_required": false, "color": "#115e59"}
]'::jsonb)

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    event_type = EXCLUDED.event_type,
    description = EXCLUDED.description,
    duration_weeks = EXCLUDED.duration_weeks,
    difficulty = EXCLUDED.difficulty,
    training_plan = EXCLUDED.training_plan;

-- =============================================
-- FUNCTION: Get participant progress for an event
-- =============================================
CREATE OR REPLACE FUNCTION get_event_progress(p_event_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    total_workouts INTEGER,
    completed_workouts INTEGER,
    completion_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ep.user_id,
        ap.display_name,
        ap.avatar_url,
        COUNT(DISTINCT etw.id)::INTEGER as total_workouts,
        COUNT(DISTINCT ewc.id)::INTEGER as completed_workouts,
        CASE 
            WHEN COUNT(DISTINCT etw.id) > 0 
            THEN ROUND((COUNT(DISTINCT ewc.id)::DECIMAL / COUNT(DISTINCT etw.id)::DECIMAL) * 100, 1)
            ELSE 0
        END as completion_percentage
    FROM event_participants ep
    JOIN athlete_profiles ap ON ap.user_id = ep.user_id
    LEFT JOIN event_training_workouts etw ON etw.event_id = ep.event_id
    LEFT JOIN event_workout_completions ewc ON ewc.training_workout_id = etw.id AND ewc.user_id = ep.user_id
    WHERE ep.event_id = p_event_id
    GROUP BY ep.user_id, ap.display_name, ap.avatar_url
    ORDER BY completion_percentage DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Enable realtime for activity feed
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'activity_feed'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;
    END IF;
END $$;

-- =============================================
-- Success! Squad Events system is ready.
-- =============================================
