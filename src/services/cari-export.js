import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ── Field extractors (self-contained to avoid circular deps) ──
function _getAmount(inv) { return inv.PayableAmount || inv.payableAmount || inv.TotalAmount || inv.totalAmount || inv.amount || 0; }
function _getInvoiceDate(inv) { return inv.IssueDate || inv.issueDate || inv.CreateDate || inv.CreatedDate || ''; }
function _getReceiverName(inv) { return inv.ReceiverName || inv.receiverName || inv.CustomerName || (inv.ReceiverInfo || inv.CustomerInfo || {}).Name || ''; }
function _getSenderName(inv) { return inv.SenderName || inv.senderName || inv.SupplierName || (inv.SenderInfo || {}).Name || ''; }

function _getTaxExclusive(inv) {
  const info = inv.InvoiceInfo || inv.invoiceInfo || inv;
  return parseFloat(info.TaxExclusiveAmount || info.taxExclusiveAmount || inv.TaxExclusiveAmount || inv.taxExclusiveAmount || 0);
}
function _getTaxTotal(inv) {
  const info = inv.InvoiceInfo || inv.invoiceInfo || inv;
  return parseFloat(info.TaxTotalAmount || info.taxTotalAmount || info.TaxTotal || info.taxTotal || inv.TaxTotalAmount || inv.taxTotalAmount || inv.TaxTotal || inv.taxTotal || 0);
}

// Fatura objesinden KDV oranını bulmaya çalış (InvoiceLines, KDVPercent, vb.)
function _detectKdvRate(inv) {
  // 1. InvoiceLines → Taxes → Percent
  const lines = inv.InvoiceLines || inv.invoiceLines || [];
  for (const l of lines) {
    const pct = l.KDVPercent || l.kdvPercent || l.TaxPercent || l.taxPercent
      || l.Taxes?.[0]?.Percent || l.taxes?.[0]?.percent;
    if (pct && pct > 0) return parseFloat(pct);
  }
  // 2. Top-level KDVPercent
  if (inv.KDVPercent > 0) return parseFloat(inv.KDVPercent);
  if (inv.kdvPercent > 0) return parseFloat(inv.kdvPercent);
  if (inv.TaxPercent > 0) return parseFloat(inv.TaxPercent);
  return null; // bulunamadı
}

function _roundRate(raw) {
  if (raw <= 2) return 1;
  if (raw <= 14) return 10;
  return 20;
}

// KDV kırılımı: matrah, oran, KDV tutarı hesapla
function _calcKdv(inv) {
  const total = parseFloat(_getAmount(inv) || 0);
  if (!total || total <= 0) return { matrah: 0, kdvOrani: 0, kdvTutar: 0 };

  let matrah = _getTaxExclusive(inv);
  let kdvTutar = _getTaxTotal(inv);

  // Case 1: Hem matrah hem KDV API'den geldi
  if (matrah > 0 && kdvTutar > 0) {
    return { matrah, kdvOrani: _roundRate((kdvTutar / matrah) * 100), kdvTutar };
  }

  // Case 2: Sadece matrah var → KDV = toplam - matrah
  if (matrah > 0 && kdvTutar <= 0) {
    kdvTutar = total - matrah;
    if (kdvTutar > 0) return { matrah, kdvOrani: _roundRate((kdvTutar / matrah) * 100), kdvTutar };
    return { matrah, kdvOrani: 0, kdvTutar: 0 };
  }

  // Case 3: Sadece KDV tutarı var → matrah = toplam - KDV
  if (matrah <= 0 && kdvTutar > 0) {
    matrah = total - kdvTutar;
    if (matrah > 0) return { matrah, kdvOrani: _roundRate((kdvTutar / matrah) * 100), kdvTutar };
  }

  // Case 4: Hiçbiri yok → fatura satırlarından oranı bul
  const lines = inv.InvoiceLines || inv.invoiceLines || [];
  if (lines.length > 0) {
    let totalNet = 0, totalTax = 0;
    for (const l of lines) {
      const qty = l.Quantity || l.quantity || 0;
      const price = l.UnitPrice || l.unitPrice || l.Price || l.price || 0;
      const allowance = l.AllowanceTotal || l.allowanceTotal || 0;
      const lineNet = (qty * price) - allowance;
      const lineTax = l.Taxes?.[0]?.Total || l.taxes?.[0]?.total || l.KDVTotal || l.kdvTotal || 0;
      totalNet += lineNet;
      totalTax += parseFloat(lineTax) || 0;
    }
    if (totalNet > 0 && totalTax > 0) {
      return { matrah: totalNet, kdvOrani: _roundRate((totalTax / totalNet) * 100), kdvTutar: totalTax };
    }
  }

  // Case 5: Son çare — varsayılan %20
  const m = total / 1.20;
  return { matrah: m, kdvOrani: 20, kdvTutar: total - m };
}

function _getMovementDate(item) {
  return item?.date || _getInvoiceDate(item) || '';
}

/**
 * Normalizes invoices based on their source (gelen/giden) and formats exactly to the requested Template
 */
function normalizeForCari(inv, source, isSpecificCustomer) {
  const isCollection = !!inv?._isCollection;
  const isGelen = source === 'gelen';
  const name = isGelen ? _getSenderName(inv) : _getReceiverName(inv);
  const dateStr = _getMovementDate(inv);
  const amount = parseFloat(isCollection ? (inv.amount || 0) : (_getAmount(inv) || 0));

  let dateObj = new Date();
  let ayAdi = 'Bilinmeyen';
  let ayNo = 1;
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      dateObj = d;
      ayAdi = monthNames[d.getMonth()];
      ayNo = d.getMonth() + 1;
    }
  }

  // İstediğin gibi, özel müşteriyse direkt "Ocak satış", çoklu excelse ismin yayına ekleniyor
  const prefix = isSpecificCustomer ? '' : `${name || 'İsimsiz'} - `;
  const aciklama = isCollection
    ? (inv.description || `${prefix}${ayAdi} tahsilat`)
    : `${prefix}${ayAdi} ${isGelen ? 'alış' : 'satış'}`;

  const tur = isCollection ? (inv.type || 'Tahsilat') : 'Fatura';
  const borc = isCollection ? 0 : (!isGelen ? amount : 0);
  const alacak = isCollection ? amount : (isGelen ? amount : 0);

  // KDV kırılımı (sadece faturalar için) — inv.raw varsa ham fatura objesini kullan
  let matrah = 0, kdvOrani = 0, kdvTutar = 0;
  if (!isCollection) {
    const rawInv = inv.raw || inv;
    const kdv = _calcKdv(rawInv);
    matrah = kdv.matrah;
    kdvOrani = kdv.kdvOrani;
    kdvTutar = kdv.kdvTutar;
  }

  return {
    Tarih: dateObj,
    Tur: tur,
    Aciklama: aciklama,
    Matrah: matrah,
    KdvOrani: kdvOrani,
    KdvTutar: kdvTutar,
    Borc: borc,
    Alacak: alacak,
    AyNo: ayNo,
    AyAdi: ayAdi
  };
}

/**
 * Yeni Cari Defter Exceli (Resimdeki formatın birebir kopyası)
 */
function createCariWorkbook(records, titleText) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Hareket Girişi');

  // Sütun genişlikleri ve Key atamaları
  worksheet.columns = [
    { key: 'A', width: 13 }, // Tarih
    { key: 'B', width: 12 }, // Tür
    { key: 'C', width: 35 }, // Açıklama
    { key: 'D', width: 18 }, // Matrah (KDV Hariç)
    { key: 'E', width: 10 }, // KDV %
    { key: 'F', width: 18 }, // KDV Tutarı
    { key: 'G', width: 18 }, // Borç (Toplam Satış)
    { key: 'H', width: 18 }, // Alacak (Tahsilat)
    { key: 'I', width: 10 }, // Ay No
    { key: 'J', width: 12 }, // Ay Adı
    { key: 'K', width: 18 }  // Kontrol
  ];

  // 1. Satır: Başlık (Koyu Mavi, Beyaz Yazı)
  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = titleText;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 25;

  // 2. Satır: Not ve Sarı Kısım
  const noteLabelCell = worksheet.getCell('A2');
  noteLabelCell.value = 'Not';
  noteLabelCell.font = { name: 'Calibri', size: 10, bold: true };
  noteLabelCell.alignment = { vertical: 'bottom', horizontal: 'left' };

  worksheet.mergeCells('B2:H2');
  const noteDescCell = worksheet.getCell('B2');
  noteDescCell.value = 'Matrah = KDV hariç tutar / KDV = vergi tutarı / Borç (Satış) = toplam fatura / Alacak (Tahsilat) = gelen ödeme';
  noteDescCell.font = { name: 'Calibri', size: 10 };
  noteDescCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE699' } };
  noteDescCell.alignment = { vertical: 'bottom', horizontal: 'left' };

  // 3. Satır: Başlıklar
  const headerRow = worksheet.getRow(3);
  headerRow.values = ['Tarih', 'Tür', 'Açıklama', 'Matrah', 'KDV %', 'KDV Tutarı', 'Borç (Satış)', 'Alacak (Tahsilat)', 'Ay No', 'Ay Adı', 'Kontrol'];
  
  ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3', 'I3', 'J3', 'K3'].forEach(c => {
    const cell = worksheet.getCell(c);
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  // Filtreleme oku
  worksheet.autoFilter = 'A3:K3';

  // Verilerin Yazılması (4. Satır ve sonrası)
  let startRow = 4;
  const targetRowCount = Math.max(records.length + 20, 150); // El ile girilecek verilere yer açmak için en az 150 satır

  for (let idx = 0; idx < targetRowCount; idx++) {
    const rowNum = startRow + idx;
    const row = worksheet.getRow(rowNum);
    const record = records[idx];

    if (record) {
      row.getCell('A').value = record.Tarih;
      row.getCell('B').value = record.Tur;
      row.getCell('C').value = record.Aciklama;

      // Matrah / KDV kırılımı (sadece faturalarda dolu)
      row.getCell('D').value = record.Matrah > 0 ? record.Matrah : null;
      row.getCell('E').value = record.KdvOrani > 0 ? record.KdvOrani : null;
      row.getCell('F').value = record.KdvTutar > 0 ? record.KdvTutar : null;

      row.getCell('G').value = record.Borc > 0 ? record.Borc : null;
      row.getCell('H').value = record.Alacak > 0 ? record.Alacak : null;
    }

    // I (Ay No) ve J (Ay Adı) her zaman formül:
    row.getCell('I').value = { formula: `IF(A${rowNum}="","",MONTH(A${rowNum}))` };
    row.getCell('J').value = { formula: `IF(I${rowNum}="","",CHOOSE(I${rowNum},"Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"))` };

    // K sütunu Kontrol formülü: Borç(G) - Alacak(H)
    row.getCell('K').value = { formula: `IF(AND(G${rowNum}="",H${rowNum}=""),"",G${rowNum}-H${rowNum})` };

    // Tek / Çift satır mantığı (Açık Mavi Arka plan - Zebra deseni)
    const isEven = rowNum % 2 === 0;

    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(col => {
      const cell = row.getCell(col);

      // Çerçeve (Açık Mavi Excel stili)
      cell.border = {
        top: {style:'thin', color: {argb:'FFB4C6E7'}},
        bottom: {style:'thin', color: {argb:'FFB4C6E7'}},
        left: {style:'thin', color: {argb:'FFB4C6E7'}},
        right: {style:'thin', color: {argb:'FFB4C6E7'}}
      };

      // Zebra deseni (Even satırlara açık mavi)
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      }

      // Font renkleri: İlk 8 kolon mavi, diğerleri standart
      if (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(col)) {
         cell.font = { name: 'Calibri', color: { argb: 'FF0000FF' } };
      } else {
         cell.font = { name: 'Calibri' };
      }

      // Formatlamalar
      if (['D', 'F', 'G', 'H'].includes(col)) {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      } else if (col === 'E') {
        cell.numFmt = '0"%"';
        cell.alignment = { horizontal: 'center' };
      } else if (col === 'K') {
        cell.numFmt = '#,##0.00;[Red]\\(#,##0.00\\)';
        cell.alignment = { horizontal: 'right' };
      } else if (col === 'A') {
        cell.numFmt = 'dd.mm.yyyy';
        cell.alignment = { horizontal: 'center' };
      } else if (['I', 'J'].includes(col)) {
        cell.alignment = { horizontal: 'right' };
      } else {
        cell.alignment = { horizontal: 'left' };
      }
    });
  }

  // ============================================
  // 2. SAYFA: MUAVİN (EKRAN GÖRÜNTÜSÜNDEKİ FORMAT)
  // ============================================
  const muavinSheet = workbook.addWorksheet('Muavin');

  // Muavin Sütun Genişlikleri
  muavinSheet.columns = [
    { key: 'A', width: 13 }, // Tarih
    { key: 'B', width: 12 }, // Tür
    { key: 'C', width: 45 }, // Açıklama
    { key: 'D', width: 18 }, // Borç (Satış)
    { key: 'E', width: 18 }, // Alacak (Tahsilat)
    { key: 'F', width: 18 }  // Bakiye
  ];

  // 1. Satır: Başlık
  muavinSheet.mergeCells('A1:F2');
  const muTitle = muavinSheet.getCell('A1');
  muTitle.value = 'MUAVİN / CARİ HAREKETLER';
  muTitle.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  muTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  muTitle.alignment = { vertical: 'middle', horizontal: 'center' };

  // 3. Satır: Başlıklar
  const muHeader = muavinSheet.getRow(3);
  muHeader.values = ['Tarih', 'Tür', 'Açıklama', 'Borç (Satış)', 'Alacak (Tahsilat)', 'Bakiye'];
  
  ['A3', 'B3', 'C3', 'D3', 'E3', 'F3'].forEach(c => {
    const cell = muavinSheet.getCell(c);
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  muavinSheet.autoFilter = 'A3:F3';

  // Verilerin 'Hareket Girişi' sayfasından dinamik çekilmesi
  let mStart = 4;
  for (let i = 0; i < targetRowCount; i++) {
    let mRow = mStart + i;
    let hRow = startRow + i; // Hareket Girişi sayfasındaki karşılığı (5, 6, ...)
    const row = muavinSheet.getRow(mRow);

    // Hareket girişinde satır boş ise "00.01.1900" ve "0" yazmaması için EĞER(şart;"";değer) mantığı:
    row.getCell('A').value = { formula: `IF('Hareket Girişi'!A${hRow}="","",'Hareket Girişi'!A${hRow})` };
    row.getCell('B').value = { formula: `IF('Hareket Girişi'!B${hRow}="","",'Hareket Girişi'!B${hRow})` };
    row.getCell('C').value = { formula: `IF('Hareket Girişi'!C${hRow}="","",'Hareket Girişi'!C${hRow})` };
    row.getCell('D').value = { formula: `IF('Hareket Girişi'!A${hRow}="","",IF('Hareket Girişi'!G${hRow}="",0,'Hareket Girişi'!G${hRow}))` };
    row.getCell('E').value = { formula: `IF('Hareket Girişi'!A${hRow}="","",IF('Hareket Girişi'!H${hRow}="",0,'Hareket Girişi'!H${hRow}))` };

    // F Sütunu (Kümülatif Bakiye Formülü)
    if (i === 0) {
      // İlk satır: Bakiye = Borç - Alacak (N() formülü kullanılarak boşlukların 0 sayılması sağlandı, #DEĞER! hatası çözüldü)
      row.getCell('F').value = { formula: `IF(A${mRow}="","",N(D${mRow})-N(E${mRow}))` };
    } else {
      // Diğer satırlar: Üstteki bakiye + bu satırın borcu - bu satırın alacağı
      row.getCell('F').value = { formula: `IF(A${mRow}="","",N(F${mRow-1})+N(D${mRow})-N(E${mRow}))` };
    }

    const isEven = mRow % 2 === 0;

    ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
      const cell = row.getCell(col);

      // Kenarlık
      cell.border = {
        top: {style:'thin', color: {argb:'FFB4C6E7'}},
        bottom: {style:'thin', color: {argb:'FFB4C6E7'}},
        left: {style:'thin', color: {argb:'FFB4C6E7'}},
        right: {style:'thin', color: {argb:'FFB4C6E7'}}
      };

      // Zebra Deseni
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      }

      cell.font = { name: 'Calibri', color: { argb: 'FF000000' } }; // Muavinde siyaha yakın standart

      // Formatlamalar
      if (['D', 'E', 'F'].includes(col)) {
        // Muhasebe formatı (sıfır olan değerlerde çizgi (-) çıkar)
        cell.numFmt = '#,##0.00;-#,##0.00;"-"';
        cell.alignment = { horizontal: 'right' };
      } else if (col === 'A') {
        cell.numFmt = 'dd.mm.yyyy';
        cell.alignment = { horizontal: 'center' };
      } else {
        cell.alignment = { horizontal: 'left' };
      }
    });
  }

  // 1000 satırın altındaki TOPLAM alanı
  let totalRowIdx = mStart + targetRowCount;
  const tRow = muavinSheet.getRow(totalRowIdx);
  
  tRow.getCell('C').value = 'TOPLAM';
  tRow.getCell('C').font = { name: 'Calibri', bold: true, size: 12 };
  tRow.getCell('C').alignment = { horizontal: 'right', vertical: 'middle' };

  // D kolonunun (Borç) Toplamı
  tRow.getCell('D').value = { formula: `SUM(D${mStart}:D${totalRowIdx-1})` };
  // E kolonunun (Alacak) Toplamı
  tRow.getCell('E').value = { formula: `SUM(E${mStart}:E${totalRowIdx-1})` };
  // F (Bakiye) Toplamı -> (Toplam Borç - Toplam Alacak)
  tRow.getCell('F').value = { formula: `D${totalRowIdx}-E${totalRowIdx}` };

  ['D', 'E', 'F'].forEach(col => {
    const totalCell = tRow.getCell(col);
    totalCell.font = { name: 'Calibri', bold: true, size: 12 };
    totalCell.numFmt = '#,##0.00';
    totalCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF1DE' } }; // Hafif ayrımsatıcı arkaplan
  });

  // ============================================
  // 3. SAYFA: ÖZET DASHBOARD
  // ============================================
  const dashSheet = workbook.addWorksheet('Özet Dashboard');

  dashSheet.columns = [
    { key: 'A', width: 22 },
    { key: 'B', width: 22 },
    { key: 'C', width: 22 },
    { key: 'D', width: 22 },
    { key: 'E', width: 22 },
    { key: 'F', width: 22 },
    { key: 'G', width: 22 },
    { key: 'H', width: 22 }
  ];

  // 1. Satır: Başlık
  dashSheet.mergeCells('A1:I1');
  const dTitleUrl = dashSheet.getCell('A1');
  dTitleUrl.value = `${titleText} ÖZETİ`;
  dTitleUrl.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  dTitleUrl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  dTitleUrl.alignment = { vertical: 'middle', horizontal: 'center' };
  dashSheet.getRow(1).height = 25;

  dashSheet.mergeCells('A2:I2');
  const dInfo = dashSheet.getCell('A2');
  dInfo.value = 'Canlı Formüllü Versiyon - Hareket Girişi sayfasına veri girildiğinde otomatik güncellenir.';
  dInfo.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF808080' } };

  // Üst Kartlar (Row 4-5) - A, C, E, G sütunlarına göre yerleşim
  const maxH = startRow + targetRowCount - 1; // Hareket Girişi son satır no (örnek: 154)

  dashSheet.mergeCells('A4:B4'); dashSheet.getCell('A4').value = 'Toplam Satış';
  dashSheet.mergeCells('A5:B5'); dashSheet.getCell('A5').value = { formula: `SUM('Hareket Girişi'!G4:G${maxH})` };

  dashSheet.mergeCells('C4:D4'); dashSheet.getCell('C4').value = 'Toplam Tahsilat';
  dashSheet.mergeCells('C5:D5'); dashSheet.getCell('C5').value = { formula: `SUM('Hareket Girişi'!H4:H${maxH})` };

  dashSheet.mergeCells('E4:F4'); dashSheet.getCell('E4').value = 'Kapanış Bakiye';
  dashSheet.mergeCells('E5:F5'); dashSheet.getCell('E5').value = { formula: `A5-C5` };

  dashSheet.mergeCells('G4:H4'); dashSheet.getCell('G4').value = 'Cari Durum';
  dashSheet.mergeCells('G5:H5'); dashSheet.getCell('G5').value = { formula: `IF(E5>0,"ALACAKLIYIZ",IF(E5<0,"BORÇLUYUZ","KAPANDI"))` };

  // Kart renklendirme ve stil
  const cardHeaders = [
    { cell: 'A4', bg: 'FFD9E1F2' }, // Açık Mavi
    { cell: 'C4', bg: 'FFE2EFDA' }, // Açık Yeşil
    { cell: 'E4', bg: 'FFFCE4D6' }, // Açık Şeftali
    { cell: 'G4', bg: 'FFD9E1F2' }  // Açık Mavi
  ];
  cardHeaders.forEach(ch => {
    const c = dashSheet.getCell(ch.cell);
    c.font = { name: 'Calibri', bold: true, size: 11 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ch.bg } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  ['A5', 'C5', 'E5', 'G5'].forEach(cellRef => {
    const c = dashSheet.getCell(cellRef);
    c.font = { name: 'Calibri', bold: true, size: 14 };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    if (cellRef !== 'G5') c.numFmt = '#,##0.00;-#,##0.00;"-"';
  });

  // Dönemsel Özet (Row 9-13)
  dashSheet.mergeCells('A9:H9');
  const dSummary = dashSheet.getCell('A9');
  dSummary.value = 'DÖNEMSEL ÖZET';
  dSummary.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  dSummary.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  dSummary.alignment = { vertical: 'middle', horizontal: 'center' };

  dashSheet.getCell('A10').value = 'Kalem';
  dashSheet.getCell('A11').value = 'Satış';
  dashSheet.getCell('A12').value = 'Tahsilat';
  dashSheet.getCell('A13').value = 'Net Bakiye';
  ['A10','A11','A12','A13'].forEach(cl => dashSheet.getCell(cl).font = { bold: true });

  // Aktif ayları bul ve dinamik sütun oluştur
  const monthNamesArr = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  let activeMonths = [...new Set(records.map(r => r.AyNo))].filter(Boolean).sort((a,b) => a-b);
  if (activeMonths.length === 0) activeMonths = [1, 2, 3]; // Örnek olarak en az 3 ay gelsin
  
  let colIdx = 2; // Başlangıç kolonu 'B' (Index 2)
  activeMonths.forEach(mNum => {
    const colChar = String.fromCharCode(64 + colIdx); // B, C, vs...
    dashSheet.getCell(`${colChar}10`).value = monthNamesArr[mNum];
    dashSheet.getCell(`${colChar}10`).font = { bold: true };
    dashSheet.getCell(`${colChar}10`).alignment = { horizontal: 'center' };

    // Formüller: ÇOKETOPLA (SUMIFS)
    dashSheet.getCell(`${colChar}11`).value = { formula: `SUMIFS('Hareket Girişi'!$G$4:$G$${maxH},'Hareket Girişi'!$I$4:$I$${maxH},${mNum})` };
    dashSheet.getCell(`${colChar}12`).value = { formula: `SUMIFS('Hareket Girişi'!$H$4:$H$${maxH},'Hareket Girişi'!$I$4:$I$${maxH},${mNum})` };
    dashSheet.getCell(`${colChar}13`).value = { formula: `IF(${colChar}11="",0,${colChar}11)-IF(${colChar}12="",0,${colChar}12)` };

    dashSheet.getCell(`${colChar}11`).numFmt = '#,##0.00;-#,##0.00;"-"';
    dashSheet.getCell(`${colChar}12`).numFmt = '#,##0.00;-#,##0.00;"-"';
    dashSheet.getCell(`${colChar}13`).numFmt = '#,##0.00;[Red](#,##0.00);"-"';
    
    colIdx++;
  });

  const gtChar = String.fromCharCode(64 + colIdx); // Genel Toplam sütunu
  dashSheet.getCell(`${gtChar}10`).value = 'Genel Toplam';
  dashSheet.getCell(`${gtChar}10`).font = { bold: true };
  const lastMChar = String.fromCharCode(64 + colIdx - 1); // B11:E11 vb kapsayıcı son sütun
  
  dashSheet.getCell(`${gtChar}11`).value = { formula: `SUM(B11:${lastMChar}11)` };
  dashSheet.getCell(`${gtChar}12`).value = { formula: `SUM(B12:${lastMChar}12)` };
  dashSheet.getCell(`${gtChar}13`).value = { formula: `SUM(B13:${lastMChar}13)` };
  ['11','12','13'].forEach(r => dashSheet.getCell(`${gtChar}${r}`).numFmt = '#,##0.00;-#,##0.00;"-"');

  // GRAFİK İÇİN YARDIMCI TABLO (F16-G16 civarı)
  dashSheet.mergeCells('E15:F15');
  const graphTitle = dashSheet.getCell('E15');
  graphTitle.value = 'Yürüyen Bakiye (Grafik İçin Formüller)';
  graphTitle.font = { bold: true, color: { argb: 'FF808080' } };
  graphTitle.alignment = { horizontal: 'center' };

  dashSheet.getCell('E16').value = 'Tarih';
  dashSheet.getCell('F16').value = 'Bakiye';
  dashSheet.getCell('E16').font = { bold: true };
  dashSheet.getCell('F16').font = { bold: true };
  dashSheet.getCell('E16').alignment = { horizontal: 'center' };
  dashSheet.getCell('F16').alignment = { horizontal: 'right' };

  // Son 60 hareketi grafiğe formülle bağla (Kütüphane grafik çizemediği için DataBar ekleyeceğiz)
  for (let c = 0; c < 60; c++) { 
    const rNo = 17 + c;
    const mNo = 4 + c; // Muavinden satırlar
    dashSheet.getCell(`E${rNo}`).value = { formula: `IF('Muavin'!A${mNo}="","",'Muavin'!A${mNo})` };
    dashSheet.getCell(`F${rNo}`).value = { formula: `IF('Muavin'!A${mNo}="","",N('Muavin'!F${mNo}))` };
    dashSheet.getCell(`E${rNo}`).numFmt = 'dd.mm.yyyy';
    dashSheet.getCell(`F${rNo}`).numFmt = '#,##0.00';
  }

  // Görsel bir grafik oluşmadığı için, Bakiyelerin üzerine "Hücre İçi Grafik (Veri Çubuğu)" ekleyelim
  dashSheet.addConditionalFormatting({
    ref: 'F17:F76',
    rules: [
      {
        type: 'dataBar',
        cfvo: [{ type: 'min' }, { type: 'max' }],
        gradient: true,
        color: { argb: 'FF5B9BD5' }
      }
    ]
  });

  // ============================================
  // DİNAMİK AY SAYFALARI (Sadece faturası olan aylar için)
  // ============================================
  activeMonths.forEach(mNum => {
    const mName = monthNamesArr[mNum]; // "Ocak", "Şubat"...
    if (!mName) return;

    const mSheet = workbook.addWorksheet(mName);

    mSheet.columns = [
      { key: 'A', width: 13 }, // Tarih
      { key: 'B', width: 12 }, // Tür
      { key: 'C', width: 35 }, // Açıklama
      { key: 'D', width: 18 }, // Borç
      { key: 'E', width: 18 }, // Alacak
      { key: 'F', width: 18 }  // Net
    ];

    // Başlık
    mSheet.mergeCells('A1:F2');
    const mTitle = mSheet.getCell('A1');
    mTitle.value = `${mName.toUpperCase()} DETAY`;
    mTitle.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    mTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    mTitle.alignment = { vertical: 'middle', horizontal: 'center' };

    // Sütun Başlıkları
    const mHeader = mSheet.getRow(3);
    mHeader.values = ['Tarih', 'Tür', 'Açıklama', 'Borç', 'Alacak', 'Net'];
    
    ['A3','B3','C3','D3','E3','F3'].forEach(c => {
        const cell = mSheet.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
    });
    mSheet.autoFilter = 'A3:F3';

    // Veriler ve Formüller (Hareket Girişinden Ay bazlı eşleştirme - Gapsiz)
    let detailStartRow = 4;
    
    // O aya ait kayıtların Hareket Girişi'ndeki satır numaralarını buluyoruz
    const monthRows = [];
    records.forEach((rec, idx) => {
        if (rec.Tarih && rec.Tarih.getMonth() + 1 === mNum) {
            monthRows.push(startRow + idx); // startRow = 5
        }
    });

    // 150 Satırlık format, ancak sadece ilgili ayın satırları için formül basılacak
    for (let i = 0; i < targetRowCount; i++) {
        let dRow = detailStartRow + i;
        const row = mSheet.getRow(dRow);

        if (i < monthRows.length) {
            const hRow = monthRows[i];
            // Doğrudan o satırı çeken, boşluksuz, canlı hücre bağlantıları
            row.getCell('A').value = { formula: `IF('Hareket Girişi'!A${hRow}="","",'Hareket Girişi'!A${hRow})` };
            row.getCell('B').value = { formula: `IF('Hareket Girişi'!B${hRow}="","",'Hareket Girişi'!B${hRow})` };
            row.getCell('C').value = { formula: `IF('Hareket Girişi'!C${hRow}="","",'Hareket Girişi'!C${hRow})` };
            row.getCell('D').value = { formula: `IF('Hareket Girişi'!G${hRow}="",0,'Hareket Girişi'!G${hRow})` };
            row.getCell('E').value = { formula: `IF('Hareket Girişi'!H${hRow}="",0,'Hareket Girişi'!H${hRow})` };
        } else {
            // Ayın kayıtları bittiyse alt satırlar boş kalsın ama formül hatası vermesin
            row.getCell('A').value = "";
            row.getCell('B').value = "";
            row.getCell('C').value = "";
            row.getCell('D').value = "";
            row.getCell('E').value = "";
        }

        // F Sütunu Hesaplaması = IF(A boş ise; boş; Borç - Alacak) - İstenilen Net mantığı
        row.getCell('F').value = { formula: `IF($A${dRow}="","",$D${dRow}-$E${dRow})` };

        // Formatlar
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
            const cell = row.getCell(col);
            if (['D', 'E'].includes(col)) {
                cell.numFmt = '#,##0.00;-#,##0.00;"-"';
                cell.alignment = { horizontal: 'right' };
            } else if (col === 'F') {
                cell.numFmt = '#,##0.00;[Red](#,##0.00);"-"';
                cell.alignment = { horizontal: 'right' };
            } else if (col === 'A') {
                cell.numFmt = 'dd.mm.yyyy';
                cell.alignment = { horizontal: 'center' };
            }
        });
    }
  });

  // ============================================
  // TAHSİLATLAR SAYFASI (Otomatik, En Sonda ve "Alacak" koşullu)
  // ============================================
  const tSheet = workbook.addWorksheet('Tahsilatlar');
  tSheet.columns = [
    { key: 'A', width: 13 }, // Tarih
    { key: 'B', width: 12 }, // Tür
    { key: 'C', width: 35 }, // Açıklama
    { key: 'D', width: 18 }, // Borç
    { key: 'E', width: 18 }, // Alacak
    { key: 'F', width: 18 }  // Net
  ];

  // Başlık
  tSheet.mergeCells('A1:F2');
  const tTitle = tSheet.getCell('A1');
  tTitle.value = `TAHSİLATLAR DETAY`;
  tTitle.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  tTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  tTitle.alignment = { vertical: 'middle', horizontal: 'center' };

  // Sütun Başlıkları
  const tHeader = tSheet.getRow(3);
  tHeader.values = ['Tarih', 'Tür', 'Açıklama', 'Borç', 'Alacak', 'Net'];
  
  ['A3','B3','C3','D3','E3','F3'].forEach(c => {
      const cell = tSheet.getCell(c);
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
  });
  tSheet.autoFilter = 'A3:F3';

  // Hareket Girişinden formülle çekiyoruz (Öncelikle dolu tahsilatlar, sonra boşluksuz dinamik ekleme yeri)
  let tStartRow = 4;
  
  const tahsilatRows = [];
  records.forEach((rec, idx) => {
      // Alacak>0 ise tahsilat
      if (rec.Alacak && Number(rec.Alacak) > 0) {
          tahsilatRows.push(startRow + idx);
      }
  });
  
  const emptyRows = [];
  for (let i = records.length; i < targetRowCount; i++) {
      emptyRows.push(startRow + i);
  }
  
  const mappedTRows = [...tahsilatRows, ...emptyRows];

  for (let i = 0; i < targetRowCount; i++) {
      let dRow = tStartRow + i;
      const row = tSheet.getRow(dRow);

      if (i < mappedTRows.length) {
          const hRow = mappedTRows[i];
          row.getCell('A').value = { formula: `IF('Hareket Girişi'!H${hRow}>0,'Hareket Girişi'!A${hRow},"")` };
          row.getCell('B').value = { formula: `IF($A${dRow}="","",'Hareket Girişi'!B${hRow})` };
          row.getCell('C').value = { formula: `IF($A${dRow}="","",'Hareket Girişi'!C${hRow})` };
          row.getCell('D').value = { formula: `IF($A${dRow}="","",IF('Hareket Girişi'!G${hRow}="",0,'Hareket Girişi'!G${hRow}))` };
          row.getCell('E').value = { formula: `IF($A${dRow}="","",IF('Hareket Girişi'!H${hRow}="",0,'Hareket Girişi'!H${hRow}))` };
      } else {
          row.getCell('A').value = "";
          row.getCell('B').value = "";
          row.getCell('C').value = "";
          row.getCell('D').value = "";
          row.getCell('E').value = "";
      }

      // Net formülü (- değerler veriyor)
      row.getCell('F').value = { formula: `IF($A${dRow}="","",$D${dRow}-$E${dRow})` };

      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
          const cell = row.getCell(col);
          if (['D', 'E'].includes(col)) {
              cell.numFmt = '#,##0.00;-#,##0.00;"-"';
              cell.alignment = { horizontal: 'right' };
          } else if (col === 'F') {
              cell.numFmt = '#,##0.00;[Red](#,##0.00);"-"';
              cell.alignment = { horizontal: 'right' };
          } else if (col === 'A') {
              cell.numFmt = 'dd.mm.yyyy';
              cell.alignment = { horizontal: 'center' };
          }
      });
  }

  return workbook;
}

export async function exportCariDefter(invoices, source, accountName = '') {
  try {
    const records = invoices.map(i => normalizeForCari(i, source, false)).sort((a,b) => a.Tarih - b.Tarih);
    const title = `${(accountName || 'TÜM').toUpperCase()} - CARİ HAREKETLER (Toplu)`;
    
    const workbook = createCariWorkbook(records, title);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `Cari_Defter_${accountName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(blob, fileName);

    return { success: true, count: records.length };
  } catch (error) {
    console.error('Cari export error:', error);
    return { success: false, error: error.message };
  }
}

export async function exportCustomerCari(invoices, customerName, source) {
  try {
    const records = invoices.map(i => normalizeForCari(i, source, true)).sort((a,b) => a.Tarih - b.Tarih);
    const title = `${customerName.toUpperCase()} - CANLI CARİ SİSTEMİ`;

    const workbook = createCariWorkbook(records, title);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const safeName = customerName.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9]/g, '_');
    const fileName = `${safeName}_Canli_Cari_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(blob, fileName);

    return { success: true, count: records.length };
  } catch (error) {
    console.error('Customer cari export error:', error);
    return { success: false, error: error.message };
  }
}

export async function exportMultiAccountCari(invoices, customerName, accountBreakdown) {
  const _getInvoiceDate = inv => inv.IssueDate || inv.issueDate || inv.CreateDate || inv.CreatedDate || '';
  const _getInvoiceNumber = inv => inv.InvoiceNumber || inv.invoiceNumber || inv.InvoiceSerieOrNumber || '';
  const _getReceiverName = inv => inv.ReceiverName || inv.receiverName || inv.CustomerName || inv.customerName || (inv.CustomerInfo || {}).Name || '';
  const _getAmount = inv => inv.PayableAmount || inv.payableAmount || inv.TotalAmount || inv.totalAmount || 0;

  try {
    const workbook = new ExcelJS.Workbook();
    
    // -----------------------------------------------------
    // 1. SAYFA: HAREKET GİRİŞİ (GRUPLU) - KESİN OLARAK İLK SAYFA
    // -----------------------------------------------------
    const detailSheet = workbook.addWorksheet('Hareket Girişi', { properties: { tabColor: { argb: 'FF00B050' } } });
    
    detailSheet.columns = [
      { key: 'A', width: 15 }, // Tarih
      { key: 'B', width: 25 }, // Fatura No
      { key: 'C', width: 35 }, // Açıklama
      { key: 'D', width: 18 }, // Matrah
      { key: 'E', width: 10 }, // KDV %
      { key: 'F', width: 18 }, // KDV Tutarı
      { key: 'G', width: 18 }, // Borç (KDV Dahil)
    ];

    detailSheet.mergeCells('A1:G1');
    const dhCell = detailSheet.getCell('A1');
    dhCell.value = `${customerName.toUpperCase()} - HESAPLARA GÖRE HAREKET GİRİŞİ`;
    dhCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    dhCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    dhCell.alignment = { vertical: 'middle', horizontal: 'center' };
    detailSheet.getRow(1).height = 25;

    let dRowNo = 3;
    let genelToplam = 0;

    Object.keys(accountBreakdown).forEach(accId => {
      const acc = accountBreakdown[accId];
      const accInvs = invoices.filter(inv => inv._accountId === accId).sort((a, b) => new Date(_getInvoiceDate(a) || 0) - new Date(_getInvoiceDate(b) || 0));
      
      if (accInvs.length === 0) return;

      // Hesap Başlığı
      detailSheet.mergeCells(`A${dRowNo}:G${dRowNo}`);
      const accHeader = detailSheet.getCell(`A${dRowNo}`);
      accHeader.value = `■ ${acc.name.toUpperCase()}`;
      accHeader.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      accHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      accHeader.alignment = { vertical: 'middle', horizontal: 'left' };
      detailSheet.getRow(dRowNo).height = 20;
      dRowNo++;

      // Kolon Başlıkları
      const detailColHeader = detailSheet.getRow(dRowNo);
      detailColHeader.values = ['Tarih', 'Fatura No', 'Açıklama', 'Matrah', 'KDV %', 'KDV Tutarı', 'Borç (Satış)'];
      ['A','B','C','D','E','F','G'].forEach(c => {
        const cell = detailSheet.getCell(`${c}${dRowNo}`);
        cell.font = { name: 'Calibri', size: 11, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.border = { top: {style:'thin'}, bottom: {style:'thin'} };
        if (['D','E','F','G'].includes(c)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });
      dRowNo++;

      let accTotal = 0;

      // Faturalar
      accInvs.forEach(inv => {
        const row = detailSheet.getRow(dRowNo);
        const amount = parseFloat(_getAmount(inv) || 0);
        accTotal += amount;
        
        // Açıklama (Ay formatı)
        const dateStr = _getInvoiceDate(inv);
        let ayAdi = '';
        if (dateStr) {
          const d = new Date(dateStr);
          const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
          if (!isNaN(d.getTime())) {
            ayAdi = monthNames[d.getMonth()];
          }
        }
        const aciklama = ayAdi ? `${ayAdi} Satış` : 'Satış';

        // KDV Kırılımı hesaplama (cari-export.js içindeki _calcKdv ile)
        const kdvInfo = typeof _calcKdv === 'function' ? _calcKdv(inv) : { matrah: 0, kdvOrani: 0, kdvTutar: 0 };

        row.values = [
          dateStr ? new Date(dateStr) : '',
          _getInvoiceNumber(inv),
          aciklama,
          kdvInfo.matrah > 0 ? kdvInfo.matrah : null,
          kdvInfo.kdvOrani > 0 ? kdvInfo.kdvOrani : null,
          kdvInfo.kdvTutar > 0 ? kdvInfo.kdvTutar : null,
          amount > 0 ? amount : null
        ];
        
        row.getCell('A').numFmt = 'dd.mm.yyyy';
        row.getCell('A').alignment = { horizontal: 'center' };
        ['D','F','G'].forEach(col => {
          row.getCell(col).numFmt = '#,##0.00';
          row.getCell(col).alignment = { horizontal: 'right' };
        });
        row.getCell('E').alignment = { horizontal: 'right' };
        
        // Zebra çizgileri
        if (dRowNo % 2 === 0) {
          ['A','B','C','D','E','F','G'].forEach(c => {
            row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
          });
        }
        dRowNo++;
      });

      // Hesap Ara Toplamı
      const subTotalRow = detailSheet.getRow(dRowNo);
      subTotalRow.getCell('F').value = 'Ara Toplam:';
      subTotalRow.getCell('F').font = { bold: true };
      subTotalRow.getCell('F').alignment = { horizontal: 'right' };
      
      subTotalRow.getCell('G').value = accTotal;
      subTotalRow.getCell('G').font = { bold: true, color: { argb: 'FFC00000' } };
      subTotalRow.getCell('G').numFmt = '#,##0.00';
      subTotalRow.getCell('G').alignment = { horizontal: 'right' };
      
      ['A','B','C','D','E','F','G'].forEach(c => {
        subTotalRow.getCell(c).border = { bottom: {style:'medium', color: {argb:'FF808080'}} };
      });

      genelToplam += accTotal;
      dRowNo += 2; // Boşluk
    });

    // GENEL TOPLAM
    const grandTotalRow = detailSheet.getRow(dRowNo);
    detailSheet.mergeCells(`A${dRowNo}:F${dRowNo}`);
    const gtLabel = detailSheet.getCell(`A${dRowNo}`);
    gtLabel.value = 'TÜM HESAPLAR GENEL TOPLAMI:';
    gtLabel.font = { name: 'Calibri', size: 14, bold: true };
    gtLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    
    const gtVal = detailSheet.getCell(`G${dRowNo}`);
    gtVal.value = genelToplam;
    gtVal.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF00B050' } };
    gtVal.numFmt = '#,##0.00';
    gtVal.alignment = { horizontal: 'right', vertical: 'middle' };
    
    grandTotalRow.height = 25;

    // -----------------------------------------------------
    // 2. SAYFA: HESAP ÖZETİ
    // -----------------------------------------------------
    const accSheet = workbook.addWorksheet('Hesap Özeti', { properties: { tabColor: { argb: 'FFC000' } } });
    accSheet.columns = [
      { key: 'A', width: 35 },
      { key: 'B', width: 20 },
      { key: 'C', width: 25 },
    ];

    accSheet.mergeCells('A1:C1');
    const headerCell = accSheet.getCell('A1');
    headerCell.value = `${customerName.toUpperCase()} - HESAP BAZLI SATIŞ ÖZETİ`;
    headerCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
    accSheet.getRow(1).height = 25;

    const colHeader = accSheet.getRow(3);
    colHeader.values = ['Hesap Adı', 'Fatura Adedi', 'Toplam Satış (TRY)'];
    ['A3', 'B3', 'C3'].forEach(c => {
      const cell = accSheet.getCell(c);
      cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    let rowNo = 4;
    let totalInv = 0;
    let totalAmt = 0;
    Object.values(accountBreakdown).sort((a,b) => b.totalAmount - a.totalAmount).forEach(acc => {
      const row = accSheet.getRow(rowNo++);
      row.values = [acc.name, acc.invoiceCount, acc.totalAmount];
      row.getCell('A').font = { bold: true };
      row.getCell('B').alignment = { horizontal: 'center' };
      row.getCell('C').numFmt = '#,##0.00';
      row.getCell('C').font = { color: { argb: 'FF006600' } };
      totalInv += acc.invoiceCount;
      totalAmt += acc.totalAmount;
    });

    const totalRow = accSheet.getRow(rowNo);
    totalRow.values = ['GENEL TOPLAM', totalInv, totalAmt];
    totalRow.font = { bold: true, size: 12 };
    totalRow.getCell('B').alignment = { horizontal: 'center' };
    totalRow.getCell('C').numFmt = '#,##0.00';
    totalRow.getCell('C').font = { color: { argb: 'FF006600' } };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };

    // workbook.views aktif sekmeyi kesinleştirmek için
    workbook.views = [
      {
        x: 0, y: 0, width: 10000, height: 20000,
        firstSheet: 0, activeTab: 0, visibility: 'visible'
      }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const safeName = customerName.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9]/g, '_');
    const fileName = `${safeName}_Cari_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(blob, fileName);

    return { success: true, count: invoices.length };
  } catch (error) {
    console.error('Multi account cari export error:', error);
    return { success: false, error: error.message };
  }
}
