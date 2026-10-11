# Sonvera güvenli geçiş rehberi

Bu dal geliştirme sürümüdür. **12 Ekim 2026:** canlıya 001–015 migration uygulandı; Edge `nilvera` + `job-runner` deploy edildi. Edge secrets ve Cloudflare istemci yayını hâlâ tamamlanmalı. Arayüz yeni RPC’lere ihtiyaç duyar; secrets + yeni istemci olmadan Nilvera/proxy bozulur.

## Yayın sırası
1. Mevcut sürümü, kullanıcı UUID'sini, hesap sayısını, tahsilat sayı/toplamlarını, arşiv belge sayılarını kaydedin. Şüpheli mükerrerleri otomatik silmeyin.
2. PostgreSQL istemcisini kurun. PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD, PGSSLMODE=require ortam değişkenlerini güvenli olarak tanımlayın. Parolayı kabuk geçmişine yazmayın.
3. En az 16 karakterlik SONVERA_BACKUP_PASSWORD belirleyin. `npm run backup` şifreli custom-format pg_dump üretir; dosya ve parola ayrı saklanır. Yedekleme tüm erişilebilir şemaları kapsar. Bu aşama başarısızsa geçişe devam etmeyin.
4. İzole test veritabanında geri yükleme provası yapın. Ayrıntılar `docs/BACKUP-RESTORE.md` içindedir. `npm run backup:decrypt -- backups/FILE.svb SAFE/restore.dump` yalnızca dosyayı açar, DB'ye yazmaz. `pg_restore` bağlantısını yalnız test veritabanına yöneltin. auth/Vault gibi Supabase şemaları için uyumlu Supabase ortamı gerekir. Vault platform anahtarları dump ile taşınmaz. Finansal özet için `npm run backup:verify -- dosya.svb` kullanın; kaynak ve izole hedef bağlantıları karışmamalıdır.
5. Mevcut Supabase projesine sırasıyla 001–014 migration dosyalarını uygulayın. `schema.sql` canlıda tekrar çalıştırılmaz. Vault uzantısı yoksa 002 transaction geri alınır. 002 mevcut anahtarları sunucuda Vault'a taşır, tarayıcının api_key sütununu okumasını kapatır.
6. Supabase Edge secrets: OWNER_USER_ID (tek kullanıcının UUID'si), ALLOWED_ORIGINS (virgülle ayrılmış tam origin listesi), SCHEDULER_SECRET (rastgele uzun parola). SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY platform tarafından sağlanır. Bunları VITE_ değişkenlerine koymayın.
7. Supabase CLI ile `supabase functions deploy nilvera`, `supabase functions deploy job-runner`. İşlevler JWT'yi içeride doğrular; config.toml bunu yansıtır. Auth'ta yeni kullanıcı kaydını kapatın. Eski kaynakta bulunan giriş parolasını değiştirin; eski Nilvera anahtarlarını da sağlayıcıdan yenileyip hesaplarda kaydedin.
8. Vault'ta project_url ve scheduler_secret adlarını oluşturun; `supabase/setup-scheduler.sql` ile beş dakikalık görevi kurun. Bunları SQL dosyasına literal olarak kaydetmeyin. İlk iş kuyruğunu test hesabında kontrol edin.
9. `.env.example` temelinde yalnızca public Supabase URL/anon anahtarı girin. `npm ci`, `npm run check`, `npm run lint`, `npm run test:e2e` ve `npx deno check supabase/functions/nilvera/index.ts supabase/functions/job-runner/index.ts` çalıştırın.
10. Cloudflare kimlik doğrulamasından sonra `npx wrangler deploy` ile statik varlıkları yayınlayın. Ücretli kaynak oluşturma tanımlı değildir. Canlı denemede önce okumaları kontrol edin; fatura gönderme testlerini Nilvera test hesabında yapın.

## Aşamalı açılış ve geri dönüş
Migration 001 doğrudan tahsilat/arşiv yazmalarını, 002 eski hesap/anahtar erişimini kapatır. Bu nedenle DB geçişi kısa bir bakım penceresinde, hazır yeni istemci ve işlevlerle birlikte yapılmalıdır; eski istemcilerle paralel güvenli finansal yazma desteği yoktur. Açık PWA sürümleri güncelleme bildirimi alır. Eski istemciler açık hata alır; yeni istemciye geçmeden işlem yapamaz.

Geri dönüşte güvenli RPC/Vault katmanı korunur. Önceki korumasız istemci sürümüne dönülmez. Uyumlu arayüz sürümü yayınlanır; kaydedilmemiş formlar varken zorunlu yenileme yapılmaz. Veri kaybı şüphesinde kayıt yazmayı durdurup sayı/toplamları karşılaştırın; otomatik eski dump yüklemeyin.

## Yedek işletimi
`backups/last-success.json` yalnızca tamamlanan şifreli yedeği işaretler. Windows Görev Zamanlayıcıda repo dizininde `npm run backup` çalıştırılabilir; bilgisayar açık olmalı ve ortam/kimlik bilgileri görev kullanıcısına güvenle tanımlanmalıdır. Bu depoda herhangi bir sistem görevi otomatik kurulmadı. Yedek parolasını kaybetmek geri yüklemeyi engeller. Yedek silme politikası otomatik değildir. Açılmış dump'ları provadan sonra güvenle kaldırın.

## Henüz canlı doğrulanmayanlar
- Gerçek PostgreSQL bağlantıları arasında eşzamanlılık; PGlite testleri tek motor kuyruğunda çalışır.
- Supabase Vault şifrelemesi, RLS'nin gerçek proje rolleri, fonksiyon dağıtımı, cron ve ağ kotaları.
- Nilvera'nın test ortamında kabul ettiği satır yuvarlaması, taslak güncelleme ve belirsiz gönderim sorgusu.
- Gerçek yedek/geri yükleme, mevcut bakiye karşılaştırması, İstanbul'dan gecikme.
- Gerçek iPhone Safari/Android Chrome, PWA güncelleme/kurulum ve saha Core Web Vitals.


## 11 Ekim devam notu — henüz çalıştırılmadı
Migration sırası artık 001–015: 011 ledger export, 012 backup history, 013 restore verification, 014 document operation index, 015 resolve operation dahil. Yeni kodlar için test/derleme ertelendi; önceki başarı sonuçları bu ekleri doğrulamaz. Güncel ayrıntılar ve kalan işler kökte DEVIR-TESLIM.md dosyasındadır.

Windows yedek kurulumu için scripts/configure-backup.ps1 parametrelerini kullanın; sırlar Read-Host ile alınır ve mevcut Windows kullanıcısına bağlı DPAPI ile saklanır. -RegisterDailyTask isteğe bağlıdır; görev scripts/run-backup.ps1 çalıştırır. Bilgisayar ve kullanıcı oturumu açık olmalıdır. PostgreSQL araçları ve gerçek bağlantı bilgileri gerekir. SONVERA_OWNER_USER_ID ile rapor sahibini tanımlayın; metadata raporu dosya içeriğini Supabase’e yüklemez. Henüz görev kurulmadı veya geri yükleme doğrulanmadı.
