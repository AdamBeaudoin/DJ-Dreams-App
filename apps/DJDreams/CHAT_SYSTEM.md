# Real-Time Chat System Documentation

## 🚀 Features Implemented

### ✅ Real-Time Messaging
- **Supabase Real-Time**: Messages appear instantly across all connected users
- **Connection Status**: Visual indicator showing real-time connection status
- **Auto-Scroll**: Automatically scrolls to newest messages

### ✅ Message Persistence
- **Database Storage**: All messages stored in Supabase PostgreSQL database  
- **Session Persistence**: Messages persist between browser sessions
- **Message History**: Loads last 50 messages on page load

### ✅ Content Moderation
- **Profanity Filter**: Automatic filtering of inappropriate content using `bad-words` library
- **Custom Word List**: Includes DJ/music-specific moderation terms
- **Visual Indicators**: Moderated messages show warning icon (⚠️)
- **User Feedback**: Toast notifications for moderated content

### ✅ Enhanced Security
- **World ID Verification**: Only verified humans can send messages
- **Message Validation**: Length limits, spam detection, caps lock detection
- **User Identification**: Unique usernames based on World ID nullifier hash

## 🏗️ Architecture

### Frontend
- **`ChatRoom` Component**: Main UI component with verification & messaging
- **`useRealtimeChat` Hook**: Manages real-time subscriptions and message sending
- **Real-Time Updates**: Supabase real-time subscriptions for instant message delivery

### Backend
- **`/api/chat/send`**: Handles message sending with moderation
- **`/api/chat/messages`**: Fetches message history
- **`/api/verify`**: World ID verification (existing)

### Database Schema
```sql
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  verified BOOLEAN DEFAULT true,
  nullifier_hash TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_moderated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js bad-words
```

### 2. Configure Supabase
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `SUPABASE_SETUP.md`
3. Add environment variables to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Enable Real-Time
In your Supabase dashboard:
1. Go to Database → Replication
2. Enable replication for the `messages` table

## 💬 Usage Flow

1. **User arrives** → Loads message history from database
2. **User verifies World ID** → Becomes eligible to send messages
3. **User sends message** → Message is validated → Moderated → Stored → Broadcast
4. **Real-time updates** → All connected users see new messages instantly

## 🔧 Moderation Rules

### Automatic Filtering
- Profanity detection and replacement with asterisks
- Spam keywords: 'spam', 'scam', 'bot', 'fake'
- Message length limit: 200 characters
- Excessive repeated characters blocked
- Excessive caps lock (>70%) blocked

### Visual Feedback
- Clean messages: Normal display
- Moderated messages: Warning icon (⚠️) + toast notification
- Failed messages: Error toast with specific reason

## 🎯 Production Considerations

### Performance
- Message history limited to 50 recent messages
- Real-time subscription with rate limiting (10 events/second)
- Efficient PostgreSQL indexes on timestamp and user_id

### Security
- Row Level Security (RLS) enabled
- Only verified World ID users can insert messages
- All users can read messages (public chat)
- Server-side message validation and moderation

### Monitoring
- Console logging for moderation actions
- Database indexes for query performance
- Connection status indicators

## 🚀 Future Enhancements

### Potential Features
- [ ] Message reactions/emojis
- [ ] User typing indicators  
- [ ] Message threading/replies
- [ ] User mention system (@username)
- [ ] Message history pagination
- [ ] Admin moderation panel
- [ ] Chat rooms/channels
- [ ] Private direct messages
- [ ] Image/media sharing
- [ ] Message encryption

### Technical Improvements
- [ ] Redis caching for message history
- [ ] CDN integration for media
- [ ] Advanced AI moderation
- [ ] Message search functionality
- [ ] Export chat history
- [ ] Mobile push notifications

## 🐛 Troubleshooting

### Common Issues
1. **Messages not appearing**: Check Supabase real-time connection status
2. **Can't send messages**: Ensure World ID verification completed
3. **Moderation too strict**: Adjust filter settings in `moderation.ts`
4. **Database errors**: Check Supabase configuration and RLS policies

### Debug Mode
Enable console logging by checking browser developer tools for:
- Real-time subscription status
- Message moderation results
- API response errors 