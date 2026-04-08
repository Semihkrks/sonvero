// ══════════════════════════════════════════
// Banka Dekont / Hesap Hareketi Parser
// PDF + Excel → Otomatik Tahsilat Eşleştirme
// ══════════════════════════════════════════
import * as XLSX from 'xlsx';

// ── Türkçe Normalizasyon ──
function normalize(str) {
  if (!str) return '';
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/i̇/g, 'i')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Tarih parse helper (timezone-safe: UTC kullanmaz, doğrudan string döner) ──
function pad2(n) { return String(n).padStart(2, '0'); }

function parseDate(val) {
  if (!val) return null;

  // Excel Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${val.getFullYear()}-${pad2(val.getMonth() + 1)}-${pad2(val.getDate())}`;
  }

  const str = String(val).trim();

  // dd.mm.yyyy veya dd/mm/yyyy
  const dmyMatch = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // yyyy-mm-dd
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }

  // Fallback
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return `${fallback.getFullYear()}-${pad2(fallback.getMonth() + 1)}-${pad2(fallback.getDate())}`;
  }

  return null;
}

// ── Tutar parse helper ──
function parseAmount(val) {
  if (typeof val === 'number') return val > 0 ? val : 0;
  if (!val) return 0;
  const str = String(val).trim()
    .replace(/\s/g, '')
    .replace(/TL|₺|TRY/gi, '')
    .replace(/\./g, '')   // binlik ayırıcı
    .replace(/,/g, '.');  // ondalık
  const n = parseFloat(str);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ══════════════════════════════════════════
// EXCEL PARSER (SheetJS — .xls, .xlsx, HTML-xls hepsini açar)
// ══════════════════════════════════════════
export async function parseExcelStatement(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const transactions = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 2) continue;

    // Header tespiti: ilk 5 satırı tara
    let headerRowIdx = -1;
    let colMap = {};

    for (let r = 0; r < Math.min(5, rows.length); r++) {
      const cells = (rows[r] || []).map((val, idx) => ({ col: idx, val: normalize(String(val || '')) }));

      const dateCol = cells.find(c => /tarih|date|islem.?tarihi|valor/i.test(c.val));
      const amountCol = cells.find(c => /tutar|amount|miktar|alacak|gelen|havale|kredi/i.test(c.val));
      const descCol = cells.find(c => /aciklama|description|detay|musteri|alici|gonderen/i.test(c.val));

      if (dateCol && amountCol) {
        headerRowIdx = r;
        colMap.date = dateCol.col;
        colMap.amount = amountCol.col;
        colMap.desc = descCol?.col ?? null;

        const borcCol = cells.find(c => /borc|debit|giden|odeme/i.test(c.val));
        if (borcCol) colMap.borc = borcCol.col;
        break;
      }
    }

    // Header bulunamazsa akıllı tespit
    if (headerRowIdx < 0) {
      headerRowIdx = -1;
      const sample = rows[0] || [];
      let firstDateCol = null, firstNumCol = null, firstTextCol = null;
      sample.forEach((val, idx) => {
        if (firstDateCol === null && parseDate(val)) firstDateCol = idx;
        else if (firstNumCol === null && typeof val === 'number' && val > 0) firstNumCol = idx;
        else if (firstTextCol === null && typeof val === 'string' && val.length > 3) firstTextCol = idx;
      });
      if (firstDateCol !== null && firstNumCol !== null) {
        colMap.date = firstDateCol;
        colMap.amount = firstNumCol;
        colMap.desc = firstTextCol;
      }
    }

    if (colMap.date === undefined || colMap.amount === undefined) continue;

    // Veri satırlarını oku
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const dateVal = row[colMap.date];
      const amountVal = row[colMap.amount];
      const descVal = colMap.desc !== null ? String(row[colMap.desc] || '') : '';

      // Borç sütunu varsa, borç satırlarını atla
      if (colMap.borc !== undefined) {
        const borcVal = parseAmount(row[colMap.borc]);
        if (borcVal > 0 && parseAmount(amountVal) === 0) continue;
      }

      const date = parseDate(dateVal);
      const amount = parseAmount(amountVal);

      if (!date || !amount) continue;

      transactions.push({
        date,
        amount,
        description: descVal.trim(),
        rawDescription: descVal.trim(),
        source: 'excel'
      });
    }
  }

  return transactions;
}

// ══════════════════════════════════════════
// PDF PARSER
// ══════════════════════════════════════════
export async function parsePdfStatement(file) {
  // Dinamik import: pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist');

  // Worker setup — inline fake worker for browser bundle
  if (typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer, disableWorker: true }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return parseBankStatementText(fullText);
}

// ── Banka dekont metninden transaction çıkarma ──
function parseBankStatementText(text) {
  const transactions = [];
  const lines = text.split('\n');

  // Tarih pattern: dd.mm.yyyy veya dd/mm/yyyy
  const dateRegex = /(\d{1,2}[./-]\d{1,2}[./-]\d{4})/g;
  // Tutar pattern: 1.234,56 veya 1234,56 veya 1234.56
  const amountRegex = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Tarih bul
    const dateMatches = [...line.matchAll(dateRegex)];
    if (dateMatches.length === 0) continue;

    // Tutar bul
    const amountMatches = [...line.matchAll(amountRegex)];
    if (amountMatches.length === 0) continue;

    const date = parseDate(dateMatches[0][1]);
    if (!date) continue;

    // En büyük tutarı al (genellikle işlem tutarı)
    let bestAmount = 0;
    for (const m of amountMatches) {
      const a = parseAmount(m[1]);
      if (a > bestAmount) bestAmount = a;
    }
    if (bestAmount <= 0) continue;

    // Açıklama: tarih ve tutarları çıkarınca kalan metin
    let desc = line;
    for (const m of dateMatches) desc = desc.replace(m[0], '');
    for (const m of amountMatches) desc = desc.replace(m[0], '');
    desc = desc.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();

    transactions.push({
      date,
      amount: bestAmount,
      description: desc,
      rawDescription: line.trim(),
      source: 'pdf'
    });
  }

  return transactions;
}

// ══════════════════════════════════════════
// MÜŞTERİ EŞLEŞTİRME
// ══════════════════════════════════════════
export function matchTransactionsToCustomers(transactions, customerMap) {
  if (!transactions?.length || !customerMap) {
    return { matched: [], unmatched: transactions || [] };
  }

  // Müşteri isimlerini normalize et
  const customerEntries = Object.entries(customerMap).map(([key, customer]) => ({
    key,
    name: customer.name,
    taxNo: customer.taxNo,
    normalizedName: normalize(customer.name),
    // İsim parçaları (kısmi eşleşme için)
    nameParts: normalize(customer.name).split(' ').filter(p => p.length > 2)
  }));

  const matched = [];
  const unmatched = [];

  for (const tx of transactions) {
    const normalizedDesc = normalize(tx.description);
    // Açıklama kelimelerini de çıkar (kısaltma eşleşmesi için)
    const descParts = normalizedDesc.split(' ').filter(p => p.length > 2);
    let bestMatch = null;
    let bestScore = 0;

    for (const entry of customerEntries) {
      let score = 0;

      // 1. Tam isim eşleşmesi (çift yönlü: açıklama müşteriyi içeriyor VEYA müşteri açıklamayı içeriyor)
      if (normalizedDesc.includes(entry.normalizedName) || entry.normalizedName.includes(normalizedDesc)) {
        score = 100;
      }
      // 2. VKN eşleşmesi
      else if (entry.taxNo && entry.taxNo !== '—' && tx.description.includes(entry.taxNo)) {
        score = 95;
      }
      // 3. Kısmi eşleşme: müşterinin kelimelerinin çoğu açıklamada var mı
      else if (entry.nameParts.length >= 2) {
        const fwdMatch = entry.nameParts.filter(p => normalizedDesc.includes(p));
        const fwdRatio = fwdMatch.length / entry.nameParts.length;
        // Ters yön: açıklamadaki kelimelerin çoğu müşteri adında var mı
        const revMatch = descParts.filter(p => entry.normalizedName.includes(p));
        const revRatio = descParts.length > 0 ? revMatch.length / descParts.length : 0;
        const bestRatio = Math.max(fwdRatio, revRatio);
        if (bestRatio >= 0.5) {
          score = Math.round(bestRatio * 90);
        }
      }
      // 4. Tek kelime eşleşmesi
      else if (entry.nameParts.length === 1 && entry.nameParts[0].length > 3) {
        if (normalizedDesc.includes(entry.nameParts[0]) || entry.normalizedName.includes(normalizedDesc)) {
          score = 60;
        }
      }
      // 5. Açıklamadaki anlamlı kelimelerin müşteri adında geçme oranı
      if (score === 0 && descParts.length >= 1) {
        const hits = descParts.filter(p => p.length > 3 && entry.normalizedName.includes(p));
        if (hits.length >= 1 && hits.length / descParts.length >= 0.4) {
          score = Math.round((hits.length / descParts.length) * 70);
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch && bestScore >= 40) {
      matched.push({
        ...tx,
        matchedCustomerKey: bestMatch.key,
        matchedCustomerName: bestMatch.name,
        matchedCustomerTaxNo: bestMatch.taxNo,
        matchScore: bestScore,
        selected: true // Varsayılan: seçili
      });
    } else {
      unmatched.push(tx);
    }
  }

  // Skora göre sırala (yüksek skor önce)
  matched.sort((a, b) => b.matchScore - a.matchScore);

  return { matched, unmatched };
}

// ══════════════════════════════════════════
// METİN (TEXT/PASTE) PARSER
// ══════════════════════════════════════════
// Format:
//   Müşteri Adı
//   dd/mm/yyyy: 1.234,56 TL
//   dd/mm/yyyy: 5.678,90 TL
//   Toplam: xxx TL   (atlanır)
//
//   Başka Müşteri Adı
//   dd/mm/yyyy: 1.000,00 TL
//   ...
export function parseTextStatement(text) {
  if (!text || !text.trim()) return [];

  const transactions = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Tarih + tutar satırı: dd/mm/yyyy: 1.234,56 TL  veya  dd.mm.yyyy: 1.234,56
  const txLineRegex = /^(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s*[:;-]?\s*(.+)/;
  // Toplam satırını atla
  const totalLineRegex = /^toplam\s*[:;-]/i;
  // Tutar: 1.234.567,89 veya 300.000,00 veya 500000,00
  const amountInTextRegex = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/;

  let currentCustomer = null;

  for (const line of lines) {
    // Toplam satırını atla
    if (totalLineRegex.test(line)) continue;

    // Tarih + tutar satırı mı?
    const txMatch = line.match(txLineRegex);
    if (txMatch) {
      const date = parseDate(txMatch[1]);
      const restText = txMatch[2];
      const amountMatch = restText.match(amountInTextRegex);
      const amount = amountMatch ? parseAmount(amountMatch[1]) : 0;

      if (date && amount > 0 && currentCustomer) {
        transactions.push({
          date,
          amount,
          description: currentCustomer,
          displayDescription: 'Gelen Ödeme',
          rawDescription: `${currentCustomer} — ${line}`,
          source: 'text'
        });
      }
      continue;
    }

    // Tarih veya tutar satırı değilse → müşteri adı olabilir
    // En az 3 karakter ve harf içermeli
    if (line.length >= 3 && /[a-zA-ZğüşöçıİĞÜŞÖÇ]/.test(line)) {
      currentCustomer = line
        .replace(/\(.*?\)/g, '')  // Parantez içini temizle opsiyonel
        .trim() || line;
    }
  }

  return transactions;
}

// ══════════════════════════════════════════
// ANA PARSE FONKSİYONU
// ══════════════════════════════════════════
async function detectFileType(file) {
  // Önce magic bytes ile kontrol et (daha güvenilir)
  try {
    const slice = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(slice);

    // PDF: %PDF başlar
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return 'pdf';
    }
    // ZIP (xlsx): PK başlar
    if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
      return 'xlsx';
    }
    // XLS (legacy): D0 CF 11 E0
    if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
      return 'xls';
    }
  } catch { /* fallback to name */ }

  // Fallback: dosya adı
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx';

  return 'unknown';
}

export async function parseStatementFile(file) {
  if (!file) throw new Error('Dosya seçilmedi.');

  const type = await detectFileType(file);

  if (type === 'xlsx' || type === 'xls') {
    return parseExcelStatement(file);
  }

  if (type === 'pdf') {
    return parsePdfStatement(file);
  }

  throw new Error('Desteklenmeyen dosya formatı. Lütfen PDF veya Excel (.xlsx) yükleyin.');
}
