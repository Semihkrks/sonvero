# SonAI sesli iş akışları

SonAI düğmesine dokunmak mikrofonu başlatır. Dinleme, düşünme ve yanıt verme durumları kürede gösterilir. Yazı alanı görünmez. Bir sonuç alındıktan sonra bağlam çipi ve yanındaki “Yeni sohbet” düğmesi görünür; “yeni sohbet” sesli komutu da konuşma bağlamını sıfırlar.

## Örnekler

- “Ne sorabilirim?”, “Tahsilatla ilgili ne sorabilirim?”, “Rapor için örnek ver”, “Son tahsilatı nasıl düzeltebilirim?” Yardım cevapları gerçek yetenek kataloğundan gelir; örnekler işlem başlatmaz ve bekleyen seçimler korunur.
- “Harmanda bize ne kadar borçlu?”, “Harmanda’dan ne kadar alacağımız var?”, “Ayşe hesabında toplam ne kadar alacağımız var?” Müşteri sorusu gerçek bakiye, açık hesap toplamı pozitif müşteri bakiyeleri toplamıdır.
- “Bu ay kaç para topladık?”, “Satış toplamı”, “Alış toplamı”, “En borçlu üç müşteriyi göster.” Tekil müşteri bağlamı devam edebilir; açık tüm/seçili hesap kapsamı önceki müşteriyi taşımaz.
- Rapor hazırlandıktan sonra: “Aynısını geçen ay için”, “sadece satışlar olsun”, “tahsilatları çıkar”, “tahsilatları da ekle.” Bunlar rapor filtreleridir; yeni tahsilat değildir. “Diğer hesabın aynı müşterisi” yalnız tek başka hesap varsa çözülür; birden fazla hesap varsa seçim sorulur.
- “Excel de olsun”, “fotoğrafı çıkar”, “Excel yerine görsel olsun.” Biçim değişikliği mevcut müşteriyi korur. “WhatsApp’a gönderme” hiçbir gönderim yapmaz.
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
- Fatura sorgulama (yalnız okur, arşivdeki TRY faturaları): “Bu ay kaç satış faturası kestik?”, “Harmanda’ya kestiğimiz son fatura ne?”, “Ayşe hesabında eylülde gelen faturalar neler?”, “En büyük fatura hangisi?”, “Tüm hesaplarda geçen ay kaç fatura var?” Ardından “Ya gelenler?”, “Peki geçen ay?” aynı kapsamda devam eder. Müşteri adı geçerse tek hesapta gerçek müşteri kaydı çözülür.
- “Harmanda’ya fatura kes”, “yeni fatura oluştur”: SonAI fatura kesmez; Fatura oluştur ekranını açar, bilgiler orada görülür ve kullanıcı onayıyla kesilir. Fatura iptali/silme/onaylama yapılmaz.

## Konuşma belleği ve takip soruları

SonAI son sonucu (hesap, müşteri, dönem, metrik, rapor biçimi) “bağlam” olarak tutar ve pencerede küçük bir çip olarak gösterir. Eksik takip mesajları yalnız değişen alanı değiştirir:

- “Serkan Bingöl hesabında bu ay tahsilat toplamı ne kadar?” → “Peki geçen ayki?” (aynı hesap ve metrik, Eylül) → “Ya satışlar?” (aynı hesap ve dönem, satış toplamı) → “Peki tüm hesaplarda?”
- “Serkan Bingöl hesabındaki Harmanda bakiyesi ne?” → “Onun bu ayki Excelini hazırla” / “Onu Excel yap” (müşteri ve hesap yeniden sorulmaz) → “Aynı müşteriye 5 bin tahsilat ekle” (yine onay ister).
- Bakiye sonrası yalnız dönem söylenirse (“Peki geçen ay?”) hangi okumanın istendiği düğmelerle sorulur: tahsilat toplamı, satış toplamı veya cari Excel.
- Yeni bir müşteri veya hesap adı geçen, ya da “seçili hesaplar” denen mesajlar bağlamdan tahmin edilmez; normal ayrıştırıcı ve model yorumlar. Hesap değişince önceki müşteri taşınmaz.
- Sohbet aynı sekmede panel kapansa veya ekran değişse de sürer (sessionStorage). 6 saat kullanılmazsa, “yeni sohbet” denince, çipteki “Yeni sohbet” düğmesine basılınca veya oturum kapatılınca silinir. Onay bekleyen tahsilat taslakları ve önizleme metinleri hiç saklanmaz; geri yüklenen eski bir kayıt referansı düzeltme/iptal öncesi yeniden okunur ve açık onay ister.
- Modele son 12 tur rol etiketli, daha eski istekler tek satır özet ve aktif bağlam olarak gider; talimatlar `systemInstruction` içinde, kullanıcı verisinden ayrıdır.

## İşlem kuralları

Yetenekler `services/assistant/capabilities.mjs` içinde on bir grupta tutulur; aynı katalog hem uygulamanın yardım cevaplarını hem modelin sistem bilgilerini besler. Soru örnekleri kapalı bir ezber listesi değildir: müşteri, hesap, tarih, filtre ve biçim alanlarının birleşimleri ayrı senaryolarda doğrulanır. Tüm olası Türkçe cümlelerin kusursuz anlaşılacağı garantisi yoktur.

Banka/kasa, stok, kâr ve vade soruları mevcut araçların kapsamı dışındadır; net hareket kâr diye sunulmaz. Bu sorulardaki sayılar bekleyen tahsilatın tutarı veya raporun müşteri adı olarak tüketilmez. Dönem karşılaştırması için ayrı araç yoktur; birden fazla bağımsız veri sorusu tek sonuçla yapılmış sayılmaz.

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
- `tests/assistant-report-scenarios.test.js`: kısa rapor devamları, kapsam değişikliği, biçimler, seçimler, olumsuz gönderim ve belirsiz dönem senaryoları. Finansal soru/olumsuzluk tabloları `assistant-action-extensions.test.js`, konuşma durumları `assistant-conversation.test.js`, sayfa sınırları `assistant-chat.test.js` içindedir.
- İsteğe bağlı `SONAI_SETTINGS_PATH` ile `node test/interpretation-live.mjs`: mevcut modelde yalnız sentetik komutların yorumunu sınar; kayıt/gönderim oluşturmaz. Normal test paketinde çalışmaz ve API anahtarını çıktıya yazmaz.

Yorumlayıcı Gemini 3.5 Flash-Lite üzerinde `medium` düşünme düzeyi ve 4096 token yanıt bütçesi kullanır. Ücretli alternatif veya yeni sağlayıcıya otomatik geçiş yoktur. Kota dolduğunda açık hata verir. [Modelin düşünme düzeyleri](https://ai.google.dev/gemini-api/docs/thinking) ve [API fiyatlandırması](https://ai.google.dev/gemini-api/docs/pricing) 17 Ekim 2026 tarihinde kontrol edildi; ücretsiz katman kotasına tabidir.

Bu değişiklikler yeni veritabanı migration’ı gerektirmez; mevcut güvenli kayıt/RPC katmanını kullanır. Canlıya alınırken hem frontend hem `services/assistant` sunucusu güncellenmelidir. Yayın durumu ve gerçek test sonuçları `DEVIR-TESLIM.md` dosyasındadır. Testler gerçek finansal kayıt değiştirmez. Dekont işleme, fatura oluşturma/gönderme ve ödeme yapma eklenmedi.
