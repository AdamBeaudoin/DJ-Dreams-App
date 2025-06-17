import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { MiniKitProvider } from '@/components/minikit-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DJ Dreams',
  description: 'DJ sets streaming from around the world',
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
      </body>
    </html>
  )
} 