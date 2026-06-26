'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView, useReducedMotion } from 'motion/react'

export default function CTAButton({
  label = 'Get My Free Visibility Audit',
  href = '#audit',
  large = true,
  glow = false,
  external = false,
}: {
  label?: string
  href?: string
  large?: boolean
  glow?: boolean
  external?: boolean
}) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<'idle' | 'flying' | 'bobbing'>('idle')
  const [endX, setEndX] = useState(120)
  const [mounted, setMounted] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const inView = useInView(wrapRef, { once: false, amount: 0.9 })
  const hasGlow = glow && !reduced

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (mounted) setIsTouchDevice(window.matchMedia('(hover: none)').matches)
  }, [mounted])

  useEffect(() => {
    if (!mounted || !isTouchDevice || !inView || reduced || phase !== 'idle') return
    if (wrapRef.current) setEndX(wrapRef.current.offsetWidth - 36)
    setPhase('flying')
  }, [mounted, isTouchDevice, inView, reduced, phase])

  function handleEnter() {
    if (reduced || isTouchDevice || phase !== 'idle') return
    if (wrapRef.current) setEndX(wrapRef.current.offsetWidth - 36)
    setPhase('flying')
  }

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={() => { if (!isTouchDevice) setPhase('idle') }}
    >
      <motion.a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        whileTap={reduced ? undefined : { scale: 0.97 }}
        animate={hasGlow ? {
          boxShadow: ['0 0 14px rgba(255,69,0,0.22)', '0 0 32px rgba(255,69,0,0.52)', '0 0 14px rgba(255,69,0,0.22)'],
        } : undefined}
        transition={{
          duration: 0.15,
          ...(hasGlow ? { boxShadow: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } } : {}),
        }}
        className={`inline-flex items-center gap-2 bg-[#FF4500] text-white font-bold rounded-xl
          hover:bg-[#FF5500] transition-colors duration-150 min-h-[44px]
          ${large ? 'text-base sm:text-lg px-7 sm:px-9 py-4' : 'text-sm px-5 py-2.5'}`}
      >
        <motion.span animate={{ x: phase !== 'idle' ? 8 : 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          {label}
        </motion.span>
      </motion.a>
      <AnimatePresence>
        {mounted && phase !== 'idle' && (
          <motion.span
            key="rocket"
            aria-hidden
            className="pointer-events-none absolute z-50 select-none"
            style={{
              fontSize: large ? '20px' : '16px',
              lineHeight: 1,
              top: '50%',
              marginTop: large ? '-10px' : '-8px',
              left: large ? 10 : 8,
            }}
            initial={{ x: 0, opacity: 0, y: 0 }}
            animate={phase === 'flying'
              ? { x: endX, opacity: [0, 1, 1, 1], y: [0, -8, 0] }
              : { x: endX, opacity: 1, y: [0, -3, 0, 3, 0] }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={phase === 'flying'
              ? { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
              : { duration: 1.8, repeat: Infinity, ease: 'easeInOut', x: { duration: 0 } }}
            onAnimationComplete={() => { if (phase === 'flying') setPhase('bobbing') }}
          >
            🚀
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
