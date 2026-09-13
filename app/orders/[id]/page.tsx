import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MessageForm from './message-form'
import PhotoUpload from './photo-upload'
import StageForm from './stage-form'

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

  const { data: stages } = await supabase
    .from('order_stages')
    .select('id, stage_number, stage_name, required_photos, status')
    .eq('order_id', id)
    .order('stage_number', { ascending: true })

  const { data: photos } = await supabase
    .from('evidence')
    .select('id, file_url, taken_at, stage_id')
    .eq('order_id', id)
    .order('taken_at', { ascending: false })

  return (
      <div className="mb-4"><Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800">← Geri</Link></div>
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-1">Siparis #{order.id.slice(0, 8)}</h1>
      <p className="text-sm opacity-70 mb-6">
        {order.buyer?.name} &rarr; {order.supplier?.name} &middot; {order.status}
      </p>

      <h2 className="text-sm font-semibold mb-2">Uretim Asamalari</h2>
      {(stages ?? []).length === 0 && <p className="text-sm opacity-60">Henuz asama tanimlanmadi.</p>}
      <ul className="divide-y">
        {(stages ?? []).map((st: any) => {
          const adet = (photos ?? []).filter((p: any) => p.stage_id === st.id).length
          return (
      <div className="mb-4"><Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800">← Geri</Link></div>
            <li key={st.id} className="py-2 flex justify-between text-sm">
              <span>{st.stage_number}. {st.stage_name}</span>
              <span className={adet >= st.required_photos ? 'text-green-600' : 'opacity-60'}>
                {adet} / {st.required_photos} foto
              </span>
            </li>
          )
        })}
      </ul>
      <StageForm orderId={order.id} nextNumber={(stages ?? []).length + 1} />

      <h2 className="text-sm font-semibold mt-8 mb-2">Uretim Fotograflari</h2>
      <div className="grid grid-cols-3 gap-2">
        {(photos ?? []).map((p: any) => {
          const stage = (stages ?? []).find((st: any) => st.id === p.stage_id)
          return (
      <div className="mb-4"><Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800">← Geri</Link></div>
            <div key={p.id} className="flex flex-col">
              <img src={p.file_url} alt="" className="w-full h-24 object-cover rounded border" />
              <p className="text-xs opacity-60 mt-1">{stage ? `${stage.stage_number}. ${stage.stage_name}` : "Asama yok"}</p>
            </div>
          )
        })}
      </div>
      {(photos ?? []).length === 0 && <p className="text-sm opacity-60">Henuz fotograf yok.</p>}

      <PhotoUpload orderId={order.id} stages={stages ?? []} />

      <h2 className="text-sm font-semibold mt-8 mb-2">Mesajlar</h2>
      <div className="space-y-3">
        {(messages ?? []).map((m: any) => {
          const mine = m.sender_id === user.id
          return (
      <div className="mb-4"><Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800">← Geri</Link></div>
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
