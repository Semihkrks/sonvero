# SonAI sesli iş akışları

SonAI düğmesine dokunmak mikrofonu başlatır. Dinleme, düşünme ve yanıt verme durumları kürede gösterilir. Yazı alanı ve yeni sohbet düğmesi görünmez; “yeni sohbet” sesli komutu konuşma bağlamını sıfırlar.

## Örnekler

- “Ayşe Karabut hesabından 9.ay satışalış tahsilatdahil Harmanda müşterisinin Excelini ver.” Hesap, dönem, yön, tahsilat ve dosya türü aynı cümleden alınır. Kısa ad gerçek hesap kayıtlarında çözülür; tam unvan/VKN zorunlu değildir. Birden fazla gerçek eşleşme varsa seçim sorulur.
- “Serkan Bingöldeki son eklediğim tahsilatın tutarı yanlıştı, onu 75 bin olarak düzeltir misin?” Seçili hesabın gerçek kayıtları eklenme zamanına göre okunur; sohbetin başında oluşturulmuş olması gerekmez. Son kayıt iptal edilmişse eski kayda sessizce geçilmez. Değişiklik onaya sunulur.
- “Tahsilat düzelt” → kayıt seçimi → “tutar” → yeni miktar. “75 bin, tarihi de dün olsun” her iki bilgiyi tek yanıtta verir; sonraki soru için söylenen bilgiler korunur. Sıra numarası ve VKN tutar olarak yorumlanmaz.
- “Bugün Serkan Bingöl hesabındaki Harmanda müşterisine 60 bin tahsilat ekle.”
- “Harmanda müşterimiz.” Gerçek müşteri seçildikten sonra “buna 2k daha ekle” veya “aynı müşteriye iki bin daha tahsilat ekle”: kimlik yeniden sorulmadan bugün için yeni bir tahsilat hazırlanır ve onay istenir. “2*k” gibi belirsiz tutarlarda yalnız tutar tekrar sorulur.
- Onaydan önce: “60 değil 65 bin olsun”, “bugüne değil düne yaz”, “Serkan değil Mustafa Yılmaz olsun.”
- “Serkan Bingöl hesabındaki Harmanda bakiyesi ne?” Ardından: “Peki bu ay ne kadar tahsilat yapmışız?”, “Peki satışı ne kadar?”
- “Bugün toplam ne topladık?”, “Tüm hesaplarda bugün toplam ne topladık?”, “Bu ay en çok borcu olan beş müşteri kim?”
- “Serkan’ın satışından tahsilatını çıkar.” Bu hesaplama satış eksi tahsilattır. Genel “net durum” satış eksi alış eksi tahsilattır.
- “Az önce eklediğim tahsilatı 65 bin olarak düzelt”, “az önce eklediğim tahsilatı iptal et.”
- “En son eklediğim tahsilat ne?”, “Hangi tahsilatı ekledim?” gerçek kayıtları eklenme zamanına göre okur; yeni tahsilat oluşturmaz. “Harmanda’nın son tahsilatı” müşteriyle sınırlar. Hesap belirsizse hesap sorulur.
- “Bugün Serkan Bingöl hesabındaki Harmanda’ya 60 bin, Cihan’a 20 bin tahsilat ekle.” Her kayıt ayrı onaylanır; en fazla 10 istek sıraya alınır.
- “Giden faturaları aç.” Ekran açma, fatura düzenleme veya gönderme işlemi değildir.

## İşlem kuralları

Hesap, müşteri, tutar ve tarih gösterildikten sonra “onaylıyorum” veya “kaydet” komutu ilgili tek işlemi yürütür. “İptal” bekleyen taslağı ve kalan sırayı kapatır; tamamlanmış kayıtları geri almaz. Tahsilat iptali gerçek kaydın kimliği ve sürümüyle geçmişi koruyarak yapılır. Hesap veya müşteri başka bir kayıtla değiştirilmez; kayıt iptal edilip yeni bir tahsilat oluşturulur.

Hesap belirtilmiş ama bulunamamışsa önceki hesaba geri düşülmez. Birden fazla müşteri veya tahsilat varsa seçim istenir. Tutarlar gerçek konuşmadan doğrulanır; modelin tutar tahmini kullanılmaz. Belirsiz kayıt sonucunda aynı değişmez bilgilerle tekrar kontrol edilir, sıradaki işe geçilmez. Başka sekmede değişmiş tahsilat güncel sürümüyle tekrar okunup yeniden onaylanır.

Hesap, müşteri, dönem ve son doğrulanmış tahsilat bağlamı yalnız açık konuşmada tutulur. Yeni sohbet ve paneli kapatma bu belleği temizler. Özetler kayıt servislerinde Decimal ile hesaplanır; arşiv geçmişinin tamlığı ve hariç tutulan hareketler yanıtta belirtilir. Bir özet yanıtı canlı banka bakiyesi garantisi değildir.

## Sesli yanıt

Tarayıcının/cihazın `speechSynthesis` özelliği kullanılır; yeni bir ücretli API veya sağlayıcı eklenmez. Varsa yerel Türkçe ses seçilir; ses listesinde Türkçe bulunamazsa platforma `tr-TR` dil isteği iletilir. Yanıt sırasında mikrofon duraklatılır; bitince ses kuyruğu bırakılır, kısa bekleme sonrası mikrofon ses grafiği yeniden bağlanır. İşletim sistemi canlı mikrofonu sessize almışsa sorunlu akış yenilenir; normal sessizlik izin isteğini tekrarlamaz. Kalıcı sessize alma bir kez kurtarılıp başarısızsa açık hata gösterilir. Küreye veya “Araya gir” düğmesine dokunarak yanıt kesilip hemen dinlemeye geçilebilir. Genel yanıtlar kısa okunur; finansal onay bilgileri korunur, tam metin ekranda kalır. Konuşma desteklenmez veya başarısız olursa metin yanıtı kalır. Gerçek iPhone/PWA ses ve izin davranışı cihazda ayrıca doğrulanmalıdır.

Küredeki beş çizgi sessizlikte eşit ve kısadır. Konuşma algılanınca farklı ritimlerle hareket eder; tek tek frekans bantlarına bağlı değildir. Düşünürken dönen noktalara dönüşür. Azaltılmış hareket tercihinde animasyonlar kapanır.

## Doğrulama ve yayın

- `npm run check`: tip kontrolü, birim/entegrasyon testleri ve production build.
- `npm run lint`: mevcut ESLint kapsamı.
- `npx playwright test tests/e2e/sonai.spec.ts`: sahte dış servislerle gerçek tarayıcıda mikrofon başlangıcı, responsive arayüz, düzeltme/özet/iptal, sıra ve belirsiz sonuçta aynı işlem kimliği.
- `services/assistant` içinde `npm test`: servis doğrulama testleri.
- İsteğe bağlı `SONAI_SETTINGS_PATH` ile `node test/interpretation-live.mjs`: mevcut modelde yalnız sentetik komutların yorumunu sınar; kayıt/gönderim oluşturmaz. Normal test paketinde çalışmaz ve API anahtarını çıktıya yazmaz.

Yorumlayıcı Gemini 3.5 Flash-Lite üzerinde `medium` düşünme düzeyi ve 4096 token yanıt bütçesi kullanır. Ücretli alternatif veya yeni sağlayıcıya otomatik geçiş yoktur. Kota dolduğunda açık hata verir. [Modelin düşünme düzeyleri](https://ai.google.dev/gemini-api/docs/thinking) ve [API fiyatlandırması](https://ai.google.dev/gemini-api/docs/pricing) 17 Ekim 2026 tarihinde kontrol edildi; ücretsiz katman kotasına tabidir.

Bu değişiklikler yeni veritabanı migration’ı gerektirmez; mevcut güvenli kayıt/RPC katmanını kullanır. Canlıya alınırken hem frontend hem `services/assistant` sunucusu güncellenmelidir. Yayın durumu ve gerçek test sonuçları `DEVIR-TESLIM.md` dosyasındadır. Testler gerçek finansal kayıt değiştirmez. Dekont işleme, fatura oluşturma/gönderme ve ödeme yapma eklenmedi.
