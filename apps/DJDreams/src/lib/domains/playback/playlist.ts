export interface DJSet {
  url: string
  title: string
}

export const DJ_SETS: DJSet[] = [
  {
    url: 'https://www.youtube.com/watch?v=-thQ8NNWtFE',
    title: 'Romy | Boiler Room: London',
  },
  {
    url: 'https://www.youtube.com/watch?v=328JXdl4Ix4',
    title: 'SEVEN - Carmen Electro | HÖR'
  },
  {
    url: 'https://www.youtube.com/watch?v=Q7ijWa9T21M',
    title: 'CRYME | HÖR'
  },
  {
    url: 'https://www.youtube.com/watch?v=cGPuGUlSXJA',
    title: 'Bambi-S | HÖR'
  },
  {
    url: 'https://www.youtube.com/watch?v=c0-hvjV2A5Y',
    title: 'Fred again.. | Boiler Room: London'
  },
  {
    url: 'https://www.youtube.com/watch?v=YA1FGanQA_E',
    title: 'KI/KI - BBC Radio 1 Essential Mix House Party'
  },
  {
    url: 'https://www.youtube.com/watch?v=C_u9kRVjR_A',
    title: 'SEVEN - CRYME | HÖR'
  },
  {
    url: 'https://www.youtube.com/watch?v=ybN2pf3B57c',
    title: 'Fred Again & Skepta - Victory Lap'
  },
  {
    url: 'https://www.youtube.com/watch?v=xgJBhezlMoE',
    title: 'Overmono | Boiler Room'
  },
  {
    url: 'https://www.youtube.com/watch?v=-w3xYI64LSo',
    title: 'Job Jobse | Boiler Room'
  },
  {
    url: 'https://www.youtube.com/watch?v=5c9QuIMOcwc',
    title: 'Flat White'
  },
  {
    url: 'https://www.youtube.com/watch?v=7Ih2hbcZZoM',
    title: 'Dekmantel - Shanti Celeste & Peach'
  },
  {
    url: 'https://www.youtube.com/watch?v=pOTkCgkxqyg',
    title: 'Nirvana - MTV Unplugged in New York'
  }
]

// Rotation interval in milliseconds (2 hours)
export const ROTATION_INTERVAL = 2 * 60 * 60 * 1000

export function getCurrentSetIndex(): number {
  const now = Date.now()
  const startTime = new Date('2025-01-01').getTime()
  const elapsed = now - startTime
  return Math.floor(elapsed / ROTATION_INTERVAL) % DJ_SETS.length
}
