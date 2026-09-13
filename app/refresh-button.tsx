'use client'

import { useRouter } from 'next/navigation'

export default function RefreshButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.refresh()}
      aria-label="Yenile"
      className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-black text-white text-xl shadow-lg"
    >
      &#8635;
    </button>
  )
}
