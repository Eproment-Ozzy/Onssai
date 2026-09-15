# OnSsAI — Devir Notu (13 Eyl 2026)

## Ne çalışıyor
- Auth, alıcı dashboard, RFQ → teklif → sipariş akışı
- Mesajlaşma (messages tablosu, original_text)
- Fotoğraf yükleme: SHA-256 hash + device_id + stage_id, Supabase Storage `evidence` bucket
- Üretim aşamaları: order_stages (stage_name alıcı yazar, required_photos), foto sayacı
- Trigger: stage_id 15 dk sonra kilitli, silme 30 dk sonra yasak
- PWA + Vercel otomatik deploy (main branch)

## Sırada (öncelik sırası)
1. Tedarikçi tarafı — supplier company girişi, sipariş görüntüleme, foto yükleme
2. AI çeviri — messages.original_text → karşı tarafın dilinde
3. Sipariş durumu ilerletme (active → shipped → delivered)
4. Stripe

## Güvenlik borcu (canlıya çıkmadan ÖNCE)
- Supabase anahtarları sohbete sızdı → yenile
- GitHub token sohbete sızdı → yenile
- `evidence` bucket public → private + signed URL
- Kayıt akışında onay yok, site herkese açık
- Node 20 → 22

## Test verisi
- order: 7d726770-1af1-4e6b-83c9-a2347bb92fbf
- buyer company: 74dd1287-0244-463c-b8d9-429a1ab30312
- supplier company: 81e39ffe-87c5-42f8-9c69-a6560e7ee6f2
- kullanıcı: ozzy@onssai.com

## Kurallar
- Sektöre özel olmayacak (tekstil sadece test verisi)
- Aşamaları ve foto sayısını alıcı belirler
