'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Nav                from './components/Nav'
import Footer             from './components/Footer'
import ScrollProgressDots from './components/draft/ScrollProgressDots'
import ParallaxHero       from './components/draft/ParallaxHero'
import PinnedGuarantees   from './components/draft/PinnedGuarantees'
import ProcessSection     from './components/draft/ProcessSection'
import HorizontalPainRail from './components/draft/HorizontalPainRail'
import StatsSection       from './components/draft/StatsSection'
import AnimateOnScroll    from './components/draft/AnimateOnScroll'
import CTAButton          from './components/CTAButton'

const AuditTool = dynamic(() => import('./components/AuditTool'), { ssr: false })

// ─── Data ─────────────────────────────────────────────────────────────────────
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
    a: "We have simple, transparent plans with no hidden fees and no surprise invoices. Head to our pricing page to see the full breakdown — or get your free audit first and we'll point you to the right fit.",
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

// ─── FAQ section ──────────────────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)
  const reduced = useReducedMotion()

  return (
    <section className="py-20 sm:py-24" aria-label="Frequently asked questions">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll className="text-center mb-12 sm:mb-14">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="h-px bg-[#FF4500]/25 w-10 flex-shrink-0" aria-hidden />
            <span className="font-mono text-[#FF4500] text-base tracking-[0.16em] uppercase">// FAQ</span>
            <span className="h-px bg-[#FF4500]/25 w-10 flex-shrink-0" aria-hidden />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Questions? We&apos;ve got you.</h2>
          <p className="text-white/65 text-base sm:text-lg max-w-lg mx-auto">No jargon, no runaround. Just straight answers.</p>
        </AnimateOnScroll>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <AnimateOnScroll key={i} delay={i * 0.04}>
              <div className={`bg-[#13131f] border rounded-2xl overflow-hidden transition-colors duration-200 ${open === i ? 'border-[#FF4500]/35' : 'border-white/7'}`}>
                <button type="button" onClick={() => setOpen(open === i ? null : i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 min-h-[56px]"
                  aria-expanded={open === i}>
                  <span className="font-semibold text-white text-base leading-snug">{item.q}</span>
                  <motion.span aria-hidden
                    animate={reduced ? {} : { rotate: open === i ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF4500]/10 flex items-center justify-center text-[#FF4500] text-lg leading-none">
                    +
                  </motion.span>
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
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Submit button ────────────────────────────────────────────────────────────
function SubmitButton({ loading }: { loading: boolean }) {
  const reduced = useReducedMotion()
  return (
    <motion.button
      type="submit" disabled={loading}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      className="w-full bg-[#FF4500] text-white font-extrabold text-base py-4 px-8
        rounded-xl hover:bg-[#FF5500] transition-colors duration-150
        disabled:opacity-60 disabled:cursor-not-allowed mt-2 min-h-[52px]">
      {loading ? 'Sending…' : 'Send it 🚀'}
    </motion.button>
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
    <div className="min-h-screen bg-[#0d0d1c] text-[#F5F5F0]">

      {/* Fixed overlays */}
      <ScrollProgressDots />
      <Nav />

      {/* ══ HERO — parallax + typewriter ══════════════════════════════════════ */}
      <ParallaxHero />

      {/* ══ SEO BAND ══════════════════════════════════════════════════════════ */}
      <div className="py-5 bg-[#0a0a14] border-b border-white/5 text-center">
        <p className="text-xs sm:text-sm text-white/45 font-medium tracking-wide">
          Web Design &amp; Marketing for Florida Small Businesses · Space Coast, Brevard County &amp; Beyond
        </p>
      </div>

      {/* ══ FREE AUDIT TOOL ═══════════════════════════════════════════════════ */}
      <div id="audit"><AuditTool /></div>

      {/* ══ GUARANTEES — pinned 400vh reveal ══════════════════════════════════ */}
      <PinnedGuarantees />

      {/* ══ PROCESS ═══════════════════════════════════════════════════════════ */}
      <ProcessSection />

      {/* ══ PAIN POINTS — horizontal scroll rail ══════════════════════════════ */}
      <HorizontalPainRail />

      {/* ══ STATS — animated counters ═════════════════════════════════════════ */}
      <StatsSection />

      {/* ══ PRICING TEASER ════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-24 bg-[rgba(13,13,28,0.88)]" aria-label="Pricing">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
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
          </AnimateOnScroll>

          {/* Guarantee */}
          <AnimateOnScroll delay={0.1} className="mt-10">
            <div className="bg-[#13131f] border border-[#FF4500]/22 rounded-2xl p-7 sm:p-9 text-center">
              <p className="text-white/85 text-base sm:text-lg font-semibold leading-relaxed">
                72-hour preview. Full delivery within 14 days. Or you don&apos;t pay.
              </p>
            </div>
          </AnimateOnScroll>

          {/* We Give Back */}
          <AnimateOnScroll delay={0.14} className="mt-6">
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
          </AnimateOnScroll>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════════════ */}
      <FAQSection />

      {/* ══ CONTACT ═══════════════════════════════════════════════════════════ */}
      <section id="contact" className="py-20 sm:py-24 bg-[rgba(13,13,28,0.88)]" aria-label="Contact form">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateOnScroll className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Let&apos;s get you online.</h2>
            <p className="text-white/65 text-base sm:text-lg">
              Drop us your info and we&apos;ll reach out within a few hours. No spam, no pitch decks.
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll delay={0.1}>
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
          </AnimateOnScroll>
        </div>
      </section>

      <Footer />
    </div>
  )
}
