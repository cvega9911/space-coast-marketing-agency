/**
 * /draft — Scroll-driven design playground.
 * Self-contained at this route. DO NOT import from or affect app/page.tsx.
 *
 * Enhancements implemented:
 *  1. Parallax hero with aerial Space Coast image
 *  2. AnimateOnScroll — spring fade-and-rise wrapper
 *  3. Pinned guarantees — 400vh sequential beat reveal
 *  4. Scroll progress dots — fixed left-side nav
 *  5. Animated counters — scroll-triggered with progress bar
 *  6. Typewriter headline — 4-phrase cycling (lives inside ParallaxHero)
 *  7. Horizontal pain rail — 200vh scroll-driven card track
 */

import Nav              from '../components/Nav'
import Footer           from '../components/Footer'
import DraftBanner      from '../components/draft/DraftBanner'
import ScrollProgressDots from '../components/draft/ScrollProgressDots'
import ParallaxHero     from '../components/draft/ParallaxHero'
import PinnedGuarantees from '../components/draft/PinnedGuarantees'
import ProcessSection   from '../components/draft/ProcessSection'
import HorizontalPainRail from '../components/draft/HorizontalPainRail'
import StatsSection     from '../components/draft/StatsSection'
import AnimateOnScroll  from '../components/draft/AnimateOnScroll'
import { CALENDLY }     from '../../lib/calendly'

export const metadata = {
  title: 'Draft — Space Coast Marketing Agency',
  robots: { index: false, follow: false },
}

export default function DraftPage() {
  return (
    <>
      {/* Fixed overlays */}
      <DraftBanner />
      <ScrollProgressDots />

      {/* Push page content below the 32px draft banner */}
      <div className="pt-8" style={{ background: '#0d0d1c' }}>
        <Nav />

        {/* 1 ── Parallax Hero (includes typewriter headline) */}
        <ParallaxHero />

        {/* 2 ── Audit tool placeholder ─────────────────────────── */}
        <section
          id="audit"
          className="py-20 sm:py-24 text-center"
          style={{ background: 'rgba(17,17,32,0.97)' }}
          aria-label="Free audit"
        >
          <div className="max-w-xl mx-auto px-6">
            <AnimateOnScroll>
              <div className="flex items-center justify-center gap-3 mb-5">
                <span className="h-px bg-[#FF4500]/25 w-10 flex-shrink-0" aria-hidden />
                <span className="font-mono text-[#FF4500] text-xs tracking-[0.18em] uppercase">// FREE AUDIT</span>
                <span className="h-px bg-[#FF4500]/25 w-10 flex-shrink-0" aria-hidden />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                See exactly what&apos;s costing you customers.
              </h2>
              <p className="text-white/55 text-sm mb-8">
                Instant analysis. No account. No pitch.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="yourbusiness.com"
                  readOnly
                  className="flex-1 bg-[#13131f] border border-white/12 rounded-xl px-4 py-3
                    text-white text-sm placeholder:text-white/30 outline-none min-h-[48px]"
                />
                <a
                  href={CALENDLY.DISCOVERY}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                    bg-[#FF4500] text-white font-bold text-sm hover:bg-[#e03d00]
                    transition-colors duration-150 min-h-[48px] whitespace-nowrap"
                >
                  Show Me What I&apos;m Missing 🚀
                </a>
              </div>
              <p className="text-white/30 text-xs mt-3">Free — no account needed</p>
            </AnimateOnScroll>
          </div>
        </section>

        {/* 3 ── Pinned guarantees reveal (400vh) */}
        <PinnedGuarantees />

        {/* 2 + 4 ── Process section with AnimateOnScroll wrappers */}
        <ProcessSection />

        {/* 7 ── Horizontal pain rail (200vh on desktop, snap on mobile) */}
        <HorizontalPainRail />

        {/* 5 ── Animated stats counters */}
        <StatsSection />

        {/* CTA band */}
        <section
          className="py-20 text-center"
          style={{ background: 'rgba(13,13,28,0.97)' }}
          aria-label="Call to action"
        >
          <div className="max-w-2xl mx-auto px-6">
            <AnimateOnScroll>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Ready to get found on the Space Coast?
              </h2>
              <p className="text-white/55 text-base mb-8">
                72-hour preview. $599 flat. You own everything.
              </p>
              <a
                href={CALENDLY.DISCOVERY}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl
                  bg-[#FF4500] text-white font-bold text-lg hover:bg-[#e03d00]
                  transition-colors duration-150 min-h-[56px] shadow-xl shadow-[#FF4500]/30"
              >
                Book a Free Discovery Call 🚀
              </a>
            </AnimateOnScroll>
          </div>
        </section>

        <Footer />
      </div>
    </>
  )
}
