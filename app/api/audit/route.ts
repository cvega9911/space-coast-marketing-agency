import { NextRequest, NextResponse } from 'next/server'

const INDUSTRY: Record<string, { searches: number; avgJob: number; name: string }> = {
  plumbing:    { searches: 840,  avgJob: 285,  name: 'Plumbing'       },
  hvac:        { searches: 1200, avgJob: 420,  name: 'HVAC'           },
  electrical:  { searches: 680,  avgJob: 340,  name: 'Electrical'     },
  landscaping: { searches: 720,  avgJob: 180,  name: 'Landscaping'    },
  cleaning:    { searches: 960,  avgJob: 120,  name: 'Cleaning'       },
  roofing:     { searches: 560,  avgJob: 680,  name: 'Roofing'        },
  painting:    { searches: 480,  avgJob: 220,  name: 'Painting'       },
  legal:       { searches: 890,  avgJob: 1200, name: 'Legal'          },
  dental:      { searches: 1100, avgJob: 850,  name: 'Dental'         },
  medical:     { searches: 950,  avgJob: 220,  name: 'Medical/Health' },
  fitness:     { searches: 1300, avgJob: 65,   name: 'Fitness'        },
  restaurant:  { searches: 2400, avgJob: 45,   name: 'Restaurant'     },
  realestate:  { searches: 1600, avgJob: 4500, name: 'Real Estate'    },
  auto:        { searches: 740,  avgJob: 380,  name: 'Auto Repair'    },
  retail:      { searches: 800,  avgJob: 90,   name: 'Retail'         },
  other:       { searches: 600,  avgJob: 200,  name: 'Local Business' },
}

function calcOpportunity(ind: { searches: number; avgJob: number }) {
  const base = ind.searches * 0.15 * 0.03 * ind.avgJob
  return {
    low:  Math.round((base * 0.75) / 100) * 100,
    high: Math.round((base * 1.35) / 100) * 100,
  }
}

const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

function isRateLimited(ip: string): boolean {
  const last = rateLimitMap.get(ip)
  const now  = Date.now()
  if (last && now - last < RATE_LIMIT_WINDOW_MS) return true
  rateLimitMap.set(ip, now)
  if (rateLimitMap.size > 5000) {
    rateLimitMap.forEach((ts, key) => {
      if (now - ts > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(key)
    })
  }
  return false
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

interface PSScore { performance: number; accessibility: number; bestPractices: number; seo: number }
interface PSVitals { lcp: number | null; inp: number | null; cls: number | null; fcp: number | null; ttfb: number | null }
interface PSOpportunity { title: string; savings: string }

async function fetchPageSpeed(url: string): Promise<{
  psScores: PSScore
  coreWebVitals: PSVitals
  opportunities: PSOpportunity[]
} | null> {
  const apiKey = process.env.NEXT_PRIVATE_PAGEAPI_KEY
  if (!apiKey) return null

  try {
    const endpoint = `https://www.googleapis.com/pagespeedOnline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`
    const ctrl = new AbortController()
    const tid  = setTimeout(() => ctrl.abort(), 15000)
    const res  = await fetch(endpoint, { signal: ctrl.signal })
    clearTimeout(tid)

    if (!res.ok) return null
    const data = await res.json()

    const cats   = data.lighthouseResult?.categories ?? {}
    const audits = data.lighthouseResult?.audits ?? {}

    const psScores: PSScore = {
      performance:   Math.round((cats.performance?.score ?? 0)        * 100),
      accessibility: Math.round((cats.accessibility?.score ?? 0)      * 100),
      bestPractices: Math.round((cats['best-practices']?.score ?? 0)  * 100),
      seo:           Math.round((cats.seo?.score ?? 0)                * 100),
    }

    const metricVal = (id: string): number | null => {
      const v = audits[id]?.numericValue
      return typeof v === 'number' ? Math.round(v) : null
    }

    const coreWebVitals: PSVitals = {
      lcp:  metricVal('largest-contentful-paint'),
      inp:  metricVal('experimental-interaction-to-next-paint') ?? metricVal('total-blocking-time'),
      cls:  audits['cumulative-layout-shift']?.numericValue != null
              ? parseFloat((audits['cumulative-layout-shift'].numericValue as number).toFixed(3))
              : null,
      fcp:  metricVal('first-contentful-paint'),
      ttfb: metricVal('server-response-time'),
    }

    const opportunities: PSOpportunity[] = Object.values(audits as Record<string, {
      score?: number; details?: { type?: string }; title?: string; displayValue?: string
    }>)
      .filter(a => typeof a.score === 'number' && a.score < 0.9 && a.details?.type === 'opportunity')
      .sort((a, b) => (a.score as number) - (b.score as number))
      .slice(0, 3)
      .map(a => ({
        title:   a.title ?? 'Improvement opportunity',
        savings: a.displayValue ?? '',
      }))

    return { psScores, coreWebVitals, opportunities }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded — please wait 10 minutes between audits.' }, { status: 429 })
  }

  let body: { industry?: string; city?: string; url?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }

  const ind           = INDUSTRY[body.industry ?? ''] ?? INDUSTRY.other
  const { low, high } = calcOpportunity(ind)

  let checks: { label: string; pass: boolean; impact: 'high' | 'medium' | 'low' }[] | null = null
  let score: number | null = null
  let psData: Awaited<ReturnType<typeof fetchPageSpeed>> = null

  if (body.url?.trim()) {
    const raw  = body.url.trim()
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

    const [htmlResult, pageSpeedResult] = await Promise.all([
      (async () => {
        try {
          const ctrl = new AbortController()
          const tid  = setTimeout(() => ctrl.abort(), 6000)
          const t0   = Date.now()

          const res = await fetch(href, {
            signal:   ctrl.signal,
            headers:  { 'User-Agent': 'Mozilla/5.0 (compatible; SCMABot/1.0)' },
            redirect: 'follow',
          })
          clearTimeout(tid)

          const elapsed = Date.now() - t0
          const html    = res.ok ? await res.text().catch(() => '') : ''

          const isHttps     = href.startsWith('https://')
          const fast        = elapsed < 1800
          const hasViewport = /name=["']viewport["']/i.test(html)
          const hasTitle    = /<title[^>]*>\s*\S.{2,}<\/title>/i.test(html)
          const hasDesc     = /name=["']description["']/i.test(html)
          const hasH1       = /<h1[\s>]/i.test(html)
          const hasSchema   = /application\/ld\+json/i.test(html)
          const hasOg       = /property=["']og:/i.test(html)
          const hasGMB      = /google\.com\/maps|business\.site/i.test(html)
          const alive       = res.status < 400

          const c = [
            { label: 'HTTPS — secure connection',             pass: isHttps,     impact: 'high'   as const },
            { label: `Loads in under 1.8s (${elapsed}ms)`,   pass: fast,        impact: 'high'   as const },
            { label: 'Mobile viewport configured',            pass: hasViewport, impact: 'high'   as const },
            { label: 'Page title (shows in Google results)',  pass: hasTitle,    impact: 'medium' as const },
            { label: 'Meta description for search preview',   pass: hasDesc,     impact: 'medium' as const },
            { label: 'H1 heading structure',                  pass: hasH1,       impact: 'medium' as const },
            { label: 'Structured data / schema markup',       pass: hasSchema,   impact: 'medium' as const },
            { label: 'Open Graph / social sharing tags',      pass: hasOg,       impact: 'low'    as const },
            { label: 'Google Business link detected',         pass: hasGMB,      impact: 'low'    as const },
            { label: 'Site responds without errors',          pass: alive,       impact: 'high'   as const },
          ]

          const W = { high: 3, medium: 2, low: 1 } as const
          const total   = c.reduce((s, ch) => s + W[ch.impact], 0)
          const passing = c.filter(ch => ch.pass).reduce((s, ch) => s + W[ch.impact], 0)
          return { checks: c, score: Math.round((passing / total) * 100) }
        } catch {
          return {
            checks: [{ label: 'Site unreachable or timed out — this alone hurts your Google ranking', pass: false, impact: 'high' as const }],
            score:  5,
          }
        }
      })(),
      fetchPageSpeed(href),
    ])

    checks = htmlResult.checks
    score  = htmlResult.score
    psData = pageSpeedResult
  }

  return NextResponse.json({
    industry:      ind.name,
    city:          body.city ?? 'your area',
    monthlyLow:    low,
    monthlyHigh:   high,
    score,
    checks,
    hasWebsite:    !!(body.url?.trim()),
    psScores:      psData?.psScores      ?? null,
    coreWebVitals: psData?.coreWebVitals ?? null,
    opportunities: psData?.opportunities ?? null,
  })
}
