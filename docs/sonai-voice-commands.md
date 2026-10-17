# SonAI sesli iş akışları

SonAI düğmesine dokunmak mikrofonu başlatır. Dinleme, düşünme ve yanıt verme durumları kürede gösterilir. Yazı alanı ve yeni sohbet düğmesi görünmez; “yeni sohbet” sesli komutu konuşma bağlamını sıfırlar.

## Örnekler

- “Bugün Serkan Bingöl hesabındaki Harmanda müşterisine 60 bin tahsilat ekle.”
- “Harmanda müşterimiz.” Gerçek müşteri seçildikten sonra “buna 2k daha ekle” veya “aynı müşteriye iki bin daha tahsilat ekle”: kimlik yeniden sorulmadan bugün için yeni bir tahsilat hazırlanır ve onay istenir. “2*k” gibi belirsiz tutarlarda yalnız tutar tekrar sorulur.
- Onaydan önce: “60 değil 65 bin olsun”, “bugüne değil düne yaz”, “Serkan değil Mustafa Yılmaz olsun.”
- “Serkan Bingöl hesabındaki Harmanda bakiyesi ne?” Ardından: “Peki bu ay ne kadar tahsilat yapmışız?”, “Peki satışı ne kadar?”
- “Bugün toplam ne topladık?”, “Tüm hesaplarda bugün toplam ne topladık?”, “Bu ay en çok borcu olan beş müşteri kim?”
- “Serkan’ın satışından tahsilatını çıkar.” Bu hesaplama satış eksi tahsilattır. Genel “net durum” satış eksi alış eksi tahsilattır.
- “Az önce eklediğim tahsilatı 65 bin olarak düzelt”, “az önce eklediğim tahsilatı iptal et.”
- “Bugün Serkan Bingöl hesabındaki Harmanda’ya 60 bin, Cihan’a 20 bin tahsilat ekle.” Her kayıt ayrı onaylanır; en fazla 10 istek sıraya alınır.
- “Giden faturaları aç.” Ekran açma, fatura düzenleme veya gönderme işlemi değildir.

## İşlem kuralları

Hesap, müşteri, tutar ve tarih gösterildikten sonra “onaylıyorum” veya “kaydet” komutu ilgili tek işlemi yürütür. “İptal” bekleyen taslağı ve kalan sırayı kapatır; tamamlanmış kayıtları geri almaz. Tahsilat iptali gerçek kaydın kimliği ve sürümüyle geçmişi koruyarak yapılır. Hesap veya müşteri başka bir kayıtla değiştirilmez; kayıt iptal edilip yeni bir tahsilat oluşturulur.

Hesap belirtilmiş ama bulunamamışsa önceki hesaba geri düşülmez. Birden fazla müşteri veya tahsilat varsa seçim istenir. Tutarlar gerçek konuşmadan doğrulanır; modelin tutar tahmini kullanılmaz. Belirsiz kayıt sonucunda aynı değişmez bilgilerle tekrar kontrol edilir, sıradaki işe geçilmez. Başka sekmede değişmiş tahsilat güncel sürümüyle tekrar okunup yeniden onaylanır.

Hesap, müşteri, dönem ve son doğrulanmış tahsilat bağlamı yalnız açık konuşmada tutulur. Yeni sohbet ve paneli kapatma bu belleği temizler. Özetler kayıt servislerinde Decimal ile hesaplanır; arşiv geçmişinin tamlığı ve hariç tutulan hareketler yanıtta belirtilir. Bir özet yanıtı canlı banka bakiyesi garantisi değildir.

## Sesli yanıt

Tarayıcının/cihazın `speechSynthesis` özelliği kullanılır; yeni bir ücretli API veya sağlayıcı eklenmez. Varsa yerel Türkçe ses seçilir; ses listesinde Türkçe bulunamazsa platforma `tr-TR` dil isteği iletilir. Yanıt sırasında mikrofon duraklatılır; bitince yeniden dinlenir. Küreye dokunarak yanıt kesilebilir. Konuşma desteklenmez veya başarısız olursa metin yanıtı kalır. Gerçek iPhone/PWA ses ve izin davranışı cihazda ayrıca doğrulanmalıdır.

## Doğrulama ve yayın

- `npm run check`: tip kontrolü, birim/entegrasyon testleri ve production build.
- `npm run lint`: mevcut ESLint kapsamı.
- `npx playwright test tests/e2e/sonai.spec.ts`: sahte dış servislerle gerçek tarayıcıda mikrofon başlangıcı, responsive arayüz, düzeltme/özet/iptal, sıra ve belirsiz sonuçta aynı işlem kimliği.
- `services/assistant` içinde `npm test`: servis doğrulama testleri.

Bu değişiklikler yeni veritabanı migration’ı gerektirmez; mevcut güvenli kayıt/RPC katmanını kullanır. Canlıya alınırken hem frontend hem `services/assistant` sunucusu güncellenmelidir. Bu çalışma kapsamında canlı deployment veya gerçek finansal kayıt değişikliği yapılmadı. Dekont işleme, fatura oluşturma/gönderme ve ödeme yapma eklenmedi.
