'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '', password: '', full_name: '',
    company_name: '', company_type: 'buyer', country: 'TR',
  })

  const set = (k: string, v: string) => setForm({ ...form, [k]: v })

  async function handleSubmit() {
    setError('')
    if (form.password.length < 6) {
      setError('Sifre en az 6 karakter olmali')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          company_name: form.company_name,
          company_type: form.company_type,
          country: form.country,
        },
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8 space-y-4">
        <h1 className="text-2xl font-bold">OnSsAI Kayit</h1>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>
        )}

        <input className="w-full border rounded px-3 py-2" placeholder="Ad Soyad"
          value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Sirket Adi"
          value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />

        <select className="w-full border rounded px-3 py-2"
          value={form.company_type} onChange={(e) => set('company_type', e.target.value)}>
          <option value="buyer">Alici (Buyer)</option>
          <option value="supplier">Uretici (Supplier)</option>
        </select>

        <input className="w-full border rounded px-3 py-2" placeholder="Ulke kodu (TR, CN, DE...)"
          value={form.country} onChange={(e) => set('country', e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="email" placeholder="E-posta"
          value={form.email} onChange={(e) => set('email', e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Sifre (min 6 karakter)"
          value={form.password} onChange={(e) => set('password', e.target.value)} />

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50">
          {loading ? 'Kaydediliyor...' : 'Kayit Ol'}
        </button>

        <p className="text-sm text-center">
          Hesabin var mi? <Link href="/login" className="underline">Giris yap</Link>
        </p>
      </div>
    </div>
  )
}
