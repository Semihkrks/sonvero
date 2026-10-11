# Uygulama kaydı — 11 Ekim 2026

IDE geçişi için ana kontrol listesi: [DEVIR-TESLIM.md](../DEVIR-TESLIM.md).

## Yerelde uygulandı
- Tahsilat komutları: senkron arayüz kilidi, oturum/hesap doğrulaması, kalıcı işlem anahtarı, PostgreSQL transaction içinde kayıt + işlem sonucu + geçmiş. Eski doğrudan yazmalara yetki kapatılması, sürüm kontrollü düzenleme, gerekçeli iptal.
- Supabase Vault'a anahtar geçişi, güvenli hesap RPC'leri, hesap devre dışı bırakma, sunucu kontrollü Nilvera adresi ve izinli endpoint listesi. Başarılı GET tek sefer; geçici hatalarda sınırlı tekrar. Belirsiz gönderimde yeniden yazma yerine kalıcı doğrulama işi.
- Atomik arşiv upsert'i, staging üzerinden sayfalı senkronizasyon, iş sahiplenme/kiralama ve tekrar zamanlaması. Eksik listede görünmeyen belge silinmiyor.
- PostgreSQL sayfalı cari defteri: tüm eşleşmelerin toplamı, dönem başı, TRY dışı belgelerin ayrılması, iade/iptal normalizasyonu. Verinin tüm geçmişi kapsadığı iddia edilmiyor.
- React/TypeScript/TanStack Query/RHF/Zod ile ana sayfa, cari hareketleri ve sistem ayarları; mevcut müşteri detay ekranına erişim korunuyor. Ortak Inter/Lucide bileşenleri ve temalar, dört sekmeli mobil gezinme.
- Fatura formunda TRY sınırı, Decimal satır toplamları, kararlı UUID, sekme içinde form kurtarma ve taslak/gönderim kilidi.
- Toplu dekontta dosya özeti, banka referansı veya dosya/satır anahtarı, güvenli eşleştirme onayı, başarılı satırları yeniden göndermeme; Excel ayrıştırma ve cari Excel dışa aktarma worker'ları. 100 bin satırdaki çağrı yığını taşması giderildi.
- API'leri dışlayan PWA statik önbelleği; kullanıcı onaylı sürüm geçişi, çevrimdışı engeli, özel yerel verilerin çıkışta temizlenmesi.
- Sayfa bazlı JavaScript yükleme, ücretsiz Cloudflare dağıtım tanımı, CI kontrolleri, AES-256-GCM şifreli pg_dump aracı ve doğrulama SQL'i.
- PDF/Excel okuyucu yükseltmeleri ve ExcelJS'nin yalnızca v4 UUID kullanımıyla uyumlu uuid 11 override'ı; npm audit açık bulmuyor.

## Kanıt ve sınırlar
Vitest gerçek PGlite PostgreSQL motorunda migration/transaction/RLS senaryolarını çalıştırır. Vault test adaptörü yalnızca SQL sözleşmesini taklit eder; gerçek Vault şifrelemesini kanıtlamaz. Eşzamanlı 20 çağrı aynı PGlite motor kuyruğundadır; çok bağlantılı PostgreSQL stres testi değildir.

Playwright senaryoları yalnızca sahte test Supabase origin'ini yakalar; üretime yazmaz. Hızlı 10 tıklama, cevap kaybı, iki bilinçli eşit tahsilat, çevrimdışı koruma, Kayıt dolu listede 7 ekran genişliği × 2 tema, fatura formu kurtarma, tahsilatta kaybolan yanıt sonrası sayfa yenileyerek aynı işlem kimliğiyle devam etme doğrulandı. Görsel kanıtlar test-results altında oluşur.

## Planın tamamlanması için kalan işler
- Canlı başlangıç kaydı, gerçek yedek/geri yükleme ve eski/yeni bakiye karşılaştırması; Supabase migration/Edge/cron yayını ve Nilvera test belgeleri.
- Müşteri ayrıntıları, çok hesaplı cari ve diğer mevcut ekranların React ortak bileşenlerine taşınması; mevcut eski ekranlar tamamen yenilenmiş sayılmaz.
- Bütün modüller için satır bazlı toplu işlem sonuçları, belge gönderme özet/önizlemeleri, taslak sürüm çakışması, tarihsel senkronizasyon kapsamından tamlık ispatı.
- PDF/Excel üretim örneklerinin anonimleştirilmiş karşılaştırması, belirsiz PDF eşleşmeleri ve taranmış dosyalarda elle düzeltmenin uçtan uca testi.
- 10 bin/100 bin sentetik tahsilatta sorgu ve worker dışa aktarma ölçüldü (PERFORMANCE.md). Karma belge dağılımları, gerçek ağ gecikmesi, saha LCP/INP/CLS ve gerçek iOS/Android testleri hâlâ gerekli.
- Depolama ve ağ kotalarının ölçümü; şu an ayarlarda yalnızca veritabanı kapasitesi görünür. Yedek son başarı zamanı dosyada kayıtlı, uygulamaya bağlanmadı.
- Hesaplara göre özellik bayrakları ve eski istemci için özel güncelleme ekranı. Mevcut migration seti koordineli bakım penceresi gerektirir.
- Cloudflare canlı yayın ve bakım sonrası kullanıcı kabulü.

Bu kayıt tüm planın tamamlandığı veya canlı sistemin güvenli sürüme geçtiği anlamına gelmez. Dağıtım sırası ve eksik dış ortam doğrulamaları ROLLOUT.md dosyasındadır.

## Son kodlama turu — henüz doğrulanmadı
Kullanıcı isteğiyle testler sona bırakıldı. 008–010 migration, tarama kapsamı paneli, tarihsel tarama öncelikleri, /cari-ozet müşteri bakiyeleri, fatura gönderim özeti, hesap bağlı taslak context, kullanıcı eylemiyle bildirim izni ve taslaklarda satır bazlı toplu gönderim kodu eklendi. Son doğrulanmış 48 birim/SQL testi ve 11 tarayıcı senaryosu bu yeni değişiklikleri kapsamıyor. Ayrıntılı güncel görev sırası kökteki DEVIR-TESLIM.md içindedir.


## 12 Ekim final tur
Yerel kodlama tamamlandı ve doğrulandı: typecheck, **62 Vitest**, build, lint (0 error), **11 E2E**, Deno check. Migration **001–015**. Canlı yedek/restore/migration/yayın ve gerçek cihaz PWA hâlâ yok. Güncel ayrıntılar kökte DEVIR-TESLIM.md dosyasındadır.
