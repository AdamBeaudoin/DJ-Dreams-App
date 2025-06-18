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
      console.log('World ID verification successful:', verifyRes)
      
      return NextResponse.json({ 
        verifyRes, 
        status: 200,
        message: 'Verification successful' 
      })
    } else {
      // This is where you should handle errors from the World ID /verify endpoint.
      // Usually these errors are due to a user having already verified.
      console.log('World ID verification failed:', verifyRes)
      
      return NextResponse.json({ 
        verifyRes, 
        status: 400,
        message: 'Verification failed' 
      })
    }
  } catch (error) {
    console.error('World ID verification error:', error)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      status: 500 
    })
  }
} 