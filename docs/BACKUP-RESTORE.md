# Şifreli yedek ve finansal geri yükleme karşılaştırması

Bu yönerge uygulanmış bir yedek/geri yükleme provası değildir. Kod yazıldı; çalıştırılmadı. Üretim veritabanının üzerine geri yükleme yapmayın.

## Windows / Supabase bağlantısı

Ücretsiz Supabase projelerinde `db.<project>.supabase.co:5432` çoğu zaman yalnız **IPv6** yayınlar. Ev/ofis ağında IPv6 yoksa `pg_dump` “bağlantı tamamlanamadı” der. Bu durumda Dashboard → Database → Connection string → **Session mode** hostunu kullanın (`aws-0-<region>.pooler.supabase.com`, port `5432`, kullanıcı `postgres.<project-ref>`). Transaction pooler (6543) `pg_dump` için uygun değildir.

Tek seferlik yedek (şifreleri sorar, ekrana yazmaz):

```powershell
.\scripts\backup-once.ps1
```

Bölge farklıysa: `.\scripts\backup-once.ps1 -Region eu-west-1` (Dashboard’daki Session host ile aynı bölge).

## Yedek dosyaları

Migration 011 ve PostgreSQL istemci araçları kurulu olduğunda `npm run backup` finansal referansı yedekten önce ve sonra okur. Hesap, tahsilat ve arşiv satırlarının özetleri, para birimi bazlı hareket toplamları ve veri revizyonları karşılaştırılır. Veri değişmiş veya referans okunamamışsa yedek korunur; finansal doğrulama referansı üretilmez. Sessiz dönemde yeniden yedek alınmalıdır.

Başarılı bir çalışmada:

- `sonvera-....svb`: AES-256-GCM ile şifreli PostgreSQL custom dump.
- Aynı dosya adı + `.manifest.svb`: ayrıca şifrelenmiş finansal karşılaştırma referansı; yalnız referans kararlıysa oluşur.
- Aynı dosya adı + `.json`: dosya kimliği, boyutu ve SHA-256 özeti; sır veya belge içeriği içermez.
- `backups/last-success.json`: son tamamlanmış çalışmanın durumu.

Ana yedek ve manifest aynı parolayı kullanır. Parolayı dosyalardan ayrı güvenli yerde saklayın. Manifest bulunmaması dump dosyasının bozuk olduğunu göstermez; otomatik finansal karşılaştırma yapılamadığını gösterir. Raporlama hatası tamamlanmış şifreli dosyayı silmez.

## İzole geri yükleme

1. Yedek boyutunu ve `.manifest.svb` / `.json` referanslarının varlığını kontrol edin. Mevcut kaynak veritabanının bağlantı bilgilerini hedef olarak kullanmayın.
2. Ayrı PostgreSQL veya uyumlu Supabase test ortamında gerekli roller, şemalar ve uzantıları hazırlayın. Kaynakla uyumlu PostgreSQL sürümü kullanın.
3. Dump içinde `auth.users` yabancı anahtarları vardır. İzole ortamda `auth` şeması ve ilgili kullanıcı satırları yoksa restore kısmi kalabilir; finansal karşılaştırma tabloları için en azından `accounts`, `customer_collections`, `invoice_archive`, `ledger_entries` ve `private.ledger_revisions` okunabilir olmalıdır.
4. `SONVERA_BACKUP_PASSWORD` ortam değişkenini güvenli şekilde sağlayın. `npm run backup:decrypt -- dosya.svb izole.dump` komutu yalnız dump dosyasını açar; veritabanına yazmaz.
5. Dump’ı açıkça seçilmiş izole veritabanına geri yükleyin (örnek; bağlantıyı kendiniz doğrulayın):

```powershell
pg_restore --exit-on-error --no-owner --no-acl --dbname=postgresql://USER@HOST:5432/sonvera_restore_test SAFE/restore.dump
```

Bu depodaki doğrulama aracı `pg_restore` çalıştırmaz; hedefi kendiliğinden seçmez veya veritabanı silmez.

6. İzole hedef için şunları tanımlayın: `SONVERA_RESTORE_PGHOST`, `SONVERA_RESTORE_PGPORT`, `SONVERA_RESTORE_PGDATABASE`, `SONVERA_RESTORE_PGUSER`, `SONVERA_RESTORE_PGPASSWORD` ve gerekiyorsa `SONVERA_RESTORE_PGSSLMODE`. Ana `PGHOST` / `PGDATABASE` hedef okumasında kullanılmaz. `SONVERA_RESTORE_*` kaynak `PG*` ile aynı host+port+database olamaz; araç bunu reddeder.
7. Okuyan rol RLS yüzünden boş sonuç görmemelidir. Tercihen BYPASSRLS veya restore sahibi rol kullanın; aksi halde satır sayısı/özet uyuşmazlığı yanlış negatif üretir. `private.ledger_revisions` için okuma yetkisi gerekir.
8. `npm run backup:verify -- dosya.svb` çalıştırın. Araç dosya SHA-256 özetini ve şifreli manifesti doğrular; izole hedefi yalnız okur. Satır sayıları, kayıt özetleri ve para birimi bazlı finansal toplamlar tam eşleşmezse başarı dosyası oluşmaz.
9. Başarıda `dosya.svb.restore-verified.json` yazılır. Var olan aynı isimli raporun üzerine yazılmaz (aynı yedek özeti varsa korunur). Ana kayda raporlamak için komuta `--report` ekleyin; bu durumda normal PG bağlantısı kaynak sistem olmalı, `SONVERA_OWNER_USER_ID` tanımlanmalı ve migration **013** kurulmuş olmalıdır. Yalnız doğrulama metadata’sı kaydedilir. Migration 013 doğrulama zamanını yaklaşık bir günlük pencerede kabul eder.
10. Raporlama ağ/psql hatası verdiyse yerel `.restore-verified.json` korunur. Aynı gün içinde `npm run backup:verify -- dosya.svb --report-only` ile yeniden gönderebilirsiniz.
11. Açılmış dump ve test ortamındaki kişisel verilerin saklama süresini belirleyin; gereksiz açık kopyaları kaldırın. Yedek dosyalarının otomatik silinmesi tanımlı değildir.

## Bu karşılaştırmanın kanıtlamadığı alanlar

Vault anahtarlarının başka ortamda çözülebilmesi, Supabase Auth yapılandırması, Storage dosyaları, Edge Function sırları, cron, sağlayıcı bağlantısı ve gerçek uygulama akışları ayrıca doğrulanmalıdır. Veritabanı dump’ı bu dış ayarların eksiksiz taşındığı anlamına gelmez. Ayarlardaki doğrulama tarihi yalnız finansal kayıt eşleşmesini belirtir.

Doğrulama scriptleri, migration’lar, Windows DPAPI kurulumu ve görev zamanlayıcısı bu oturumda çalıştırılmadı. Gerçek yedek ve geri yükleme provası tamamlanmadan canlı şema geçişi yapılmamalı. Migration sırası artık **001–014**’tür.
