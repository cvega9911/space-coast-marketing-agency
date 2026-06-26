'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, useInView } from 'motion/react'

const STEPS = [
  {
    day: 'Day 1',
    num: '01',
    title: 'We Talk',
    body: '15-minute call. Tell us what you do and who you want to reach. No pitch, no pressure.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
  },
  {
    day: 'Day 1–3',
    num: '02',
    title: 'We Build',
    body: 'We design and build your site — fast, mobile-first, and set up to rank on Google.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
  },
  {
    day: 'Day 3',
    num: '03',
    title: "You're Live",
    body: 'Site goes live. We walk you through it. Customers start finding you on Google.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
]

function StepCard({ step, index }: { step: typeof STEPS[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: index * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative flex flex-col"
    >
      {/* Day badge */}
      <div className="font-mono text-[#FF4500] text-xs tracking-[0.22em] uppercase mb-4 font-bold">
        {step.day}
      </div>

      {/* Icon circle with step number */}
      <div className="relative mb-6 self-start md:self-center">
        <div className="w-20 h-20 rounded-2xl bg-[#FF4500]/8 border border-[#FF4500]/20
          flex items-center justify-center text-[#FF4500]
          group-hover:bg-[#FF4500]/14 transition-colors duration-300">
          {step.icon}
        </div>
        <div
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#FF4500] text-white
            text-xs font-extrabold flex items-center justify-center
            shadow-lg shadow-[#FF4500]/40"
          aria-hidden
        >
          {index + 1}
        </div>
      </div>

      <h3 className="text-xl font-extrabold text-white mb-2 md:text-center">{step.title}</h3>
      <p className="text-white/60 text-sm leading-relaxed md:text-center">{step.body}</p>
    </motion.div>
  )
}

export default function ProcessSection() {
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.75', 'center 0.5'],
  })

  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])
  const rocketX   = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  const rocketOpacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0])

  return (
    <section
      ref={sectionRef}
      id="process"
      className="py-20 sm:py-28 overflow-hidden"
      style={{ background: 'rgba(13,13,28,0.88)' }}
      aria-label="How it works"
    >
      <div className="max-w-5xl mx-auto px-6">
        {/* Heading */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
            <span className="font-mono text-[#FF4500] text-base tracking-[0.16em] uppercase">// HOW IT WORKS</span>
            <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            From call to live site in{' '}
            <span className="text-[#FF4500]">72 hours.</span>
          </h2>
          <p className="text-white/45 text-base mt-3 max-w-md mx-auto">
            Three steps. No back-and-forth. No waiting weeks.
          </p>
        </div>

        {/* Timeline connector — desktop only */}
        <div className="hidden md:block relative mb-4 h-6" aria-hidden>
          {/* Track */}
          <div className="absolute inset-x-[16%] top-1/2 h-px bg-white/6" />
          {/* Animated fill */}
          <motion.div
            className="absolute left-[16%] right-[16%] top-1/2 h-px bg-gradient-to-r from-[#FF4500] via-[#FF5500] to-[#FF6500] origin-left"
            style={{ scaleX: lineScale }}
          />
          {/* Rocket riding the line — lives inside track container for clean % positioning */}
          <div className="absolute left-[16%] right-[16%] top-1/2 -translate-y-1/2 pointer-events-none">
            <motion.span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-base leading-none select-none"
              style={{ left: rocketX, opacity: rocketOpacity }}
              aria-hidden
            >
              🚀
            </motion.span>
          </div>
          {/* Step dots */}
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#FF4500]"
              style={{ left: `calc(16% + ${i * 34}%)` }}
            />
          ))}
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto">
          {STEPS.map((s, i) => (
            <StepCard key={s.num} step={s} index={i} />
          ))}
        </div>

        {/* Bottom callout */}
        <div className="mt-14 text-center">
          <div className="inline-flex items-center gap-3 bg-[#FF4500]/8 border border-[#FF4500]/20 rounded-xl px-6 py-3">
            <span className="text-[#FF4500] text-sm font-bold">72-hour preview guaranteed.</span>
            <span className="text-white/40 text-sm">Full delivery within 14 days. Or you don&apos;t pay.</span>
          </div>
        </div>
      </div>
    </section>
  )
}
