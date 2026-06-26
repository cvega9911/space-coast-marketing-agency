'use client'

/**
 * Stats section using Enhancement 5 animated counters.
 * Reuses STATS from the main page data.
 */

import AnimatedCounter from './AnimatedCounter'
import AnimateOnScroll from './AnimateOnScroll'
import CTAButton from '../CTAButton'

const STATS = [
  { value: 72,  suffix: 'hrs', label: 'Guaranteed delivery', isZero: false },
  { value: 0,   suffix: '',    label: 'Hidden fees',          isZero: true  },
  { value: 0,   suffix: '',    label: 'Contracts required',   isZero: true  },
  { value: 100, suffix: '%',   label: 'Client ownership',     isZero: false },
]

export default function StatsSection() {
  return (
    <section
      id="pricing"
      className="py-20 sm:py-28"
      style={{ background: 'rgba(13,13,28,0.95)' }}
      aria-label="Stats"
    >
      <div className="max-w-5xl mx-auto px-6">
        <AnimateOnScroll className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
            <span className="font-mono text-[#FF4500] text-base tracking-[0.16em] uppercase">// BY THE NUMBERS</span>
            <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            No contracts. No hidden fees.{' '}
            <span className="text-[#FF4500]">No surprises.</span>
          </h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-14">
          {STATS.map((s, i) => (
            <AnimateOnScroll key={s.label} delay={i * 0.08}>
              <AnimatedCounter
                to={s.value}
                suffix={s.suffix}
                label={s.label}
                isZero={s.isZero}
              />
            </AnimateOnScroll>
          ))}
        </div>

        <AnimateOnScroll delay={0.2} className="mt-12 text-center">
          <CTAButton label="Get My Free Visibility Audit" href="#audit" />
          <p className="text-white/35 text-xs mt-4">
            72-hour preview guaranteed. Full delivery within 14 days. Or you don&apos;t pay.
          </p>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
