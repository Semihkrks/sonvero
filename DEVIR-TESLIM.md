# Sonvera — devir teslim ve yapılacaklar

## 19 Ekim — SonAI konuşma belleği, takip soruları ve premium küre

- Kök neden (çok turlu testlerle kanıtlandı, ilk halde 9 senaryonun 7'si düşüyordu): son yanıtın konusu tutulmuyordu; “peki geçen ayki?”, “ya satışlar?”, “onu Excel yap” rapor akışına düşüp müşteri/ay soruyordu. “geçen ayki/bu ayki” ekleri tanınmıyordu. Panel her açılışta sıfırlanıyor, ekran değişince kapanıyor, hiçbir şey saklanmıyordu. Modele son 8 kayıt (ilki karşılama) gidiyor, aktif konu gitmiyordu. Ek hata: “X hesabında bu ay tahsilat toplamı” cümlesinde “bu ay” müşteri sanılıyordu.
- Yeni `src/lib/assistant-memory.js`: rol etiketli tur belleği (modele son 12 tur + eski isteklerin özeti), aktif konu, sekme bazlı sessionStorage (6 saat boşta kalınca, “yeni sohbet”, çipteki düğme veya oturum kapatma/kullanıcı değişimi ile silinir — `operations.js` `clearPrivateStorage`). `resolveFollowUp` eksik takipleri son konuya göre çözer; yeni müşteri/hesap adı, eşleşmeyen hesap adı parçası veya “seçili hesaplar” varsa normal ayrıştırıcıya bırakır. Bakiye sonrası yalnız dönem söylenirse düğmeli netleştirme sorar.
- `assistant-business.js`: konu kaydı (`onTopic`), `execute`, `snapshot/restore`. Onay bekleyen taslaklar ve önizleme metinleri saklanmaz; her yazma yine açık onay ister. Son tahsilat sorusunun konusu sorulan kapsamı saklar; gösterilen kayıt “onu düzelt” referansı olur. Dönemler “Eylül 2026” biçiminde yazılır.
- `assistant.js`: oturum geri yükleme (bozuk şema temizlenir), bağlam çipi + “Yeni sohbet”, modele zengin bağlam (topic, conversation, earlier), kapanmış paneldan geç yazma engeli, bağlama uygun yardım cevabı.
- Sunucu: `interpretation.mjs` `buildInterpretRequest` talimatları `systemInstruction` olarak verinin dışına ayırır, BAĞLAM KULLANIMI kuralları eklendi; `server.mjs` bunu kullanır; `capabilities.mjs` konuşma yeteneği güncellendi. **Oracle'a dağıtılmadı** (onay gerekir; `scripts/deploy-assistant.mjs` `capabilities.mjs` dosyasını zaten kopyalıyor).
- Arayüz: küçük pencere düzeni korundu. Küre tek ışık kaynaklı katmanlı yapıya geçti (aura, dinlemede ses seviyesine bağlı dalga halkaları, düşünmede dönen hale, konuşmada nabız, iç sıvı ışık, kenar ışığı, parlama); açık/koyu tema, mobil, azaltılmış hareket, odak halkaları. Önceki oturumun istediği çizgi davranışı (e2e sözleşmesi) aynen korundu. Pencere: tonlu cam yüzey, tutarlı gölge, yumuşak giriş.
- Testler: yeni `tests/assistant-memory.test.js` (12 sayfa senaryosu: dönem/metrik/hesap devri, bakiyeden Excel, rapordan tahsilat + onay, zamir, panel kapat-aç, modele giden geçmiş, yeni sohbet, taslak saklanmaması, kapanış sonrası yazmama, son tahsilat kapsamı), `tests/assistant-memory-unit.test.js` (30), `services/assistant/test/interpretation.test.mjs` (3). `assistant-conversation.test.js` tarihe bağlı 9 testi 17 Ekim'e sabitlendi; `assistant-chat.test.js` testler arası sessionStorage temizliği.
- Doğrulama: Vitest 33 dosya/436 test, typecheck, build başarılı; lint 0 hata/4 eski uyarı; servis testleri 18/18; Playwright 24 geçti/2 atlandı (ölçek testi yalnız `SONVERA_SCALE=1` ile çalışır). Fikstür sayfasında gerçek Chromium ile çok turlu sohbet ve panel kapat-aç doğrulandı, masaüstü/mobil × açık/koyu × dört durum ekran görüntüleri alındı. Codex (gpt-6.1-sol) bağımsız inceleme: onaysız yazma yolu yok; bildirilen 10 bulgu düzeltildi ve testlendi.
- Ek kapsam (aynı gün): yeni salt okunur fatura aracı — `readAssistantInvoices` (`assistant-ledger.js`, `ledger_page` üzerinden satış/alış sayısı, toplam, son/en büyük fatura) ve `src/lib/assistant-invoices.js` ayrıştırıcısı; iş asistanında `invoices` eylemi ve “ya gelenler?/peki geçen ay?” takipleri. “Fatura kes/oluştur” yalnız Fatura oluştur ekranını açar (SonAI fatura kesmez); fatura iptal/silme/onay reddedilir. Sunucu şeması/doğrulaması `invoices` eylemini kabul eder; katalog 11 gruba çıktı. Kullanıcı küre görünümünü beğendi, yalnız düşünme evresi değişti: beş çizgi ortalı halkada yuvarlak, kuyruklu noktalara dönüşür ve hale ile aynı 1.25 sn yumuşak ritimde döner (e2e sözleşmesi korunur). Sohbet alanında son yanıtın üstünde önceki istek “Sen: …” olarak soluk görünür. Yeni `tests/assistant-invoices.test.js` (17). Son doğrulama: Vitest 34 dosya/453 test, typecheck, build, lint 0 hata, servis 18/18, Playwright 24 geçti/2 atlandı.
- Kalan: Oracle dağıtımı, commit/push (kullanıcı onayı), gerçek Gemini ile canlı çok turlu kontrol, fiziksel iPhone. `.claude/launch.json` içine fikstür sunucusu (`sonai-fixture`, port 5180) eklendi. Kullanıcıya ait `SONVERA-TAM-SISTEM-REHBERI.md` dokunulmadı.

## 17 Ekim — doğal konuşmada rapor ve tahsilat düzeltme

- ECC error-handling rehberiyle rapor yorumu, konuşma durumu ve finansal kayıt seçimi birlikte düzeltildi; bağımsız kod incelemesi bulguları regresyon testleriyle giderildi. “Ayşe Karabut hesabından 9.ay satışalış tahsilatdahil Harmanda müşterisinin excelini ver” tek hesapta kısa müşteri adıyla Excel hazırlar. Eksik/belirsiz hesap önceki hesaba düşmez; müşteri yalnız seçilen hesapların gerçek hareketlerinde çözülür. Gerçek isimler (Alışan, Verdi vb.) komut sözcüğü gibi budanmaz.
- Bu ay/geçen ay ve açık tarih aralıkları tanınır. Bir yanıttaki müşteri, dönem, yön ve tahsilat bilgileri birlikte korunur; açık gün aralığı tüm aya genişletilmez. Müşteri bulunamazsa sesli yeniden deneme sorusu çıkar; diğer filtreler korunur. Rapor yanıtı yeni müşteri tanıtma veya tahsilat alanı olarak tüketilmez.
- “Son eklediğim tahsilatı 75 bin olarak düzeltir misin” seçilen hesabın kalıcı kayıtlarında eklenme zamanını kullanır. Açık müşteri kapsamı korunur; hesap değişince eski sohbet kaydına dönülmez; son kayıt iptalse eski aktif kayıt değiştirilmez. “Tutar” seçimi yeni miktarı sorar; tutar ve tarih tek yanıtta işlenir. Sayısal sıra/VKN tutar sayılmaz; virgül “75 bin” ifadesini 75 TL'ye düşürmez. Yazma öncesi gerçek kayıt, sürüm ve açık onay korunur.
- Mevcut Gemini 3.5 Flash-Lite, `medium` düşünme ve 4096 token bütçesiyle kullanılır; yeni sağlayıcı veya ücretli alternatif yok. Dört sentetik komut canlı modelde doğrulandı (rapor, kalıcı son kayıt düzeltme, son kayıt sorgusu, çok alanlı rapor devamı). Anahtar çıktıya yazılmadı; finansal kayıt/gönderim yapılmadı.
- Doğrulama: `npm run check` 30 dosya/281 test, typecheck ve build başarılı; 15 servis testi başarılı; lint 0 hata/4 mevcut uyarı. 12 Chromium senaryosu son kaynaklarla başarılı; Excel indirme, kalıcı son kayıt düzeltme, mobil boyutlar ve mikrofon geri dönüşü kontrol edildi. Bağımsız incelemede bulunan kayıt kapsamı/tutar/tarih hataları kapatıldı. Fiziksel iPhone ve girişli gerçek finansal işlem denenmedi.
- Oracle `conversation-20261017` imajıyla güncellendi; önceki kaynak/imaj `before-conversation-20261017` adıyla korundu. Yeniden başlatma öncesi aktif gönderim 0; çalışan kaynak SHA256 değerleri yerelle aynı. Servis active/running, NRestarts=0, HTTPS health 200, kimliksiz status 401, WhatsApp ready. Ortam ve oturum korundu. Frontend GitHub main push'uyla Vercel'e gider; kullanıcıya sonuç bildirilmeden commit deployment durumu ve canlı kaynak doğrulanır. Kullanıcıya ait `SONVERA-TAM-SISTEM-REHBERI.md` dahil edilmedi.

## 17 Ekim — konuşma sırası, son tahsilat sorgusu ve küre düzeltmesi

- Kullanıcı kürede M biçimi oluşturan çizgileri, sesli yanıt sonrası mikrofonun ses alamamasını ve son tahsilat sorusunun yeni kayıt isteğine dönüşmesini bildirdi; düzeltme ve doğrudan push/yayın istedi. ECC `make-interfaces-feel-better` rehberiyle çakışan eski çizgi kuralları temizlendi. Sessizlikte eşit kısa çizgiler, konuşma algılanınca frekanstan bağımsız farklı ritimler, düşünürken dönen noktalar korunur; azaltılmış hareket tercihi desteklenir.
- TTS bittiğinde oynatma kuyruğu kapanır, 180 ms sonra sağlıklı mikrofonun ses grafiği yeniden kurulur. OS tarafından muted kalan canlı track yenilenir; sonradan oluşan mute bir kez kurtarılır, kalıcı başarısızlık açıkça gösterilir. Normal sessizlik yeniden izin istemez. Kapalı AudioContext grafiği yeniden bağlanır. Küre veya “Araya gir” konuşmayı kesip dinlemeye döner; keserken sessiz TTS yeniden başlatılmaz. Geç gelen callback ve kapanış korumaları testlidir.
- “En son eklediğim tahsilat ne?” ve “Hangi tahsilatı ekledim?” gerçek kaydı eklenme zamanına göre okur; geçmiş zamanlar oluşturma komutu sayılmaz. Hesap/müşteri kapsamı, iptal bilgisi, belirsiz hesap seçimi ve onay bekleyen taslağın korunması testlidir. Sabit örnek tutarlar kaldırıldı; sesli sohbetin model yanıtı hazır tanıtımla değiştirilmez. Genel cevaplar kısa okunur; finansal onay ayrıntıları tam korunur.
- Doğrulama: `npm run check` 30 dosya/229 test, typecheck ve build başarılı; 15 servis testi ve 10 gerçek Chromium senaryosu başarılı. Lint 0 hata/4 mevcut uyarı; diff kontrolü temiz. Mobil/açık/koyu ekran görüntüleri incelendi. Kod incelemesinde doğrulanmış engelleyici hata bulunmadı. iPhone donanımı ve girişli canlı finansal işlem test edilmedi; simülasyon gerçek cihazdaki düzelmeyi garanti etmez.
- Oracle servisi `voice-turn-20261017` imajıyla güncellendi; önceki imaj/kaynaklar `before-voice-turn-20261017` olarak saklandı. Çalışan kaynak hash'leri yerelle aynı, servis active/running ve NRestarts=0; HTTPS health 200, kimliksiz status 401, WhatsApp ready. Ortam/ayarlar/oturum korundu, gerçek mesaj veya tahsilat oluşturulmadı. Frontend aynı değişikliklerle GitHub `main` üzerinden Vercel'e yayınlanıyor; kullanıcıya sonuç bildirmeden deployment durumu kontrol edilir.

## 17 Ekim — SonAI sunucusu da yayınlandı

- Kullanıcının açık yayın talebiyle `864ed98` sürümünün `server.mjs` ve `validation.mjs` dosyaları Oracle asistan servisine dağıtıldı. Önceki kaynaklar `/home/opc/sonvera/releases/before-864ed98/`, önceki container imajı `localhost/sonvera-assistant:before-864ed98` olarak saklandı. Yeni imaj `localhost/sonvera-assistant:release-864ed98`; çalışan `:1` etiketi bu imaja bağlı.
- Mevcut systemd birimi, özel ayarlar, ortam dosyaları, veri dizini ve WhatsApp oturumu korundu. Yeniden başlatmadan önce aktif gönderim sayısı 0 doğrulandı. Finansal kayıt veya gerçek mesaj oluşturulmadı.
- 14 servis testi başarılı; yeni imajda iki dosyanın sözdizimi ve SHA256 eşitliği doğrulandı. Yayın sonrası servis active/running, NRestarts=0, HTTPS `/health` 200, kimliksiz `/status` 401, `sonvera.com.tr` CORS ön kontrolü 204 ve WhatsApp runtime `ready` doğrulandı. Frontend önceki GitHub push'uyla Vercel'de tamamlandı; canlı manifest/yeni ikonlar 200.
- Aşağıdaki ayrı sunucunun yayın beklediği notu giderildi. Yetkili canlı müşteriyle uçtan uca işlem ve fiziksel iPhone/PWA mikrofon testi yapılmadı; bunlar hâlâ doğrulanmamış durumda.

## 17 Ekim — SonAI bağlamı ve PWA kurulumu

- SonAI gerçek müşteri seçildikten sonra aynı açık sohbette hesap/müşteri/dönem bağlamını kullanır. “Harmanda müşterimiz” ardından “buna 2k daha ekle” yeni 2.000 TL tahsilat taslağıdır; tekrar kimlik sormaz, kaydetmeden onay ister. Belirsiz `2*k` tutarında yalnız tutar sorulur. Panel kapanınca/yeni sohbet komutunda bağlam temizlenir.
- Tahsilat düzeltme/iptal, sırayla ayrı onaylanan çoklu tahsilat, gerçek kayıtlardan özetler ve cihazın ücretsiz konuşma özelliği eklendi. Fatura oluşturma, dekont ve ödeme araçları eklenmedi. Ayrıntı: `docs/sonai-voice-commands.md`.
- Kullanıcı gerçek native uygulama istemediğini netleştirdi. Capacitor/native bağımlılık veya iOS/Android projesi kurulmadı. PWA korunuyor.
- Canlı `sonvera.com.tr` HTML, manifest ve ikon uçları salt okunur kontrol edildi: PNG ikonlar 200 ve yerelle birebir aynı. Telefonda düz harf görülmesinin kesin nedeni cihazda doğrulanamadı; eski kısayol/ikon önbelleği olası. Apple touch ve manifest PNG ikonları yeni sürümlü `/icons/sonvera-*-v2.png` adreslerine bağlandı; uygulama manifest kimliği `/` korundu.
- Ayarlar’a ana ekran kurulum durumu, iPhone adımları ve mikrofon izni açıklaması eklendi. İzin talebi ayarlarda veya uygulama açılışında kendiliğinden yapılmaz; SonAI dokunuşu başlatır. Tam kapanıştan sonra iOS'un yeniden izin sorması uygulama koduyla garanti edilerek kaldırılamaz; WebKit 280394 hâlâ açık: https://bugs.webkit.org/show_bug.cgi?id=280394.
- Service worker kurulumda zorla devralmaz; mevcut formlar/finansal işlemler/SonAI açıkken otomatik yeniden yükleme ertelenir. Yalnız kendi eski shell cache'lerini temizler. PWA yükleme düğmesi destekleyen tarayıcıda yalnız kullanıcı dokunuşuyla çalışır; iPhone için Safari paylaş menüsü yönergesi gösterilir.
- Kullanıcı GitHub push ve bağlı Vercel otomatik yayınını istedi; SonAI/PWA değişiklikleri `main` için hazırlandı. Kontroller: 204 istemci testi, typecheck/build, 14 servis testi ve 8 tarayıcı senaryosu başarılı; lint hata yok (4 mevcut uyarı). Gerçek finansal kayıt değişikliği ve fiziksel iPhone testi yapılmadı. Ayrı çalışan `services/assistant` sunucusu GitHub/Vercel frontend push'uyla güncellenmez; tam özellikler için ayrıca yayın bekler. Fiziksel iPhone ikon/yeniden açılış/mikrofon izin kontrolü açık iş olarak kalır. Önceden duran `SONVERA-TAM-SISTEM-REHBERI.md` bu commit kapsamına alınmadı.

## 17 Ekim — canlı yazı geri alındı

- Kullanıcı, canlı konuşma tanıma sonrasında mikrofonun yeniden çalışmadığını bildirdi ve özelliğin kaldırılmasını istedi. Web Speech/native tanıyıcı yolu, mod seçimi ve ilgili servis kaldırıldı. Tüm tarayıcılar önceki tek MediaRecorder + AudioContext akışını kullanır; metin kayıt çözümlendikten sonra görünür.
- AudioContext ilk dokunuşta yeniden açılır; tarayıcıda SpeechRecognition bulunması bu adımı atlatmaz. Mavi görünüm, animasyonlar, sesli seçim, toplu müşteri Excel’i ve WhatsApp gönderimi korunur.
- Ardışık üç kaydın tek mikrofon izniyle alınması, yerel konuşma tanıyıcısının hiç açılmaması ve çözümleme hatasından sonra sonraki komutun işlenmesi regresyon testlerinde kontrol edilir. Fiziksel iPhone testi bu ortamda yapılmadı.

## 17 Ekim — konuşma sırasında canlı yazı

- Önceki iOS Web Speech engeli kaldırıldı. `SpeechRecognition`/`webkitSpeechRecognition` destekleniyorsa tek yerel konuşma tanıyıcı mikrofonun sahibi olur; paralel MediaRecorder başlatılmaz. Türkçe `interimResults` konuşma devam ederken ekrana doğrudan yazılır. Ara sonuçlar komut çalıştırmaz; yalnız bitişte tek final metin niyet/gönderim akışına girer.
- Tarayıcının düzelttiği ara kelimeler güncellenir; kapanmış panelin eski olayları atılır. Sessizlik/bitiş/izin-hata zamanlayıcıları kapatılır. Destek yoksa eski kayıt yolu kalır ve durum metni kayıt-sonrası çözümlemeyi açıkça belirtir. Bu destek sınırlaması uygulamadan aşılamaz.
- Görünüm ve mavi küre değişmedi. Canlı harfler CSS ile yumuşakça açılır; metnin görünmesi için JS yazma kuyruğu/cümle sonu beklenmez.
- Typecheck, 107 frontend testi ve üretim buildi geçti. Yerel olaylarla canlı metin/final ayrımı, tek mikrofon yolu, geç gelen olaylar ve izin hataları testli. Tarayıcı otomasyonu hareketli mikrofon düğmesine tıklamada takıldığı için gerçek tarayıcı/cihaz mikrofon testi tamamlanmadı. Fiziksel iPhone testi ve gerçek WhatsApp mesajı yapılmadı.

## 17 Ekim — tüm müşterilerin Excel’i ve küre animasyonu

- “Ayşe Karabut’un 9. ayki müşterilerin Excelini getir” seçili hesabın; “9. ayın tüm müşterilerinin Excelini ver” mevcut hesap seçiminin dönem hareketlerini tek Excel’de hazırlar. `allCustomers` açıkça modellenir; müşteri seçim sorusu atlanır. 9.ayki/9.ayın çekimleri tanınır. Yeni tek-müşteri isteği toplu modu kapatır.
- Ortak `exportAllTransactions` kullanılır: müşteri özeti, müşteri detayları ve hesap sayfaları. Toplu Excel’de 6-müşteri sınırı yok; kesmeden tek dosya üretilir. Fotoğraflı paket sınırı korunur. WhatsApp durum servisi ulaşılamazsa Excel yine hazırlanır; gönderim devre dışıdır.
- Eski yuvarlak mavi görünüm korunur. Dinlemede ses seviyesine bağlı ışık, düşünmede/gönderimde dönen ince halka vardır; azaltılmış hareket tercihinde ek animasyonlar kapanır.
- Doğrulama: 101 frontend testi, typecheck ve 11 servis testi geçti. 9 müşterilik gerçek Excel dosyası açılarak tüm isimlerin özette olduğu doğrulandı. Gerçek müşteri verisi/WhatsApp mesajı ile test yapılmadı.

## 17 Ekim — SonAI, sesli seçim ve gönderim biçimi

- Görünüm son kullanıcı düzeltmesiyle önceki kompakt, yuvarlak mavi orb tasarımına geri döndü. Başlık/yeni sohbet ve sohbet balonları görünmez; yalnız son cevap ortada gösterilir. Konuşma altyazısı ve cevaplar harf harf açılır. SonAI adı/simgesi, hizalı kapatma düğmesi ve yeni işlevler korunur.

- Asistan SonAI olarak adlandırıldı; navbar ve mobil gezinmede yeni S şerit simgesi var. Kullanıcının son talimatıyla yazı alanı görünmez: konuşma, canlı/çözümlenmiş altyazı, sohbet mesajları ve dinleme/düşünme/gönderim durumları bulunur.
- “İlki olsun / ikincisini seç” yalnız o an gösterilen müşteri listesini seçer. Önizlemedeki “WhatsApp’a gönder” sesli onaydır; yeni müşteri/dönem içeren komut eski raporu yanlışlıkla göndermez. Selamlaşma ve kısa sohbet rapor taslağını korur. Model yetkileri mevcut rapor araçlarıyla sınırlıdır.
- Excel / fotoğraf / ikisi de seçimi gerçek dosya üretimini ve gönderim paketini belirler. Gönderim başladıktan sonra biçim kilitlenir; belirsiz sonuçta tekrar aynı iş kimliğiyle kontrol edilir.
- iOS’ta MediaRecorder ile paralel Web Speech başlatılmaz. Kullanıcı dokunuşunda AudioContext açılır; eski/bitmiş akışın grafiği yeniden oluşturulur. Panel kapanırken kayıt ve dinleme durur, akış devre dışı bırakılır. Hızlı yeniden açmada izin istemeyi azaltmak için devre dışı akış en fazla 30 sn tutulur, sonra veya uygulama arka plana geçince bırakılır. Kapanıştan sonra gelen izin/yanıt eski paneli başlatamaz.
- Fiziksel iPhone/PWA testi yapılmadı. Uygulama tamamen kapanıp açıldığında izin kalıcılığı iOS kontrolündedir. iOS’ta metin ses çözümlendikten sonra animasyonla gösterilir; desteklenen diğer tarayıcılarda Web Speech canlı altyazıyı sağlar.
- Doğrulama: 92 frontend testi, typecheck, üretim buildi ve 10 servis testi geçti. 390×844 mobil görünümde yatay taşma/yazı alanı yok; açık/koyu görünüm kontrol edildi. Bu tur gerçek WhatsApp mesajı gönderilmedi.

## 15 Ekim — gerçek WhatsApp teslimi, sesli panel ve dönem bakiyesi

- Bu bölüm aşağıdaki eski oturum notlarının son durumudur. Kullanıcı iki müşteri verisiz test dosyasının gönderilmesine açıkça izin verdi. `sonvera-baglanti-testi.xlsx` ve `.png` gerçek WhatsApp sohbetine gönderildi; ikisi için önce ack=2 (teslim), sonra ack=3 (okundu) doğrulandı. Tekrar göndermeyin. SAFE/test-whatsapp.mjs gerçek gönderim yapar, idempotent değildir.
- Kök neden: yeni WhatsApp Web medya modeli iç kimlik alanlarını taşıyordu; whatsapp-web.js bunları mesaj modeline kopyalayınca kimlik hatası veriyordu. `wa-compat.mjs` yalnız medya verisini aktarır. Tam sohbet serializer'ı yerine ham teslim metadatası okunur; yeni mesaj kimliklerinde `_serialized` yoksa String(id) kullanılır. sendSeen=false. Üretim servisine dağıtıldı; yeniden başlatma sonrası bağlantı ready, uyumluluk yaması etkin, /health 200 ve kimliksiz /status 401 doğrulandı. Aynı gönderim işiyle tekrar kontrol etme/eksik dosyayı tamamlama korunur.
- Görseldeki bakiye artık seçili dönem satış − alış − tahsilat toplamıdır. Ekranda gösterilmeyen arşiv açılışı eklenmez; dönem tarihleri görselde belirtilir. Kısmi filtreler “Dönem neti” olarak kalır. Açılış sorgusu kaldırıldığı için önizleme daha az istek yapar.
- Navbar asistanı Siri/ChatGPT tarzı ses panelidir. Başlık, yeni sohbet, bağlantı/ayarlar, rapor filtreleri ve yazılı gönderme alanı görünmez. Dinleme orb’u yumuşak aura + sheen + ses seviyesine (smoothing) tepki verir; interim kelimeler soluk, final kelimeler net çıkar. Asistan cevapları kelime kelime yazılır. Mikrofon panel açıkken tek stream kullanır; sessizlikten sonra komut işlenir ve yeni kayıt aynı stream ile başlar. Panel kapanınca mikrofon bırakılır. Varsayılan yıl 2026, tüm firmalar ve hesaplara ayrı Excel sayfalarıdır; açıkça başka yıl/hesap istenirse uygulanır. Ad/VKN eşleşmeleri yalnız gerçek tarama sonuçlarından yapılır. Önizleme sonrası “gönder” sesli onayı desteklenir. `prefers-reduced-motion` açıkken animasyonlar kapanır.
- Seçili Hesaplar'daki WhatsApp yanındaki dropdown kaldırıldı. Gönder düğmesi hesaplar ayrı (varsayılan)/tek sayfa seçimini modal içinde açar. Önizlemede müşteri, dönem, Excel bağlantısı ve görsel kalır; telefon ve teknik metinler gizlenir.
- Doğrulama: npm run check (76 test + typecheck + build) başarılı; ardından eklenen sesli önizleme/onay testi dahil ilgili 3 sohbet testi başarılı (toplam 77). Backend 8 test başarılı. İki ardışık ses kaydının tek izin isteği kullanması, iptal/temizlik, sesli onayın yinelenmemesi, 2026 varsayılanı, ayrı sayfalar ve dönem bakiyesi testli. 390×844 gerçek tarayıcıda kompakt panel, koyu önizleme ve seçim modalı kontrol edildi; yatay taşma yok, sentetik görsel 1200 − 300 = 900 TL gösteriyor.
- Sınırlar: fiziksel iPhone/Android PWA mikrofon testi bu ortamda yapılamadı. Site izninin oturumlar arasında kalması tarayıcı/işletim sistemi kontrolündedir; kod panel içinde tekrar izin istemez. Ses çözümleme Gemini ağı/kotasına bağlıdır. Canlı müşteri verisiyle gönderim yapılmadı; gerçek gönderim yalnız izin verilen iki test dosyasıyla doğrulandı. Asistanın yetkisi cari rapor hazırlama/gönderme ile sınırlıdır.
- Siri/ChatGPT tarzı asistan ses paneli `main`'e pushlandı; Vercel production Ready (`dpl_Cjn1L2mTgam4Egy5dXcy486YK9BN`, sonvera.com.tr).

## 15 Ekim — rapor kartında fatura/tahsilat ve toplam

- Hesap altında artık “9 hareket” yerine “6 Fatura  3 Tahsilat” yazıyor. Satış / Alış / Tahsilat altına Toplam eklendi (Satış − Alış − Tahsilat).

## 15 Ekim — Harmanda bakiye farkı

- Asistan raporu Seçili Hesaplar’dan yüksek bakiye veriyordu (ör. 3.1M vs doğru 1.8M). Ayşe/Mert’te fazla satış vardı; tahsilatlar aynıydı. Kök neden: reddedilen/iptal faturalar (`InvoiceStatus.Code` vb.) cari ekranında eleniyor, asistan yolunda sayılıyordu. Ortak `isExcludedInvoice` ile hizalandı; asistan taraması dönem dışı kayıtları ve aynı UUID tekrarını da eliyor.

## 15 Ekim — WhatsApp açıklama metni ve fotoğraf

- WhatsApp gönderiminde dosyanın altındaki açıklama metni kaldırıldı. PNG özet artık belge değil resim olarak gidiyor; Excel belge olarak kalıyor. Asistan servisi yeniden kuruldu.

## 15 Ekim — asistan sadeleştirme ve gönderim doğrulaması

- WhatsApp gönderimi artık zaman aşımında sohbete bakıyor. Dosya oradaysa tekrarlamıyor; yoksa yalnız o dosyayı en fazla iki kez yeniden deniyor. Sohbet okunamazsa kör tekrar yok. Aynı önizlemeden “Eksik dosyaları kontrol et ve gönder” önce sohbeti kontrol edip eksik dosyayı iletiyor. Servis yeniden başlarsa yarım iş `unknown` kalır; aynı kimlikle gelen dosyalar bu yolu kullanır.
- QR, alıcı, Gemini anahtarı ve gönderim geçmişi asistan sohbetinden çıkarıldı; Ayarlar sayfasında “Asistan bağlantısı” bölümünde. Asistan yalnız sohbet. Konuşma metin kutusuna kelime kelime yazılır; sesli komut modele gider, anahtar yoksa yerel ayrıştırıcıya düşer. Asistan yanıtları kelime kelime açılır.
- Rapor görseli firma adı, VKN, turuncu bakiye ve renkli hesap kırılımı kartı. Doğrulanmış dönem sonu “Bakiye”, değilse “Dönem neti”. Excel aynı.
- Asistan servisi yeniden kuruldu; `/health` 200. Gerçek WhatsApp mesajı bu turda gönderilmedi. Arayüz `main` `f2bfcb7` ile yayınlandı: `dpl_2XDqhVMg996ix1WJqrm2kMccVDM6` READY, `sonvera.com.tr` paketinde yeni sohbet ve Ayarlar bağlantısı var. Yerelde 390px asistan taşmıyor. Girişli canlı uçtan uca gönderim yapılmadı.

## 15 Ekim — sohbet paneli, hız ve WhatsApp bağlantısı düzeltmesi

- Kullanıcı tasarım skill'lerini istemedi; kullanılmadı. Mevcut tema renkleriyle mobil navbarın ortasına Asistan eklendi. Düğme sayfadan ayrılmadan sohbet panelini açıp mikrofonu başlatır; masaüstünde başlıkta da düğme var. Yazılı komut, tek tek eksik bilgi soruları ve seçenek düğmeleri bulunur.
- Asistan açık Seçili Hesaplar ekranındaki hesap/tarih/yön/tahsilat seçimlerini alır. Son hesap seçimleri aynı tarayıcı sekmesinde korunur. Önizleme sohbet içinde gösterilir, kullanıcı onayı sonrası dosyaların gönderim durumu takip edilir.
- WhatsApp kök neden: Chromium oturumu CONNECTED/hasSynced olmasına rağmen whatsapp-web.js /app/.wwebjs_cache oluşturamıyordu (EACCES). Önbellek /data/web-cache olarak değiştirildi. Kullanıcının mevcut oturumu korundu; tekrar QR gerekmeden ready oldu ve sonraki yeniden başlatmalarda da ready doğrulandı.
- "seçili hesaplarda 9.ayda harmanda excelini bana gönder" ve kısa takip yanıtları yerel ayrıştırıcıyla işlenir. Belirsiz ifadeler konuşma, mevcut seçimler ve hesap adları bağlamıyla Gemini'ye gider. Yıl yoksa sorulur; bilinmeyen müşteri uydurulmaz.
- Daha hızlı Gemini 3.5 Flash-Lite + minimal thinking doğrulandı (örnek API isteği HTTP 200 / 1411 ms). Resmi fiyat sayfasında ücretsiz katman doğrulandı. 3.8 Flash minimal'i desteklemiyordu; 2.5 Flash-Lite yeni kullanıcılara kapalı olduğu için kullanılmadı. Ücretli modele otomatik geçiş yok.
- 71 frontend testi, typecheck ve build geçti; son değişikliklere yönelik 8 test ve 4 backend testi yeniden geçti. Lint yalnız supabase.js içindeki 4 eski uyarı. 390px mobilde yatay taşma yok, navbar sırası Ana Sayfa / Toplu Tahsilat / Asistan / Cari / Diğer. Açık-koyu panel ekran görüntüleri test-results içinde; sentetik verilerle test edildi.
- Backend güncel ve health 200 / WhatsApp ready. Production dağıtım dpl_4Q6KjW43UCTiuoa1b6Lq5XmpGuJ3 READY, sonvera.com.tr alan adına bağlandı.
- Gerçek WhatsApp mesajı gönderilmedi; kullanıcı önizleme onayıyla gerçek dosya gönderimini denemeli. Finansal veri erişimi hâlâ mevcut yetkili Sonvera oturumunu gerektirir; asistan fatura/tahsilat kaydı değiştiren genel amaçlı bir ajan değildir.

## 15 Ekim 2026 — Asistan ve WhatsApp kurulumu

### Son doğrulama — Vercel girişi tamamlandı

- Kullanıcı cihaz yetkilendirmesini tamamladı; CLI semihkrks hesabını doğruladı. Production dağıtımı READY: dpl_2f8hNuKhhJLvjkuyoB4QMUgtfxyQ, https://sonvera.com.tr alan adına bağlandı. Aşağıdaki önceki Vercel yetki engeli giderildi.
- Gemini 3.8 Flash yeniden denemesi HTTP 200: örnek Ayşe Karabut / Cihan / Eylül 2026 / satış+alış / tahsilat dahil komutunu doğru yapılandırılmış alanlara çevirdi. Önceki 503 geçiciydi.
- Canlı /assistant adresi tarayıcıda 200 ve giriş ekranı gösterdi. Yetkili kullanıcı oturumu bu test tarayıcısında yok; canlı finansal veriyle uçtan uca rapor gönderimi yapılmadı.
- WhatsApp hâlâ QR durumunda. Kullanıcının Asistan sayfasından telefonla eşleştirmesi gerekiyor; gerçek mesaj gönderimi henüz doğrulanmadı.

- Sesli/yazılı komut, eksik filtre soruları, mevcut üç Excel şablonunu koruyan dosya üretimi, gerçek veriden PNG özet ve onaylı WhatsApp gönderim önizlemesi eklendi. Cari, Seçili Hesaplar ve Tüm Hesaplar ekranlarında gönderim girişi var.
- Oracle 193.122.1.32 üzerinde rootless Podman + systemd asistanı ve Caddy HTTPS kurulu. Servis adresi https://193-122-1-32.sslip.io. Oracle 80/443 kurallarını kullanıcı açtı; /health 200 doğrulandı. Özel uçlar Supabase sahibi oturumu gerektiriyor.
- Gemini anahtarı yalnız sunucunun özel settings.json dosyasına kaydedildi. Models isteği başarılı; gemini-3.8-flash komut denemesi iki kez 503 UNAVAILABLE döndü. Uçtan uca AI başarısı henüz doğrulanmadı; kullanıcıya geçici sağlayıcı hatası gösteriliyor.
- WhatsApp QR bekliyor; telefonla eşleştirme ve gerçek gönderim henüz yapılmadı. Sabit alıcı 905308625540. Hiçbir gerçek mesaj gönderilmedi.
- npm run check: 66 test, typecheck, production build başarılı. Backend 4 test başarılı. Lint hata yok, supabase.js içinde 4 mevcut uyarı var. Önceki sentetik tarayıcı testleri mobil taşma, Excel/PNG ve aynı modal içindeki tekrar deneme kimliğini doğruladı.
- Son backend kaynakları dağıtıldı. Frontend canlı dağıtımı Vercel token geçersiz olduğu için reddedildi; yeni kodun canlı olduğu varsayılmamalı. vercel login başlatıldı ve kullanıcı cihaz yetkilendirmesi bekleniyor.
- Sıradaki işler: Vercel oturumunu tamamla, frontend dağıt ve canlı girişle kontrol et; WhatsApp QR okut; Gemini geçici hatasını yeniden kontrol et. Modal kapanışı/yeniden yükleme sonrası kalıcı gönderim kimliği iyileştirmesi hâlâ değerlendirilmelidir; mevcut aynı-modal tekrarlar aynı kimliği kullanır, sunucu belirsiz gönderimi otomatik tekrarlamaz.

Son güncelleme: **12 Ekim 2026 (toplu tahsilat mobil kaydırma)**. Bu dosya başka IDE/AI ajanına geçiş için ana başlangıç noktasıdır. HER OTURUM / YANIT BİTİŞİNDE bu dosyayı güncellemek zorunludur; bu kural sonraki IDE ve ajanlar için de geçerlidir. Yapılanları, kalanları, doğrulanmayanları ve sıradaki somut adımı yazın. Tamamlanan işlerin üzerine yazmayın; mevcut kullanıcı değişikliklerini koruyun.


## 12 Ekim toplu tahsilat mobil kaydırma

- Liste kayıyordu ama son satırlar yapışkan "kaydet" çubuğunun altında kalıyordu; kaydırma orada bitiyordu. Mobilde `.tt-page` altına 150px boşluk, kaydet çubuğu alt menünün hemen üstünde.
- Dekont görüntüleyicisi: dekont kutusu 34dvh, form ayrı kaydırılıyor (`tt-vbody` min-height 0 + overflow auto). Müşteri listesi ekrana sabitlendi, kendi içinde kayar.
- 390px ölçüm: son satır kaydet çubuğunun 13px üstünde; formun son alanı alt çubuğun 24px üstünde.
- Telefonda kısa listede yapışkan kaydet çubuğu satırların üstüne biniyordu (ekrandaki hali). Mobilde çubuk artık akışta, listenin altında; masaüstü yapışkan hali duruyor.

## 12 Ekim Supabase unhealthy

- Dashboard: Database, Auth, PostgREST, Storage kırmızı. Realtime ve Edge Functions yeşil. Not: "Recently restored".
- Giriş `Failed to fetch`: `POST /auth/v1/token` 504 (yaklaşık 5 sn). `GET /auth/v1/health` 401 ile cevap veriyor, yani Auth süreci ayakta ama veritabanına ulaşamıyor. Management SQL de "connection timeout".
- Son sağlıklı postgres kaydı 11:10 UTC: cron job 1 tamamlandı. Ondan hemen önce checkpoint ~49 MB ve ~33 MB yazdı. Nano disk I/O bütçesiyle aynı olay.
- `content-script-start.js` / "Receiving end does not exist" tarayıcı eklentisi; uygulama hatası değil.
- Kod push'u bunu düzeltmez. Yeşile dönünce girişi tekrar dene. Kırmızı kalırsa Dashboard → Restart project. Bütçe doluysa Nano'da tekrar düşer.

## 12 Ekim mobil bildirim + PWA üst şerit

- "Sonvera'nın yeni sürümü hazır / Güncelle" kutusu kaldırıldı. Yeni sürüm, form dolu değilse ve süren işlem yoksa kendiliğinden açılır.
- Mobil bildirim (toast) artık kenardan kenara değil: sağ üstte en fazla 260px. 390px genişlikte ölçüldü (255px, sağdan ~13px).
- PWA üst bulanıklığı: `apple-mobile-web-app-status-bar-style` `black-translucent` idi. iOS saat/pil şeridini sayfanın üstüne buzlu cam olarak bindiriyor; tarayıcıda bu olmaz, sadece kurulu uygulamada görünür. `black` (açık temada `default`) yapıldı. Üst çubuğun `backdrop-filter` bulanıklığı mobilde kapatıldı.
- Kurulu PWA eski meta'yı bir sonraki tam kapanışa kadar tutabilir. Uygulamayı kaydırıp kapatıp yeniden açmak gerekir.

## 12 Ekim — son kodlama ve canlı tarayıcı kontrolü

**Yeni kullanıcı talimatı:** sonvera.com.tr üzerinde tarayıcı testleri istendi. Önceki testleri erteleme talimatı, bu canlı tarayıcı kontrolü için kaldırıldı. Finansal kayıt oluşturma/gönderme/iptal yapılmıyor. Yerel yeni kodun canlıya dağıtıldığı varsayılmamalı.

Son kodlama ekleri (henüz build/typecheck/unit test çalıştırılmadı):
- Migration **013_restore_verification**: service_role ile yedek kimliği ve SHA-256 eşleşerek finansal geri yükleme doğrulama metadata’sı kaydetme.
- Migration **014_document_operation_index**: tek/çok UUID ve yol UUID’sini çıkarma; GIN belge dizini; belirsiz işlemlerde çakışma engeli; önceki başarılı gönderim yalnız tekrar gönderimi engeller, arşivleme gibi farklı işlemleri gereksiz engellemez. SQL çalıştırılmadı.
- scripts/financial-manifest.mjs, verify-restored-backup.mjs, backup.mjs: yedek öncesi/sonrası finansal referans kararlılığı, ayrıca şifreli manifest, izole hedefte salt okunur kayıt/toplam karşılaştırması; isteğe bağlı --report metadata kaydı. Gerçek backup/restore yapılmadı. Ayrıntı docs/BACKUP-RESTORE.md.
- document-files.js: izinli belge türlerinde PDF/XML içerik kontrolü, iptal edilebilir indirme; yeni belge kartlarına bağlandı. GİB e-Arşiv için yeni dosya yolu varsayılmadı.
- document-recovery.js + invoice/eirsaliye create: işlem anahtarı istekten önce kalıcı sekme kaydına yazılır; belirsiz sonuçta alanlar kilitlenir; yalnız operation_receipts sorgusuyla durum kontrol edilir. Kayıt bulunamadığında otomatik yeniden gönderim yapılmaz.
- İrsaliye taslak kaydı artık boş menü yerine #/belgeler/despatchDraft listesine gider. Bu listeden düzenleme/gönderme henüz tamamlanmadı.
- directory.tsx: firma/müşteri/etiket/şablon mevcut okuma ekranları React’e geçti; güvenli metin render, firma bazlı sorgu, arama debounce/iptal, ilk 50 kayıt ve daha fazlasını gösterme.
- API X-Sonvera-Client:2 başlığı ve Edge minimum sürüm kontrolü, 426 güncelleme bildirimi; CORS güncellendi. İstemci ve Edge birlikte dağıtılmalı.
- Belge filtreleri sekmede firma bazlı korunur. Belge paylaşım bağlantısı #/belge/{accountId}/{kind}/{uuid} ile açık hesap kimliğine bağlı salt okunur görünüm açar; herkese açık belge bağlantısı değildir.
- Oturum sahibi değiştiğinde cache/özel yerel veriler temizlenir.

Canlı tarayıcı çalışması sürüyor: /browse kullanıldı. İlk yanıt HTTPS 200, ilk giriş ekranında JS hata kaydı yoktu; ilk oturum devrinde test tarayıcısı yeniden başlayıp giriş kayboldu. Kalıcı browse connect ile tekrar açıldı ve kullanıcıdan giriş istendi. Bu erişim sorunu uygulama hatası olarak raporlanmamalı. Giriş ekranında iki input için bağlı label/aria-label bulunmadığı gözlendi; erişilebilirlik bulgusu. Son canlı rapor ayrıca yazılacak.

Final test kapsamına 008–014 migration’lar, yeni React ekranları, belge indirme/iptal, belirsiz işlem kilidi, minimum istemci sürümü ve yedek manifest karşılaştırması eklenmeli. Eski 48 test sonucu yeni kodun kanıtı değildir.

## Yeni IDE'ye verilecek mesaj

> DEVIR-TESLIM.md, docs/IMPLEMENTATION-STATUS.md, docs/ROLLOUT.md ve DESIGN.md dosyalarını oku. Mevcut değişiklikleri koruyarak Sonvera geliştirmesine devam et. Planın tamamını uygulanmış sayma. Önce `git status --short` ve aşağıdaki **12 Ekim ana sayfa / küçük detaylar**, **12 Ekim UI/Excel turu** ile **12 Ekim canlı geçiş** bölümlerini kontrol et. Canlıda 001–015 + `20261011230708_fix_archive_range_istanbul_date` + `20261012082420_safe_decimal_search_path` + `20261012101500_close_reconcile_on_finish` + `20261012103000_scheduler_secret_check` + `20261012104500_archive_skip_unchanged` migration uygulandı; pg_cron zamanlayıcısı (`sonvera-jobs`, 5 dk) kuruldu; Edge `nilvera` + `job-runner` (v4) deploy edildi ve Edge secrets yazıldı. Yayın Vercel'den (GitHub `main`, domain `sonvera.com.tr`); yeni istemci `main`'e pushlandı, `ALLOWED_ORIGINS`'e domainler eklendi. DB parola yenileme, Auth kayıt kapatma, günlük yedek görevi ve gerçek telefon testi hâlâ açık. Gizli anahtarları terminale, dokümana veya sohbete yazma. HER BİTİŞTE bu dosyayı güncelle.

## 12 Ekim Sonvera marka/logo + yayın (en yeni)

### Yapılanlar
- "Sonvera 2.0" → "Sonvera" (başlık, kenar menü, alt bilgi, manifest, Excel özeti).
- Yeni logo: `public/logo.svg` (mavi kare + beyaz S + açık mavi nokta). Menü ve giriş ekranı aynı çizimi `src/components/logo.js` → `logoMark(boyut)` ile satır içi SVG olarak kullanır.
- Favicon: `logo.svg` + `favicon-32.png`; iOS: `apple-touch-icon.png`; PWA: `icon-192/512.png` + `icon-maskable-192/512.png` (kenarsız). PNG'ler `node scripts/render-brand-icons.mjs` ile (Playwright) logo.svg'den üretilir; logo değişirse bu komutu tekrar çalıştırın.
- `sw.js` önbelleğine `/logo.svg` eklendi (önbellek adı her build'de değiştiği için yeni ikonlar güncellemeyle gelir; telefona kurulu PWA ikonu işletim sistemine göre geç yenilenebilir, gerekirse kaldırıp tekrar ekleyin).
- Edge secret `ALLOWED_ORIGINS` = localhost:5173 + 127.0.0.1:5173 + `https://sonvera.com.tr` + `https://www.sonvera.com.tr` (Supabase CLI ile). Doğrulandı: iki domain kabul, yabancı origin `null`.
- Doğrulama: typecheck temiz, 62/62 unit, lint 0 hata, build OK, e2e 11 geçti / 2 atlandı; tarayıcıda menü logosu + favicon linkleri + başlık kontrol edildi.
- Commit + `main`'e push (fast-forward, Vercel otomatik yayınlar). SAFE/, dist/, backups/, DEKONTÖRNEKLERİ/ gitignore'da, commitlenmedi; commit öncesi gizli anahtar taraması temiz.

### Kalan
- Yayın sonrası sonvera.com.tr'de giriş + Nilvera çağrısı + PWA ikonunun gerçek telefonda kontrolü.
- Supabase Auth → yeni kayıtları kapat; DB parola yenileme (kullanıcı kararı); `configure-backup.ps1` günlük yedek; `SAFE/restore.dump` silinmesi.
- Ölü `.dash-widget*` / `.dash-currency*` CSS'i temizlenebilir (zararsız).

## 12 Ekim Disk G/Ç uyarısı + Vercel hazırlığı

### Disk G/Ç
- Supabase "Disk I/O budget tükenmek üzere" uyarısı. Ölçüm: Temmuz'dan beri WAL 102 MB, disk okuma 22 MB, cache hit %99,99, bağlantılar normal (PostgREST 5 boşta). Postgres sorgu yükü düşük; bütçe büyük ihtimalle bugünkü yoğun tek seferlik işler (yedek/dump, migration'lar, deploy, ilk tarama) + Nano compute'un küçük belleğinden. Kendiliğinden dolar; tekrarlarsa Dashboard → Reports → Database'de Memory/Swap ve Disk IO grafiğine bakın.
- Gerçek israf bulundu ve düzeltildi: `replace_invoice_archive` (tarayıcı) ve `stage_archive_page` (zamanlayıcı) her çağrıda aralıktaki TÜM satırları değişmese de yeniden yazıyordu; her satır `archive_revision` tetikleyicisiyle `ledger_revisions`'ı da güncelliyordu (cari önbelleğini de boşa geçersiz kılıyordu). `20261012104500_archive_skip_unchanged.sql` (canlı): `on conflict ... do update ... where payload/issue_date is distinct from`. Geri alınan kuru test: 269 aynı satır gönderildi, 0 yeniden yazıldı. Yetkiler aynı.
- Not: `invoice_archive`'taki ~19 bin silme eski istemci kodundan; mevcut fonksiyon silmiyor.

### Vercel
- Yayın Vercel'den (GitHub `Semihkrks/sonvero`, `main` → production). Cloudflare kullanılmayacak; `wrangler.jsonc` / `public/_headers` artık gereksiz.
- `vercel.json`'a `_headers` eşdeğeri güvenlik + önbellek başlıkları eklendi (assets 1 yıl immutable, `sw.js` ve `index.html` no-cache).
- Ortam değişkeni gerekmez (public Supabase URL/anon anahtarı kodda varsayılan).
- ~~**Zorunlu:** Vercel production domain(ler)i Edge secret `ALLOWED_ORIGINS`'e eklenmeli.~~ Yapıldı (yukarıdaki marka/yayın bölümüne bakın). Yeni domain eklenirse: `npx supabase secrets set "ALLOWED_ORIGINS=...virgülle tüm liste..." --project-ref ciaffmgszfvyrdoweirw` (mevcut değerleri koruyun).
- Uyarı: `origin/main` = `32ff362` (canlı backend geçişinden önceki eski istemci). Şu anki Vercel sitesi muhtemelen Nilvera tarafında çalışmıyor; yeni istemci `cursor/live-rollout-backup-edge` dalında + commitlenmemiş değişikliklerde.

## 12 Ekim zamanlayıcı kurulumu

### Yapılanlar (canlı)
- `pg_cron` + `pg_net` açıldı. Cron işi `sonvera-jobs` her 5 dk `job-runner`'ı çağırır (aktif, job id 1).
- Vault: `sonvera_project_url` + `sonvera_scheduler_secret`. Secret veritabanında `gen_random_bytes(32)` ile üretildi; hiçbir yere yazdırılmadı/kopyalanmadı. Okumayın, yazdırmayın.
- Edge `SCHEDULER_SECRET` ile eşleştirme gerekmesin diye `public.scheduler_secret_matches(text)` (yalnız service_role; SHA-256 karşılaştırma, ≥32 karakter) → migration `20261012103000_scheduler_secret_check.sql`. `job-runner` v4: env secret eşleşmezse Vault kontrolü, sonra oturum kontrolü.
- `supabase/setup-scheduler.sql` güncellendi: scheduler secret'ı kendisi üretir; yalnız `sonvera_project_url` önceden gerekli.
- Test tetiklemesi: HTTP 200 `{"processed":2,"claimed":2}`. İlk çalışmada 30 tarama işi oluştu (6 hesap × 4 belge türü bu ay + hesap başı 1 geçmiş ay); 5 dk'da 2 iş → kuyruk ~70 dk'da erir. Ayarlar'daki "Bekleyen işler" sayısı bu sürede yüksek görünür, normaldir. DB 19 MB / 500 MB.
- Yanlış/kısa secret reddedildi; anon/authenticated fonksiyonu çağıramaz. `deno check` geçti.

### Kalan
- Parola/token yenileme kullanıcı kararıyla ertelendi (risk açıklandı).
- Auth yeni kayıt kapatma, Cloudflare yayın + `ALLOWED_ORIGINS`, yedek görevi, `SAFE/restore.dump` silme, gerçek telefon testi, commit.

## 12 Ekim sadeleştirme + takılı iş düzeltmesi

### Yapılanlar
- **Ana sayfa:** Kontör / WhatsApp / Sms kutuları (sabit sahte değerlerdi: 1.000/725/275) ve döviz tablosu kaldırıldı; `loadCurrencyRates` silindi. `main.css`/`mobile.css`'te `.dash-widget*` / `.dash-currency*` stilleri ölü kod olarak duruyor (zararsız).
- **Hızlı erişim (mobil "Diğer"):** Excel Çıktısı / Hesaplar / Ayarlar çıkarıldı; yalnız Cari (Tüm/Seçili) + Faturalar (Gelen/Giden/Oluştur/e-Arşiv) + "Tüm menü". Tam yükseklik yan panel yerine "Diğer" butonunun üstünde açılan kompakt kart (sağ alt, 300 px, içerik kadar yükseklik).
- **"Bekleyen ve kontrol gereken işler" → "Belge durumu kontrolü / Bekliyor / Sırası bekleniyor":** Her Nilvera yazma işleminde (`begin_nilvera_operation`) 2 dk sonrası için `reconcile` işi açılıyordu; işlem 1 sn'de başarılı bitse de iş kapanmıyordu. Ayrıca canlıda **zamanlayıcı yok** (pg_cron/pg_net kurulu değil, `sonvera_*` Vault secret'ları yok) → iş sonsuza dek "Bekliyor". Canlıdaki 2 iş bugünkü iki e-Arşiv e-posta gönderiminden (`/earchive/Invoices/Email/Send`, ikisi de `succeeded`). Düzeltme: `supabase/migrations/20261012101500_close_reconcile_on_finish.sql` (canlıya uygulandı) — `finish_nilvera_operation` sonuç `succeeded`/`failed` olunca bağlı reconcile işini `done` yapar; mevcut takılı işler kapatıldı. Yetki değişmedi (yalnız service_role). Ayarlar'da metinler: "Gönderim sonucu teyidi" / "Nilvera arşiv taraması", açıklama paragrafı.

### Doğrulama
typecheck · 62 test · lint 0 error · build · E2E 11 geçti / 2 atlandı. Canlı DB: background_jobs = 2 done, 0 pending. Tarayıcı (390 px): kompakt hızlı erişim kartı, ana sayfa alt kutular yok, Ayarlar "Bekleyen iş bulunmuyor".

### Yayın öncesi kalanlar (öncelik sırası)
1. Sohbete/terminale düşen DB parolası + Supabase erişim token'ları yenile (Dashboard → Database → Reset password; Account → Access Tokens).
2. Auth → yeni kullanıcı kaydını kapat.
3. Zamanlayıcı: Vault'a `sonvera_project_url` + `sonvera_scheduler_secret` (Edge `SCHEDULER_SECRET` ile aynı) ekle, sonra `supabase/setup-scheduler.sql` çalıştır. Yoksa arka plan arşiv taraması ve belirsiz gönderim teyidi yalnız "Nilvera'dan yenile" ile çalışır.
4. Cloudflare `wrangler deploy`; yayın adresini Edge `ALLOWED_ORIGINS`'e ekle (yoksa yayındaki site Nilvera'ya 401/CORS alır).
5. Günlük yedek görevi (`configure-backup.ps1`); `SAFE/restore.dump` (şifresiz canlı döküm) silinmeli.
6. Gerçek telefonda (iPhone Safari / Android Chrome) giriş + PWA kurulum/güncelleme duman testi.
7. Commit yapılmadı (kullanıcı isteyince).

## 12 Ekim hız + bildirim + mobil "Diğer" paneli

### Yapılanlar
- **Girişteki gecikme:** Başlangıçta hem `getSession()` hem `INITIAL_SESSION` olayı `bootAuthedApp`'i çalıştırıyordu → uygulama iki kez açılıp iki kez veri çekiyordu. `src/app.js`'te aynı kullanıcı için tek boot (`bootPromise`/`bootUserId`). Giriş butonu başarıda "Giriş Yap"a dönmüyor, "Hesaplar yükleniyor..." + spinner kalıyor (takılmış gibi görünmüyor); hatada eski hale döner.
- **Ana sayfa 3–4 sn:** Tek boot ile istek sayısı yarıya indi; bildirim kontrolü açılışta 4 sn ertelendi (`startInvoiceNotificationMonitor({ delayMs: 4000 })`), ana sayfa istekleriyle yarışmıyor. Ana sayfa verisi hesap bazında hafızada (`dashboardCache`, 30 sn taze): geri dönüşte anında çizilir, eskiyse arka planda yenilenir. `invoice-archive.js` `getUserId()` ağ isteği yapan `getUser()` yerine yerel `getSession()` kullanır (sayfa başına ~3 `/auth/v1/user` isteği kalktı; RLS JWT'yi yine doğrular). Ölçüm (mobil, yeniden yükleme): accounts 1 istek ~0,3 sn; iki Nilvera listesi 0,5 sn'de başlayıp ~1,9 sn'de bitiyor. Her Nilvera çağrısı Supabase Edge (eu-north-1) üzerinden ~1 sn; bundan aşağısı sunucu tarafı iş.
- **Döviz tablosu:** `api.exchangerate.host` artık anahtar istiyordu, tablo hep "—" idi. Anahtarsız `api.frankfurter.dev` (Avrupa Merkez Bankası referans kuru) + 30 dk önbellek. Uydurma "satış = alış × 1,004" ve yanlış "TCMB'den alınmaktadır" yazısı kaldırıldı; tek "Kur (₺)" sütunu + kaynak/tarih. TCMB tarayıcıdan CORS nedeniyle çekilemez.
- **Bildirimler geç geliyordu:** Kontrol aralığı 2 dk → 1 dk; sekmeye dönüş ve `online` olayında anında kontrol (15 sn alt sınır, tek uçuş). Önceden her açılışta liste sessizce "görüldü" yapılıyordu → uygulama kapalıyken gelen faturalar hiç bildirilmiyordu; artık yalnız ilk kez görülen hesapta sessiz tohumlama. Sayfa açıkken sistem bildirimi yerine uygulama içi bildirim ("Görüntüle" → Gelen Kutusu). Uygulama tamamen kapalıyken anlık bildirim için sunucu tarafı Web Push gerekir (yapılmadı).
- **Bildirim tasarımı:** `src/components/toast.js` yeniden yazıldı: emoji yok, SVG ikon, başlık + mesaj, kapat, isteğe bağlı aksiyon butonu, süre çubuğu, üzerine gelince duraklar, en fazla 4 adet, hatalar en az 6 sn. Mesajlar `textContent` ile (XSS güvenli). İmza geriye uyumlu: `showToast(msg, type, durationOrOptions)`.
- **Mobil "Diğer":** Artık sol menüyü değil, sağdan açılan "Hızlı erişim" panelini açar (`bottom-nav.js` + `mobile.css` `.quick-sheet*`). Kısayollar tek elle erişim için altta: Tüm/Seçili Hesaplar Cari, Gelen/Giden, Fatura Oluştur, e-Arşiv, Excel Çıktısı, Hesaplar, Ayarlar, "Tüm menü" (klasik sol menüyü açar). Dışarı dokunma / Esc / rota değişince kapanır, odak butona döner. Kısayol sayfalarında "Diğer" aktif görünür.
- **Seçili Hesaplar Yön segmenti:** Satış/Alış/Her ikisi yazıları ortalandı (mobilde segment 44 px; global 44 px buton kuralı taşırıyordu).

### Doğrulama
typecheck geçti · 62 test geçti · lint 0 error · build geçti · E2E 11 geçti / 2 atlandı. Tarayıcıda (390 px mobil): Diğer paneli aç/gezin/Esc/"Tüm menü", bildirim tasarımı açık + koyu, döviz tablosu dolu, ana sayfaya geri dönüşte 0 Nilvera isteği. Gerçek giriş akışı parola gerektirdiği için tarayıcıda denenmedi (kod incelemesi + boot ölçümü yapıldı).

### Açık
- Gerçek arka plan bildirimi için Web Push (VAPID + abonelik tablosu + Edge cron) ürün kararı bekliyor.
- Nilvera çağrısı başına ~1 sn Edge gecikmesi; toplu uç nokta veya sunucu tarafı önbellek ile azaltılabilir.

## 12 Ekim ana sayfa Gelen/Giden + küçük detaylar

### Yapılanlar
- **Ana sayfa Gelen/Giden Kutusu:** halka kartı ile "Son Faturalar" listesi tek değişkeni (`currentRecentTab`) paylaşıyordu; soldaki "Giden Kutusu" yalnız başlığı değiştiriyor, sayı gelen sayısında kalıyordu. Artık `currentBoxTab` ayrı. Her sekme/dönem tıklaması Nilvera'dan yeniden çekiyordu; veri bir kez çekilir (`loadDashboard`), sekme/dönem `renderDashboardData` ile yerelde yeniden çizilir (tıklamada 0 istek). Çekim aralığı ayın 1'ini her zaman kapsar, PageSize 100, yarış koruması (`_loadToken`). Liste çekilemezse "fatura yok" yerine hata mesajı. Halkada seçili kutu dilimi öne çıkar, alt lejantta seçili kutu vurgulu, sekmelerde renk noktası. Mobilde halka kartının sekmeleri gizliydi → görünür. "Cevap Bekleyen" yalnız ticari faturaları sayar. Grafik gün anahtarı UTC yerine yerel tarih; "Bu Ay" grafiği artık 1'inden başlar (önceden bir gün fazla). Kullanılmayan `getMonthRange`/`formatDateISO` kaldırıldı.
- **PDF önizleme her yerde:** `openPdfViewer` artık `title`, `filePrefix`, `meta.badge`, `actions` (ek butonlar, ör. Mail Gönder) ve `{ success, html }` (sandbox HTML önizleme) destekler; `pdfMetaAttrs`/`readPdfMeta` yardımcıları. Gelen, Giden, E-Arşiv, Taslaklar, e-İrsaliye gelen/giden sayfalarındaki eski iframe `showPdfPreviewModal` kopyaları bu bileşene taşındı (Mail Gönder korundu; taslakta PDF yoksa HTML önizlemeye düşer).
- **Güvenlik/hata:** Bu listelerde karşı taraf adı, fatura no, VKN HTML-escape edilmeden basılıyordu → escape. `drafts.js`'te tanımsız `draftAlias` (alias'sız taslakta tablo çökerdi) → `extractDraftAlias(d)`; `case` blok bildirimleri düzeltildi.
- **Mobil alt menü:** "Belgeler" kaldırıldı, yerine "Toplu Tahsilat" (`/toplu-tahsilat`) geldi: Ana Sayfa · Toplu Tahsilat · Cari · Diğer. "Cari" artık tahsilat sayfasında aktif görünmez (`src/components/bottom-nav.js`). Belgeler'e menüden/`#/belgeler` ile hâlâ ulaşılır.
- **Supabase:** `public.safe_decimal(text)` için `search_path = ''` (canlı + `supabase/migrations/20261012082420_safe_decimal_search_path.sql`). Advisor uyarısı kalktı; fonksiyon doğrulandı.

### Doğrulama
typecheck geçti · 62 test geçti · lint 0 error · build geçti · E2E 11 geçti / 2 atlandı. Tarayıcıda: dashboard sekmeleri (masaüstü + mobil, açık/koyu), Gelen/Giden/E-Arşiv/Taslak PDF önizleme (~2 sn). e-İrsaliye önizlemesi bu hesapta kayıt olmadığı için canlı denenmedi.

### Notlar / açık
- `npm run lint` yalnız `src/lib src/react tests` tarar; `src/pages` ve `src/services` taranmaz. `npx eslint src --quiet` şu an 6 stil hatası verir (gereksiz escape/atama), gerçek tanımsız değişken yok.
- Ana sayfa E-Fatura / E-Arşiv / E-İrsaliye modül sekmeleri yalnız görsel; tıklanınca veri değişmez (ürün kararı gerekir).
- Aşağıdaki "Açık kalanlar" 1–4 ve 6 geçerli; 5'teki `safe_decimal` maddesi kapandı.

## 12 Ekim UI / Excel / performans turu

### Yapılanlar
- **Arşiv P0001 "Geçersiz arşiv aralığı":** UI bitiş tarihi ay sonu, DB UTC `current_date` ile karşılaştırıyordu. Canlıya `20261011230708_fix_archive_range_istanbul_date` (İstanbul tarihi) uygulandı; `invoice-archive.js` aralığı bugüne kırpar ve bu hatayı yutar. Yerel dosya adı canlı sürümle eşitlendi (önceki `202610120001_*` adı `db push`'u bozardı).
- **Excel "Dosya hazırlanamadı":** kök neden iki Vite dev sunucusunun aynı `node_modules/.vite` önbelleğini ezmesi → exceljs `504 Outdated Optimize Dep` → worker yüklenemiyordu. `vite.config.js` `optimizeDeps.include` (exceljs, file-saver, decimal.js); worker yüklenemezse ana iş parçacığında export (`cari-export-worker-client.js`); worker'da eksik `exportLedgerRows` eklendi. Tek dev sunucusu çalıştırın (`npm run dev -- --port 5173 --strictPort`).
- **Excel adı:** Seçili Hesaplar'da tek firma seçiliyse dosya firma adıyla (`FİRMA 1-10. AY.xlsx`), çoklu seçimde `Seçili N Firma`.
- **PDF önizleme:** yeni `src/components/pdf-viewer.js` (pdf.js canvas render, zoom, yazdır, yeni sekme, indir, iskelet/hata/tekrar dene, blob temizliği). Şu an yalnız dashboard son faturalarında; diğer listelerdeki `showPdfPreviewModal` kopyaları henüz bu bileşene taşınmadı.
- **Cari ekranları:** Faturalar/Tahsilatlar sekmeleri, tahsilat rengi `--tahsilat` (teal), Düzenle/Sil ayrı sütun, modern tahsilat formu, filtre butonları hizası, müşteri listesi sabit 360px + 2×2 tutar ızgarası, detay paneli kaydırma, koyu modda beyaz export barı ve boş özet hücresi düzeltildi, Tüm Hesaplar'da HTML escape.
- **Katmanlar:** modal z-index 1400 (header 1300 üstünde); mobil alt menü 9999 → 1250 (modalların altını kapatıyordu).
- **Mobil:** cari tabloları kendi kutusunda yatay kayar; Excel Export / İrsaliye Oluştur / Hesaplar inline 2–3 kolon gridleri ≤640px tek kolon. 22 rota 390px genişlikte taşma için tarandı.
- **Hız:** Tüm/Seçili Hesaplar taraması hesap başına sıralıydı; `src/lib/concurrency.js` ile 3 paralel (10,2 sn → 3,5 sn; 11,6 sn → 5,1 sn, sonuç sayıları aynı).
- `.gitignore`: `SAFE/`, `*.dump`, `DEKONTÖRNEKLERİ/` eklendi. `SAFE/restore.dump` şifresiz canlı veri dökümüdür; iş bitince silinmesi önerilir.

### Doğrulama (bu turda)
`npm run typecheck` geçti · `npm run test` 16 dosya / 62 test geçti · `npm run lint` 0 error · `npm run build` geçti · `npm run test:e2e` 11 geçti / 2 ölçek atlandı. E2E tahsilat testleri artık `#/cari-react` (React defter) üzerinde koşar; `#/cari` kullanıcı isteğiyle klasik `cari.js` ekranına döndü ve bu klasik ekran için E2E testi YOK. Tarayıcıda gerçek veriyle: Canlı Cari Excel, Seçili Hesaplar tek firma Excel adı, dashboard PDF (masaüstü + mobil), 390px mobil tarama.

### Açık kalanlar (kullanıcı/erişim gerektirir)
1. Sohbet/terminal geçmişine düşen DB parolası ve erişim token'ları yenilenmeli (Supabase Dashboard → Database → Reset password; Account → Access Tokens).
2. Auth → yeni kayıtları kapat; Leaked password protection (plan izin veriyorsa) aç.
3. Cloudflare `wrangler deploy` + yayın URL'sini `ALLOWED_ORIGINS`'e ekleme.
4. Günlük yedek görevi (`configure-backup.ps1`) kurulmadı.
5. Supabase advisor: `public.safe_decimal` search_path sabit değil (küçük migration ile düzeltilebilir); SECURITY DEFINER RPC uyarıları bilinçli (içeride sahiplik kontrolü), anonim politika uyarıları yalnız anonim giriş açılırsa risk.
6. Commit yapılmadı.


## 12 Ekim canlı geçiş turu

### Bu turda yapılanlar
- Şifreli yedek: `backups/sonvera-2026-10-11T22-06-41-993Z.svb` (~580 KB). Pooler host: `aws-1-eu-north-1.pooler.supabase.com`, user `postgres.ciaffmgszfvyrdoweirw`.
- İzole local restore (port `55432`, DB `sonvera_restore_test`): accounts 6, collections 150, archive 1671 (canlı arşiv anlık ~1681; vault uzantısı localde yok). Finansal `.manifest.svb` yok → `backup:verify` formal eşleşme üretemedi.
- Canlı **001–015** migration uygulandı (`supabase db push`); Vault’ta 6 secret.
- Edge Functions MCP ile deploy: `nilvera` v2 ACTIVE, `job-runner` v1 ACTIVE (`verify_jwt=false`).
- OWNER için hazır dosya: `%LOCALAPPDATA%\Sonvera\edge-secrets.env` (OWNER_USER_ID=`f13633cc-6170-4a51-8b63-1fcb1c388a03`, ALLOWED_ORIGINS localhost).
- **Edge secrets yazıldı** (OWNER_USER_ID, ALLOWED_ORIGINS, SCHEDULER_SECRET) — Management API / login script ile doğrulandı.
- Supabase plugin bağlandı; proje `semihmuhasebe` / `ciaffmgszfvyrdoweirw` / bölge **eu-north-1** (Stockholm).

### Bölge / İstanbul
Supabase’te İstanbul/Türkiye bölgesi yok. TR için en düşük gecikme genelde **eu-central-1 (Frankfurt)**. Taşımak = yeni proje + veri kesimi; canlı migration sonrası şimdi yapılmamalı. İleride ayrı cutover.

### UI notu (aynı gece)
- Ana sayfa React “genel bakış / toplam cari” ekranından çıkarıldı; klasik `dashboard.js` (E-Fatura / E-Arşiv / E-İrsaliye menüsü) geri bağlandı.
- Opus ile koyu tema token’ları, dashboard ve cari liste stilleri modernleştirildi (`system.css` / `main.css` / `mobile.css`).

### Sıradaki (hemen)
1. Auth’ta yeni kayıt kapat; sohbete düşen DB/access token’ları yenile/iptal.
2. Yerel istemciyi (özellikle ana sayfa + koyu tema + cari) doğrula; sonra isteğe bağlı Cloudflare `wrangler deploy`.
3. Günlük yedek: `configure-backup.ps1` ile Host=`aws-1-eu-north-1.pooler.supabase.com`, User=`postgres.ciaffmgszfvyrdoweirw`, OwnerId yukarıdaki UUID.
4. Production origin’i `ALLOWED_ORIGINS`’e ekle (yayın URL’si netleşince).

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
