'use client'
import { useEffect, useState } from 'react'

export default function MobileDebug() {
  const [open, setOpen] = useState(true)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    const add = (line: string) => setLogs(prev => [...prev.slice(-49), line])

    const onError = (e: ErrorEvent) => add(`[error] ${e.message}`)
    const onRej = (e: PromiseRejectionEvent) => add(`[unhandledrejection] ${String(e.reason)}`)

    const origLog = console.log
    const origWarn = console.warn
    const origErr = console.error

    // @ts-ignore
    console.log = (...a: any[]) => { add(`[log] ${a.map(String).join(' ')}`); origLog(...a) }
    // @ts-ignore
    console.warn = (...a: any[]) => { add(`[warn] ${a.map(String).join(' ')}`); origWarn(...a) }
    // @ts-ignore
    console.error = (...a: any[]) => { add(`[error] ${a.map(String).join(' ')}`); origErr(...a) }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRej)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRej)
      console.log = origLog as any
      console.warn = origWarn as any
      console.error = origErr as any
    }
  }, [])

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ position: 'fixed', bottom: 8, right: 8, zIndex: 999999, fontSize: 12, padding: 6, background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6 }}>Logs</button>
  )

  return (
    <div style={{ position: 'fixed', bottom: 8, left: 8, right: 8, height: '40%', zIndex: 999999, background: 'rgba(0,0,0,0.85)', color: '#0f0', overflow: 'auto', padding: 8, fontSize: 12, border: '1px solid #333', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <strong>Debug Console</strong>
        <button onClick={() => setOpen(false)} style={{ color: '#fff' }}>Hide</button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{logs.join('\n')}</pre>
    </div>
  )
}


