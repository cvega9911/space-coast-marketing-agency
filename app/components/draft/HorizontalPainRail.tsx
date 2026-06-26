'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, MotionValue } from 'motion/react'

const PAIN_POINTS = [
  {
    num: '01',
    text: "You don't have a website — or you do, and you'd rather people didn't see it.",
    sub: 'No online presence',
  },
  {
    num: '02',
    text: "People are Googling you and landing on a competitor's site instead.",
    sub: 'Invisible on Google',
  },
  {
    num: '03',
    text: "You're losing jobs to competitors with better-looking sites. You can feel it.",
    sub: 'Losing leads daily',
  },
  {
    num: '04',
    text: "Someone quoted you $3,000–$8,000 for a website. You're still thinking about it.",
    sub: 'Overpriced alternatives',
  },
]

const CARD_W  = 400
const GAP     = 28
const PADDING = 72
const TOTAL_W = PAIN_POINTS.length * CARD_W + (PAIN_POINTS.length - 1) * GAP

function PainCard({
  item,
  i,
  railX,
  totalCards,
}: {
  item: (typeof PAIN_POINTS)[number]
  i: number
  railX: MotionValue<number>
  totalCards: number
}) {
  const centerIdx      = (totalCards - 1) / 2
  const distFromCenter = i - centerIdx
  const rotate = useTransform(railX, [-TOTAL_W, 0], [distFromCenter * 1.5 - 2, distFromCenter * 1.5 + 2])

  return (
    <motion.div
      style={{ rotate, width: CARD_W, height: 288, willChange: 'transform' }}
      className="flex-shrink-0 relative bg-[#13131f] border border-white/10 rounded-2xl p-8
        flex flex-col justify-between overflow-hidden"
    >
      {/* Ghost number — large faded background */}
      <div
        className="absolute -right-3 -bottom-5 font-mono font-extrabold leading-none select-none pointer-events-none text-white/[0.04]"
        style={{ fontSize: '9rem' }}
        aria-hidden
      >
        {item.num}
      </div>

      {/* Top section */}
      <div>
        {/* Numbered label + accent line */}
        <div className="flex items-center gap-3 mb-6">
          <span className="font-mono text-[#FF4500] text-xs font-bold tracking-[0.25em] uppercase">
            {item.num}
          </span>
          <span className="h-px flex-1 bg-[#FF4500]/20" aria-hidden />
          <span className="text-white/25 text-[10px] font-mono uppercase tracking-widest">{item.sub}</span>
        </div>

        {/* Pain text — big and bold */}
        <p className="text-white font-bold text-xl leading-snug">
          {item.text}
        </p>
      </div>

      {/* Bottom CTA prompt */}
      <div className="flex items-center gap-2 mt-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4500] flex-shrink-0" aria-hidden />
        <span className="text-[#FF4500]/60 text-xs font-mono uppercase tracking-widest">
          We can fix this.
        </span>
      </div>
    </motion.div>
  )
}

export default function HorizontalPainRail() {
  const outerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  const [maxShift, setMaxShift] = useState(320)
  useEffect(() => {
    const update = () => {
      const shift = TOTAL_W - window.innerWidth + PADDING * 2
      setMaxShift(Math.max(shift, 0))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const railX       = useTransform(scrollYProgress, [0, 1], [0, -maxShift])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.1, 0.85, 1], [0, 1, 1, 0])

  return (
    <section id="pain" aria-label="Pain points">
      {/* ── Desktop: 200vh pinned horizontal scroll ─── */}
      <div ref={outerRef} className="hidden lg:block" style={{ height: '200vh' }}>
        <div
          className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center"
          style={{
            background:
              'linear-gradient(160deg, rgba(27,43,75,0.22) 0%, rgba(13,13,28,0.95) 45%, rgba(13,13,28,0.92) 100%)',
          }}
        >
          {/* Heading */}
          <div className="px-16 mb-12 flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-[#FF4500] text-xs tracking-[0.22em] uppercase font-bold">// 02</span>
              <span className="h-px bg-[#FF4500]/20 w-10" aria-hidden />
            </div>
            <h2 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.0] mb-4">
              Sound<br />
              <span className="text-[#FF4500]">Familiar?</span>
            </h2>
            <p className="text-white/40 text-sm max-w-xs leading-relaxed">
              If any of these hit too close to home, you&apos;re in the right place.
            </p>
          </div>

          {/* Card rail */}
          <div className="overflow-visible flex-shrink-0" style={{ paddingLeft: PADDING }}>
            <motion.div style={{ x: railX, gap: GAP, willChange: 'transform' }} className="flex">
              {PAIN_POINTS.map((item, i) => (
                <PainCard
                  key={item.num}
                  item={item}
                  i={i}
                  railX={railX}
                  totalCards={PAIN_POINTS.length}
                />
              ))}
            </motion.div>
          </div>

          {/* Scroll hint */}
          <motion.div
            style={{ opacity: hintOpacity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2
              text-white/25 text-xs font-mono tracking-widest uppercase pointer-events-none"
            aria-hidden
          >
            <span>→</span> Scroll to see more
          </motion.div>
        </div>
      </div>

      {/* ── Mobile: CSS snap scroll ─── */}
      <div
        className="lg:hidden py-16"
        style={{
          background:
            'linear-gradient(160deg, rgba(27,43,75,0.22) 0%, rgba(13,13,28,0.95) 45%, rgba(13,13,28,0.92) 100%)',
        }}
      >
        <div className="px-5 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-[#FF4500] text-xs tracking-[0.22em] uppercase font-bold">// 02</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-2">
            Sound <span className="text-[#FF4500]">Familiar?</span>
          </h2>
          <p className="text-white/40 text-sm">
            If any of these hit too close to home, you&apos;re in the right place.
          </p>
        </div>

        <div
          className="flex overflow-x-auto pl-5 pb-4"
          style={{
            gap: 16,
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
        >
          {PAIN_POINTS.map(item => (
            <div
              key={item.num}
              className="flex-shrink-0 relative bg-[#13131f] border border-white/10 rounded-2xl p-6
                flex flex-col justify-between overflow-hidden"
              style={{ width: 300, height: 240, scrollSnapAlign: 'start' }}
            >
              {/* Ghost number */}
              <div
                className="absolute -right-2 -bottom-4 font-mono font-extrabold leading-none select-none pointer-events-none text-white/[0.04]"
                style={{ fontSize: '7rem' }}
                aria-hidden
              >
                {item.num}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-mono text-[#FF4500] text-xs font-bold tracking-[0.22em]">{item.num}</span>
                  <span className="h-px flex-1 bg-[#FF4500]/20" />
                  <span className="text-white/25 text-[10px] font-mono tracking-widest">{item.sub}</span>
                </div>
                <p className="text-white font-bold text-base leading-snug">{item.text}</p>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF4500]" aria-hidden />
                <span className="text-[#FF4500]/60 text-[10px] font-mono uppercase tracking-widest">We can fix this.</span>
              </div>
            </div>
          ))}
          <div className="flex-shrink-0 w-5" aria-hidden />
        </div>
      </div>
    </section>
  )
}
