import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { MiniKitProvider } from '@/components/minikit-provider'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DJ Dreams',
  description: 'DJ sets streaming from around the world',
  keywords: ['DJ', 'music', 'streaming', 'electronic', 'house', 'techno', 'live sets'],
  authors: [{ name: 'DJ Dreams' }],
  creator: 'DJ Dreams',
  publisher: 'DJ Dreams',
  formatDetection: {
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DJ Dreams',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MiniKitProvider>
          {children}
        </MiniKitProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
} 