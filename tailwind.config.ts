import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#0a0a14',
          mid: '#0E1525',
          card: '#13131f',
          deep: '#05050c',
        },
        launch: {
          DEFAULT: '#FF4500',
          dim: 'rgba(255,69,0,0.12)',
          glow: 'rgba(255,69,0,0.28)',
        },
        navy: {
          DEFAULT: '#1B2B4B',
          dim: 'rgba(27,43,75,0.5)',
        },
        sage: {
          DEFAULT: '#4A5E4A',
          dim: 'rgba(74,94,74,0.15)',
        },
        cream: '#F5F5F0',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'pulse-slow': 'pulse-slow 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
