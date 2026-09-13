'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function NewQuoteForm() {
  const router = useRouter()
  const params = useSearchParams()
  const rfqId = params.get('rfq')
  const supabase = createClient()
  const [rfqTitle, setRfqTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    unit_price: '', currency: 'USD', delivery_time_days: '',
    payment_terms: '', validity_days: '30', notes: '',
  })

  useEffect(() => {
    if (!rfqId) return
    supabase.from('rfqs').select('title').eq('id', rfqId).single().then(({ data }) => {
      if (data) setRfqTitle(data.title)
    })
  }, [rfqId])

  const set = (k: string, v: string) => setForm({ ...form, [k]: v })

  async function handleSubmit() {
    setError('')
    if (!rfqId) { setError('RFQ bulunamadi'); return }
    if (!form.unit_price || !form.delivery_time_days) {
      setError('Birim fiyat ve teslimat suresi zorunlu')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Oturum bulunamadi'); setLoading(false); return }

    const { data: profile } = await supabase
      .from('users').select('company_id').eq('id', user.id).single()
    if (!profile) { setError('Profil bulunamadi'); setLoading(false); return }

    const { error } = await supabase.from('quotations').insert({
      rfq_id: rfqId,
      supplier_id: profile.company_id,
      unit_price: parseFloat(form.unit_price),
      currency: form.currency,
      delivery_time_days: parseInt(form.delivery_time_days, 10),
      payment_terms: form.payment_terms || null,
      validity_days: form.validity_days ? parseInt(form.validity_days, 10) : null,
      notes: form.notes || null,
      status: 'pending',
    })

    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/dashboard')
    router.refresh()
  }

  if (!rfqId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow p-8">RFQ secilmedi.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8 space-y-4">
        <h1 className="text-2xl font-bold">Teklif Ver</h1>
        {rfqTitle && <p className="text-sm text-gray-500">{rfqTitle}</p>}

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>
        )}

        <div className="flex gap-2">
          <input className="w-2/3 border rounded px-3 py-2" type="number" placeholder="Birim fiyat"
            value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} />
          <input className="w-1/3 border rounded px-3 py-2" placeholder="Para birimi"
            value={form.currency} onChange={(e) => set('currency', e.target.value)} />
        </div>

        <input className="w-full border rounded px-3 py-2" type="number" placeholder="Teslimat suresi (gun)"
          value={form.delivery_time_days} onChange={(e) => set('delivery_time_days', e.target.value)} />

        <input className="w-full border rounded px-3 py-2" placeholder="Odeme kosullari (opsiyonel)"
          value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} />

        <input className="w-full border rounded px-3 py-2" type="number" placeholder="Gecerlilik (gun)"
          value={form.validity_days} onChange={(e) => set('validity_days', e.target.value)} />

        <textarea className="w-full border rounded px-3 py-2" placeholder="Notlar (opsiyonel)"
          value={form.notes} onChange={(e) => set('notes', e.target.value)} />

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50">
          {loading ? 'Gonderiliyor...' : 'Teklif Gonder'}
        </button>
      </div>
    </div>
  )
}

export default function NewQuotePage() {
  return (
    <Suspense>
      <NewQuoteForm />
    </Suspense>
  )
}
