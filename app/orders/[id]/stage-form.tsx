'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StageForm({ orderId, nextNumber }: { orderId: string; nextNumber: number }) {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [photos, setPhotos] = useState('1')
  const [loading, setLoading] = useState(false)

  async function add() {
    if (!name.trim()) return
    setLoading(true)
    const { error } = await supabase.from('order_stages').insert({
      order_id: orderId,
      stage_number: nextNumber,
      stage_name: name.trim(),
      required_photos: Math.max(1, parseInt(photos) || 1),
      status: 'pending',
    })
    setLoading(false)
    if (error) { alert(error.message); return }
    setName(''); setPhotos('1')
    router.refresh()
  }

  return (
    <div className="flex gap-2 pt-3">
      <input
        className="flex-1 border rounded px-3 py-2 text-sm"
        placeholder="Asama adi (kesim, montaj, paketleme...)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-16 border rounded px-2 py-2 text-sm text-center"
        type="number"
        min="1"
        value={photos}
        onChange={(e) => setPhotos(e.target.value)}
      />
      <button onClick={add} disabled={loading}
        className="bg-black text-white text-sm rounded px-4 py-2 disabled:opacity-50 active:scale-95 transition-transform font-medium hover:bg-gray-800">
        {loading ? 'Ekleniyor...' : 'Ekle'}
      </button>
    </div>
  )
}
