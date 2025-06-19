import { NextRequest, NextResponse } from 'next/server'
import { supabase, type ChatMessageInsert } from '@/lib/supabase'
import { moderateMessage, validateMessage } from '@/lib/moderation'

interface SendMessageRequest {
  message: string
  userId: string
  username: string
  nullifierHash?: string
  verified: boolean
}

export async function POST(req: NextRequest) {
  try {
    const { message, userId, username, nullifierHash, verified }: SendMessageRequest = await req.json()

    // Validate the message
    const validation = validateMessage(message)
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: validation.error,
        status: 400 
      })
    }

    // Only allow verified users to send messages
    if (!verified) {
      return NextResponse.json({ 
        error: 'Must be verified to send messages',
        status: 403 
      })
    }

    // Moderate the message
    const moderation = moderateMessage(message)
    
    // Log moderation for monitoring
    if (!moderation.isClean) {
      console.log('⚠️ Moderated message:', {
        userId,
        originalMessage: moderation.originalMessage,
        filteredMessage: moderation.filteredMessage,
        flaggedWords: moderation.flaggedWords
      })
    }

    // Prepare message for database
    const messageData: ChatMessageInsert = {
      user_id: userId,
      username,
      message: moderation.filteredMessage, // Use filtered version
      verified,
      nullifier_hash: nullifierHash,
      is_moderated: !moderation.isClean
    }

    // Insert message into database
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return NextResponse.json({ 
        error: 'Failed to save message',
        status: 500 
      })
    }

    return NextResponse.json({ 
      message: data,
      moderated: !moderation.isClean,
      status: 200 
    })

  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      status: 500 
    })
  }
} 