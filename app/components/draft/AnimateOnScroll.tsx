'use client'

/**
 * Enhancement 2 — Scroll-Triggered Fade-and-Rise wrapper.
 * Wraps any children and animates them from opacity:0 / y:40 to
 * opacity:1 / y:0 using a spring when they enter the viewport.
 */

import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

interface Props {
  children: React.ReactNode
  delay?: number
  className?: string
}

export default function AnimateOnScroll({ children, delay = 0, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{
        delay,
        type: 'spring',
        stiffness: 60,
        damping: 20,
      }}
    >
      {children}
    </motion.div>
  )
}
