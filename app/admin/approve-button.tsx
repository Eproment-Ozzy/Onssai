'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ApproveButton({ companyId }: { companyId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function approve() {
    setLoading(true)
    const { error } = await supabase
      .from('companies')
      .update({ approved: true, approved_at: new Date().toISOString() })
      .eq('id', companyId)
    setLoading(false)
    if (error) { alert(error.message); return }
    router.refresh()
  }

  return (
    <button onClick={approve} disabled={loading}
      className="bg-black text-white text-xs rounded px-3 py-1.5 disabled:opacity-50 active:scale-95 transition-transform">
      {loading ? 'Onaylaniyor...' : 'Onayla'}
    </button>
  )
}
