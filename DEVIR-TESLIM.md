# Sonvera — devir teslim ve yapılacaklar

Son güncelleme: **12 Ekim 2026 (canlı geçiş turu)**. Bu dosya başka IDE/AI ajanına geçiş için ana başlangıç noktasıdır. HER OTURUM / YANIT BİTİŞİNDE bu dosyayı güncellemek zorunludur; bu kural sonraki IDE ve ajanlar için de geçerlidir. Yapılanları, kalanları, doğrulanmayanları ve sıradaki somut adımı yazın. Tamamlanan işlerin üzerine yazmayın; mevcut kullanıcı değişikliklerini koruyun.

## Yeni IDE'ye verilecek mesaj

> DEVIR-TESLIM.md, docs/IMPLEMENTATION-STATUS.md, docs/ROLLOUT.md ve DESIGN.md dosyalarını oku. Mevcut değişiklikleri koruyarak Sonvera geliştirmesine devam et. Planın tamamını uygulanmış sayma. Önce `git status --short` ve aşağıdaki **12 Ekim canlı geçiş** bölümünü kontrol et. Canlıda 001–015 migration uygulandı; Edge `nilvera` + `job-runner` deploy edildi. Edge secrets ve Cloudflare istemci yayını hâlâ açık. Gizli anahtarları terminale, dokümana veya sohbete yazma. HER BİTİŞTE bu dosyayı güncelle.


## 12 Ekim canlı geçiş turu

### Bu turda yapılanlar
- Şifreli yedek: `backups/sonvera-2026-10-11T22-06-41-993Z.svb` (~580 KB). Pooler host: `aws-1-eu-north-1.pooler.supabase.com`, user `postgres.ciaffmgszfvyrdoweirw`.
- İzole local restore (port `55432`, DB `sonvera_restore_test`): accounts 6, collections 150, archive 1671 (canlı arşiv anlık ~1681; vault uzantısı localde yok). Finansal `.manifest.svb` yok → `backup:verify` formal eşleşme üretemedi.
- Canlı **001–015** migration uygulandı (`supabase db push`); Vault’ta 6 secret.
- Edge Functions MCP ile deploy: `nilvera` v2 ACTIVE, `job-runner` v1 ACTIVE (`verify_jwt=false`).
- OWNER için hazır dosya: `%LOCALAPPDATA%\Sonvera\edge-secrets.env` (OWNER_USER_ID=`f13633cc-6170-4a51-8b63-1fcb1c388a03`, ALLOWED_ORIGINS localhost). Secrets henüz Supabase’e yazılmadı — `npx supabase login` sonra `.\scripts\set-edge-secrets.ps1`.
- Supabase plugin bağlandı; proje `semihmuhasebe` / `ciaffmgszfvyrdoweirw` / bölge **eu-north-1** (Stockholm).

### Bölge / İstanbul
Supabase’te İstanbul/Türkiye bölgesi yok. TR için en düşük gecikme genelde **eu-central-1 (Frankfurt)**. Taşımak = yeni proje + veri kesimi; canlı migration sonrası şimdi yapılmamalı. İleride ayrı cutover.

### Sıradaki (hemen)
1. `npx supabase login` → `.\scripts\set-edge-secrets.ps1`
2. Auth’ta yeni kayıt kapat; DB/yedek parolalarını (sohbete düşenleri) yenile.
3. Yerel `npm run dev` ile yeni istemciyi doğrula; sonra Cloudflare `wrangler deploy`.
4. Günlük yedek: `configure-backup.ps1` ile Host=`aws-1-eu-north-1.pooler.supabase.com`, User=`postgres.ciaffmgszfvyrdoweirw`, OwnerId yukarıdaki UUID.

### Risk
Eski istemci doğrudan `api_key` / serbest tahsilat yazamaz. Edge secrets yoksa Nilvera proxy 401 verir. İstemciyi secrets ile birlikte güncelle.


## 12 Ekim final tur — yerel kodlama + doğrulama

Önceki Codex kaldığı yerden devam edildi; ardından kalan yerel P0/P1 kod işleri bitirilip final kontroller çalıştırıldı. **(Üstteki canlı geçiş bölümü daha yeni.)**

### Bu oturumda tamamlananlar (yerel)
- Allowlist/path düzeltmeleri, belge bağlantısı firma seçimi, geri yükleme doğrulama boşlukları, client sürüm bandı (önceki adım).
- **015_resolve_operation.sql:** stuck işlemi elle `failed` kapatma; reconcile job status `done` (bug fix: `succeeded` tabloda yoktu).
- Gelen / e-Arşiv / **irsaliye giden-gelen** toplu yazmalar `runDocumentBatch` (`incoming:` / `earsiv:` / `despatch-out:` / `despatch-in:`).
- e-Arşiv çift liste tek kaynağa indirildi.
- Reconciliation: SendAnswer, Tags, SpecialCode, Archive/Unarchive Operation; job-runner lookup path genişletildi; `reconciliation.test.ts` güncellendi.
- Migration testleri **008–015** + `invoice-validation.test.ts` (validateInvoice/validateDespatch).
- İrsaliye taslak kartından **Düzenle** → `#/eirsaliye-olustur` (edit context + hydrate + `editAndSend`).
- Lint: `export-filename.js` control-char regex düzeltildi.

### Final doğrulama (bu turda çalıştırıldı)
| Komut | Sonuç |
|---|---|
| `npm run typecheck` | geçti |
| `npm run test` | **16 dosya / 62 test** geçti |
| `npm run build` | geçti (üçüncü taraf `use client` uyarıları var) |
| `npm run lint` | 0 error (4 eski unused warning `supabase.js`) |
| `npm run test:e2e` | **11 geçti**, 2 ölçek senaryosu atlandı |
| `deno check` nilvera + job-runner | geçti |

### Hâlâ açık (erişim / cihaz / ürün kapsamı)
1. Gerçek şifreli yedek + izole restore + `backup:verify` provası; ardından canlı **001–015** + Edge + istemci (docs/ROLLOUT.md).
2. Nilvera test hesabında uçtan uca gönderim/cevap/arsiv doğrulama; irsaliye draft hydrate alan eşlemesi gerçek örnekle kontrol.
3. React’te tüm eski ekran özellik eşitliği, kapasite/egress ölçümü, gerçek iPhone/Android PWA.
4. Commit/push yapılmadı; kullanıcı istemedi.

Migration sırası **001–015**.


## En son devam oturumu — 11 Ekim, ek uygulamalar (DOĞRULANMADI)

Bu bölüm önceki oturumun durumuna eklenir. Üstteki 12 Ekim bölümü daha yenidir.

- **011_ledger_export.sql:** hesap bazlı veri revizyonu, arşiv/tahsilat değişikliklerinde revizyon artışı, yetkili ve revizyon kontrollü 1000 satırlık Excel veri sayfaları. Revizyon tarama boyunca değişirse dışa aktarma durur.
- **012_backup_history.sql:** kullanıcıya özel yedek geçmişi; yalnız service_role yedek sonucunu kaydedebilir. Gerçek geri yükleme doğrulaması yapılmadı; alan boş kalır.
- **013_restore_verification.sql / 014_document_operation_index.sql:** geri yükleme raporu RPC + belge kimliği GIN indeksi / gönderim-sonrası arşiv engelini gevşeten koruma (önceki Codex).
- **ledger-export.js / cari-export.js / cari-export-worker-client.js:** sunucudan bütün filtreli TL hareketlerini sayfalı alıp worker ile Excel üretme, 100 bin sınırı, ilerleme, iptal, revizyon kontrolü; dönem neti açıkça dönem başından ayrılır. Firma ve ay aralığı adlandırması korunur.
- Eski üç cari ekranında export-context: yüklenen veri ile seçili tarihler uyuşmadan / veri eksikken Excel indirilmez.
- Müşteri bakiyesi detayında yeni tahsilat, düzenleme, iptal, geçmiş, Excel ve firma bağlamı denetimi eklendi.
- Toplu taslak / giden belge işlemleri için document-batch.js ve batch-results.js: satır sonuçlarını sessionStorage ile koruma, belirsiz sonuçları operation_receipts üzerinden okuma, başarılı satırları tekrar göndermeme. Çoklu satırın tamamı otomatik çözüldü iddiasında bulunmayın.
- api-transport işlem anahtarını sonuçta taşır; giden belge işlemlerinde belirsiz hatadan sonra farklı yazma isteğiyle otomatik fallback kaldırıldı. Katalog çağrısında pathParams yerine koyma eklendi.
- **010 migration yeniden üretildi:** önceki metin değiştirmede SQL içindeki dolar işaretinin JavaScript replacement olarak yorumlanması düzeltildi. SQL metinlerinde replace callback kullanın.
- Job runner / reconciliation: e-irsaliye UUID ve DespatchStatus desteği; yalnız açıkça tanımlı gönderim/taslak işlemleri otomatik uzlaştırılır. Diğer değişiklikler eski başarılı belge durumuyla yanlış başarılı sayılmaz. Resmi public e-irsaliye API tanımı okundu; gerçek sağlayıcı testi yapılmadı.
- Yedek scripts/backup-report.mjs: şifreli dosya özeti ve service RPC raporu, rapor başarısızsa tamamlanan dosyayı korur. scripts/configure-backup.ps1 + run-backup.ps1: Windows DPAPI ile kullanıcıya bağlı sır saklama, isteğe bağlı günlük görev. **Kurulum scriptleri çalıştırılmadı, görev kurulmadı, yedek alınmadı.** Ayarlarda son yedek / eski yedek / geri yükleme doğrulanmadı görünümü eklendi.
- **src/react/documents.tsx / #/belgeler:** altı belge türü, firma/ortam/tarih/sayfa bazlı query, iptal edilebilir 50 kayıtlık okuma, tarih doğrulama (en fazla 170 gün), açıkça yalnız sayfada arama, mobil kartlar, UUID/durum bilgisi. PDF/XML indirme + paylaşım linki 12 Ekim oturumunda bağlandı; bütün belge özellikleri React’e taşınmış DEĞİL.

## Son oturum eklemesi — testler kullanıcı isteğiyle sona bırakıldı

**Kullanıcının son talimatı:** “Testleri en son yap; şimdi kodu yaz ve yarım kalan işleri sürdür. Devir teslimi en son güncelle.” Bundan sonraki ajan kodlamayı her küçük değişiklikte test çalıştırarak bölmemeli. Final doğrulama turu yine gerekli.

Son doğrulanmış nokta: **48 Vitest testi, 11 Playwright senaryosu ve Deno check geçti.** İki ağır ölçek testi standart tarayıcı koşusunda atlandı. Aşağıdaki yeni değişiklikler bu noktadan SONRA yazıldı; test, tip kontrolü veya derleme çalıştırılmadı. Eski yeşil sonuçları bu yeni kodun kanıtı olarak kullanmayın.

Yeni yazılan kod:
- **008_sync_coverage.sql:** güncel ay önceliği, hesap başına sınırlı tarihi ay/tür taraması, geçmiş arşiv/sync kayıtları ve önceki ay üzerinden yeniden tarama, İstanbul takvimi, kapasite kontrolü; archive_coverage RPC seçilen ay/belge türü için tam tarama ve güncellik kanıtı döndürür.
- Cari ekranda kapsam paneli: güncel / yenileme gerekli / taranmadı. Tarihsiz aralıkta tüm geçmiş tamamlandı iddiası yok.
- **009_customer_ledger.sql:** firma+müşteri bazında gruplanmış bakiye, dönem başı, borç/alacak, hariç döviz sayısı; 50 satırlık sayfalama, sunucu araması, her hesap için yetki kontrolü.
- **/cari-ozet:** React müşteri bakiyeleri, çoklu firma seçimi, dönem filtresi ve sayfalı hareket detayı/geçmiş. Eski ayrıntılı müşteri/Excel ekranları korunuyor; tüm eski cari özellikleri yeni ekrana taşınmış DEĞİL.
- **document-confirmation.js:** veri alanlarını textContent ile oluşturan ortak gönderim özeti. Fatura gönderimi firma/alıcı/VKN/tarih/satırlar/toplam onayı ister.
- Taslak edit context'ine accountId eklendi, başka firmaya geçince açılış engellenir. Fatura müşteri aramasında geç gelen yanıt ve HTML kaçışı için ek korumalar.
- Ayarlarda yalnız kullanıcı düğmesine basınca bildirim izni isteme; reddedilmiş/desteklenmeyen durumlarda açıklama.
- **document-batch.js + drafts.js:** toplu taslak gönderimi satır satır, ortak kilit, sonuç paneli; başarılı kutular işaret dışına alınıp kilitlenir. Kısmi başarı tek genel başarı mesajıyla gizlenmez.
- **010_document_batch_guard.sql:** tek elemanlı UUID/model listesiyle ConfirmAndSend için de belge kimliği koruması. Diğer ekranlardaki çok elemanlı toplu çağrılar henüz dönüştürülmedi; bütün toplu işlemler tamamlandı demeyin.

Hemen sonraki çalışmalar:
1. Diğer belge listelerindeki toplu yazmaları aynı satır bazlı işleyiciye taşı; başarılı satırların kalıcı korunması ve belirsiz satırların yenilemeden sonra sorgulanması tamamlanmalı. Şu an taslak sonuç paneli DOM içindedir, sayfa yenileme sonrası sonuç özeti sunucu işlem kayıtlarından yeniden kurulmaz.
2. Müşteri özeti ekranındaki ayrıntılı Excel, tahsilat oluştur/düzelt ve eski ekran özelliklerinin taşınmasını tamamla; yeni ekran şu an okuma/geçmiş odaklı.
3. İrsaliye belirsiz sonuç sorgusunu resmi Nilvera sözleşmesiyle tamamla; halen otomatik doğrulama desteği eksik.
4. Yeni 008–010 migration'ları yerel SQL test kurulumuna ekle; bu dosyaların doğrulaması sona bırakıldı. migration listesi testlerde şu an 007'ye kadar.
5. Bitirirken tam test/typecheck/build/E2E/Deno turu ve kullanıcı arayüzü kontrolü. Özellikle SQL tarih aralığı, geçmiş tarama kapasitesi, müşteri toplamı, onay iptali, firma değişimi, toplu kısmi başarı ve sayfa yenileme senaryoları.

Canlı migration/yayın/yedek hâlâ yapılmadı. Migration sırası artık **001–010**. Bu yeni ekleme aşağıdaki eski ayrıntılı kontrol listesinden daha günceldir.

## 1. Kullanıcının hedefi ve değişmeyecek kararlar

- Tek kullanıcı, birden fazla firma ve Nilvera hesabı. Cari/tahsilat ile fatura iş akışları eşit önemde.
- Önce mükerrer kayıt ve veri kaybını önle; sonra hız, modern tasarım ve mobil/masaüstü kullanılabilirlik.
- Canlı veriler korunacak. Şüpheli eski mükerrerler otomatik silinmeyecek; doğrulananlar geçmişli iptal edilecek.
- Mevcut işlevler geliştirilecek; boş ticari modüller kapsam dışı. Tamamen yeni modüller ekleyerek kapsamı büyütme.
- Yeni finansal işlemler TRY. Dövizli eski belgeleri koru, TL bakiyeye katma.
- React/TypeScript geçişi aşamalı. Supabase Auth/Postgres/Vault/Edge; frontend Cloudflare Workers Static Assets. Yeni ücretli hizmet yok.
- Mobil tarayıcı ve PWA; ayrı mağaza uygulaması yok. Açık/koyu tema, yerel Inter, Lucide, klavye erişimi.
- Finansal işlem tekilliği yalnız buton kilidiyle değil, sunucu/veritabanı transaction ve idempotency anahtarıyla sağlanır.
- Nilvera yazmasında belirsiz sonuçta kör tekrar yok: aynı belge kimliğiyle durum kontrolü.
- Kullanıcı teknik işleri kendisi yapmak istemiyor. Kodlama/test/hazırlık ajan tarafından yapılacak; yalnız gerçekten gerekli giriş/erişim ve gerçek cihaz kullanıcı kabulü istenecek.
- Son istek: **bütün Excel çıktıları firma/müşteri + seçilen dönemle isimlendirilsin**. Örnek `Sem 7-10. AY.xlsx`, tek ay `Sem 7. AY.xlsx`, yıl geçişi `Sem 12.2025-2.2026 AY.xlsx`.

## 2. Çok önemli canlı durum

**Bu çalışma yerel geliştirmedir. Supabase migration'ları canlıya uygulanmadı; Edge Functions ve Cloudflare yayını yapılmadı. Gerçek yedek veya geri yükleme provası yapılmadı.**

Arayüz artık yeni RPC'lere ihtiyaç duyuyor. Sadece frontend'i yayınlamak mevcut sistemi bozabilir. Yayın sırası docs/ROLLOUT.md içindedir. Eski doğrudan yazmalar güvenlik migration'larıyla kapatıldığı için koordineli bakım penceresi gerekir. Geri dönüş korumasız eski istemciye yapılmaz.

Bu oturumda bulunan erişim durumu:
- Supabase/Cloudflare/PostgreSQL/backup kimlik bilgilerine ait ortam değişkenleri tanımlı görünmedi.
- `supabase`, `wrangler`, `pg_dump`, `pg_restore` PATH'te bulunmadı.
- Docker CLI var, Docker Desktop Linux engine çalışmıyor (`docker info` bağlantı kuramadı).
- Tarayıcıdaki yönetim oturumlarının kullanılabilirliği bu son aşamada kontrol edilmedi. Giriş erişimi varsa değerlendirin; olmadığı kesinleşmeden kullanıcıya her şeyi elle yaptırmayın.
- Supabase public URL/anon anahtarı frontend'de var; bunlar yönetici erişimi değildir. Service role veya DB parolasının yerine geçmez.
- Eski hardcoded giriş parolası kaynak koddan kaldırıldı. Canlı geçişte giriş parolası ve önceden istemciye dağıtılmış Nilvera anahtarları yenilenmeli. Eski değerleri yazdırmayın.

## 3. Yerelde yapılmış işler

### Güvenilir kayıt ve güvenli API
- [x] Tahsilat oluştur/düzelt/iptal RPC: hesap sahipliği, işlem anahtarı, aynı içerikle aynı sonuç, farklı içerikle çakışma.
- [x] SQL transaction içinde tahsilat + işlem sonucu + geçmiş; sürüm kontrollü düzenleme, fiziksel silme yerine gerekçeli iptal.
- [x] Hızlı tıklama/Enter için eşzamanlı arayüz kilidi; kayıp yanıt sonrasında aynı anahtarla devam.
- [x] Tahsilat formu sekme depolamasından kurtarılır. Belirsiz gönderim alanları kilitlenir; bozuk depolama formu çökertmez; henüz geçerli olmayan kısmi girişler korunur.
- [x] Hesap değiştirme sırasında eski okumaların görünümü kirletmesine karşı temizlik; bekleyen mutasyonda hesap değişimi engeli.
- [x] Vault tabanlı Nilvera anahtar saklama SQL'i ve güvenli hesap yönetimi. Tarayıcıda normal hesap yanıtı anahtar içermez.
- [x] Edge JWT/tek kullanıcı/hesap sahipliği doğrulaması, izinli endpoint listesi ve sabit test/canlı host.
- [x] Başarılı GET bir kez; geçici okuma hatalarında sınırlı gecikmeli tekrar. Yazmalar otomatik tekrarlanmaz.
- [x] Belge kimliği üzerinden bilinmeyen/önceden gönderilmiş işlem koruması; sonuç doğrulama işleri.
- [x] Başarısız işi yeniden kontrol kuyruğuna alma RPC'si: yalnız sahibi, yalnız failed durum; belirsiz belge tekrar gönderilmez.
- [x] Finansal geçmişi olan hesabın test/canlı ortamını değiştirme engeli; hesap devre dışı bırakılır, mali geçmiş korunur.

### Finans, arşiv ve performans
- [x] Decimal para hesapları ve Türkçe tutar ayrıştırıcı; TRY dışı/bozuk tutarları ayrı tutma; iade/iptal normalizasyonu.
- [x] Atomik arşiv upsert, staging, iş sahiplenme/kiralama; yarım tarama sağlam arşivi silmez.
- [x] Cari sunucu arama/sayfalama, tüm eşleşmelerin toplamı, dönem başı. Eksik geçmiş tam bakiye gibi gösterilmez.
- [x] Excel ayrıştırma ve cari XLSX üretimi Web Worker'da. Kullanıcı metni formül olarak yazılmaz.
- [x] 100 bin satırda spread/push kaynaklı çağrı yığını taşması düzeltildi.
- [x] Cari Excel seçili firma/müşteri/arama/yön filtreleri düzeltildi; TL dışı belgeler ayrıldı.
- [x] Ortak Excel dosya adı: `src/lib/export-filename.js`. Seçilen dönem kayıt tarihlerine göre öncelikli; Türkçe harfler korunur, yasak dosya karakterleri temizlenir.
- [x] Ayrı dışa aktarma ekranı ilk 200 kayıt sınırından çıkarıldı; tarih dilimli/sayfalı okuma kullanır. Hatalı tamamlanmamış tarama dosya üretmez.

### Arayüz ve PWA
- [x] React ana sayfa, cari hareketleri, tahsilat formları/geçmişi/iptaller, ayarlar ve işlem durumları.
- [x] Ortak açık/koyu tasarım, yerel fontlar, mobil dört sekmeli alt menü, responsive cari kartları.
- [x] Lazy route yükleme; Excel/PDF araçları ihtiyaç anında yüklenir.
- [x] Fatura formunda kararlı UUID, alan/satır kurtarma, taslak-gönder ortak kilidi, TRY sınırı.
- [x] İrsaliye formunda kararlı UUID, alan/satır/sürücü/plaka kurtarma, taslak-gönder ortak kilidi, gönderim özeti, VKN/miktar kontrolü ve Decimal tutar.
- [x] İrsaliye XML/JSON önizlemelerindeki ham HTML yerleştirme escape edildi.
- [x] Sayfa global event listener'ları route değişiminde temizlenir; modallarda odak/Escape/sekme tuzağı.
- [x] PWA yalnız statik allowlist; API/auth/özel belge genel cache'e girmez. Kirli formda zorunlu reload yok; çıkışta özel depolama temizlenir.
- [x] Bildirim izni otomatik istenmez; izin yoksa uygulama içi bildirim.

### İşletim temeli
- [x] CI, Vitest, Playwright, TypeScript komutları ve sınırlı ESLint.
- [x] AES-256-GCM + scrypt şifreli pg_dump aracı; yanlış parola/bozuk dosya testleri.
- [x] Cloudflare ücretsiz static deployment konfigürasyonu; otomatik ücretli kaynak oluşturulmaz.
- [x] Dependency güncellemeleri; son audit çalışmasında 0 açık. Yeni değişikliklerden sonra tekrar doğrulayın.

## 4. Son çalışma ve hemen devam edilecek yer

Son eklenen irsaliye düzeltmeleri:
- `src/pages/eirsaliye-create.js`: UUID artık her build'de değişmiyor; ortak kilit; kurtarma; önizleme escape; tutar Decimal.
- `supabase/functions/_shared/invoice-validation.ts`: `validateDespatch` eklendi.
- `supabase/functions/nilvera/index.ts`: e-irsaliye yazmaları yanlışlıkla fatura doğrulamasına gitmesin diye ayrıldı.
- `supabase/migrations/202610100007_despatch_guard.sql`: 005 fonksiyonunun irsaliye UUID'lerini de koruyan ileri migration'ı.
- `tests/private-api.test.js`: 007 migration listesine eklendi. İrsaliye UUID için ayrı SQL davranış testi henüz eklenmedi.
- `tests/e2e/workflows.spec.ts`: irsaliye yenileme + sabit UUID + 10 tıklama + taslak/gönder ortak kilit testi geçti.

**İlk sonraki görevler:**
1. Yeni `validateDespatch` için birim test ekle; Deno check'i yeni sunucu değişiklikleriyle çalıştır.
2. 007 migration'a özel irsaliye UUID/ikinci anahtar/hesap izolasyonu SQL testleri ekle.
3. İrsaliye belirsiz sonuç sorgusunu sağlayıcının güncel resmi API sözleşmesiyle tamamla. `job-runner` şu an yalnız e-fatura/e-arşiv yollarını otomatik doğrular; irsaliye manuel kontrol hatasında kalır. Endpoint/status alanlarını tahmin etme.
4. İrsaliye kurtarmada sürücü/plaka listelerinin görünümünü ve satır toplamlarını görsel kontrol et. API önizleme/satır araması yanıtlarında geç gelen hesap verisini test et.
5. Sonrasında aşağıdaki P0/P1 işlerini sırasıyla sürdür. Sırf bu dosya yazıldı diye geliştirmeyi tamamlanmış sayma.

## 5. Kalan işler — gerçek tamamlanma listesi

### P0: canlıya çıkmadan önce
- [ ] Gerçek erişimlerin kurulması, canlı başlangıç envanteri (hesap/kayıt/bakiye/döviz ayrımı).
- [ ] Şifreli gerçek yedek, izole uyumlu Supabase ortamında geri yükleme ve sayı/toplam karşılaştırması.
- [ ] Gerçek çok bağlantılı PostgreSQL ile 20 eşzamanlı aynı anahtar, farklı içerik, iki sekme sürüm çakışması, yetkisiz hesap testleri.
- [ ] Supabase Vault/RLS/Edge/cron gerçek dağıtım ve doğrulama. Migration'lar 001–015; `schema.sql` canlıda tekrar çalıştırılmaz.
- [ ] Nilvera test hesabında fatura/irsaliye taslak güncelleme, gönderim, satır yuvarlama ve zaman aşımı sonuç doğrulama.
- [ ] Tüm belge yazma biçimlerinde kimlik koruması: model dışında UUID listesiyle ConfirmAndSend/iptal gibi yollar ayrıca değerlendirilmeli.
- [x] Eski istemci sürüm kontrolü (Edge `x-sonvera-client` ≥ 2 + PWA güncelleme bandı; kirli formda zorunlu reload yok). Canlı rollback provası yapılmadı.
- [ ] Canlı anahtar/parola yenileme, Auth yeni kayıtların kapatılması.

### P1: veri ve günlük iş akışları
- [ ] Eski ayların arka planda kontrollü tekrar taranması: mevcut cron ağırlıklı olarak güncel ayı tarıyor; geçmiş arşiv cache TTL'si tek başına yeterli değil.
- [ ] Arşiv kapsama bilgisi: seçilen aralıktaki her belge türü/ay için tamamlanma ve son tarama kanıtı. `ledger_page.complete` şu an bilinçli olarak false.
- [ ] Taslak sürüm çakışması ve sağlayıcı güncelleme semantiği; başka hesapta açılabilecek edit context'i hesaba bağlama.
- [x] Belge listelerinde satır bazlı toplu işlem (taslak, giden, gelen, e-Arşiv, irsaliye giden/gelen). Gerçek sağlayıcıda kısmi başarı/yenileme senaryosu hâlâ saha testi bekler.
- [ ] Fatura gönderim önizleme/özetinin ürün kullanıcısına uygun tamamlanması; ham teknik JSON kullanıcı akışı olmamalı.
- [ ] PDF/dekont anonim örnekleriyle doğruluk testi; düşük güven eşleşme onayı; taranmış/okunamayan PDF'de elle düzeltme uçtan uca.
- [ ] İrsaliye ve fatura liste/oluşturma/dönüşüm/yanıt işlemlerinin ortak güvenilirlik kurallarıyla tam modül testi.
- [ ] Excel dosya adının kullanılan veri dönemiyle eşleşmesi: filtreyi değiştirip aramadan export alma yollarında son başarılı sorgu bağlamını sabitleme gözden geçirilmeli.
- [ ] Şüpheli eski mükerrerleri yalnız raporlama ekranı; kullanıcı doğrulamadan otomatik iptal yok.

### P1/P2: tasarım ve modüllerin tamamlanması
- [ ] Eski müşteri detayları ve çok hesaplı cari ekranlarını ortak React bileşenlerine taşıma.
- [ ] Gelen/giden e-fatura, e-arşiv/GİB e-arşiv, taslak, irsaliye listelerinde ortak tablo/kart/filtre durumları.
- [ ] Müşteri/firma, etiket/şablon, dışa aktarma ve hesaplar ekranlarının ortak bileşenlere taşınması.
- [ ] Mobil filtre paneli, seçili satır çubuğu, detaydan geri dönüşte liste konumu ve sanal klavye kontrolleri.
- [ ] 360/390/430/768/1280/1440/1920, iki tema, %200 yakınlaştırma ve klavyeyle bütün modüllerin testi. Şu an yalnız cari için genişlik otomasyonu var.
- [ ] Gerçek iPhone Safari/Android Chrome ve PWA kurulum/güncelleme testi.
- [ ] Depolama/egress kota ölçümü. Şu an yalnız DB 500 MB göstergesi var; diğer kotayı 0 veya ölçülmüş gibi gösterme.
- [ ] Yedek son başarı durumunu ayarlara bağlama; yerel zamanlanmış yedek görevi ve kullanıcının parola saklama yöntemi.
- [ ] Kullanıcı eylemiyle bildirim izni; özellik desteklenmiyorsa in-app davranış.
- [ ] Hesap/modül bazlı özellik bayrakları ve kontrollü açılış.
- [ ] Karma 100 bin belgeli performans, mobil bellek, ağ gecikmesi ve saha LCP/INP/CLS.
- [ ] Cloudflare yayın, canlı yalnız-okuma duman testi, gerçek günlük kullanım kabulü.

## 6. Test kanıtı ve komutlar

**12 Ekim final tur:** typecheck + **62 Vitest / 16 dosya** + build + lint (0 error) + **11 Playwright** + Deno check geçti. Ölçek testleri (`SONVERA_SCALE`) varsayılan atlandı.

```powershell
npm ci
npm run typecheck
npm run test
npm run build
npm run lint
npm run test:e2e
npx deno check supabase/functions/nilvera/index.ts supabase/functions/job-runner/index.ts
node scripts/benchmark-ledger.mjs
# İsteğe bağlı ağır test:
$env:SONVERA_SCALE='1'
npx playwright test scale.spec.ts
Remove-Item Env:SONVERA_SCALE
```

- Vitest PGlite gerçek SQL motorudur fakat 20 istek aynı motor kuyruğunda; çok bağlantılı PostgreSQL garantisi değildir.
- Vault test adaptörü SQL izin/sözleşmesini doğrular, gerçek Vault şifrelemesini doğrulamaz.
- Playwright test API origin'i `https://sonvera-test.supabase.co`; üretime yazmaz.
- ESLint yalnız belirli JS alanlarını kapsar; React TS `typecheck` ile kontrol edilir. Eski `supabase.js` içinde dört unused uyarısı var. Tüm repo lint temiz denmemeli.
- Build'de üçüncü taraf `use client` directive uyarıları var; build başarılı.
- Sentetik 10 bin/100 bin cari sorgusu ve Excel ölçümleri: docs/PERFORMANCE.md. 100 bin XLSX yaklaşık 22,6 sn; ana iş parçacığı yanıt veriyor. Bu saha INP/SLA değildir.

## 7. Dosya haritası

| Alan | Başlangıç dosyaları |
|---|---|
| React arayüz | src/react/workspace.tsx, src/styles/system.css, DESIGN.md |
| Tahsilat | src/services/tahsilat-manager.js, src/lib/operations.js |
| Para ve bakiye | src/lib/money.js, src/lib/ledger-finance.js |
| API ve hesaplar | src/lib/api-transport.js, src/api/nilvera.js, src/services/account-manager.js |
| Sunucu | supabase/functions/nilvera, supabase/functions/job-runner, supabase/functions/_shared |
| SQL | supabase/migrations/001–015 tarih önekli dosyalar, supabase/verification.sql |
| Arşiv | src/services/invoice-archive.js, src/services/nilvera-fetcher.js |
| Excel | src/lib/export-filename.js, src/services/cari-export.js, src/services/excel-export.js, src/workers/cari-export.js |
| Belge formları | src/pages/invoice-create.js, src/pages/eirsaliye-create.js |
| Dekont | src/pages/toplu-tahsilat.js, src/services/bank-statement-parser.js, src/workers/statement.js |
| PWA/lifecycle | public/sw.js, src/lib/pwa.js, src/lib/page-events.js, src/router.js |
| Yedek/yayın | scripts/backup*.mjs, docs/ROLLOUT.md, wrangler.jsonc, .env.example |

## 8. Çalışma alanını koruma

- Değişiklikler çalışma ağacında; çok sayıda değiştirilmiş ve untracked kaynak dosya var. Commit/push yapıldığı varsayılmasın; `git status` ile bakın.
- **`DEKONTÖRNEKLERİ/` kullanıcı dosyalarıdır; silmeyin/değiştirmeyin/paylaşmayın.** Üretim örnekleri kişisel veri içerebilir; test fixture'ına doğrudan kopyalamayın.
- `.gstack/` yerel geçici script/log içerir; bazı scriptler idempotent değildir, yeniden çalıştırmayın. Token/oturum dosyalarını yazdırmayın. Git'e eklemeyin.
- `test-results/`, `dist/`, `node_modules/` ve backup çıktıları kaynak değişikliği gibi commit edilmez.
- İkinci IDE'ye bütün mevcut proje klasörünü açtırın; yalnız bu MD dosyasını taşımak kod değişikliklerini taşımaz.
- Kullanıcı talimatı: web gezintisinde gstack `/browse` kullanılır. UI planlama/incelemede `/design-consultation`, `/design-html`, `/design-review` kullanılmıştır. Ek UI çalışmalarında mevcut DESIGN.md kurallarını koruyun.
- Bu dosyada hiçbir gizli erişim bilgisi bulunmamalı. Erişim sorulacaksa parola/API anahtarını sohbete yapıştırmasını istemek yerine ilgili hesabında güvenli giriş/ayar akışını kullanın.
