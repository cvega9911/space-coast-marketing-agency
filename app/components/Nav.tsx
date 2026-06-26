'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'

export default function Nav() {
  const [open, setOpen] = useState(false)
  const pathname        = usePathname()
  const reduced         = useReducedMotion()

  const links = [
    { label: 'Services', href: '/services' },
    { label: 'Pricing',  href: '/pricing'  },
    { label: 'Blog',     href: '/blog'     },
    { label: 'Contact',  href: '/#contact' },
  ]

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#0a0a14]/95 backdrop-blur-md border-b border-white/8"
        aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          <div className="flex-shrink-0 pr-6">
            <Link href="/"
              className="font-extrabold tracking-tight text-base sm:text-lg leading-tight"
              aria-label="Space Coast Marketing">
              <span className="text-[#FF4500]">Space Coast</span>
              <span className="text-[#F5F5F0]"> Marketing</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {links.map(l => (
              <Link key={l.label} href={l.href}
                className={`text-sm font-medium transition-colors rounded focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-[#FF4500]/70 focus-visible:ring-offset-2
                  focus-visible:ring-offset-[#0a0a14] ${
                  pathname === l.href || pathname.startsWith(l.href.split('#')[0] + '/')
                    ? 'text-white' : 'text-white/70 hover:text-white'}`}>
                {l.label}
              </Link>
            ))}

            <a href="tel:+13213285307"
              className="text-sm text-white/65 hover:text-white transition-colors tabular-nums tracking-tight">
              (321) 328-5307
            </a>

          </div>

          <button onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-white/60 hover:text-white transition-colors
              min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open
              ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            }
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={reduced ? {} : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduced ? {} : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="md:hidden border-t border-white/8 bg-[#0a0a14]/98 overflow-hidden">
              <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
                {links.map(l => (
                  <Link key={l.label} href={l.href} onClick={() => setOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-white/70 hover:text-white
                      hover:bg-white/5 rounded-xl transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  )
}
