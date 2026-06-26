'use client'

/**
 * Enhancement 6 — Cycling Typewriter Headline.
 * Cycles through four phrases character-by-character with a blinking cursor.
 * No external library — vanilla React state + useEffect.
 */

import { useState, useEffect } from 'react'

const PHRASES = [
  'is searching right now.',
  'found your competitor.',
  'clicked away.',
  'could have called you.',
]

const TYPE_SPEED   = 40   // ms per character typed
const DELETE_SPEED = 25   // ms per character deleted
const HOLD_TIME    = 1800 // ms to hold completed phrase

export default function TypewriterHeadline() {
  const [displayed, setDisplayed] = useState('')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [phase, setPhase]         = useState<'typing' | 'holding' | 'deleting'>('typing')
  const [cursorOn, setCursorOn]   = useState(true)

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setCursorOn(v => !v), 500)
    return () => clearInterval(id)
  }, [])

  // Typewriter state machine
  useEffect(() => {
    const target = PHRASES[phraseIdx]

    if (phase === 'typing') {
      if (displayed.length < target.length) {
        const id = setTimeout(
          () => setDisplayed(target.slice(0, displayed.length + 1)),
          TYPE_SPEED,
        )
        return () => clearTimeout(id)
      } else {
        const id = setTimeout(() => setPhase('holding'), HOLD_TIME)
        return () => clearTimeout(id)
      }
    }

    if (phase === 'holding') {
      setPhase('deleting')
    }

    if (phase === 'deleting') {
      if (displayed.length > 0) {
        const id = setTimeout(
          () => setDisplayed(d => d.slice(0, -1)),
          DELETE_SPEED,
        )
        return () => clearTimeout(id)
      } else {
        setPhraseIdx(i => (i + 1) % PHRASES.length)
        setPhase('typing')
      }
    }
  }, [displayed, phase, phraseIdx])

  return (
    <span>
      <span className="text-[#FF4500]">{displayed}</span>
      <span
        className="text-[#FF4500] ml-0.5"
        style={{ opacity: cursorOn ? 1 : 0, transition: 'opacity 0.1s' }}
        aria-hidden
      >|</span>
    </span>
  )
}
