'use client'

/**
 * Enhancement 4 — Left-side vertical scroll progress indicator.
 * Six dots (one per major section) connected by a thin line.
 * Active dot fills orange and scales up. Fades in after 200px of scroll.
 * Hover reveals section label.
 */

import { useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'

const SECTIONS = [
  { id: 'hero',       label: 'Hero'        },
  { id: 'audit',      label: 'Audit Tool'  },
  { id: 'guarantees', label: 'Guarantees'  },
  { id: 'process',    label: 'Process'     },
  { id: 'pain',       label: 'Pain Points' },
  { id: 'pricing',    label: 'Pricing'     },
]

export default function ScrollProgressDots() {
  const [active,  setActive]  = useState(0)
  const [hovered, setHovered] = useState<number | null>(null)
  const { scrollY } = useScroll()

  // Fade in after 200px
  const opacity = useTransform(scrollY, [150, 250], [0, 1])

  // Track active section via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    SECTIONS.forEach(({ id }, i) => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(i) },
        { threshold: 0.3 },
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [])

  return (
    <motion.nav
      style={{ opacity }}
      aria-label="Page sections"
      className="fixed left-5 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-0 pointer-events-none hidden lg:flex"
    >
      {SECTIONS.map((s, i) => (
        <div key={s.id} className="relative flex flex-col items-center pointer-events-auto">
          {/* Connector line above (skip first) */}
          {i > 0 && (
            <div className="w-px h-5 bg-white/15" />
          )}

          {/* Dot + label row */}
          <div
            className="relative flex items-center gap-2.5 cursor-pointer group"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })
            }}
            role="button"
            tabIndex={0}
            aria-label={`Scroll to ${s.label}`}
          >
            {/* Label — appears on hover */}
            <motion.span
              initial={{ opacity: 0, x: 6 }}
              animate={hovered === i ? { opacity: 1, x: 0 } : { opacity: 0, x: 6 }}
              transition={{ duration: 0.18 }}
              className="absolute right-full mr-2.5 text-[10px] font-mono text-white/70
                uppercase tracking-widest whitespace-nowrap pointer-events-none"
            >
              {s.label}
            </motion.span>

            {/* Dot */}
            <motion.div
              animate={active === i
                ? { scale: 12 / 8, backgroundColor: '#FF4500', borderColor: '#FF4500' }
                : { scale: 1,      backgroundColor: 'transparent', borderColor: '#FF4500' }
              }
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-2 h-2 rounded-full border-2"
              style={{ borderColor: '#FF4500' }}
            />
          </div>
        </div>
      ))}
    </motion.nav>
  )
}
