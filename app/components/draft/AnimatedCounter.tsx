'use client'

/**
 * Enhancement 5 — Scroll-triggered animated number counter with progress bar.
 * Starts counting only when the element enters the viewport (once).
 * The "Zero" (contracts=0) stat cycles 0→∞→"Zero" with a bounce effect.
 */

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'motion/react'

interface Props {
  to: number
  suffix?: string
  label: string
  isZero?: boolean   // special treatment for the "Zero contracts" stat
}

/** Ease-out cubic: t ∈ [0,1] → eased value */
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

const DURATION = 1500 // ms

export default function AnimatedCounter({ to, suffix = '', label, isZero = false }: Props) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })

  const [count,    setCount]    = useState(0)
  const [progress, setProgress] = useState(0)
  const [display,  setDisplay]  = useState<string>('0')
  const [started,  setStarted]  = useState(false)

  useEffect(() => {
    if (!inView || started) return
    setStarted(true)

    if (isZero) {
      // Special: 0 → show "∞" briefly → bounce to "Zero"
      const stages: Array<{ delay: number; text: string }> = [
        { delay: 0,    text: '0'    },
        { delay: 400,  text: '∞'    },
        { delay: 900,  text: 'Zero' },
      ]
      stages.forEach(({ delay, text }) => {
        setTimeout(() => setDisplay(text), delay)
      })
      // also animate progress bar
      let start = 0
      const raf = (ts: number) => {
        if (!start) start = ts
        const p = Math.min((ts - start) / DURATION, 1)
        setProgress(easeOutCubic(p))
        if (p < 1) requestAnimationFrame(raf)
      }
      requestAnimationFrame(raf)
      return
    }

    // Normal count-up
    let start = 0
    const raf = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / DURATION, 1)
      const eased = easeOutCubic(p)
      setCount(Math.round(eased * to))
      setProgress(eased)
      if (p < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [inView, started, isZero, to])

  const displayValue = isZero ? display : `${count}${suffix}`

  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      {/* Counter value */}
      <motion.div
        className="font-mono font-extrabold text-[#FF4500] leading-none mb-2"
        style={{ fontSize: 'clamp(3rem, 6vw, 6rem)' }}
        animate={isZero && display === 'Zero' ? { scale: [1.15, 0.95, 1] } : {}}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {displayValue}
      </motion.div>

      {/* Label */}
      <p className="text-white/55 text-xs sm:text-sm mb-3">{label}</p>

      {/* Progress bar */}
      <div className="w-full h-0.5 bg-white/8 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#FF4500] rounded-full origin-left"
          style={{ scaleX: progress }}
          transition={{ ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
