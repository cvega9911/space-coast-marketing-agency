'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

interface RocketButtonProps {
  href: string
  children: React.ReactNode
  className?: string
  target?: string
  rel?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export default function RocketButton({
  href, children, className = '', target, rel, onClick,
}: RocketButtonProps) {
  const [phase, setPhase] = useState<'idle' | 'flying' | 'bobbing'>('idle')
  const [endX, setEndX] = useState(120)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)
  const prefersReduced = useReducedMotion()

  useEffect(() => { setMounted(true) }, [])

  const reduced = mounted && !!prefersReduced

  const isExternal     = href.startsWith('http')
  const resolvedTarget = target ?? (isExternal ? '_blank'              : undefined)
  const resolvedRel    = rel    ?? (isExternal ? 'noopener noreferrer' : undefined)

  function handleEnter() {
    if (reduced) return
    if (containerRef.current) setEndX(containerRef.current.offsetWidth - 32)
    setPhase('flying')
  }

  return (
    <span ref={containerRef} className="relative inline-flex"
      onMouseEnter={handleEnter} onMouseLeave={() => setPhase('idle')}>
      <motion.a
        href={href} target={resolvedTarget} rel={resolvedRel}
        className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4500] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a14] ${className}`}
        onClick={onClick} whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
      >
        <motion.span animate={{ x: phase !== 'idle' ? 8 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }} className="inline-block">
          {children}
        </motion.span>
      </motion.a>

      <AnimatePresence>
        {mounted && phase !== 'idle' && (
          <motion.span key={phase} aria-hidden
            className="pointer-events-none absolute z-50 select-none"
            style={{ fontSize: '18px', lineHeight: 1, top: '50%', marginTop: '-9px', left: 8 }}
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
