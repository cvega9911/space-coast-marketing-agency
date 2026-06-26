'use client'

/**
 * Enhancement 3 — Pinned scroll-through guarantees reveal.
 * 400vh of scroll space. Four sequential beats:
 *   cards 1–3 enter, hold, then shrink into an accumulating pill row.
 *   Card 4 enters and stays as the "resolution" state.
 */

import { useRef } from 'react'
import { motion, useScroll, useTransform, MotionValue } from 'motion/react'

const GUARANTEES = [
  {
    num:   '72',
    unit:  'hrs',
    title: '72-Hour Preview or Refund',
    body:  "You see your site within 72 hours of kickoff. If we miss the window, you don't pay. (We haven't missed one yet.)",
    pill:  '72hr Preview',
  },
  {
    num:   '∞',
    unit:  '',
    title: 'No Contracts. Ever.',
    body:  'Month-to-month only. Stop anytime, no penalties, no exit fees, no fine print.',
    pill:  'No Contracts',
  },
  {
    num:   '100',
    unit:  '%',
    title: 'You Own Your Site.',
    body:  'Your domain, your code, your property. We never hold your website hostage.',
    pill:  'You Own It',
  },
  {
    num:   '0',
    unit:  'hidden fees',
    title: 'Price Is Price.',
    body:  'No setup surprises. No hidden invoices. The number on the page is what you pay.',
    pill:  'Price Is Price',
  },
]

type Guarantee = typeof GUARANTEES[number]

// Sub-components — hooks at component level, never inside .map() ───────────────

function GuaranteeCard({
  g,
  i,
  sv,
  isLast,
}: {
  g: Guarantee
  i: number
  sv: MotionValue<number>
  isLast: boolean
}) {
  const step  = 0.25
  const start = i * step
  const peakS = start + 0.04
  // Last card stays visible through the end; others transition out
  const peakE = isLast ? 1 : start + step - 0.04
  const end   = isLast ? 1 : start + step

  const opacity     = useTransform(sv, [start, peakS, peakE, end], [0, 1, 1, isLast ? 1 : 0])
  const x           = useTransform(sv, [start, peakS], [80, 0])
  const scaleNormal = useTransform(sv, [start + step - 0.04, start + step], [1, 0.88])
  const scaleFlat   = useTransform(sv, [peakS, 1], [1, 1])
  const scale       = isLast ? scaleFlat : scaleNormal

  return (
    <motion.div
      style={{
        opacity,
        x,
        scale,
        position: 'absolute',
        inset: 0,
        willChange: 'transform, opacity',
      }}
      className="bg-[#13131f] border border-[#FF4500]/22 rounded-2xl p-8 sm:p-10"
    >
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start">
        <div className="flex-shrink-0">
          <div className="font-mono text-[4rem] sm:text-[5rem] font-extrabold text-[#FF4500] leading-none tracking-tight">
            {g.num}
          </div>
          {g.unit && (
            <div className="font-mono text-[10px] text-white/45 tracking-[0.2em] uppercase mt-1">
              {g.unit}
            </div>
          )}
        </div>
        <div className="pt-1">
          <h3 className="font-bold text-white text-xl sm:text-2xl mb-3 leading-snug">
            {g.title}
          </h3>
          <p className="text-white/65 text-base leading-relaxed">{g.body}</p>
        </div>
      </div>

      <div className="mt-8 flex gap-1.5">
        {GUARANTEES.map((_, j) => (
          <div
            key={j}
            className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
              j <= i ? 'bg-[#FF4500]' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </motion.div>
  )
}

// Pills for cards 0–2 only (card 3 stays prominent, no pill needed)
function GuaranteePill({
  g,
  i,
  sv,
}: {
  g: Guarantee
  i: number
  sv: MotionValue<number>
}) {
  // Pill appears when the card exits: at (i+1) * 0.25, max 0.9
  const pillStart = Math.min((i + 1) * 0.25, 0.9)
  const opacity   = useTransform(sv, [pillStart, pillStart + 0.04, 1], [0, 1, 1])
  const y         = useTransform(sv, [pillStart, pillStart + 0.04], [8, 0])

  return (
    <motion.div
      style={{ opacity, y }}
      className="bg-[#FF4500]/15 border border-[#FF4500]/30 text-[#FF4500]
        text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full whitespace-nowrap"
    >
      {g.pill}
    </motion.div>
  )
}

function ScrollHint({ sv }: { sv: MotionValue<number> }) {
  const opacity = useTransform(sv, [0, 0.1, 0.85, 1], [0.5, 0.5, 0.5, 0])
  return (
    <motion.p
      style={{ opacity }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 text-xs font-mono tracking-widest uppercase pointer-events-none"
      aria-hidden
    >
      Keep scrolling
    </motion.p>
  )
}

export default function PinnedGuarantees() {
  const outerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  return (
    <div ref={outerRef} style={{ height: '400vh' }} className="relative" id="guarantees">
      <div
        className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center"
        style={{ background: '#111120' }}
      >
        {/* Section label */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
          <span className="h-px bg-[#FF4500]/25 w-10 flex-shrink-0" aria-hidden />
          <span className="font-mono text-[#FF4500] text-xs tracking-[0.18em] uppercase">
            // 01 — GUARANTEES
          </span>
          <span className="h-px bg-[#FF4500]/25 w-10 flex-shrink-0" aria-hidden />
        </div>

        {/* Accumulated pills — cards 0, 1, 2 only */}
        <div className="absolute top-20 left-0 right-0 flex justify-center gap-3 px-4 z-10">
          {GUARANTEES.slice(0, 3).map((g, i) => (
            <GuaranteePill key={g.pill} g={g} i={i} sv={scrollYProgress} />
          ))}
        </div>

        {/* Card stack */}
        <div className="relative w-full max-w-2xl mx-auto px-6 mt-10" style={{ minHeight: 280 }}>
          {GUARANTEES.map((g, i) => (
            <GuaranteeCard
              key={g.title}
              g={g}
              i={i}
              sv={scrollYProgress}
              isLast={i === GUARANTEES.length - 1}
            />
          ))}
        </div>

        <ScrollHint sv={scrollYProgress} />
      </div>
    </div>
  )
}
