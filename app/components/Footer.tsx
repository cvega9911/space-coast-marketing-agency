import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#1B2B4B] text-white/75 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="font-extrabold text-xl tracking-tight mb-2">
              <span className="text-[#FF4500]">Space Coast</span>
              <span className="text-white"> Marketing Agency</span>
            </div>
            <p className="text-white/50 text-sm font-mono tracking-[0.14em] uppercase mb-4">
              Amplify Your Presence.
            </p>
            <p className="text-white/55 text-sm leading-relaxed max-w-xs">
              Professional websites and full-service marketing for Brevard County businesses.
              Merritt Island based. Florida proud.
            </p>
            <p className="text-white/40 text-xs mt-3 font-semibold">Se habla español</p>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-white/35 mb-4">Navigate</p>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Home',     href: '/'         },
                { label: 'Services', href: '/services' },
                { label: 'Pricing',  href: '/pricing'  },
                { label: 'Blog',     href: '/blog'     },
                { label: 'Contact',  href: '/#contact' },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="text-white/60 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.18em] text-white/35 mb-4">Contact</p>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="tel:+13213285307" className="text-white/60 hover:text-white transition-colors">
                  (321) 328-5307
                </a>
              </li>
              <li>
                <a href="mailto:info@spacecoastmarketingagency.com"
                  className="text-white/60 hover:text-white transition-colors break-all">
                  info@spacecoastmarketingagency.com
                </a>
              </li>
              <li className="text-white/45 text-xs leading-relaxed pt-1">
                Merritt Island, FL<br />Brevard County
              </li>
            </ul>

            <div className="flex gap-3 mt-5">
              {[
                { label: 'Facebook', href: '#', icon: (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                )},
                { label: 'Instagram', href: '#', icon: (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465.668.25 1.235.603 1.799 1.167.564.564.917 1.131 1.167 1.799.247.636.416 1.363.465 2.427.047 1.024.06 1.379.06 3.808s-.013 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.903 4.903 0 01-1.167 1.799 4.903 4.903 0 01-1.799 1.167c-.636.247-1.363.416-2.427.465-1.024.047-1.379.06-3.808.06s-2.784-.013-3.808-.06c-1.064-.049-1.791-.218-2.427-.465a4.903 4.903 0 01-1.799-1.167 4.903 4.903 0 01-1.167-1.799c-.247-.636-.416-1.363-.465-2.427C2.013 14.784 2 14.43 2 12s.013-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.903 4.903 0 011.167-1.799A4.903 4.903 0 015.49 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 12.315 2zM12 7a5 5 0 100 10A5 5 0 0012 7zm0 2a3 3 0 110 6 3 3 0 010-6zm5.25-3.5a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z" />
                  </svg>
                )},
                { label: 'Google', href: '#', icon: (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                )},
              ].map(s => (
                <a key={s.label} href={s.href} aria-label={s.label}
                  className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-white/50
                    hover:bg-[#FF4500]/20 hover:text-[#FF4500] transition-colors">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/35">
          <p>© {new Date().getFullYear()} Space Coast Marketing Agency. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
