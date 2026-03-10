-- Supabase Schema for HabitForge v2 (Anthropic prompt pack)

-- 1. profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  streak_freezes INT DEFAULT 2,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'own_profile' ON profiles FOR ALL USING (id = auth.uid());

-- Trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at)
  VALUES (new.id, new.raw_user_meta_data->>'username', NOW());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. habits
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  icon TEXT,
  color TEXT,
  frequency TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  category TEXT NOT NULL,
  goal_type TEXT,
  goal_value NUMERIC,
  sort_order INT DEFAULT 0,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'user_own_habits' ON habits FOR ALL USING (user_id = auth.uid());

-- 3. habit_logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completion_value NUMERIC,
  notes TEXT,
  mood TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, log_date)
);

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'user_own_logs' ON habit_logs FOR ALL USING (user_id = auth.uid());

-- 4. streaks
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_completed DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'user_own_streaks' ON streaks FOR ALL USING (user_id = auth.uid());

-- 5. achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INT DEFAULT 0,
  condition_type TEXT,
  condition_value TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'read_all_achievements' ON achievements FOR SELECT USING (true);

-- Seed achievements
INSERT INTO achievements (key, name, description, icon, xp_reward, category)
VALUES
  ('habitai_first', 'AI Explorer', 'Add your first HabiTAI habit', '🤖', 50, 'habitai'),
  ('habitai_streak_7', 'AI Believer', 'Keep an AI habit for 7 days', '🧠', 100, 'habitai'),
  ('habitai_all_added', 'Full Buy-In', 'Add all 3 AI suggestions', '✨', 150, 'habitai'),
  ('first_habit', 'The Journey Begins', 'Create your first habit', '🌱', 25, 'habits'),
  ('streak_3', 'On Fire', 'Hit a 3-day streak', '🔥', 50, 'streaks'),
  ('streak_7', 'Unstoppable', 'Hit a 7-day streak', '🚀', 100, 'streaks'),
  ('streak_30', 'Dedicated', 'Hit a 30-day streak', '🏆', 500, 'streaks'),
  ('habits_5', 'Multitasker', 'Maintain 5 active habits', '🤹', 100, 'habits'),
  ('perfect_week', 'Flawless', 'Complete all habits for a week', '⭐', 200, 'habits'),
  ('focus_10_sessions', 'Deep Worker', 'Complete 10 focus sessions', '🎯', 150, 'focus'),
  ('challenge_winner', 'Champion', 'Win a group challenge', '🥇', 300, 'social')
ON CONFLICT (key) DO NOTHING;

-- 6. user_achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'user_own_achievements' ON user_achievements FOR ALL USING (user_id = auth.uid());

-- 7. habitai_sessions
CREATE TABLE IF NOT EXISTS habitai_sessions (
  id KEY DEFAULT gen_random_uuid(), -- Fixed later
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  goal_category TEXT NOT NULL,
  goal_description TEXT,
  suggestions JSONB NOT NULL,
  habits_added UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE habitai_sessions DROP CONSTRAINT IF EXISTS habitai_sessions_pkey CASCADE;
ALTER TABLE habitai_sessions ADD PRIMARY KEY (id);

ALTER TABLE habitai_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'own_ai' ON habitai_sessions FOR ALL USING (user_id = auth.uid());

-- 8. challenges
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  habit_template JSONB,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'read_public_challenges' ON challenges FOR SELECT USING (is_public = true OR creator_id = auth.uid());
CREATE POLICY 'create_challenges' ON challenges FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY 'update_own_challenges' ON challenges FOR UPDATE USING (creator_id = auth.uid());

-- 9. challenge_members
CREATE TABLE IF NOT EXISTS challenge_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  progress_score INT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE challenge_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'read_challenge_members' ON challenge_members FOR SELECT USING (true);
CREATE POLICY 'join_challenges' ON challenge_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY 'update_own_progress' ON challenge_members FOR UPDATE USING (user_id = auth.uid());

-- 10. focus_sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,
  duration_minutes INT NOT NULL,
  completed BOOLEAN DEFAULT false,
  tick_enabled BOOLEAN DEFAULT true,
  volume NUMERIC DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'user_own_focus' ON focus_sessions FOR ALL USING (user_id = auth.uid());

-- 11. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL,
  days_of_week INT[] DEFAULT '{1,2,3,4,5,6,7}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, habit_id)
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY 'user_own_notifications' ON notifications FOR ALL USING (user_id = auth.uid());
