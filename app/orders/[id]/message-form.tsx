'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function MessageForm({ orderId }: { orderId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!text.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { error } = await supabase.from('messages').insert({
      order_id: orderId,
      sender_id: user.id,
      original_text: text.trim(),
    })
    setLoading(false)
    if (error) { alert(error.message); return }
    setText('')
    router.refresh()
  }

  return (
    <div className="flex gap-2 pt-4 border-t">
      <input
        className="flex-1 border rounded px-3 py-2 text-sm"
        placeholder="Mesaj yaz..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') send() }}
      />
      <button onClick={send} disabled={loading}
        className="bg-black text-white text-sm rounded px-4 py-2 disabled:opacity-50">
        Gonder
      </button>
    </div>
  )
}
