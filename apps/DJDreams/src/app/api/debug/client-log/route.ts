import { NextRequest, NextResponse } from 'next/server'
import { appendFile } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

const DEBUG_SESSION = '797957'

/**
 * Accepts client debug payloads during active debug sessions. Writes NDJSON
 * locally in dev; logs to stdout on Vercel so runtime evidence is capturable.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body?.sessionId !== DEBUG_SESSION) {
      return NextResponse.json({ ok: false }, { status: 403 })
    }

    const entry = { ...body, timestamp: Date.now() }
    const line = `${JSON.stringify(entry)}\n`

    if (process.env.NODE_ENV === 'development') {
      const logPath = path.join(process.cwd(), '../../.cursor/debug-797957.log')
      await appendFile(logPath, line)
    } else {
      console.log('[debug-client-log]', line.trim())
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
