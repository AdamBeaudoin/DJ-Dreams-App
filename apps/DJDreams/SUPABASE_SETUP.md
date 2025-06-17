# Supabase Setup for Real-time Analytics

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key

## 2. Database Schema

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create user_sessions table
CREATE TABLE user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR UNIQUE NOT NULL,
  world_id VARCHAR UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  join_time TIMESTAMP WITH TIME ZONE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create viewer_analytics table
CREATE TABLE viewer_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  humans_here INTEGER DEFAULT 0,
  verified_viewers INTEGER DEFAULT 0,
  unique_humans INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_last_seen ON user_sessions(last_seen);
CREATE INDEX idx_user_sessions_world_id ON user_sessions(world_id);
CREATE INDEX idx_viewer_analytics_timestamp ON viewer_analytics(timestamp);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE viewer_analytics;
```

## 3. Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewer_analytics ENABLE ROW LEVEL SECURITY;

-- Allow public read access to analytics
CREATE POLICY "Allow public read access to analytics" ON viewer_analytics
  FOR SELECT USING (true);

-- Allow public insert to analytics
CREATE POLICY "Allow public insert to analytics" ON viewer_analytics
  FOR INSERT WITH CHECK (true);

-- Allow users to manage their own sessions
CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING (true);
```

## 4. Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 5. Real-time Features

The system automatically:
- ✅ Tracks user sessions when they visit
- ✅ Updates viewer count in real-time
- ✅ Handles World ID verification
- ✅ Cleans up sessions on page leave
- ✅ Shows live analytics like Vivo

## 6. Analytics Dashboard (Optional)

You can view analytics in Supabase dashboard or create a custom admin panel to see:
- Current viewers
- Verified vs unverified users
- Historical trends
- Peak viewing times

## 7. Production Considerations

- Set up proper RLS policies for your use case
- Consider rate limiting for session updates
- Add monitoring and alerting
- Implement proper error handling
- Add data retention policies 