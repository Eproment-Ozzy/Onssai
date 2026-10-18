// Uctan uca RLS / akis testi. Kullanim: node --env-file=.env.local scripts/e2e-rls.mjs
// Gerekli: e2e-*@onssai.test test kullanicilari (sifre E2E_PASSWORD ortam degiskeninden).
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const PASS = process.env.E2E_PASSWORD

let pass = 0, fail = 0
function check(name, ok, info = '') {
  if (ok) { pass++; console.log('  ✓', name) }
  else { fail++; console.log('  ✗', name, info) }
}

async function login(email) {
  const c = createClient(URL, KEY, { auth: { persistSession: false } })
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASS })
  if (error) throw new Error(`${email}: ${error.message}`)
  const { data: me } = await c.from('users').select('company_id').eq('id', data.user.id).single()
  return { c, uid: data.user.id, company: me.company_id, session: data.session }
}

const anon = createClient(URL, KEY, { auth: { persistSession: false } })
const buyer = await login('e2e-buyer@onssai.test')
const supplier = await login('e2e-supplier@onssai.test')
const outsider = await login('e2e-outsider@onssai.test')
const admin = await login('e2e-admin@onssai.test')
console.log('Giris: 4 kullanici OK')

console.log('\n1) Anonim erisim')
for (const t of ['companies', 'users', 'rfqs', 'orders', 'evidence', 'messages']) {
  const { data, error } = await anon.from(t).select('*').limit(1)
  check(`anon ${t} okuyamaz`, !!error || (data ?? []).length === 0, error?.message)
}

console.log('\n2) Onay kurali')
{
  const { error } = await buyer.c.from('rfqs').insert({ buyer_id: buyer.company, title: 'x', category: 'x', quantity: 1, deadline: '2027-01-01' })
  check('onaysiz alici RFQ acamaz', !!error)
  const { error: e2 } = await supplier.c.from('products').insert({ supplier_id: supplier.company, name: 'x', category: 'x', unit_price: 1 })
  check('onaysiz tedarikci urun ekleyemez', !!e2)
  const { data: d3 } = await buyer.c.from('companies').update({ approved: true }).eq('id', buyer.company).select()
  check('kullanici kendi sirketini onaylayamaz', (d3 ?? []).length === 0)
  const { error: e4 } = await buyer.c.from('users').update({ is_platform_admin: true }).eq('id', buyer.uid)
  check('kullanici kendini admin yapamaz', !!e4)
  for (const u of [buyer, supplier]) {
    const { data } = await admin.c.from('companies').update({ approved: true, approved_at: new Date().toISOString() }).eq('id', u.company).select()
    check('admin sirketi onaylar', (data ?? []).length === 1)
  }
}

console.log('\n3) RFQ -> teklif -> kabul -> siparis')
const { data: rfq, error: rfqErr } = await buyer.c.from('rfqs').insert({
  buyer_id: buyer.company, title: 'E2E test RFQ', category: 'genel', quantity: 100, unit: 'adet', deadline: '2027-01-01', status: 'open',
}).select().single()
check('onayli alici RFQ acar', !!rfq, rfqErr?.message)
{
  const { data } = await supplier.c.from('rfqs').select('id').eq('id', rfq.id)
  check('onayli tedarikci acik RFQ gorur', (data ?? []).length === 1)
  const { data: d2 } = await outsider.c.from('rfqs').select('id').eq('id', rfq.id)
  check('onaysiz tedarikci RFQ goremez', (d2 ?? []).length === 0)
  const { error: e3 } = await supplier.c.from('rfqs').insert({ buyer_id: supplier.company, title: 'x', category: 'x', quantity: 1, deadline: '2027-01-01' })
  check('tedarikci RFQ acamaz', !!e3)
}
const { data: quote, error: qErr } = await supplier.c.from('quotations').insert({
  rfq_id: rfq.id, supplier_id: supplier.company, unit_price: 12.5, currency: 'USD', delivery_time_days: 30, status: 'pending',
}).select().single()
check('tedarikci teklif verir', !!quote, qErr?.message)
{
  const { error } = await outsider.c.from('quotations').insert({ rfq_id: rfq.id, supplier_id: outsider.company, unit_price: 1, delivery_time_days: 1 })
  check('onaysiz tedarikci teklif veremez', !!error)
  const { data: d2 } = await supplier.c.from('quotations').update({ status: 'accepted' }).eq('id', quote.id).select()
  check('tedarikci kendi teklifini kabul edemez', (d2 ?? []).length === 0)
  const { error: e3 } = await buyer.c.from('quotations').update({ unit_price: 1 }).eq('id', quote.id)
  check('alici teklif fiyatini degistiremez', !!e3)
  const { error: e4 } = await buyer.c.from('orders').insert({ buyer_id: buyer.company, supplier_id: supplier.company, quantity: 1, unit_price: 1, total_amount: 1, currency: 'USD' })
  check('istemci dogrudan siparis olusturamaz', !!e4)
  const { error: e5 } = await buyer.c.from('quotations').update({ status: 'accepted' }).eq('id', quote.id)
  check('alici teklifi kabul eder', !e5, e5?.message)
}
const { data: order } = await buyer.c.from('orders').select('*').eq('quotation_id', quote.id).single()
check('kabulde siparis otomatik olustu', !!order && Number(order.total_amount) === 1250)
{
  const { data: r } = await buyer.c.from('rfqs').select('status').eq('id', rfq.id).single()
  check('RFQ durumu awarded oldu', r?.status === 'awarded')
  const { data: so } = await supplier.c.from('orders').select('id').eq('id', order.id)
  check('tedarikci siparisi gorur', (so ?? []).length === 1)
  const { data: oo } = await outsider.c.from('orders').select('id').eq('id', order.id)
  check('yabanci siparisi goremez', (oo ?? []).length === 0)
  const { data: au } = await admin.c.from('orders').select('id').eq('id', order.id)
  check('admin siparisi gorur', (au ?? []).length === 1)
}

console.log('\n4) Asamalar')
const { data: stage, error: sErr } = await buyer.c.from('order_stages').insert({
  order_id: order.id, stage_number: 1, stage_name: 'Kesim', required_photos: 2, status: 'pending',
}).select().single()
check('alici asama ekler', !!stage, sErr?.message)
{
  const { error } = await supplier.c.from('order_stages').insert({ order_id: order.id, stage_number: 2, stage_name: 'x' })
  check('tedarikci asama ekleyemez', !!error)
  const { data } = await supplier.c.from('order_stages').select('id').eq('order_id', order.id)
  check('tedarikci asamalari gorur', (data ?? []).length === 1)
}

console.log('\n5) Kanit fotografi (private bucket + signed URL)')
// 1x1 JPEG
const jpg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')
const path = `${order.id}/${Date.now()}-e2e.jpg`
{
  const { error } = await supplier.c.storage.from('evidence').upload(path, jpg, { contentType: 'image/jpeg' })
  check('tedarikci siparis klasorune yukler', !error, error?.message)
  const { error: e2 } = await outsider.c.storage.from('evidence').upload(`${order.id}/hack.jpg`, jpg, { contentType: 'image/jpeg' })
  check('yabanci siparis klasorune yukleyemez', !!e2)
  const { error: e3 } = await anon.storage.from('evidence').upload(`${order.id}/anon.jpg`, jpg, { contentType: 'image/jpeg' })
  check('anonim yukleyemez', !!e3)
}
const { data: ev, error: evErr } = await supplier.c.from('evidence').insert({
  order_id: order.id, stage_id: stage.id, uploaded_by_user_id: supplier.uid, file_type: 'photo',
  file_path: path, file_size_bytes: jpg.length, file_hash: 'e2e-hash', device_id: 'e2e-device',
}).select().single()
check('kanit kaydi olusur', !!ev, evErr?.message)
{
  const { error } = await outsider.c.from('evidence').insert({
    order_id: order.id, stage_id: stage.id, uploaded_by_user_id: outsider.uid, file_path: `${order.id}/x.jpg`, file_hash: 'x',
  })
  check('yabanci kanit kaydi ekleyemez', !!error)
  const { error: e2 } = await supplier.c.from('evidence').update({ file_hash: 'degisti' }).eq('id', ev.id)
  check('kanit hash degistirilemez', !!e2)

  const pub = await fetch(`${URL}/storage/v1/object/public/evidence/${path}`)
  check('public URL calismaz (bucket private)', pub.status >= 400, `status ${pub.status}`)
  const { data: s1 } = await buyer.c.storage.from('evidence').createSignedUrls([path], 60)
  const r1 = s1?.[0]?.signedUrl ? await fetch(s1[0].signedUrl) : null
  check('alici signed URL ile gorur', r1?.status === 200, `status ${r1?.status}`)
  const { data: s2 } = await outsider.c.storage.from('evidence').createSignedUrls([path], 60)
  check('yabanci signed URL alamaz', !s2?.[0]?.signedUrl)
}

console.log('\n6) Mesajlasma')
{
  const { error } = await buyer.c.from('messages').insert({ order_id: order.id, sender_id: buyer.uid, original_text: 'Merhaba' })
  check('alici mesaj yazar', !error, error?.message)
  const { error: e2 } = await supplier.c.from('messages').insert({ order_id: order.id, sender_id: supplier.uid, original_text: 'Merhaba, basladik' })
  check('tedarikci mesaj yazar', !e2, e2?.message)
  const { error: e3 } = await supplier.c.from('messages').insert({ order_id: order.id, sender_id: buyer.uid, original_text: 'sahte' })
  check('baskasi adina mesaj yazilamaz', !!e3)
  const { error: e4 } = await outsider.c.from('messages').insert({ order_id: order.id, sender_id: outsider.uid, original_text: 'x' })
  check('yabanci mesaj yazamaz', !!e4)
  const { data: m } = await buyer.c.from('messages').select('original_text, users(full_name)').eq('order_id', order.id)
  check('alici iki mesaji ve gonderen adlarini gorur', (m ?? []).length === 2 && m.every((x) => x.users?.full_name))
  const { data: m2 } = await outsider.c.from('messages').select('id').eq('order_id', order.id)
  check('yabanci mesajlari goremez', (m2 ?? []).length === 0)
}

// Sayfa testi icin oturum bilgisini disari ver
if (process.env.E2E_SESSION_OUT) {
  const fs = await import('node:fs')
  fs.writeFileSync(process.env.E2E_SESSION_OUT, JSON.stringify({ order: order.id, buyer: buyer.session, outsider: outsider.session }), { mode: 0o600 })
}

console.log(`\nSonuc: ${pass} gecti, ${fail} kaldi`)
process.exit(fail ? 1 : 0)
