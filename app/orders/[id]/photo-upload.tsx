'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PhotoUpload({ orderId }: { orderId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const safe = file.name.replace(/[^a-zA-Z0-9.]/g, '')
    const path = orderId + '/' + Date.now() + '-' + safe

    let deviceId = localStorage.getItem('onssai_device_id')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('onssai_device_id', deviceId)
    }

    const buf = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buf)
    const hash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')

    const up = await supabase.storage.from('evidence').upload(path, file)
    if (up.error) { alert(up.error.message); setLoading(false); return }

    const { data: pub } = supabase.storage.from('evidence').getPublicUrl(path)

    const { error } = await supabase.from('evidence').insert({
      order_id: orderId,
      uploaded_by_user_id: user.id,
      file_type: 'photo',
      file_url: pub.publicUrl,
      file_size_bytes: file.size,
      file_hash: hash,
      device_id: deviceId,
      taken_at: new Date().toISOString(),
    })

    setLoading(false)
    if (error) { alert(error.message); return }
    e.target.value = ''
    router.refresh()
  }

  return (
    <div className="pt-4 mt-4 border-t">
      <label className="inline-block bg-black text-white text-sm rounded px-4 py-2">
        {loading ? 'Yukleniyor...' : 'Fotograf Ekle'}
        <input type="file" accept="image/*" capture="environment" onChange={handleFile} disabled={loading} className="hidden" />
      </label>
    </div>
  )
}
