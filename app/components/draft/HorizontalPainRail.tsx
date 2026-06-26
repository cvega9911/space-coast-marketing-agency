'use client'

/**
 * Enhancement 7 — Horizontal scroll card rail.
 * Desktop: 200vh pinned section. Vertical scroll drives horizontal card movement.
 *          Cards tilt ±2° based on their position relative to center.
 * Mobile:  CSS horizontal scroll snap (no JS needed).
 */

import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, MotionValue } from 'motion/react'

const PAIN_POINTS = [
  {
    num: '01',
    text: "You don't have a website — or you do, and you'd rather people didn't see it.",
  },
  {
    num: '02',
    text: "People are Googling you and landing on a competitor's site instead.",
  },
  {
    num: '03',
    text: "You're losing jobs to competitors with better-looking sites. You can feel it.",
  },
  {
    num: '04',
    text: "Someone quoted you $3,000–$8,000 for a website. You're still thinking about it.",
  },
]

const CARD_W  = 380  // px
const GAP     = 24   // px
const PADDING = 64   // px, left inset
const TOTAL_W = PAIN_POINTS.length * CARD_W + (PAIN_POINTS.length - 1) * GAP

// Each card is its own component so useTransform is called at component level (not inside .map)
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
  const centerIdx    = (totalCards - 1) / 2
  const distFromCenter = i - centerIdx

  // Cards on the left lean left, cards on the right lean right; straighten as they center
  const rotate = useTransform(railX, [-TOTAL_W, 0], [distFromCenter * 1.5 - 2, distFromCenter * 1.5 + 2])

  return (
    <motion.div
      style={{ rotate, width: CARD_W, willChange: 'transform' }}
      className="flex-shrink-0 bg-[#13131f] border border-white/10 rounded-2xl p-8
        flex flex-col gap-6 h-52"
    >
      <div className="w-8 h-8 rounded-xl bg-[#FF4500]/10 flex items-center justify-center
        text-[#FF4500] font-mono text-sm font-bold flex-shrink-0">
        {item.num}
      </div>
      <p className="text-white/75 text-sm sm:text-base leading-relaxed">{item.text}</p>
    </motion.div>
  )
}

export default function HorizontalPainRail() {
  const outerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  // Calculate max horizontal shift after mount (needs browser viewport width)
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

  const railX = useTransform(scrollYProgress, [0, 1], [0, -maxShift])

  // Arrow hint fades near end of section
  const hintOpacity = useTransform(scrollYProgress, [0, 0.1, 0.85, 1], [0, 1, 1, 0])

  return (
    <section id="pain" aria-label="Pain points">
      {/* ── Desktop: 200vh pinned horizontal scroll ─────────── */}
      <div
        ref={outerRef}
        className="hidden lg:block"
        style={{ height: '200vh' }}
      >
        <div
          className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center"
          style={{
            background:
              'linear-gradient(160deg, rgba(27,43,75,0.18) 0%, rgba(13,13,28,0.92) 40%, rgba(13,13,28,0.88) 100%)',
          }}
        >
          {/* Heading */}
          <div className="px-16 mb-10 flex-shrink-0">
            <p className="font-mono text-[#FF4500] text-xs tracking-[0.18em] uppercase mb-2">
              // 02 — Sound Familiar?
            </p>
            <h2 className="text-2xl font-extrabold text-white mb-1">
              This is exactly who we built this for.
            </h2>
            <p className="text-white/50 text-sm">
              If any of these hit too close to home, you&apos;re in the right place.
            </p>
          </div>

          {/* Card rail */}
          <div className="overflow-visible flex-shrink-0" style={{ paddingLeft: PADDING }}>
            <motion.div
              style={{ x: railX, willChange: 'transform' }}
              className="flex"
            >
              {PAIN_POINTS.map((item, i) => (
                <div
                  key={item.num}
                  style={{ marginRight: i < PAIN_POINTS.length - 1 ? GAP : 0 }}
                >
                  <PainCard
                    item={item}
                    i={i}
                    railX={railX}
                    totalCards={PAIN_POINTS.length}
                  />
                </div>
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

      {/* ── Mobile: CSS horizontal scroll snap ──────────────── */}
      <div
        className="lg:hidden py-16"
        style={{
          background:
            'linear-gradient(160deg, rgba(27,43,75,0.18) 0%, rgba(13,13,28,0.92) 40%, rgba(13,13,28,0.88) 100%)',
        }}
      >
        <div className="px-4 mb-8">
          <p className="font-mono text-[#FF4500] text-xs tracking-[0.18em] uppercase mb-2">
            // Sound Familiar?
          </p>
          <h2 className="text-xl font-extrabold text-white mb-1">
            This is exactly who we built this for.
          </h2>
          <p className="text-white/50 text-sm">
            If any of these hit too close to home, you&apos;re in the right place.
          </p>
        </div>

        <div
          className="flex overflow-x-auto pl-4 pb-4 gap-4"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
        >
          {PAIN_POINTS.map(item => (
            <div
              key={item.num}
              className="flex-shrink-0 bg-[#13131f] border border-white/10 rounded-2xl p-6
                flex flex-col gap-5"
              style={{ width: 300, scrollSnapAlign: 'start' }}
            >
              <div className="w-8 h-8 rounded-xl bg-[#FF4500]/10 flex items-center justify-center
                text-[#FF4500] font-mono text-sm font-bold">
                {item.num}
              </div>
              <p className="text-white/75 text-sm leading-relaxed">{item.text}</p>
            </div>
          ))}
          <div className="flex-shrink-0 w-4" aria-hidden />
        </div>
      </div>
    </section>
  )
}
