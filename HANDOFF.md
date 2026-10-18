# OnSsAI — Devir Notu (18 Eki 2026)

## Durum özeti
- **Veritabanı YOK.** `.env.local`'deki Supabase projesi (ref `ivahdiwg…`) artık **COMMERAND-STAGING** adında başka bir uygulamanın projesi; 10 Eki 2026'da OnSsAI tabloları oradan silindi. O projeye DOKUNMA.
- Yeni OnSsAI Supabase projesi henüz açılmadı: "Onssai" organizasyonu Pro planda, yeni proje ücretli (~$10/ay compute). Özgür'ün kararı bekleniyor (ücretsiz ayrı organizasyon önerildi).
- Şema hazır: `supabase/migrations/0001_onssai_init.sql` (yeni boş projeye tek seferde uygulanır).
- Build yerelde geçiyor (Next.js 14.2.35, Node 22 hedefli).

## Ne çalışıyor (kod)
- Auth: kayıt (e-posta onayı + `/auth/callback`), giriş (`?next=` dönüşü), çıkış
- Middleware: `/`, `/login`, `/register`, `/auth/*`, manifest dışında her sayfa giriş ister
- Şirket onayı: yeni şirket `approved=false`; admin panelinden "Onayla". Onaysız şirket RFQ/teklif/ürün ekleyemez (RLS)
- Alıcı/tedarikçi dashboard, RFQ → teklif → kabul/red; kabulde sipariş trigger ile otomatik oluşur
- Sipariş ekranı: aşamalar (sadece alıcı ekler), foto yükleme (SHA-256 + device_id + stage), mesajlaşma
- `evidence` bucket private; fotoğraflar 1 saatlik signed URL ile gösterilir, yol `<order_id>/<dosya>`
- Kanıt kuralları: aşama bağlantısı 15 dk sonra kilit, 30 dk sonra silinemez, dosya/hash değiştirilemez

## Şema / RLS kuralları (0001)
- Tablolar: companies, users, products, rfqs, quotations, orders, order_stages, evidence, messages — hepsinde RLS
- Yardımcı fonksiyonlar `private` şemada (API'ye kapalı, anon çalıştıramaz)
- `users`: kullanıcı yalnız `full_name` güncelleyebilir (admin/şirket alanı kilitli); admin bayrağı sadece SQL ile verilir
- Siparişler sadece trigger ile oluşur; istemci insert edemez

## Yeni proje açılınca yapılacaklar (sıra)
1. `0001_onssai_init.sql` uygula, `get_advisors` ile kontrol et
2. Auth ayarları: Confirm email AÇIK, leaked password protection AÇIK, Site URL `https://onssai.vercel.app`, Redirect `https://onssai.vercel.app/auth/callback`
3. `.env.local` ve Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable), `SUPABASE_SECRET_KEY`
4. Özgür kayıt olur → SQL ile `update users set is_platform_admin = true` + şirketini onayla
5. Uçtan uca test: alıcı RFQ → tedarikçi teklif → kabul → aşama → foto → mesaj

## Sırada (Ay 2)
1. Tedarikçi paneli tamamlama, sipariş durumu ilerletme (active → shipped → delivered)
2. Admin paneli genişletme (kullanıcılar, siparişler)
3. AI çeviri (messages.original_text)
4. n8n ajan hattı başlangıcı
5. Stripe EN SON (Wise ikinci kanal)

## Güvenlik borcu
- [ ] Sızan eski Supabase anahtarları COMMERAND-STAGING'e ait → Özgür yenileyecek
- [ ] GitHub token yenile (Özgür)
- [ ] Vercel projesinde Node sürümünü 22.x yap (package.json `engines` ile de zorlandı)
- [ ] Vercel erişimi: bu sunucuda `vercel login` gerekli; Vercel MCP "ozzy19" ekibine yetkisiz
- [x] evidence bucket private + signed URL (yeni şemada)
- [x] Kayıtta e-posta onayı + admin şirket onayı
- [x] Middleware tüm korumalı sayfalarda

## Test verisi
- Yok (eski veri taşınmadı, karar: sıfırdan)

## Kurallar
- Sektöre özel olmayacak (tekstil sadece test verisi)
- Aşamaları ve foto sayısını alıcı belirler
- Her yeni tabloda RLS zorunlu; gizli anahtar asla commit edilmez
