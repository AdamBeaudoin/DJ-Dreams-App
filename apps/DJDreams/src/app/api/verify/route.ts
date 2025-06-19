import { NextRequest, NextResponse } from 'next/server'
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js'

interface IRequestPayload {
  payload: ISuccessResult
  action: string
  signal: string | undefined
}

export async function POST(req: NextRequest) {
  try {
    const { payload, action, signal } = (await req.json()) as IRequestPayload
    
    // Get app_id from environment variables
    const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`
    
    if (!app_id) {
      console.error('World ID verification failed: App ID not configured')
      return NextResponse.json({ 
        error: 'App ID not configured',
        status: 500 
      })
    }
    
    // Verify the proof using World ID cloud verification
    const verifyRes = (await verifyCloudProof(payload, app_id, action, signal)) as IVerifyResponse

    if (verifyRes.success) {
      // This is where you should perform backend actions if the verification succeeds
      // Such as, setting a user as "verified" in a database
      const username = MiniKit.user.username
      return NextResponse.json({ 
        verifyRes, 
        status: 200,
        message: 'Verification successful',
        username: username
      })
    } else {
      // This is where you should handle errors from the World ID /verify endpoint.
      // Usually these errors are due to a user having already verified.
      console.error('World ID verification failed:', verifyRes.code || 'Unknown error')
      
      return NextResponse.json({ 
        verifyRes, 
        status: 400,
        message: 'Verification failed',
        details: verifyRes
      })
    }
  } catch (error) {
    console.error('World ID verification error:', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 500 
    })
  }
} 