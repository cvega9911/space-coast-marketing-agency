import type { Metadata } from 'next'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy — Space Coast Marketing Agency',
  alternates: { canonical: 'https://spacecoastmarketingagency.com/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-[#F5F5F0]">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-28 sm:py-36">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">Privacy Policy</h1>
        <p className="text-white/45 text-sm mb-8">Last updated: June 2026</p>

        <div className="space-y-8 text-white/70 text-base leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-2">Information We Collect</h2>
            <p>When you fill out a form on this site, we collect your name, business name, phone number, email address, and the services you're interested in. When you use our free audit tool, we collect the website URL you submit along with your email if you choose to share it.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-2">How We Use It</h2>
            <p>We use your information solely to respond to your inquiry and provide the services you requested. We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-2">Email Communications</h2>
            <p>If you contact us, we may follow up by email or phone. You can opt out of any non-essential communication at any time by replying "unsubscribe" or calling us at (321) 328-5307.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-2">Cookies &amp; Analytics</h2>
            <p>This site may use basic analytics to understand traffic patterns. We do not use advertising trackers or sell behavioral data.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white mb-2">Contact</h2>
            <p>Questions about this policy? Email us at{' '}
              <a href="mailto:info@spacecoastmarketingagency.com" className="text-[#FF4500] hover:text-white transition-colors">
                info@spacecoastmarketingagency.com
              </a>{' '}or call (321) 328-5307.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
