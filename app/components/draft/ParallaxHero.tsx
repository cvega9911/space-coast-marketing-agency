'use client'

/**
 * Enhancement 1 — Scroll-parallax hero, Artemis I launch photo.
 *
 * Desktop: 130vh image drifts upward at ~0.4× scroll speed (parallax depth).
 * Mobile:  Static crop, object-position: center 30% to keep rocket + plume visible.
 *
 * Overlay composition (layered gradients, one element):
 *   • Warm #E8481C tint at ~10% opacity from top — ties launch fire to site accent
 *   • Dark vignette + full fade to #0a0a14 at bottom — seamless section transition
 *
 * objectPosition: 50% 35% — frames rocket center-left so headline reads over dark sky
 */

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform } from 'motion/react'
import TypewriterHeadline from './TypewriterHeadline'
import CTAButton from '../CTAButton'

export default function ParallaxHero() {
  const heroRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  // Image drifts upward at ~0.4× scroll rate → parallax depth
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%'])

  // Scroll indicator fades out as user scrolls down
  const { scrollY } = useScroll()
  const indicatorOpacity = useTransform(scrollY, [0, 200], [1, 0])

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* ── Desktop: parallax image (hidden on mobile) ─── */}
      <motion.div
        style={{ y: imageY, willChange: 'transform' }}
        className="absolute inset-0 hidden sm:block"
        aria-hidden
      >
        <div className="relative w-full h-[130vh]" style={{ top: '-15vh' }}>
          <Image
            src="/hero/artemis-i-launch.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            style={{
              objectFit: 'cover',
              // 50% horizontal frames rocket center-left; sky dominates right → headline legible
              // 35% vertical locks on rocket body + upper plume, not exhaust ground level
              objectPosition: '50% 35%',
            }}
          />
        </div>
      </motion.div>

      {/* ── Mobile: static crop — no parallax, keep rocket + plume in frame ─── */}
      <div className="absolute inset-0 sm:hidden" aria-hidden>
        <Image
          src="/hero/artemis-i-launch.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{
            objectFit: 'cover',
            objectPosition: 'center 30%',
          }}
        />
      </div>

      {/* ── Overlay: warm fire tint + dark vignette + seamless bottom fade ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            // Layer 1 — warm #E8481C tint near the launch plume (top ~40%)
            // Ties the Artemis fire tones to the site's orange accent at 10% opacity
            'linear-gradient(175deg, rgba(232,72,28,0.10) 0%, rgba(232,72,28,0.05) 30%, transparent 50%)',
            // Layer 2 — dark hero vignette fading to full #0a0a14 at the bottom
            // Bottom 50% fades fully so transition into next section is seamless
            'linear-gradient(to bottom, rgba(10,10,20,0.38) 0%, rgba(10,10,20,0.42) 35%, rgba(10,10,20,0.80) 58%, #0a0a14 100%)',
          ].join(', '),
        }}
        aria-hidden
      />

      {/* ── Hero content ────────────────────────────────── */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="h-px bg-[#FF4500]/40 w-10 flex-shrink-0" aria-hidden />
            <span className="font-mono text-[#FF4500] text-base tracking-[0.16em] uppercase">
              // LOCAL VISIBILITY · SPACE COAST, FL
            </span>
            <span className="h-px bg-[#FF4500]/40 w-10 flex-shrink-0" aria-hidden />
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] mb-4">
            Your next customer
            <br />
            <TypewriterHeadline />
          </h1>

          <p className="text-white/65 text-base sm:text-xl max-w-xl mx-auto mt-6 mb-10 leading-relaxed">
            Someone&apos;s Googling your service right now. They&apos;re finding your competitor.{' '}
            <span className="text-white font-semibold">We fix that in 72 hours.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <CTAButton label="Get My Free Visibility Audit" href="#audit" large glow />
            <a href="tel:+13213285307"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-lg font-semibold min-h-[44px]">
              <svg className="w-5 h-5 text-[#FF4500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              (321) 328-5307
            </a>
          </div>
        </motion.div>
      </div>

      {/* ── Scroll indicator ────────────────────────────── */}
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
