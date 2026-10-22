# Sonvera'ya Katkıda Bulunun

Hata düzeltmeleri, dokümantasyon, erişilebilirlik ve regresyon testleri için katkılarınızı bekliyoruz. Büyük değişikliklerden önce bir issue açarak beklenen davranışı ve kapsamı konuşun.

## Geliştirme

1. Depoyu fork edin ve değişikliğiniz için bir dal oluşturun.
2. Node.js 22 ile npm ci çalıştırın.
3. .env.example dosyasını .env olarak kopyalayın; izole Supabase ortamı ve sentetik veriler kullanın.
4. Kurulum ve migration sırası için docs/ROLLOUT.md dosyasını inceleyin.

## Pull request

- Somut problemi, değişen davranışı ve doğrulama sonucunu açıklayın.
- İşlevsel bir hata düzeltmesi için anlamlı bir regresyon testi ekleyin.
- npm run lint ve npm run check çalıştırın. Arayüz davranışı değişiyorsa npm run test:e2e ile ilgili senaryoları doğrulayın.
- Finansal işlem, erişim politikası veya migration değişikliğinde geçiş ve geri dönüş etkisini açıklayın.
- İlgisiz değişiklikleri ayrı tutun; mevcut kullanıcı değişikliklerini koruyun.

## Veri ve güvenlik

Gerçek faturalar, dekontlar, banka kayıtları, müşteri bilgileri, sırlar ve üretim ekran görüntüleri eklemeyin. İzinleri ve entegrasyonları üretim hesabında test etmeyin. Güvenlik açıklarını bildirmek için SECURITY.md dosyasını izleyin.

Katkı yaparken eklediğiniz kod ve materyalleri projenin MIT lisansı altında paylaşma hakkına sahip olmanız gerekir. Üçüncü taraf materyallerin kaynak ve lisanslarını belirtin.
