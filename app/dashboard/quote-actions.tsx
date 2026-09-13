'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function QuoteActions({ quoteId }: { quoteId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function updateStatus(status: 'accepted' | 'rejected') {
    setLoading(true)
    const { error } = await supabase
      .from('quotations')
      .update({ status })
      .eq('id', quoteId)
    setLoading(false)
    if (error) {
      alert(error.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button onClick={() => updateStatus('accepted')} disabled={loading}
        className="bg-black text-white text-xs rounded px-3 py-1.5 disabled:opacity-50">
        Kabul Et
      </button>
      <button onClick={() => updateStatus('rejected')} disabled={loading}
        className="bg-gray-200 text-gray-700 text-xs rounded px-3 py-1.5 disabled:opacity-50">
        Reddet
      </button>
    </div>
  )
}
