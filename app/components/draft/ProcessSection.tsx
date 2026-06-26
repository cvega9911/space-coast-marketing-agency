/**
 * How It Works — 3-step process section.
 * Wraps each step in AnimateOnScroll (Enhancement 2).
 * Server component — AnimateOnScroll handles its own client hydration.
 */

import AnimateOnScroll from './AnimateOnScroll'

const STEPS = [
  {
    n: '1',
    title: 'We Talk',
    sub: '15 minutes',
    body: '15-minute call. Tell us what you do and who you want to reach. No pitch, no pressure.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
  },
  {
    n: '2',
    title: 'We Build',
    sub: '72 hours',
    body: 'We design and build your site — fast, mobile-first, and set up to rank on Google.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
    ),
  },
  {
    n: '3',
    title: "You're Live",
    sub: 'Day 3',
    body: 'Site goes live. We walk you through it. Customers start finding you.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
]

export default function ProcessSection() {
  return (
    <section
      id="process"
      className="py-20 sm:py-28"
      style={{ background: 'rgba(13,13,28,0.88)' }}
      aria-label="How it works"
    >
      <div className="max-w-5xl mx-auto px-6">
        <AnimateOnScroll className="text-center mb-14">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
            <span className="font-mono text-[#FF4500] text-xs tracking-[0.18em] uppercase">// HOW IT WORKS</span>
            <span className="h-px bg-[#FF4500]/25 w-12 flex-shrink-0" aria-hidden />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            From call to live site in three steps.
          </h2>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto">
          {STEPS.map((s, i) => (
            <AnimateOnScroll key={s.n} delay={i * 0.1}>
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-[#FF4500]/7 border border-[#FF4500]/16
                    flex items-center justify-center text-[#FF4500]">
                    {s.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#FF4500] text-white
                    text-xs font-extrabold flex items-center justify-center shadow-md shadow-[#FF4500]/30"
                    aria-hidden>
                    {s.n}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{s.title}</h3>
                <p className="text-[#FF4500]/80 font-semibold text-sm mb-3">{s.sub}</p>
                <p className="text-white/65 text-sm leading-relaxed">{s.body}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
