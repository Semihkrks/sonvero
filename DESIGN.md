# Sonvera tasarım sistemi
## Ürün
Tek kullanıcılı, çok firmalı fatura ve cari çalışma alanı. Güvenilir tutarlar, açık işlem durumu ve hızlı gezinme önceliklidir.
## Onaylanan yön
10 Ekim 2026 planı: açık/koyu tema, gri yüzeyler, mavi vurgu, Inter, Lucide. Mevcut iş akışları korunur.
## Tokenlar
Kaynak: src/styles/system.css.
- Açık: zemin #f4f6f9, yüzey #ffffff, ikincil yüzey (tablo başlığı, segment) #f6f8fb, çizgi #dce3ec, yazı #172236 / #526079 / soluk #64748b, vurgu #2563eb.
- Koyu (nötr gri, lacivert değil): zemin #0f1115, yüzey #171a21, ikincil yüzey #1c2028, hover #1e222a, çizgi #272c36 / #3a414e, yazı #e9ecf1 / #b3bac6 / soluk #8a93a3, vurgu metni #6aa5ff.
- Dolu butonlar ayrı token kullanır, beyaz yazı her iki temada AA kontrastı sağlar: --accent-solid (#2563eb / #2f6fe8), --success-solid (#15803d / #18794a), --danger-solid (#b91c1c / #c2323f). Pastel --success/--danger yalnız metin ve rozet içindir.
- Rozet ve durum çipleri: 6 px köşe, tonlu zemin (--*-bg) + %22 currentColor iç çizgi; sv-status başında nokta.
- Grafik: --chart-in (gelen, mavi) ve --chart-out (giden, yeşil); canvas renkleri bu tokenlardan okunur, parlama/gradyan metin yok.
- --bg-glass yarı saydam üst katmandır (hover); eski --bg-surface, --border-color, --primary adları bu tokenlara bağlanır.
## Bileşenler
Butonlar 40 px (sm 32 px masaüstü, mobil 44 px), 8 px köşe, hover'da kayma yok. Sekmeler segment kontrol: ikincil yüzey kabı, aktif sekme yüzey rengi + ince çizgi. Kartlar 12 px köşe, statik kartta hover gölgesi yok. Tablolar: başlık ikincil yüzeyde 11 px büyük harf soluk; tutar sütunları sağa hizalı, tabular. Ana sayfa klasik Nilvera düzenini korur (modül sekmeleri, gelen/giden, dönem, halka grafik, son faturalar); toplam cari / dönem bakiyesi metrikleri ana sayfaya konmaz.
## Tipografi ve yerleşim
Inter yerel 400/500/600; rakamlar tabular. Başlık 28/24 px, gövde 14/16 px, meta 12 px. 4 px boşluk ölçeği. Köşe 6/8/12/14 px. İçerik en fazla 1600 px. Mobil 44 px hedefler, 16 px giriş alanları.
## Davranış
Buton bekleme durumu ilk await öncesinde başlar. Tek işlem bir kez yazılır. Renk tek başına anlam taşımaz. Form hataları alan yanında, işlem sonucu kalıcı panelde. Modal odak hapsi ve geri dönüşü zorunlu.
## Doğrulama
360/390/430/768/1280/1440/1920 px, iki tema, klavye, %200 yakınlaştırma ve azaltılmış hareket.
