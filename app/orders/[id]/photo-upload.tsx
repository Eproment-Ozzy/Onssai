'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PhotoUpload({ orderId, stages }: { orderId: string; stages: any[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [stageId, setStageId] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!stageId) { alert('Once asama sec'); e.target.value = ''; return }
    const file = e.target.files?.[0]
    if (!file) return
    if (!stageId) { alert('Once asama sec'); e.target.value = ''; return }
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
      stage_id: stageId || null,
      uploaded_by_user_id: user.id,
      file_type: 'photo',
      file_url: pub.publicUrl,
      file_size_bytes: file.size,
      file_hash: hash,
      device_id: deviceId,
      stage_id: stageId,
      taken_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })

    setLoading(false)
    if (error) { alert(error.message); return }
    e.target.value = ''
    router.refresh()
  }

  return (
    <div className="pt-4 mt-4 border-t">
      <div className="flex gap-2 items-center">
        <select value={stageId} onChange={(e) => setStageId(e.target.value)}
          className="flex-1 border rounded px-3 py-2 text-sm">
          <option value="">Asama sec</option>
          {stages.map((s: any) => (
            <option key={s.id} value={s.id}>{s.stage_number}. {s.stage_name}</option>
          ))}
        </select>
        <label className={`text-sm rounded px-4 py-2 transition-all active:scale-95 cursor-pointer font-medium ${
          stageId 
            ? "bg-black text-white hover:bg-gray-800" 
            : "bg-gray-200 text-gray-500 cursor-not-allowed"
        }`}>
          {loading ? 'Yukleniyor...' : 'Ekle'}
          <input type="file" accept="image/*" capture="environment" onChange={handleFile} disabled={loading || !stageId} className="hidden" />
        </label>
      </div>
    </div>
  )
}
