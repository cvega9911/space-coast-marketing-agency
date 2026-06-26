'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { CALENDLY } from '../../lib/calendly'

interface Check { label: string; pass: boolean; impact: 'high' | 'medium' | 'low' }
interface PSScore { performance: number; accessibility: number; bestPractices: number; seo: number }
interface PSVitals { lcp: number | null; inp: number | null; cls: number | null; fcp: number | null; ttfb: number | null }
interface PSOpportunity { title: string; savings: string }

interface EstimateResult {
  industry: string
  city: string
  monthlyLow: number
  monthlyHigh: number
  score: number | null
  checks: Check[] | null
  hasWebsite: boolean
  psScores:      PSScore | null
  coreWebVitals: PSVitals | null
  opportunities: PSOpportunity[] | null
}

const INDUSTRIES = [
  { value: 'plumbing',    label: 'Plumbing'        },
  { value: 'hvac',        label: 'HVAC'             },
  { value: 'electrical',  label: 'Electrical'       },
  { value: 'landscaping', label: 'Landscaping'      },
  { value: 'cleaning',    label: 'Cleaning'         },
  { value: 'roofing',     label: 'Roofing'          },
  { value: 'painting',    label: 'Painting'         },
  { value: 'legal',       label: 'Legal'            },
  { value: 'dental',      label: 'Dental'           },
  { value: 'medical',     label: 'Medical / Health' },
  { value: 'fitness',     label: 'Fitness / Gym'    },
  { value: 'restaurant',  label: 'Restaurant'       },
  { value: 'realestate',  label: 'Real Estate'      },
  { value: 'auto',        label: 'Auto Repair'      },
  { value: 'retail',      label: 'Retail'           },
  { value: 'other',       label: 'Other'            },
]

const ANALYSIS_STEPS = [
  'Pulling local search volume data',
  'Estimating competitor conversion rates',
  'Calculating monthly revenue opportunity',
  'Scanning your site for quick wins',
  'Generating your personalised report',
]

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`
}

function DollarCount({ to }: { to: number }) {
  const [val, setVal] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) { setVal(to); return }
    let start = 0
    const dur = 1600
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(e * to))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [to, reduced])

  return <>{fmt(val)}</>
}

function ScoreRing({ score, size = 88 }: { score: number; size?: number }) {
  const r = size * 0.40
  const circ = 2 * Math.PI * r
  const [filled, setFilled] = useState(0)
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'

  useEffect(() => {
    const t = setTimeout(() => setFilled(score), 120)
    return () => clearTimeout(t)
  }, [score])

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90 absolute inset-0" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.07} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size * 0.07}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (filled / 100) * circ}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <span className="text-2xl font-extrabold relative z-10" style={{ color }}>{score}</span>
    </div>
  )
}

function CheckRow({ check, index }: { check: Check; index: number }) {
  const reduced = useReducedMotion()
  return (
    <motion.li
      initial={reduced ? {} : { opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.06 * index, duration: 0.35, ease: 'easeOut' }}
      className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0"
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
        ${check.pass ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
        {check.pass ? '✓' : '✗'}
      </span>
      <span className="text-sm text-white/65 flex-1">{check.label}</span>
      {check.impact === 'high' && (
        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 flex-shrink-0">
          high impact
        </span>
      )}
    </motion.li>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest text-white/60">{label}</label>
      {children}
    </div>
  )
}

const selectCls = 'w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm appearance-none ' +
  'focus:outline-none focus:border-[#FF4500]/60 focus:ring-2 focus:ring-[#FF4500]/60 transition-colors min-h-[44px] cursor-pointer'
const inputCls  = 'w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/45 ' +
  'focus:outline-none focus:border-[#FF4500]/60 focus:ring-2 focus:ring-[#FF4500]/60 transition-colors min-h-[44px]'

export default function AuditTool() {
  const reduced = useReducedMotion()
  const resultsRef = useRef<HTMLDivElement>(null)

  const [industry, setIndustry]           = useState('')
  const [city, setCity]                   = useState('')
  const [url, setUrl]                     = useState('')
  const [phase, setPhase]                 = useState<'form' | 'loading' | 'done'>('form')
  const [step, setStep]                   = useState(0)
  const [result, setResult]               = useState<EstimateResult | null>(null)
  const [captureEmail, setCaptureEmail]   = useState('')
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!captureEmail) return
    setCaptureStatus('loading')
    try {
      const res = await fetch('https://leadgen.presencify.co/api/capture-lead', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: captureEmail, industry, city, website_url: url }),
      })
      setCaptureStatus(res.ok ? 'success' : 'error')
    } catch {
      setCaptureStatus('error')
    }
  }

  const canSubmit = industry && city.trim()

  async function run(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setPhase('loading')
    setStep(0)

    const timer = setInterval(() => setStep(s => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 700)

    try {
      const res = await fetch('/api/audit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ industry, city: city.trim(), url: url.trim() || undefined }),
      })
      clearInterval(timer)
      setStep(ANALYSIS_STEPS.length - 1)

      if (!res.ok) { setPhase('form'); return }

      const data: EstimateResult = await res.json()
      setResult(data)
      setPhase('done')
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    } catch {
      clearInterval(timer)
      setPhase('form')
    }
  }

  return (
    <section className="py-24" id="audit" aria-label="Revenue leak estimator">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div
          className="text-center mb-12"
          initial={reduced ? {} : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            How much revenue is your web presence{' '}
            <span className="text-[#FF4500]">leaking every month?</span>
          </h2>
          <p className="text-white/65 text-lg max-w-xl mx-auto">
            Tell us your industry and city. We&apos;ll estimate how much business your current online presence
            is leaving on the table — and what it would take to fix it.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">

          {phase === 'form' && (
            <motion.form
              key="form"
              onSubmit={run}
              initial={reduced ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? {} : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="bg-[#13131f] border border-white/8 rounded-2xl p-7 sm:p-10 space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label="What&apos;s your industry?">
                  <div className="relative">
                    <select value={industry} onChange={e => setIndustry(e.target.value)} required className={selectCls}>
                      <option value="">Pick your business type…</option>
                      {INDUSTRIES.map(i => (
                        <option key={i.value} value={i.value}>{i.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center" aria-hidden>
                      <svg className="w-4 h-4 text-white/45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </Field>

                <Field label="What city are you in?">
                  <input type="text" value={city} onChange={e => setCity(e.target.value)}
                    placeholder="Cocoa Beach, FL" required className={inputCls} />
                </Field>
              </div>

              <Field label="Got a website? Drop the URL here (optional)">
                <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="yourbusiness.com" className={inputCls} />
                <p className="text-white/45 text-xs mt-1">
                  If you add a URL, we&apos;ll scan it for specific issues — no account required.
                </p>
              </Field>

              <motion.button
                type="submit"
                disabled={!canSubmit}
                whileHover={reduced || !canSubmit ? undefined : { boxShadow: '0 0 28px rgba(255,69,0,0.45)' }}
                whileTap={reduced ? undefined : { scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="w-full bg-[#FF4500] text-white font-extrabold text-base py-4 px-8
                  rounded-xl hover:bg-[#cc3700] transition-colors duration-150
                  disabled:opacity-40 disabled:cursor-not-allowed min-h-[52px]"
              >
                Show Me What I&apos;m Missing 🚀
              </motion.button>
            </motion.form>
          )}

          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={reduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? {} : { opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-[#13131f] border border-white/8 rounded-2xl p-10 text-center"
            >
              <div className="relative w-14 h-14 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-[#FF4500]/12" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#FF4500] animate-spin" />
                <div className="absolute inset-[6px] rounded-full border-2 border-transparent border-t-[#FF4500]/50 animate-spin" style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
              </div>
              <ul className="space-y-3 inline-block text-left">
                {ANALYSIS_STEPS.map((s, i) => (
                  <li key={i} className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                    i < step ? 'text-[#FF4500]' : i === step ? 'text-white' : 'text-white/20'
                  }`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold
                      ${i < step ? 'bg-[#FF4500]/20 text-[#FF4500]' : i === step ? 'bg-white/10 text-white' : ''}`}>
                      {i < step ? '✓' : i === step ? '◉' : '○'}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {phase === 'done' && result && (
            <motion.div
              key="results"
              ref={resultsRef}
              initial={reduced ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="space-y-5"
            >
              {/* Revenue card */}
              <motion.div
                className="bg-[#13131f] border-2 border-[#FF4500]/45 rounded-2xl p-8 text-center relative overflow-hidden"
                animate={!reduced ? {
                  boxShadow: ['0 0 30px rgba(255,69,0,0.12)', '0 0 60px rgba(255,69,0,0.28)', '0 0 30px rgba(255,69,0,0.12)'],
                } : undefined}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden" aria-hidden>
                  <div className="absolute top-[-40%] left-[20%] w-[70%] h-[120%] rounded-full bg-[#FF4500] blur-[80px] opacity-[0.05]" />
                </div>

                <p className="text-xs font-mono text-[#FF4500] tracking-[0.18em] uppercase mb-2 relative z-10">
                  Estimated Monthly Revenue Opportunity
                </p>
                <p className="text-xs text-white/50 mb-6 relative z-10">
                  {result.industry} businesses in {result.city} with a strong web presence
                </p>

                <div className="flex items-center justify-center gap-3 mb-2 relative z-10">
                  <span className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight">
                    <DollarCount to={result.monthlyLow} />
                  </span>
                  <span className="text-white/45 text-2xl font-light">—</span>
                  <span className="text-5xl sm:text-6xl font-extrabold text-[#FF4500] tracking-tight">
                    <DollarCount to={result.monthlyHigh} />
                  </span>
                </div>
                <p className="text-white/50 text-sm relative z-10">per month in additional revenue</p>

                {result.score !== null && (
                  <div className="mt-8 pt-8 border-t border-white/8 flex flex-col items-center gap-2 relative z-10">
                    <p className="text-xs text-white/50 uppercase tracking-widest">Your site&apos;s current SEO health</p>
                    <ScoreRing score={result.score} size={96} />
                    <p className={`text-sm font-semibold mt-1 ${
                      result.score >= 70 ? 'text-emerald-400' : result.score >= 40 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {result.score >= 70 ? 'Solid foundation' : result.score >= 40 ? 'Room to improve' : 'Missing big opportunities'}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Site checks */}
              {result.checks && result.checks.length > 0 && (
                <div className="bg-[#13131f] border border-white/8 rounded-2xl p-7">
                  <h3 className="text-sm font-bold text-white mb-1">What we found on your site</h3>
                  <p className="text-white/50 text-xs mb-5">
                    {result.checks.filter(c => !c.pass).length} issue{result.checks.filter(c => !c.pass).length !== 1 ? 's' : ''} that are actively costing you visibility
                  </p>
                  <ul>
                    {result.checks.map((c, i) => <CheckRow key={i} check={c} index={i} />)}
                  </ul>
                </div>
              )}

              {/* PageSpeed scores */}
              {result.psScores && (
                <div className="bg-[#13131f] border border-white/8 rounded-2xl p-7">
                  <h3 className="text-sm font-bold text-white mb-1">Google PageSpeed Scores</h3>
                  <p className="text-white/50 text-xs mb-5">Mobile performance scores from Google Lighthouse</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {([
                      ['Performance',    result.psScores.performance],
                      ['Accessibility',  result.psScores.accessibility],
                      ['Best Practices', result.psScores.bestPractices],
                      ['SEO',            result.psScores.seo],
                    ] as [string, number][]).map(([label, val]) => {
                      const color = val >= 90 ? '#22c55e' : val >= 50 ? '#f59e0b' : '#ef4444'
                      return (
                        <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl" style={{ background: `${color}09`, border: `1px solid ${color}22` }}>
                          <span className="text-2xl font-extrabold" style={{ color }}>{val}</span>
                          <span className="text-[10px] text-white/60 text-center leading-tight">{label}</span>
                        </div>
                      )
                    })}
                  </div>

                  {result.coreWebVitals && (
                    <div className="mt-5 pt-5 border-t border-white/5">
                      <p className="text-xs font-bold uppercase tracking-widest text-white/25 mb-3">Core Web Vitals</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {([
                          ['LCP',  result.coreWebVitals.lcp  != null ? `${(result.coreWebVitals.lcp / 1000).toFixed(1)}s`  : null, result.coreWebVitals.lcp  != null ? (result.coreWebVitals.lcp  <= 2500 ? 'good' : result.coreWebVitals.lcp  <= 4000 ? 'ok' : 'bad') : null],
                          ['FCP',  result.coreWebVitals.fcp  != null ? `${(result.coreWebVitals.fcp / 1000).toFixed(1)}s`  : null, result.coreWebVitals.fcp  != null ? (result.coreWebVitals.fcp  <= 1800 ? 'good' : result.coreWebVitals.fcp  <= 3000 ? 'ok' : 'bad') : null],
                          ['CLS',  result.coreWebVitals.cls  != null ? `${result.coreWebVitals.cls}`                       : null, result.coreWebVitals.cls  != null ? (result.coreWebVitals.cls  <= 0.1  ? 'good' : result.coreWebVitals.cls  <= 0.25  ? 'ok' : 'bad') : null],
                          ['TTFB', result.coreWebVitals.ttfb != null ? `${result.coreWebVitals.ttfb}ms`                    : null, result.coreWebVitals.ttfb != null ? (result.coreWebVitals.ttfb <= 800  ? 'good' : result.coreWebVitals.ttfb <= 1800  ? 'ok' : 'bad') : null],
                          ['INP',  result.coreWebVitals.inp  != null ? `${result.coreWebVitals.inp}ms`                     : null, result.coreWebVitals.inp  != null ? (result.coreWebVitals.inp  <= 200  ? 'good' : result.coreWebVitals.inp  <= 500   ? 'ok' : 'bad') : null],
                        ] as [string, string | null, string | null][]).filter(([,v]) => v != null).map(([label, val, rating]) => {
                          const color = rating === 'good' ? '#22c55e' : rating === 'ok' ? '#f59e0b' : '#ef4444'
                          return (
                            <div key={label} className="flex items-center gap-2.5 py-1">
                              <span className="text-[10px] font-extrabold text-white/45 w-8 flex-shrink-0">{label}</span>
                              <span className="text-sm font-bold" style={{ color }}>{val}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {result.opportunities && result.opportunities.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-white/5">
                      <p className="text-xs font-bold uppercase tracking-widest text-white/25 mb-3">Top Opportunities</p>
                      <ul className="space-y-2">
                        {result.opportunities.map((o, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <span className="text-white/75 flex-1">{o.title}</span>
                            {o.savings && <span className="text-amber-400 font-semibold flex-shrink-0">{o.savings}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Insight callout */}
              <div className="bg-[#13131f] border border-white/8 rounded-2xl p-7">
                <h3 className="text-sm font-bold text-white mb-2">What this means for you</h3>
                <p className="text-white/70 text-sm leading-relaxed">
                  Every month without a strong web presence, those{' '}
                  <span className="text-white font-semibold">{fmt(result.monthlyLow)}–{fmt(result.monthlyHigh)}</span> in potential
                  {' '}revenue is going directly to competitors who show up on Google.
                  {result.hasWebsite
                    ? ' Your site has real quick wins available — most take us less than an hour to fix.'
                    : ' The good news: getting in front of local customers starts at $599 and we can have you live within 72 hours.'}
                </p>
              </div>

              {/* CTA */}
              <div className="bg-[#FF4500]/6 border border-[#FF4500]/25 rounded-2xl p-7 flex flex-col sm:flex-row items-center justify-between gap-5">
                <div>
                  <p className="font-bold text-white mb-1">Ready to stop leaving money on the table?</p>
                  <p className="text-white/65 text-sm">15-minute call. We&apos;ll show you exactly what&apos;s holding you back.</p>
                </div>
                <motion.a
                  href={CALENDLY.DISCOVERY}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={!reduced ? { scale: 1.03, boxShadow: '0 0 22px rgba(255,69,0,0.45)' } : undefined}
                  whileTap={!reduced ? { scale: 0.97 } : undefined}
                  transition={{ duration: 0.15 }}
                  className="flex-shrink-0 bg-[#FF4500] text-white font-bold px-7 py-3.5 rounded-xl
                    hover:bg-[#cc3700] transition-colors duration-150 text-sm whitespace-nowrap min-h-[44px]
                    flex items-center gap-2"
                >
                  Book a Free Call 🚀
                </motion.a>
              </div>

              {/* Email capture */}
              <div className="bg-[#13131f] border border-white/8 rounded-2xl p-7">
                {captureStatus === 'success' ? (
                  <p className="text-white/80 text-sm text-center">Got it! Your audit results are on the way.</p>
                ) : (
                  <form onSubmit={handleCapture} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email" required value={captureEmail}
                      onChange={e => setCaptureEmail(e.target.value)}
                      placeholder="Enter your email to get your audit results"
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                        placeholder:text-white/45 focus:outline-none focus:border-[#FF4500]/60
                        focus:ring-2 focus:ring-[#FF4500]/60 transition-colors min-h-[44px]"
                    />
                    <button type="submit" disabled={captureStatus === 'loading'}
                      className="flex-shrink-0 bg-[#FF4500] text-white font-bold px-6 py-3 rounded-xl
                        hover:bg-[#cc3700] transition-colors text-sm min-h-[44px]
                        disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap">
                      {captureStatus === 'loading' ? 'Sending…' : 'Send My Results 🚀'}
                    </button>
                  </form>
                )}
                {captureStatus === 'error' && (
                  <p className="text-red-400 text-xs mt-3" role="alert">
                    Something went wrong — try again or call us at (321) 328-5307.
                  </p>
                )}
              </div>

              {/* Run again */}
              <div className="text-center">
                <button
                  onClick={() => {
                    setPhase('form')
                    setResult(null)
                    setStep(0)
                    setCaptureEmail('')
                    setCaptureStatus('idle')
                  }}
                  className="text-sm text-white/25 hover:text-white/70 transition-colors"
                >
                  ← Check a different business
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
