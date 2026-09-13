import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '../dashboard/logout-button'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) {
    redirect('/dashboard')
  }

  const [
    { count: companyCount },
    { count: userCount },
    { count: rfqCount },
    { count: quoteCount },
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('rfqs').select('*', { count: 'exact', head: true }),
    supabase.from('quotations').select('*', { count: 'exact', head: true }),
  ])

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, company_type, country, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: rfqs } = await supabase
    .from('rfqs')
    .select('id, title, category, quantity, status, companies(name)')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Admin Paneli</h1>
            <p className="text-sm text-gray-500">{profile.full_name} · Platform Yoneticisi</p>
          </div>
          <LogoutButton />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold">{companyCount ?? 0}</p>
            <p className="text-xs text-gray-500">Sirket</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold">{userCount ?? 0}</p>
            <p className="text-xs text-gray-500">Kullanici</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold">{rfqCount ?? 0}</p>
            <p className="text-xs text-gray-500">RFQ</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold">{quoteCount ?? 0}</p>
            <p className="text-xs text-gray-500">Teklif</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold">Sirketler</h2>
          {!companies || companies.length === 0 ? (
            <p className="text-sm text-gray-500">Henuz sirket yok.</p>
          ) : (
            <ul className="divide-y">
              {companies.map((c) => (
                <li key={c.id} className="py-3 flex justify-between text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-500">{c.company_type} · {c.country}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold">Tum RFQlar</h2>
          {!rfqs || rfqs.length === 0 ? (
            <p className="text-sm text-gray-500">Henuz RFQ yok.</p>
          ) : (
            <ul className="divide-y">
              {rfqs.map((r: any) => (
                <li key={r.id} className="py-3 flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-gray-500">{r.companies?.name} · {r.category} · {r.quantity} adet</p>
                  </div>
                  <span className="text-xs bg-gray-100 rounded px-2 py-1 h-fit">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
