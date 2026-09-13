'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewRfqPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', category: '', description: '',
    quantity: '', unit: 'adet', deadline: '',
  })

  const set = (k: string, v: string) => setForm({ ...form, [k]: v })

  async function handleSubmit() {
    setError('')
    if (!form.title || !form.category || !form.quantity || !form.deadline) {
      setError('Baslik, kategori, miktar ve son tarih zorunlu')
      return
    }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Oturum bulunamadi'); setLoading(false); return }

    const { data: profile } = await supabase
      .from('users').select('company_id').eq('id', user.id).single()

    if (!profile) { setError('Profil bulunamadi'); setLoading(false); return }

    const { error } = await supabase.from('rfqs').insert({
      buyer_id: profile.company_id,
      title: form.title,
      description: form.description || form.title,
      category: form.category,
      quantity: parseInt(form.quantity, 10),
      unit: form.unit,
      deadline: form.deadline,
      status: 'open',
    })

    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8 space-y-4">
        <h1 className="text-2xl font-bold">Yeni RFQ</h1>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>
        )}

        <input className="w-full border rounded px-3 py-2" placeholder="Baslik"
          value={form.title} onChange={(e) => set('title', e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Kategori (orn. tekstil, elektronik)"
          value={form.category} onChange={(e) => set('category', e.target.value)} />
        <textarea className="w-full border rounded px-3 py-2" placeholder="Aciklama (opsiyonel)"
          value={form.description} onChange={(e) => set('description', e.target.value)} />

        <div className="flex gap-2">
          <input className="w-2/3 border rounded px-3 py-2" type="number" placeholder="Miktar"
            value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
          <input className="w-1/3 border rounded px-3 py-2" placeholder="Birim"
            value={form.unit} onChange={(e) => set('unit', e.target.value)} />
        </div>

        <div>
          <label className="text-xs text-gray-500">Son tarih</label>
          <input className="w-full border rounded px-3 py-2" type="date"
            value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
        </div>

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50">
          {loading ? 'Olusturuluyor...' : 'RFQ Olustur'}
        </button>
      </div>
    </div>
  )
}
