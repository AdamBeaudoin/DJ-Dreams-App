# DJ Dreams App

A live DJ streaming platform featuring curated sets from top electronic music artists, with World ID verification for secure chat and PWA support for mobile installation.

## Features

- 🎵 **Curated DJ Sets** - 10 handpicked tracks from Boiler Room, HÖR, and top electronic artists
- 🌍 **World ID Verification** - Secure chat with Orb-level verification 
- 📱 **PWA Support** - Install as a mobile app
- 🎛️ **Smart Playlist** - 2-hour rotation with intelligent track switching
- 📱 **Mobile Optimized** - Responsive design with touch-friendly controls
- ⚡ **Lightweight** - Clean, fast-loading codebase without unnecessary dependencies

## Live Demo

Visit: https://dj-dreams-app.vercel.app/

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom components
- **Authentication**: World ID via MiniKit integration
- **Streaming**: ReactPlayer with YouTube integration
- **PWA**: Manifest.json with mobile app capabilities
- **Deployment**: Vercel with automatic GitHub integration

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
apps/DJDreams/
├── src/
│   ├── app/           # Next.js app router
│   ├── components/    # React components
│   ├── hooks/         # Custom hooks
│   └── lib/          # Utilities
├── public/           # Static assets
└── package.json      # Dependencies
```

## Features in Detail

### DJ Sets Playlist
- Curated selection of electronic music sets
- Automatic 2-hour rotation system
- Manual shuffle functionality
- High-quality YouTube streaming

### World ID Integration
- Orb-level verification required for chat
- Secure, privacy-focused authentication
- Real-time chat functionality

### Mobile Experience
- PWA installation capability
- Touch-optimized interface
- Responsive design for all screen sizes
- Safe area padding for modern devices

## Contributing

This project is part of a coding challenge submission. The codebase is optimized for performance and maintainability.

---

Built with ❤️ for the electronic music community 