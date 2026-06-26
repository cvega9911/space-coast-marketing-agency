'use client'

/**
 * Enhancement 1 — Scroll-parallax hero with aerial Space Coast image.
 * The background image (130vh tall) drifts upward at ~0.4× scroll speed,
 * creating depth. Includes a bouncing scroll indicator that fades after 200px.
 */

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'motion/react'
import TypewriterHeadline from './TypewriterHeadline'
import Link from 'next/link'

export default function ParallaxHero() {
  const heroRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  // Image drifts -30vh over the hero scroll distance (slower than content → parallax)
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%'])

  // Scroll indicator fades out as user scrolls
  const { scrollY } = useScroll()
  const indicatorOpacity = useTransform(scrollY, [0, 200], [1, 0])

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background — 130vh image drifts upward */}
      <motion.div
        style={{ y: imageY, willChange: 'transform' }}
        className="absolute inset-0"
        aria-hidden
      >
        <div className="relative w-full h-[130vh]" style={{ top: '-15vh' }}>
          <Image
            src="/hero/artemis-i-launch.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: '65% 40%' }}
          />
        </div>
      </motion.div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,10,20,0.45) 0%, rgba(10,10,20,0.65) 50%, rgba(10,10,20,0.92) 100%)',
        }}
        aria-hidden
      />

      {/* Hero content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="h-px bg-[#FF4500]/40 w-10 flex-shrink-0" aria-hidden />
            <span className="font-mono text-[#FF4500] text-xs tracking-[0.18em] uppercase">
              Space Coast Web Design
            </span>
            <span className="h-px bg-[#FF4500]/40 w-10 flex-shrink-0" aria-hidden />
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] mb-4">
            Your next customer
            <br />
            <TypewriterHeadline />
          </h1>

          <p className="text-white/65 text-base sm:text-xl max-w-xl mx-auto mt-6 mb-10 leading-relaxed">
            Professional websites for Space Coast businesses — built in 72 hours, starting at $599.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl
                bg-[#FF4500] text-white font-bold text-base hover:bg-[#e03d00]
                transition-colors duration-150 min-h-[52px] shadow-lg shadow-[#FF4500]/25"
            >
              Book a Free Call 🚀
            </Link>
            <Link
              href="#audit"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl
                border border-white/20 text-white font-semibold text-base
                hover:border-white/40 transition-colors duration-150 min-h-[52px]"
            >
              Get a Free Audit
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        style={{ opacity: indicatorOpacity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-10"
        aria-hidden
      >
        <span className="text-white/40 text-[10px] font-mono tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          className="w-5 h-5 border-2 border-white/30 rounded-full flex items-center justify-center"
        >
          <div className="w-1 h-1 bg-white/50 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  )
}
