'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
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
        <h1 className="text-2xl font-bold">OnSsAI Giris</h1>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{error}</div>
        )}

        <input className="w-full border rounded px-3 py-2" type="email" placeholder="E-posta"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Sifre"
          value={password} onChange={(e) => setPassword(e.target.value)} />

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50">
          {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
        </button>

        <p className="text-sm text-center">
          Hesabin yok mu? <Link href="/register" className="underline">Kayit ol</Link>
        </p>
      </div>
    </div>
  )
}
