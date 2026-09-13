import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'
import QuoteActions from './quote-actions'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, role, company_id, companies(name, company_type, country)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return <div className="p-8 text-red-600">Profil bulunamadi.</div>
  }

  const company: any = profile.companies
  const isBuyer = company?.company_type === 'buyer'

  let rfqs: any[] = []
  let quotations: any[] = []
  let products: any[] = []
  let incomingQuotes: any[] = []
  let orders: any[] = []

  if (isBuyer) {
    const { data } = await supabase
      .from('rfqs')
      .select('id, title, category, quantity, status, deadline')
      .order('created_at', { ascending: false })
    rfqs = data ?? []

    const { data: quotes } = await supabase
      .from('quotations')
      .select('id, unit_price, currency, delivery_time_days, status, rfqs(title)')
      .order('created_at', { ascending: false })
    incomingQuotes = quotes ?? []
    const { data: myOrders } = await supabase
      .from('orders')
      .select('id, quantity, unit_price, total_amount, currency, status, companies!orders_supplier_id_fkey(name)')
      .eq('buyer_id', profile.company_id)
      .order('created_at', { ascending: false })
    orders = myOrders ?? []
  } else {
    const { data: openRfqs } = await supabase
      .from('rfqs')
      .select('id, title, category, quantity, deadline')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    rfqs = openRfqs ?? []

    const { data: myQuotes } = await supabase
      .from('quotations')
      .select('id, unit_price, status, rfqs(title)')
      .eq('supplier_id', profile.company_id)
      .order('created_at', { ascending: false })
    quotations = myQuotes ?? []

    const { data: myProducts } = await supabase
      .from('products')
      .select('id, name, category, unit_price')
      .eq('supplier_id', profile.company_id)
    products = myProducts ?? []

    const { data: myOrders } = await supabase
      .from('orders')
      .select('id, quantity, unit_price, total_amount, currency, status, companies!orders_buyer_id_fkey(name)')
      .eq('supplier_id', profile.company_id)
      .order('created_at', { ascending: false })
    orders = myOrders ?? []
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{profile.full_name}</h1>
            <p className="text-sm text-gray-500">{company?.name} · {isBuyer ? 'Alici' : 'Uretici'} · {company?.country}</p>
          </div>
          <LogoutButton />
        </div>

        {isBuyer ? (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">RFQ&apos;larim</h2>
              <Link href="/rfq/new" className="bg-black text-white text-sm rounded px-3 py-1.5">
                + Yeni RFQ
              </Link>
            </div>
            {rfqs.length === 0 ? (
              <p className="text-sm text-gray-500">Henuz RFQ olusturmadin.</p>
            ) : (
              <ul className="divide-y">
                {rfqs.map((r) => (
                  <li key={r.id} className="py-3 flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-gray-500">{r.category} · {r.quantity} adet</p>
                    </div>
                    <span className="text-xs bg-gray-100 rounded px-2 py-1 h-fit">{r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {isBuyer && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="font-semibold">Gelen Teklifler</h2>
            {incomingQuotes.length === 0 ? (
              <p className="text-sm text-gray-500">Henuz teklif gelmedi.</p>
            ) : (
              <ul className="divide-y">
                {incomingQuotes.map((q: any) => (
                  <li key={q.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{q.rfqs?.title}</p>
                      <p className="text-gray-500">{q.unit_price} {q.currency} · {q.delivery_time_days} gun teslimat</p>
                    </div>
                    {q.status === 'pending' ? (
                      <QuoteActions quoteId={q.id} />
                    ) : (
                      <span className="text-xs bg-gray-100 rounded px-2 py-1">{q.status}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {orders.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="font-semibold">Siparislerim</h2>
            <ul className="divide-y">
              {orders.map((o: any) => (
                <li key={o.id} className="py-3">
                  <Link href={`/orders/${o.id}`} className="group" className="flex justify-between items-center text-sm hover:bg-gray-50 -mx-2 px-2 py-1 rounded">
                    <div>
                      <p className="font-medium">{o.companies?.name}</p>
                      <p className="text-gray-500">{o.quantity} adet · {o.total_amount} {o.currency}</p>
                    <span className="inline-block ml-1 text-gray-400 group-hover:text-gray-600 transition-colors">→</span>
      </div>
                    <span className="text-xs bg-gray-100 rounded px-2 py-1 h-fit">{o.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isBuyer && (
          <>
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="font-semibold">Acik RFQ&apos;lar</h2>
              {rfqs.length === 0 ? (
                <p className="text-sm text-gray-500">Su an acik RFQ yok.</p>
              ) : (
                <ul className="divide-y">
                  {rfqs.map((r) => (
                    <li key={r.id} className="py-3 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium">{r.title}</p>
                        <p className="text-gray-500">{r.category} · {r.quantity} adet</p>
                      </div>
                      <Link href={`/quote/new?rfq=${r.id}`} className="bg-black text-white text-xs rounded px-3 py-1.5 shrink-0">
                        Teklif Ver
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="font-semibold">Tekliflerim</h2>
              {quotations.length === 0 ? (
                <p className="text-sm text-gray-500">Henuz teklif vermedin.</p>
              ) : (
                <ul className="divide-y">
                  {quotations.map((q) => (
                    <li key={q.id} className="py-3 flex justify-between text-sm">
                      <span>{q.rfqs?.title}</span>
                      <span>{q.unit_price} · {q.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">Urunlerim ({products.length})</h2>
                <Link href="/products/new" className="bg-black text-white text-xs rounded px-3 py-1.5">
                  + Urun Ekle
                </Link>
              </div>
              {products.length === 0 ? (
                <p className="text-sm text-gray-500">Henuz urun eklemedin.</p>
              ) : (
                <ul className="divide-y">
                  {products.map((p) => (
                    <li key={p.id} className="py-3 flex justify-between text-sm">
                      <span>{p.name}</span>
                      <span>{p.unit_price}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
