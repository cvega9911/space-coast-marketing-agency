'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion, useInView } from 'motion/react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import Nav from './components/Nav'
import Footer from './components/Footer'

const AuditTool = dynamic(() => import('./components/AuditTool'), { ssr: false })

// ─── Animation wrappers ───────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, y = 32, className = '' }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string
}) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.01 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function StaggerParent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.01 }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
    >
      {children}
    </motion.div>
  )
}

function StaggerChild({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      variants={{
        hidden:  { opacity: 0, y: 28 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}

// ─── Count-up stat ─────────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref      = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.01 })
  const reduced  = useReducedMotion()
  const [val, setVal] = useState(to)

  useEffect(() => { if (!reduced) setVal(0) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isInView) return
    if (reduced) { setVal(to); return }
    let start = 0
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 1400, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [isInView, to, reduced])

  return <span ref={ref}>{val}{suffix}</span>
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
function Check() {
  return (
    <svg className="w-4 h-4 text-[#FF4500] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

// ─── CTA Button ───────────────────────────────────────────────────────────────
function CTAButton({ label = 'Get My Free Visibility Audit', href = '#audit', large = true, glow = false, external = false }: {
  label?: string; href?: string; large?: boolean; glow?: boolean; external?: boolean
}) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<'idle' | 'flying' | 'bobbing'>('idle')
  const [endX, setEndX] = useState(120)
  const [mounted, setMounted] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const inView = useInView(wrapRef, { once: false, amount: 0.9 })
  const hasGlow = glow && !reduced

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (mounted) setIsTouchDevice(window.matchMedia('(hover: none)').matches)
  }, [mounted])

  useEffect(() => {
    if (!mounted || !isTouchDevice || !inView || reduced || phase !== 'idle') return
    if (wrapRef.current) setEndX(wrapRef.current.offsetWidth - 36)
    setPhase('flying')
  }, [mounted, isTouchDevice, inView, reduced, phase])

  function handleEnter() {
    if (reduced || isTouchDevice || phase !== 'idle') return
    if (wrapRef.current) setEndX(wrapRef.current.offsetWidth - 36)
    setPhase('flying')
  }

  return (
    <span ref={wrapRef} className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={() => { if (!isTouchDevice) setPhase('idle') }}>
      <motion.a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        whileTap={reduced ? undefined : { scale: 0.97 }}
        animate={hasGlow ? {
          boxShadow: ['0 0 14px rgba(255,69,0,0.22)', '0 0 32px rgba(255,69,0,0.52)', '0 0 14px rgba(255,69,0,0.22)'],
        } : undefined}
        transition={{ duration: 0.15, ...(hasGlow ? { boxShadow: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } } : {}) }}
        className={`inline-flex items-center gap-2 bg-[#FF4500] text-white font-bold rounded-xl
          hover:bg-[#FF5500] transition-colors duration-150 min-h-[44px]
          ${large ? 'text-base sm:text-lg px-7 sm:px-9 py-4' : 'text-sm px-5 py-2.5'}`}
      >
        <motion.span animate={{ x: phase !== 'idle' ? 8 : 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          {label}
        </motion.span>
      </motion.a>
      <AnimatePresence>
        {mounted && phase !== 'idle' && (
          <motion.span key="rocket" aria-hidden
            className="pointer-events-none absolute z-50 select-none"
            style={{ fontSize: large ? '20px' : '16px', lineHeight: 1, top: '50%', marginTop: large ? '-10px' : '-8px', left: large ? 10 : 8 }}
            initial={{ x: 0, opacity: 0, y: 0 }}
            animate={phase === 'flying'
              ? { x: endX, opacity: [0, 1, 1, 1], y: [0, -8, 0] }
              : { x: endX, opacity: 1, y: [0, -3, 0, 3, 0] }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={phase === 'flying'
              ? { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
              : { duration: 1.8, repeat: Infinity, ease: 'easeInOut', x: { duration: 0 } }}
            onAnimationComplete={() => { if (phase === 'flying') setPhase('bobbing') }}
          >🚀</motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

// ─── Submit button ─────────────────────────────────────────────────────────────
function SubmitButton({ loading }: { loading: boolean }) {
  const reduced = useReducedMotion()

  return (
    <motion.button
      type="submit" disabled={loading}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      className="w-full bg-[#FF4500] text-white font-extrabold text-base py-4 px-8
        rounded-xl hover:bg-[#FF5500] transition-colors duration-150
        disabled:opacity-60 disabled:cursor-not-allowed mt-2 min-h-[52px]"
    >
      {loading ? 'Sending…' : 'Send it 🚀'}
    </motion.button>
  )
}

// ─── Military & First Responder accordion ────────────────────────────────────
function MilitaryDiscount() {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  return (
    <div className="max-w-5xl mx-auto mb-5">
      <div className={`bg-[#13131f] border rounded-2xl overflow-hidden transition-colors duration-200 ${open ? 'border-[#FF4500]/35' : 'border-white/7'}`}>
        <button type="button" onClick={() => setOpen(o => !o)}
          className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 min-h-[52px]"
          aria-expanded={open}>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[#FF4500] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <span className="font-semibold text-white text-sm">
              Military &amp; First Responder Discount — $50 off any site build
            </span>
          </div>
          <motion.span aria-hidden animate={reduced ? {} : { rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}
            className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF4500]/10 flex items-center justify-center text-[#FF4500] text-lg leading-none">+</motion.span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div key="military-body"
              initial={reduced ? {} : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduced ? {} : { height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden">
              <div className="px-6 pb-6 pt-1">
                <p className="text-white/70 text-sm leading-relaxed mb-2">
                  Active duty, veterans, police, fire, and EMS —{' '}
                  <strong className="text-white">$50 off any site build</strong>.
                  Your word is enough. No verification required.
                </p>
                <p className="text-white/45 text-xs">
                  Mention your service in the contact form or on our call and we&apos;ll apply the discount automatically.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const STATS = [
  { value: 72,  suffix: 'hrs', label: 'Guaranteed delivery' },
  { value: 0,   suffix: '',    label: 'Hidden fees'          },
  { value: 0,   suffix: '',    label: 'Contracts required'   },
  { value: 100, suffix: '%',   label: 'Client ownership'     },
]

const PROCESS_STEPS = [
  {
    n: '1', title: 'We Talk', sub: '15 minutes',
    body: '15-minute call. Tell us what you do and who you want to reach. No pitch, no pressure.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
  },
  {
    n: '2', title: 'We Build', sub: '72 hours',
    body: 'We design and build your site — fast, mobile-first, and set up to rank on Google.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
  },
  {
    n: '3', title: "You're Live", sub: 'Day 3',
    body: 'Site goes live. We walk you through it. Customers start finding you.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
]

const PAIN_POINTS = [
  "You don't have a website — or you do, and you'd rather people didn't see it.",
  "People are Googling you and landing on a competitor's site instead.",
  "You're losing jobs to competitors with better-looking sites. You can feel it.",
  "Someone quoted you $3,000–$8,000 for a website. You're still thinking about it.",
]

const WEBSITE_FEATURES = [
  '5-page professional website',
  'On-page SEO foundations',
  'SSL included',
  'Google Business Profile setup',
  'Free hosting for life',
  '72-hour preview delivery',
  'Unlimited revisions',
]

const GROWTH_FEATURES = [
  'Everything in Website tier',
  '10-page website, fully optimized',
  'Social Media Management',
  'Google Business Profile Optimization',
  '2 blog posts per month',
  'Review Management',
  'Unlimited revisions',
  'Do-What-We-Said Guarantee',
]

const CMO_FEATURES = [
  'Website included (everything in Tier 1 + 2, free)',
  '5 custom blog posts per month',
  'Recurring SEO + AEO (ChatGPT, Gemini, Perplexity visibility)',
  'Paid ad management',
  'AI integrations',
  'Marketing automations',
  'Weekly 1-on-1 white-glove consultations',
  'Monthly reporting',
]

const CHARITIES = [
  'Brevard Veterans Memorial Center',
  'Space Coast Honor Flight',
  'Feeding the Space Coast',
  'Brevard Humane Society',
  "Children's Hunger Project",
  'World Central Kitchen',
  'Direct Relief',
]

const FAQ_ITEMS = [
  {
    q: 'How much does a website cost?',
    a: 'We have simple, transparent plans with no hidden fees and no surprise invoices. Head to our pricing page to see the full breakdown — or just get your free audit first and we\'ll point you to the right fit.',
  },
  {
    q: 'How fast can you actually build a website?',
    a: "You see a preview of your site within 72 hours of your kickoff call. That's our guarantee — not a marketing claim. If we miss the window, you don't pay.",
  },
  {
    q: 'Do I have to sign a contract?',
    a: 'Never. Monthly plans are month-to-month. Stop anytime, no penalties, no exit fees. The Website package is a one-time payment — there is nothing to cancel.',
  },
  {
    q: 'Will I own my website?',
    a: 'Yes, completely. You own the domain, the code, and the content from day one. We never hold your site hostage.',
  },
  {
    q: 'Will my website show up on Google?',
    a: "We build every site with on-page SEO foundations — fast load times, mobile-first design, schema markup, and proper heading structure. We can't guarantee specific rankings, but we set you up to compete locally from day one.",
  },
  {
    q: 'Do you work with businesses outside Brevard County?',
    a: "We're based in Merritt Island and focus primarily on Brevard County and surrounding communities. We can work with any Florida business remotely.",
  },
]

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)
  const reduced = useReducedMotion()

  return (
    <section className="py-20 sm:py-24" aria-label="Frequently asked questions">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn className="text-center mb-12 sm:mb-14">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="font-mono text-[#FF4500] text-base tracking-[0.16em] uppercase">// FAQ</span>
            <span className="h-px bg-[#FF4500]/25 w-10 flex-shrink-0" aria-hidden />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Questions? We&apos;ve got you.</h2>
          <p className="text-white/65 text-base sm:text-lg max-w-lg mx-auto">No jargon, no runaround. Just straight answers.</p>
        </FadeIn>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <div className={`bg-[#13131f] border rounded-2xl overflow-hidden transition-colors duration-200 ${open === i ? 'border-[#FF4500]/35' : 'border-white/7'}`}>
                <button type="button" onClick={() => setOpen(open === i ? null : i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 min-h-[56px]"
                  aria-expanded={open === i}>
                  <span className="font-semibold text-white text-base leading-snug">{item.q}</span>
                  <motion.span aria-hidden
                    animate={reduced ? {} : { rotate: open === i ? 45 : 0 }} transition={{ duration: 0.2 }}
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF4500]/10 flex items-center justify-center text-[#FF4500] text-lg leading-none">+</motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div key="answer"
                      initial={reduced ? {} : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduced ? {} : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden">
                      <p className="px-6 pb-6 text-white/75 text-sm leading-relaxed">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [form,   setForm]   = useState({ name: '', businessName: '', phone: '', email: '', interest: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const reduced = useReducedMotion()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (res.ok) { setStatus('success'); setForm({ name: '', businessName: '', phone: '', email: '', interest: '' }) }
      else setStatus('error')
    } catch { setStatus('error') }
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm ' +
    'placeholder:text-white/45 focus:outline-none focus:border-[#FF4500]/60 ' +
    'focus:ring-2 focus:ring-[#FF4500]/60 transition-colors min-h-[44px]'

  return (
    <div className="min-h-screen bg-[#0a0a14] text-[#F5F5F0]">
      <Nav />

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section aria-label="Hero" className="relative min-h-screen flex items-center overflow-hidden">
        <Image
          src="/hero/artemis-i-launch.jpg"
          alt="Rocket launch at Kennedy Space Center — Space Coast Marketing"
          fill priority className="object-cover"
          style={{ objectPosition: '65% 50%' }}
        />
        <div className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.72) 40%, rgba(10,10,20,0.32) 68%, rgba(10,10,20,0.10) 100%)' }}
          aria-hidden />
        <div className="absolute inset-x-0 top-0 h-28 z-[1] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,20,0.75) 0%, transparent 100%)' }}
          aria-hidden />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-36 sm:py-44">
          <div className="max-w-xl lg:max-w-2xl">

            <motion.div
              initial={reduced ? {} : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex items-center gap-3 mb-7 sm:mb-9"
            >
              <span className="font-mono text-[#FF4500] text-base sm:text-lg tracking-[0.18em] uppercase">
                // LOCAL VISIBILITY · SPACE COAST, FL
              </span>
              <span className="h-px bg-[#FF4500]/35 w-16 flex-shrink-0" aria-hidden />
            </motion.div>

            <motion.h1
              initial={reduced ? {} : { opacity: 0, x: -28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.55, ease: [0.22,1,0.36,1] }}
              className="text-5xl sm:text-7xl lg:text-[5.5rem] font-bold leading-[1.04] tracking-tight mb-7 sm:mb-9 text-[#F5F5F0]"
            >
              Your next customer<br />
              <span className="text-[#FF4500]">is searching</span><br />
              right now.
            </motion.h1>

            <motion.p
              initial={reduced ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5, ease: 'easeOut' }}
              className="text-lg sm:text-xl text-[#F5F5F0]/65 max-w-md mb-4 leading-relaxed"
            >
              Someone&apos;s Googling your service right now. They&apos;re finding your competitor.
              {' '}<span className="text-[#F5F5F0] font-semibold">We fix that in 72 hours.</span>
            </motion.p>

            <motion.div
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.45, ease: 'easeOut' }}
              className="flex flex-col sm:flex-row items-start gap-5 mb-6"
            >
              <CTAButton large glow />
              <a href="tel:+13213285307"
                className="flex items-center gap-2 text-[#F5F5F0]/70 hover:text-[#F5F5F0] transition-colors text-lg font-semibold min-h-[44px]">
                <svg className="w-5 h-5 text-[#FF4500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                (321) 328-5307
              </a>
            </motion.div>

            <motion.div
              initial={reduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="flex flex-wrap items-center gap-6 sm:gap-9 text-[#F5F5F0]/45 text-sm"
            >
              {['No contracts', '72-hour preview', 'Space Coast based'].map(t => (
                <span key={t} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#FF4500] flex-shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth={2.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ SEO BAND ══════════════════════════════════════════════════════════ */}
      <div className="py-5 bg-[#0a0a14] border-b border-white/5 text-center">
        <h2 className="text-xs sm:text-sm text-white/45 font-medium tracking-wide">
          Web Design &amp; Marketing for Florida Small Businesses · Space Coast, Brevard County &amp; Beyond
        </h2>
      </div>

      {/* ══ FREE AUDIT TOOL ═══════════════════════════════════════════════════ */}
      <div id="audit"><AuditTool /></div>

      {/* ══ GUARANTEES ════════════════════════════════════════════════════════ */}
      <section
        className="py-20 sm:py-28"
        style={{ background: 'linear-gradient(160deg, rgba(74,94,74,0.1) 0%, rgba(74,94,74,0.04) 55%, rgba(13,13,28,0.95) 100%)' }}
        aria-label="Our guarantees"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-12 lg:gap-16 items-start">

            {/* Left — guarantee cards */}
            <div>
              <FadeIn className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <span className="font-mono text-[#FF4500] text-base tracking-[0.16em] uppercase">// 01 — GUARANTEES</span>
                  <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
                  We say what we mean.{' '}
                  <span className="text-[#FF4500]">And we back it up.</span>
                </h2>
                <p className="text-white/65 text-base sm:text-lg max-w-xl">
                  Tired of agencies with buried contracts and surprise invoices? Same. Here&apos;s what we do instead.
                </p>
              </FadeIn>

              <StaggerParent className="space-y-4">
                {/* Featured guarantee */}
                <StaggerChild>
                  <motion.div
                    whileHover={reduced ? undefined : { y: -4, borderColor: 'rgba(255,69,0,0.45)' }}
                    transition={{ duration: 0.2 }}
                    className="bg-[#13131f] border border-[#FF4500]/22 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row gap-5 sm:gap-8 items-start"
                  >
                    <div className="flex-shrink-0">
                      <div className="font-mono text-[3.25rem] sm:text-[4rem] font-extrabold text-[#FF4500] leading-none tracking-tight">72</div>
                      <div className="font-mono text-[10px] text-white/55 tracking-[0.18em] uppercase mt-1.5">hours</div>
                    </div>
                    <div className="pt-0.5">
                      <h3 className="font-bold text-white text-base sm:text-lg mb-2 leading-snug">72-Hour Preview or Refund.</h3>
                      <p className="text-white/65 text-sm leading-relaxed">
                        You see your site within 72 hours of kickoff. If we miss the window, you don&apos;t pay. (We haven&apos;t missed one yet.)
                      </p>
                    </div>
                  </motion.div>
                </StaggerChild>

                {/* 3 supporting cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: 'No Contracts. Ever.', body: 'Month-to-month only. Stop anytime, no penalties, no exit fees, no fine print.' },
                    { title: 'You Own Your Site.',  body: 'Your domain, your code, your property. We never hold your website hostage.' },
                    { title: 'Price Is Price.',     body: 'No setup surprises. No hidden invoices. The number on the page is what you pay.', badge: { num: '0', unit: 'hidden fees' } },
                  ].map(item => (
                    <StaggerChild key={item.title}>
                      <motion.div
                        whileHover={reduced ? undefined : { y: -4, borderColor: 'rgba(255,69,0,0.28)' }}
                        transition={{ duration: 0.2 }}
                        className="bg-[#13131f] border border-white/7 rounded-2xl p-5 sm:p-6 h-full text-center"
                      >
                        {'badge' in item && item.badge && (
                          <div className="mb-3">
                            <div className="font-mono text-[2.75rem] font-extrabold text-[#FF4500] leading-none">{item.badge.num}</div>
                            <div className="font-mono text-[10px] text-white/55 tracking-[0.18em] uppercase mt-1">{item.badge.unit}</div>
                          </div>
                        )}
                        <h3 className="font-bold text-white text-sm mb-1.5 leading-snug">{item.title}</h3>
                        <p className="text-white/65 text-xs leading-relaxed">{item.body}</p>
                      </motion.div>
                    </StaggerChild>
                  ))}
                </div>
              </StaggerParent>
            </div>

            {/* Right — stats */}
            <div className="lg:pt-14">
              <FadeIn>
                <div className="grid grid-cols-2 gap-5">
                  {STATS.map(s => (
                    <div key={s.label} className="bg-[#13131f]/70 rounded-2xl p-5 border border-white/6 text-center">
                      <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#FF4500] mb-1">
                        {s.value === 0 ? 'Zero' : <Counter to={s.value} suffix={s.suffix} />}
                      </div>
                      <p className="text-white/50 text-sm sm:text-base">{s.label}</p>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>

          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-24" aria-label="How it works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-14 sm:mb-16">
            <div className="flex items-center justify-center gap-4 mb-5">
              <span className="h-px bg-white/15 w-14 flex-shrink-0" aria-hidden />
              <span className="text-white/55 text-sm font-mono tracking-[0.20em] uppercase">THE PROCESS</span>
              <span className="h-px bg-white/15 w-14 flex-shrink-0" aria-hidden />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Three steps. Less than a week. Done.</h2>
            <p className="text-white/65 text-base sm:text-lg max-w-lg mx-auto">
              You tell us about your business. We build everything. You show up.
            </p>
          </FadeIn>

          <StaggerParent className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            {PROCESS_STEPS.map(s => (
              <StaggerChild key={s.n}>
                <motion.div whileHover={reduced ? undefined : { y: -4 }} transition={{ duration: 0.2 }}
                  className="flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className="w-20 h-20 rounded-2xl bg-[#FF4500]/7 border border-[#FF4500]/16 flex items-center justify-center text-[#FF4500]">
                      {s.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#FF4500] text-white text-xs font-extrabold flex items-center justify-center shadow-md shadow-[#FF4500]/30" aria-hidden>
                      {s.n}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{s.title}</h3>
                  <p className="text-[#FF4500]/80 font-semibold text-sm mb-3">{s.sub}</p>
                  <p className="text-white/65 text-sm leading-relaxed">{s.body}</p>
                </motion.div>
              </StaggerChild>
            ))}
          </StaggerParent>
        </div>
      </section>

      {/* ══ PAIN POINTS ═══════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-24"
        style={{ background: 'linear-gradient(160deg, rgba(27,43,75,0.18) 0%, rgba(13,13,28,0.92) 40%, rgba(13,13,28,0.88) 100%)' }}
        aria-label="Pain points">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12 sm:mb-14">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="font-mono text-[#FF4500] text-base tracking-[0.16em] uppercase">// 02 — Sound Familiar?</span>
              <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">This is exactly who we built this for.</h2>
            <p className="text-white/65 text-base sm:text-lg max-w-xl mx-auto">
              If any of these hit too close to home, you&apos;re in the right place.
            </p>
          </FadeIn>

          <StaggerParent className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {PAIN_POINTS.map((text, i) => (
              <StaggerChild key={i}>
                <motion.div
                  whileHover={reduced ? undefined : { y: -4, borderColor: 'rgba(255,69,0,0.3)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#13131f] border border-white/7 rounded-2xl p-6 flex gap-4 items-start"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#4A5E4A]/20 flex items-center justify-center text-[#FF4500] flex-shrink-0 mt-0.5 font-mono text-sm font-bold">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <p className="text-white/75 text-sm leading-relaxed">{text}</p>
                </motion.div>
              </StaggerChild>
            ))}
          </StaggerParent>

          <FadeIn delay={0.12} className="text-center mt-8 sm:mt-10">
            <p className="text-white/60 text-sm max-w-md mx-auto mb-6">
              Yep. We fix all of this. 72-hour preview, guaranteed.
            </p>
            <CTAButton label="Get My Free Visibility Audit" href="#audit" external={false} />
          </FadeIn>
        </div>
      </section>

      {/* ══ PRICING ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-[rgba(13,13,28,0.88)]" aria-label="Pricing" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="font-mono text-[#FF4500] text-base tracking-[0.16em] uppercase">// PRICING</span>
              <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              No contracts. No surprises.{' '}
              <span className="text-[#FF4500]">Just honest pricing.</span>
            </h2>
            <p className="text-white/65 text-base sm:text-lg max-w-lg mx-auto mb-8">
              Simple, transparent plans. You own everything from day one.
            </p>
            <Link href="/pricing"
              className="inline-flex items-center gap-2 bg-[#FF4500] text-white font-bold rounded-xl
                hover:bg-[#FF5500] transition-colors duration-150 min-h-[44px] text-base px-7 py-4">
              See All Plans 🚀
            </Link>
          </FadeIn>

          {/* Guarantee */}
          <FadeIn delay={0.1} className="mt-10 max-w-5xl mx-auto">
            <div className="bg-[#13131f] border border-[#FF4500]/22 rounded-2xl p-7 sm:p-9 text-center">
              <p className="text-white/85 text-base sm:text-lg font-semibold leading-relaxed">
                72-hour preview. Full delivery within 14 days. Or you don&apos;t pay.
              </p>
            </div>
          </FadeIn>

          {/* We Give Back */}
          <FadeIn delay={0.12} className="mt-6 max-w-5xl mx-auto">
            <div className="bg-[#1B2B4B]/40 border border-white/8 rounded-2xl p-6 sm:p-7">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-[#FF4500] text-sm tracking-[0.18em] uppercase">// WE GIVE BACK</span>
                <span className="h-px bg-[#FF4500]/25 w-8 flex-shrink-0" aria-hidden />
              </div>
              <p className="text-white font-semibold text-sm mb-1">
                $20 of every purchase goes to charity — you choose where.
              </p>
              <p className="text-white/50 text-xs mb-4 leading-relaxed">
                Own a 501(c)(3)? We build websites for nonprofits free of charge. Reach out — we&apos;d love to help.
              </p>
              <div className="flex flex-wrap gap-2">
                {CHARITIES.map(c => (
                  <span key={c} className="text-xs bg-[#1B2B4B] border border-white/10 text-white/60 px-3 py-1.5 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════════════ */}
      <FAQSection />

      {/* ══ CONTACT ═══════════════════════════════════════════════════════════ */}
      <section id="contact" className="py-20 sm:py-24 bg-[rgba(13,13,28,0.88)]" aria-label="Contact form">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Let&apos;s get you online.</h2>
            <p className="text-white/65 text-base sm:text-lg">
              Drop us your info and we&apos;ll reach out within a few hours. No spam, no pitch decks.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="bg-[#13131f] rounded-2xl border border-white/8 p-6 sm:p-10">
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div key="success"
                    initial={reduced ? {} : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-14">
                    <motion.div
                      initial={reduced ? {} : { scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                      className="w-16 h-16 rounded-full bg-[#FF4500]/12 flex items-center justify-center mx-auto mb-5" aria-hidden>
                      <svg className="w-8 h-8 text-[#FF4500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                    <div className="text-4xl mb-3" aria-hidden>🚀</div>
                    <h3 className="text-xl font-extrabold text-white mb-2">Message sent!</h3>
                    <p className="text-white/65">We&apos;ll be in touch within a few hours.</p>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-white/80 mb-1.5">Name</label>
                        <input id="name" type="text" name="name" value={form.name} onChange={handleChange}
                          required placeholder="John Smith" className={inputCls} autoComplete="name" />
                      </div>
                      <div>
                        <label htmlFor="businessName" className="block text-sm font-semibold text-white/80 mb-1.5">Business Name</label>
                        <input id="businessName" type="text" name="businessName" value={form.businessName}
                          onChange={handleChange} required placeholder="Smith Plumbing Co." className={inputCls} autoComplete="organization" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-white/80 mb-1.5">Phone</label>
                        <input id="phone" type="tel" name="phone" value={form.phone}
                          onChange={handleChange} required placeholder="(321) 555-0100" className={inputCls} autoComplete="tel" />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-white/80 mb-1.5">Email</label>
                        <input id="email" type="email" name="email" value={form.email}
                          onChange={handleChange} required placeholder="john@smithplumbing.com" className={inputCls} autoComplete="email" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="interest" className="block text-sm font-semibold text-white/80 mb-1.5">What are you looking for?</label>
                      <div className="relative">
                        <select id="interest" name="interest" value={form.interest}
                          onChange={handleChange} required
                          className={`${inputCls} appearance-none pr-10 cursor-pointer`}>
                          <option value="">Pick an option…</option>
                          <option>Website</option>
                          <option>Growth Plan</option>
                          <option>Fractional CMO</option>
                          <option>Site Care Plan</option>
                          <option>Military / First Responder Discount</option>
                          <option>Just have questions</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center" aria-hidden>
                          <svg className="w-4 h-4 text-white/45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {status === 'error' && (
                      <p className="text-red-400 text-sm" role="alert">
                        Something went wrong. Try again or call{' '}
                        <a href="tel:+13213285307" className="underline">(321) 328-5307</a>.
                      </p>
                    )}

                    <SubmitButton loading={status === 'loading'} />
                    <p className="text-center text-white/45 text-xs pt-1">
                      By submitting, you agree to our{' '}
                      <a href="/privacy" className="underline hover:text-white/70 transition-colors">Privacy Policy</a>.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  )
}
