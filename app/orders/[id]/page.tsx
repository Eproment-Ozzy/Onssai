import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MessageForm from './message-form'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*, buyer:companies!orders_buyer_id_fkey(name), supplier:companies!orders_supplier_id_fkey(name)')
    .eq('id', id)
    .single()

  if (!order) return <div className="p-6">Siparis bulunamadi</div>

  const { data: messages } = await supabase
    .from('messages')
    .select('id, original_text, created_at, sender_id, users(full_name)')
    .eq('order_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-1">Siparis #{order.id.slice(0, 8)}</h1>
      <p className="text-sm opacity-70 mb-6">
        {order.buyer?.name} &rarr; {order.supplier?.name} &middot; {order.status}
      </p>

      <div className="space-y-3">
        {(messages ?? []).map((m: any) => {
          const mine = m.sender_id === user.id
          return (
            <div key={m.id} className={mine ? 'text-right' : 'text-left'}>
              <p className="text-xs opacity-70 mb-1">{m.users?.full_name}</p>
              <span className={mine ? 'inline-block rounded px-3 py-2 text-sm bg-black text-white' : 'inline-block rounded px-3 py-2 text-sm bg-gray-100'}>
                {m.original_text}
              </span>
            </div>
          )
        })}
      </div>

      <MessageForm orderId={order.id} />
    </div>
  )
}
