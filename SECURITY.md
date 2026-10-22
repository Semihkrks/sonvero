# Güvenlik Politikası

## Açık bildirme

Güvenlik açıklarını, erişim anahtarlarını ve müşteri bilgilerini herkese açık issue veya pull request içinde paylaşmayın. GitHub Private Vulnerability Reporting açıksa bu kanalı kullanın. Aksi halde hassas ayrıntı vermeden bakım sorumlusundan özel bir iletişim kanalı isteyin. Bildirime etkilenen sürüm, olası etki ve sentetik verilerle hazırlanmış bir yeniden üretim örneği ekleyin.

## Dağıtım ilkeleri

- Gerçek fatura, dekont, banka kaydı ve müşteri bilgilerini depoya eklemeyin.
- Service-role anahtarları ve entegrasyon sırları sunucuda kalmalıdır; VITE_* alanlarına yazılmamalıdır.
- PostgreSQL/RLS politikalarını ve migration sırasını izole ortamda doğrulayın.
- Mevcut mimari bir yetkili kullanıcının birden fazla firma hesabını yönetmesine odaklanır; genel amaçlı çok kiracılı SaaS izolasyonu varsayılmamalıdır.
- Yedekleme ve geri yükleme adımlarını gerçek kullanımdan önce test edin.

## Geçmiş dosyalar

Kişisel çalışma dosyaları ve referans ekran görüntüleri güncel ağaçtan kaldırılmıştır. Bu işlem eski Git commit'lerini, üçüncü taraf klonlarını veya önceki dağıtımları temizlemez. Geçmiş, dağıtım ve önbellek kopyaları ayrıca incelenmelidir. Açığa çıkmış erişim bilgileri varsa yenilenmelidir.
