import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Fetch messages from database, newest first
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Database fetch error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch messages',
        status: 500 
      })
    }

    // Reverse to show oldest first in UI
    const messages = data.reverse()

    return NextResponse.json({ 
      messages,
      status: 200 
    })

  } catch (error) {
    console.error('Fetch messages error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      status: 500 
    })
  }
} 