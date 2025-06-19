import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    // Return early if Supabase is not configured
    if (!supabase) {
      return NextResponse.json({ 
        messages: [],
        status: 200,
        message: 'Chat system not configured' 
      })
    }

    const { searchParams } = req.nextUrl
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch messages from database, newest first
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
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