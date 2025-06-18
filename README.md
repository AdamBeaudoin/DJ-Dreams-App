# 🎵 Aphex Tx Radio

A World App Mini-App for streaming DJ sets with World ID verification and real-time chat.

## ✨ Features

- **🔴 Live DJ Streaming** - Rotating DJ sets from around the world
- **🔀 Manual Shuffle** - Skip to the next DJ set anytime
- **💬 Live Chat** - Chat with other verified listeners
- **🌍 World ID Verification** - Secure identity verification via Worldcoin
- **📱 Mobile Optimized** - Touch-friendly interface for all devices
- **📊 Real-time Analytics** - Live viewer counts and engagement metrics

## 🚀 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentication**: World ID (Worldcoin MiniKit)
- **Video Player**: ReactPlayer
- **Database**: Supabase (optional)
- **Deployment**: Vercel

## 🎯 Live Demo

Visit the live app: [Coming Soon]

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd DJ_Stream_App
   ```

2. **Install dependencies**
   ```bash
   cd apps/aphex-tx-radio
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Environment Variables

Create a `.env.local` file in `apps/aphex-tx-radio/`:

```env
# Supabase (Optional - for real analytics)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# World ID (Optional - for real verification)
NEXT_PUBLIC_WORLD_APP_ID=your_world_app_id
NEXT_PUBLIC_WORLD_ACTION_ID=your_world_action_id
```

## 🎵 DJ Set Rotation

The app features 7 curated DJ sets that rotate automatically:

1. SEVEN - Carmen Electro
2. DJ Set - Electronic Mix  
3. Live DJ Performance
4. Underground House Mix
5. Techno Live Session
6. Electronic DJ Mix
7. Progressive House Set

## 🌍 World ID Integration

### Testing World ID

1. **Deploy to public URL** (required for World ID)
2. **Open in World App** on your mobile device
3. **Click "Verify World ID"** in the chat section
4. **Complete verification** through World App

### Mock Mode

For development, the app includes mock World ID verification that simulates the real flow without requiring actual verification.

## 📱 Mobile Experience

- **Responsive Design** - Optimized for all screen sizes
- **Touch-Friendly** - 44px minimum touch targets
- **iOS/Android** - Native app-like experience
- **World App Compatible** - Works seamlessly in World App browser

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect GitHub repository** to Vercel
2. **Set build settings**:
   - Build Command: `npm run build`
   - Output Directory: `apps/aphex-tx-radio/.next`
   - Root Directory: `apps/aphex-tx-radio`
3. **Add environment variables** in Vercel dashboard
4. **Deploy**

### Custom Domain

Configure your domain to point to the `/radio` subdirectory for the full `aphextx.com/radio` experience.

## 📊 Analytics

The app includes real-time analytics tracking:

- **Live Viewers** - Current active users
- **Verified Users** - World ID verified participants  
- **Total Visits** - Cumulative visitor count
- **Session Tracking** - User engagement metrics

## 🔧 Configuration

### Video Rotation

Modify `DJ_SETS` array in `src/components/stream-player.tsx` to update the playlist.

### Rotation Interval

Change `ROTATION_INTERVAL` constant to adjust auto-rotation timing (default: 2 hours).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Open a GitHub issue
- Contact: [your-contact-info]

---

Built with ❤️ for the Aphex Tx community 