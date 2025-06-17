# Deployment Guide for aphextx.com/radio

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended)

1. **Go to [vercel.com](https://vercel.com)**
2. **Connect your GitHub repo** (if you have one)
3. **Or upload the project folder directly**
4. **Set these environment variables in Vercel:**
   ```
   NODE_ENV=production
   ```
5. **Configure custom domain:**
   - Add `aphextx.com` as custom domain
   - Set up redirect: `aphextx.com/radio` → your-vercel-app.vercel.app

### Option 2: Static Export + Any Host

1. **Build static version:**
   ```bash
   npm run build
   ```

2. **Export static files:**
   ```bash
   npx next export
   ```

3. **Upload `out/` folder to your web host**
4. **Configure your web server to serve from `/radio` path**

### Option 3: Manual Upload

1. **Build the project:**
   ```bash
   npm run build
   npm run start
   ```

2. **Copy built files to your server**
3. **Set up reverse proxy or subdirectory routing**

## 🌐 Domain Configuration

### For aphextx.com/radio:

**Apache (.htaccess):**
```apache
RewriteEngine On
RewriteRule ^radio/(.*)$ /path/to/radio/app/$1 [L]
```

**Nginx:**
```nginx
location /radio/ {
    alias /path/to/radio/app/;
    try_files $uri $uri/ /radio/index.html;
}
```

**Cloudflare Pages:**
- Upload the `out/` folder
- Set custom domain to `aphextx.com`
- Configure `/radio` path

## 📁 File Structure After Build

```
out/
├── _next/
├── radio/
│   ├── index.html
│   ├── archive/
│   └── _next/
└── index.html
```

## 🔧 Environment Variables

For production, you may want to add:

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
```

## ✅ Testing

After deployment, test:
- `aphextx.com/radio` - Main radio page
- `aphextx.com/radio/archive` - Archive page
- Video player functionality
- Chat interface
- Mobile responsiveness

## 🚨 Troubleshooting

**If videos don't load:**
- Check CORS settings
- Verify YouTube URLs are accessible
- Check browser console for errors

**If routing doesn't work:**
- Verify basePath configuration
- Check web server configuration
- Ensure trailing slashes are handled

**If assets don't load:**
- Check assetPrefix in next.config.js
- Verify file paths in production
- Check web server static file serving 