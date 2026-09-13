'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewProductPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', category: '', description: '',
    unit_price: '', currency: 'USD', moq: '', lead_time_days: '',
  })

  const set = (k: string, v: string) => setForm({ ...form, [k]: v })

  async function handleSubmit() {
    setError('')
    if (!form.name || !form.category || !form.unit_price) {
      setError('Urun adi, kategori ve fiyat zorunlu')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Oturum bulunamadi'); setLoading(false); return }

    const { data: profile } = await supabase
      .from('users').select('company_id').eq('id', user.id).single()
    if (!profile) { setError('Profil bulunamadi'); setLoading(false); return }

    const { error } = await supabase.from('products').insert({
      supplier_id: profile.company_id,
      name: form.name,
      category: form.category,
      description: form.description || null,
      unit_price: parseFloat(form.unit_price),
      currency: form.currency,
      moq: form.moq ? parseInt(form.moq, 10) : null,
      lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days, 10) : null,
    })

    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8 space-y-4">
        <h1 className="text-2xl font-bold">Yeni Urun</h1>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>
        )}

        <input className="w-full border rounded px-3 py-2" placeholder="Urun adi"
          value={form.name} onChange={(e) => set('name', e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Kategori"
          value={form.category} onChange={(e) => set('category', e.target.value)} />
        <textarea className="w-full border rounded px-3 py-2" placeholder="Aciklama (opsiyonel)"
          value={form.description} onChange={(e) => set('description', e.target.value)} />

        <div className="flex gap-2">
          <input className="w-2/3 border rounded px-3 py-2" type="number" placeholder="Birim fiyat"
            value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} />
          <input className="w-1/3 border rounded px-3 py-2" placeholder="Para birimi"
            value={form.currency} onChange={(e) => set('currency', e.target.value)} />
        </div>

        <div className="flex gap-2">
          <input className="w-1/2 border rounded px-3 py-2" type="number" placeholder="Min. siparis"
            value={form.moq} onChange={(e) => set('moq', e.target.value)} />
          <input className="w-1/2 border rounded px-3 py-2" type="number" placeholder="Teslimat suresi (gun)"
            value={form.lead_time_days} onChange={(e) => set('lead_time_days', e.target.value)} />
        </div>

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50">
          {loading ? 'Ekleniyor...' : 'Urun Ekle'}
        </button>
      </div>
    </div>
  )
}
