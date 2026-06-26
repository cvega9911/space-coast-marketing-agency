'use client'

/** Fixed "DRAFT" warning banner pinned to the very top of the viewport. */
export default function DraftBanner() {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-8 flex items-center justify-center
        bg-red-600 text-white text-xs font-bold tracking-widest uppercase select-none"
      aria-hidden
    >
      ⚠ DRAFT — NOT FOR PRODUCTION ⚠
    </div>
  )
}
