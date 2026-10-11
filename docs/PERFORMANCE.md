# Yerel performans ölçümü

11 Ekim 2026, geliştirici bilgisayarı. Sentetik veriler kullanıldı; üretim hesabına/DB'ye erişilmedi.

| Deney | Sonuç |
|---|---|
| 10.000 tahsilat: 50 satır + tüm kayıtların toplamı | PGlite: 88 / 66 / 62 ms |
| 100.000 tahsilat: 50 satır + tüm kayıtların toplamı | PGlite: 559 / 543 / 529 ms |
| 10.000 hareket: formatlı XLSX üretimi | Chromium Web Worker: 3.076 ms; 934.284 bayt |
| 100.000 hareket: formatlı XLSX üretimi | Chromium Web Worker: 22.629 ms; 9.216.829 bayt |

Dışa aktarma sırasında ana sayfadaki 50 ms aralıklı sayaç sırasıyla 61 ve 451 kez ilerledi. Bu, ağır çalışma sırasında ana iş parçacığının çalışabildiğini doğrular; saha INP ölçümü değildir. Üretilen XLSX dosyaları tarayıcıdan indirildi. İlk 100 bin denemesinde bulunan spread/push kaynaklı çağrı yığını taşması giderildi ve test tekrar geçti.

Sorgu deneyi koleksiyon ağırlıklıdır. 100 bin karışık Nilvera belgesi, tüm arama dağılımları, ağ/Edge/Nilvera gecikmesi, mobil bellek sınırı ve gerçek cihazlar için ayrıca ölçüm gerekir. Bu rakamlar canlı SLA veya Core Web Vitals garantisi değildir.

Tekrarlama:
- `node scripts/benchmark-ledger.mjs`
- PowerShell: `$env:SONVERA_SCALE='1'` ardından `npx playwright test scale.spec.ts`.
- Ölçek testi normal CI'da atlanır. Çıktılar test-results ve .gstack altındadır.
