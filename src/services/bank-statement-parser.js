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
// 450.000,00 (TR) ve 299,000.00 (banka/US) ve iOS "1500.50" aynı kuralla okunur.
// İki ayırıcı varsa sonuncusu ondalıktır. Tek ayırıcıdan sonra 1–2 hane ondalık,
// 3 hane veya tekrarlayan grup binliktir.
export function parseUserAmount(val) {
  if (typeof val === 'number') return Number.isFinite(val) && val > 0 ? val : 0;
  if (!val) return 0;
  let str = String(val).trim()
    .replace(/\s/g, '')
    .replace(/TL|₺|TRY/gi, '')
    .replace(/[.,]+$/, '');
  if (!str) return 0;

  const lastDot = str.lastIndexOf('.');
  const lastComma = str.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) str = str.replace(/\./g, '').replace(',', '.');
    else str = str.replace(/,/g, '');
  } else if (lastComma !== -1 || lastDot !== -1) {
    const sep = lastComma !== -1 ? ',' : '.';
    const parts = str.split(sep);
    const frac = parts[parts.length - 1];
    const grouped = frac.length === 3 && parts.slice(1).every(p => p.length === 3);
    if (grouped) str = parts.join('');
    else if (frac.length <= 2) str = `${parts.slice(0, -1).join('')}.${frac}`;
    else str = parts.join('');
  }

  const n = parseFloat(str);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function formatUserAmount(value) {
  const n = typeof value === 'number' ? value : parseUserAmount(value);
  if (!n) return '';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(n);
}

// Yazarken kuruş girilebilsin: sondaki . veya , ve 1–2 haneli küsur silinmesin.
// 1.500 ve 1.500.000 binlik olduğu için formatlanmaya devam eder.
export function isDecimalInProgress(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return false;
  if (/[.,]$/.test(trimmed)) return true;
  const m = trimmed.match(/[.,](\d{1,2})$/);
  if (!m) return false;
  const seps = trimmed.match(/[.,]/g) || [];
  if (seps.length === 1 && m[1].length === 3) return false;
  return true;
}

function parseAmount(val) {
  return parseUserAmount(val);
}

// ══════════════════════════════════════════
// EXCEL / CSV PARSER (SheetJS — .xls, .xlsx, .csv, HTML-xls hepsini açar)
// ══════════════════════════════════════════

// Banka açıklamasından müşteri adını çıkar
// Garanti:  "VOLKAN KARAKAŞ-KUMAş ALİM CARİ öDEME-7652110" → "VOLKAN KARAKAŞ"
// İş Bank: "Volkan Karakaş - Enpara Bank A.ş." → "Volkan Karakaş"
// Akbank:  "Songül Karapunar - Akbank- Komisyon" → "Songül Karapunar"
// Genel:   "songul karapunar-FAST-CEP ŞUBE-1284000227" → "songul karapunar"
const BANK_NOISE = /\b(garanti|akbank|is\s?bank|ziraat|yapi\s?kredi|vakif|halk|deniz|qnb|enpara|kuveyt|ing|hsbc|teb|fibabanka|odeabank|icbc|turkiye|bankasi|bank|sube|cep|fast|hvl|eft|mbl|masraf|komisyon|tahsilat|havale|virman|para\s?cekme|para\s?transferi|vergi|bsmv|ref|referans)\b/gi;

function extractCustomerFromDesc(desc) {
  if (!desc) return desc;
  const str = desc.trim();

  // Tire / çizgi ile ayır (" - " veya "-")
  const parts = str.split(/\s*[-–—]\s*/);
  if (parts.length >= 2) {
    const first = parts[0].trim();
    // İlk parça en az 3 karakter, harf içermeli, ve tamamen sayı/kod olmamalı
    if (first.length >= 3 && /[a-zA-ZğüşöçıİĞÜŞÖÇ]{2,}/.test(first) && !/^\d+[/]/.test(first)) {
      // Banka/işlem gürültüsünü temizle
      const cleaned = first.replace(BANK_NOISE, '').replace(/\s+/g, ' ').trim();
      return cleaned.length >= 3 ? cleaned : first;
    }
  }

  // Tire yoksa: tüm açıklamadan banka gürültüsünü çıkar
  const cleaned = str.replace(BANK_NOISE, '').replace(/\d{5,}/g, '').replace(/\s+/g, ' ').trim();
  return cleaned.length >= 3 ? cleaned : str;
}

export async function parseExcelStatement(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const transactions = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 2) continue;

    // Header tespiti: ilk 30 satırı tara (banka dökümleri üstte bilgi satırları olur)
    let headerRowIdx = -1;
    let colMap = {};

    for (let r = 0; r < Math.min(30, rows.length); r++) {
      const cells = (rows[r] || []).map((val, idx) => ({ col: idx, val: normalize(String(val || '')) }));

      const dateCol = cells.find(c => /tarih|date|islem.?tar|valor|valut/i.test(c.val));
      const amountCol = cells.find(c => /^tutar$|amount|miktar|^alacak$|gelen|islem.?tutar/i.test(c.val));
      const descCol = cells.find(c => /aciklama|description|detay|musteri|alici|gonderen|referans|islem.?aciklama/i.test(c.val));
      const labelCol = cells.find(c => /etiket|label|islem.?tip|islem.?tur|tur|type|kategori|kanal/i.test(c.val));

      if (dateCol && amountCol) {
        headerRowIdx = r;
        colMap.date = dateCol.col;
        colMap.amount = amountCol.col;
        colMap.desc = descCol?.col ?? null;
        colMap.label = labelCol?.col ?? null;

        const borcCol = cells.find(c => /borc|debit|giden/i.test(c.val));
        if (borcCol) colMap.borc = borcCol.col;
        break;
      }
    }

    // Header bulunamazsa akıllı tespit (ilk veri satırından)
    if (headerRowIdx < 0) {
      for (let sr = 0; sr < Math.min(30, rows.length); sr++) {
        const sample = rows[sr] || [];
        let firstDateCol = null, firstNumCol = null, firstTextCol = null;
        sample.forEach((val, idx) => {
          if (firstDateCol === null && parseDate(val)) firstDateCol = idx;
          else if (firstNumCol === null && typeof val === 'number') firstNumCol = idx;
          else if (firstTextCol === null && typeof val === 'string' && val.length > 3) firstTextCol = idx;
        });
        if (firstDateCol !== null && firstNumCol !== null) {
          headerRowIdx = sr - 1; // Veri bu satırdan başlıyor
          colMap.date = firstDateCol;
          colMap.amount = firstNumCol;
          colMap.desc = firstTextCol;
          break;
        }
      }
    }

    if (colMap.date === undefined || colMap.amount === undefined) continue;

    // Veri satırlarını oku
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const dateVal = row[colMap.date];
      const rawAmountVal = row[colMap.amount];
      const descVal = colMap.desc !== null ? String(row[colMap.desc] || '') : '';
      const labelVal = colMap.label !== null ? String(row[colMap.label] || '') : '';

      // Borç sütunu varsa, borç satırlarını atla
      if (colMap.borc !== undefined) {
        const borcVal = parseAmount(row[colMap.borc]);
        if (borcVal > 0 && parseAmount(rawAmountVal) === 0) continue;
      }

      const date = parseDate(dateVal);

      // Tutar: pozitif = gelen, negatif = giden. Sadece pozitif (gelen) al
      let rawNum = typeof rawAmountVal === 'number' ? rawAmountVal : null;
      if (rawNum === null) {
        // String tutar: negatif olabilir
        const s = String(rawAmountVal || '').trim().replace(/\s/g, '').replace(/TL|₺|TRY/gi, '');
        const cleaned = s.replace(/\./g, '').replace(/,/g, '.');
        rawNum = parseFloat(cleaned);
      }

      // Negatif tutarları atla (giden ödeme / kesinti)
      if (!Number.isFinite(rawNum) || rawNum <= 0) continue;
      if (!date) continue;

      // Açıklamadan müşteri adını çıkar
      const customerName = extractCustomerFromDesc(descVal);

      transactions.push({
        date,
        amount: rawNum,
        description: customerName,
        displayDescription: 'Gelen Ödeme',
        rawDescription: descVal.trim(),
        label: labelVal,
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
  const pdfjsLib = await import('pdfjs-dist');

  // Vite ?url import: sadece worker dosyasının URL'ini al, bundle etme
  const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  const txs = parseBankStatementText(fullText);
  const fileName = file?.name || '';
  if (!txs.length) {
    return [{
      date: '',
      amount: 0,
      description: '',
      senderName: '',
      receiverName: '',
      displayDescription: 'Gelen Ödeme (Dekont)',
      rawDescription: '',
      source: 'pdf-dekont',
      confidence: 'low',
      fileName
    }];
  }
  return txs.map(tx => ({ ...tx, fileName: tx.fileName || fileName }));
}

export function parseDekontFromText(text, fileName = '') {
  const txs = parseBankStatementText(text);
  return txs.map(tx => ({ ...tx, fileName: tx.fileName || fileName }));
}

// ── Tek dekont: etiket sözlüğü (banka adına kilitli değil) ──
// Aramalar katlanmış (İ/I/Ş → i/s) metinde yapılır; değer özgün metinden kesilir.
const NEXT_FIELD = /\b(?:gonderen(?:\s+kisi|\s+adi|\s+unvani?|\s+unvan)?|alici(?:\s+unvani|\s+isim(?:\s*[\\/]\s*unvan)?|\s+unvan|\s+adi|\s+iban|\s+banka)?|alacakli(?:\s+hesap|\s+isim|\s+unvan|\s+adi?)?|musteri\s+unvani|borclu|(?:islem)\s+tutari|eft\s+tutari|havale\s+tutari|fast\s+tutari|islem\s+tarihi|islem\s+zam|belge\s+tarihi|dekont\s+tarihi|duzenlen?me\s+tarihi|valor|aciklama|odeme\s+amaci|sorgu|iban|fast\s+ucret|eft\s+ucret|bsmv|toplam|gonderilen\s+iban)\b/;

const SENDER_RULES = [
  { re: /gonderen\s+kisi/, weight: 100 },
  { re: /gonderen\s+(?:adi|unvani?)/, weight: 95 },
  { re: /gonderen/, weight: 90, rejectAfter: /^\s*iban/ },
  { re: /musteri\s+unvani/, weight: 80 },
  { re: /borclu/, weight: 70 },
  { re: /sayin/, weight: 60 }
];

const RECEIVER_RULES = [
  { re: /alici\s+unvani|alici\s+isim(?:\s*[\\/]\s*unvan)?|alici\s+unvan|alici\s+adi/, weight: 100 },
  { re: /alacakli\s*(?:hesap|isim|unvan|adi?)/, weight: 90 },
  { re: /alici/, weight: 70, rejectAfter: /^\s*(?:iban|banka|bank)\b/ }
];

const AMOUNT_RULES = [
  { re: /islem\s+tutari/, weight: 100, badBefore: /toplam|ucret|vergi|masraf|komisyon/ },
  { re: /eft\s+tutari/, weight: 96, badBefore: /ucret/ },
  { re: /havale\s+tutari/, weight: 96, badBefore: /ucret/ },
  { re: /fast\s+tutari/, weight: 94, badBefore: /ucret/ },
  { re: /gonderilen\s+tutar/, weight: 92 },
  { re: /(?<![\p{L}])tutar(?![\p{L}])/u, weight: 70, badBefore: /toplam|ucret|bsmv|masraf|komisyon|vergi|fast|eft/ }
];

const DATE_RULES = [
  { re: /islem\s+tarihi/, weight: 100 },
  { re: /islem\s+zam/, weight: 95 },
  { re: /belge\s+tarihi/, weight: 90 },
  { re: /dekont\s+tarihi/, weight: 85 },
  { re: /duzenlen?me\s+tarihi/, weight: 80 },
  { re: /valor(?:\s+tarihi)?/, weight: 50 }
];

const COMPANY_RE = /([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü0-9\s.&'-]{8,220}?(?:LİMİTED ŞİRKETİ|LIMITED SIRKETI|LİMİTED ŞİRKET|ANONİM ŞİRKETİ|ANONIM SIRKETI|A\.\s*Ş\.))/g;

function flattenDekontText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function foldTr(text) {
  return String(text || '')
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toLowerCase();
}

function cleanPartyName(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/\s+/g, ' ').trim();
  s = s.replace(/^[:\-–—\s]+/, '');
  s = s.replace(/^(?:e[-\s]*)?dekont\s+/i, '');
  const folded = foldTr(s);
  const cut = folded.search(/\b(?:turkiye\s+garanti|garanti\s+bank|turkiye\s+is|is\s*bankasi|yapi\s*(?:ve\s*)?kredi|akbank|qnb\s*bank|halk\s*bank|halkbank|ziraat\s*bank|vakif\s*bank|vakifbank|kuveyt\s*turk|denizbank|enpara|finansbank|ing\s*bank|albaraka)\b/);
  if (cut > 0) s = s.slice(0, cut);
  s = s.replace(/\bTR\d{2}\b[\s\S]*/i, '');
  s = s.replace(/\s+[BA]\s+TL\b[\s\S]*/i, '');
  s = s.replace(/\s+\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?\s*(?:TL|TRY)?\s*$/i, '');
  s = s.replace(/[|]+/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/[:\-–—,./\\]+$/, '').trim();
  if (s.length < 2) return '';
  if (/^(tl|try|iban|eft|fast|banka|bank)$/i.test(s)) return '';
  return s.slice(0, 140);
}

function findLabel(text, rule) {
  const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + 'g');
  let m;
  while ((m = re.exec(text))) {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 16);
    if (rule.rejectAfter && rule.rejectAfter.test(after)) continue;
    if (rule.badBefore) {
      const before = text.slice(Math.max(0, m.index - 28), m.index);
      if (rule.badBefore.test(before)) continue;
    }
    return m;
  }
  return null;
}

function valueAfter(folded, match, original) {
  const rawTail = folded.slice(match.index + match[0].length);
  const restFold = rawTail.replace(/^[\s:–—-]+/, '');
  const lead = rawTail.length - restFold.length;
  const start = match.index + match[0].length + lead;
  const stop = restFold.search(NEXT_FIELD);
  const end = stop === -1 ? original.length : start + stop;
  const chunk = original.slice(start, Math.min(end, start + 180)).trim();
  return cleanPartyName(chunk);
}

function bestParty(folded, rules, original) {
  let best = null;
  for (const rule of rules) {
    const m = findLabel(folded, rule);
    if (!m) continue;
    const name = valueAfter(folded, m, original);
    if (!name) continue;
    if (!best || rule.weight > best.weight) best = { name, weight: rule.weight, labeled: true };
  }
  return best;
}

function bestAmount(text) {
  let best = null;
  for (const rule of AMOUNT_RULES) {
    const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + 'g');
    let m;
    while ((m = re.exec(text))) {
      const before = text.slice(Math.max(0, m.index - 28), m.index);
      if (rule.badBefore && rule.badBefore.test(before)) continue;
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 48);
      const num = after.match(/[:\s(TLRY)]*(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{1,2}|\d{4,})/i);
      if (!num) continue;
      const amount = parseAmount(num[1]);
      if (amount <= 0) continue;
      if (!best || rule.weight > best.weight || (rule.weight === best.weight && amount > best.amount)) {
        best = { amount, weight: rule.weight, labeled: true };
      }
    }
  }
  return best;
}

function collectDates(text) {
  const re = /(\d{1,2}[./-]\d{1,2}[./-]\d{4})/g;
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    const d = parseDate(m[1]);
    if (d && !out.includes(d)) out.push(d);
  }
  return out;
}

function bestDate(text) {
  let best = null;
  for (const rule of DATE_RULES) {
    const m = findLabel(text, rule);
    if (!m) continue;
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
    const dm = after.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{4})/);
    const date = dm ? parseDate(dm[1]) : null;
    if (!date) continue;
    if (!best || rule.weight > best.weight) best = { date, weight: rule.weight, labeled: true };
  }
  if (best) return best;
  const dates = collectDates(text);
  if (dates.length === 1) return { date: dates[0], weight: 40, labeled: true };
  if (dates.length > 1) return { date: dates[0], weight: 20, labeled: false };
  return null;
}

function guessSenderFromTitle(text, receiverName) {
  const recv = normalize(receiverName || '');
  COMPANY_RE.lastIndex = 0;
  let m;
  while ((m = COMPANY_RE.exec(text))) {
    const name = cleanPartyName(m[1]);
    if (!name || name.length < 8) continue;
    const norm = normalize(name);
    if (recv && (norm === recv || norm.includes(recv) || recv.includes(norm))) continue;
    if (/\b(bank|bankasi|qnb)\b/.test(norm)) continue;
    return name;
  }
  return '';
}

function parseSingleDekont(text) {
  const flat = flattenDekontText(text);
  if (!flat || flat.length < 20) return null;
  const folded = foldTr(flat);

  const senderHit = bestParty(folded, SENDER_RULES, flat);
  const receiverHit = bestParty(folded, RECEIVER_RULES, flat);
  const amountHit = bestAmount(folded);
  const dateHit = bestDate(folded, flat);

  let senderName = senderHit?.name || '';
  let senderLabeled = !!senderHit;
  const receiverName = receiverHit?.name || '';
  const receiverLabeled = !!receiverHit;

  if (!senderName) {
    senderName = guessSenderFromTitle(flat, receiverName);
    senderLabeled = false;
  }

  const amount = amountHit?.amount || 0;
  const date = dateHit?.date || '';
  const amountLabeled = !!amountHit?.labeled;
  const dateLabeled = !!dateHit?.labeled;

  if (!senderName && !receiverName && !amount && !date) return null;

  let confidence = 'high';
  if (!amount || !date || !senderName) confidence = 'low';
  else if (!senderLabeled || !receiverLabeled || !amountLabeled || !dateLabeled) confidence = 'mid';

  const customerName = extractCustomerFromDesc(senderName) || senderName;

  return {
    date,
    amount,
    description: customerName,
    displayDescription: 'Gelen Ödeme (Dekont)',
    rawDescription: [senderName, receiverName].filter(Boolean).join(' - '),
    senderName: customerName,
    receiverName,
    source: 'pdf-dekont',
    confidence
  };
}

// ── Banka dekont metninden transaction çıkarma ──
function parseBankStatementText(text) {
  const dekont = parseSingleDekont(text);
  if (dekont && dekont.confidence !== 'low' && dekont.amount > 0 && dekont.senderName) {
    return [dekont];
  }

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
      description: extractCustomerFromDesc(desc),
      displayDescription: 'Gelen Ödeme',
      rawDescription: line.trim(),
      senderName: extractCustomerFromDesc(desc),
      receiverName: '',
      source: 'pdf',
      confidence: 'mid'
    });
  }

  if (transactions.length > 1) return transactions;
  if (dekont && (dekont.senderName || dekont.receiverName || dekont.amount || dekont.date)) return [dekont];
  if (transactions.length === 1) return transactions;
  return dekont ? [dekont] : [];
}

// ══════════════════════════════════════════
// HESAP ROUTING — İşlemleri doğru hesaba yönlendir
// ══════════════════════════════════════════
// Banka döküm açıklamasındaki isimlere bakarak hangi hesaba ait olduğunu belirle.
// Örnek: "Ayşe Karabut - Garanti Bankası" → Ayşe Karabut hesabına yönlendir
export function routeTransactionsToAccounts(transactions, accounts) {
  if (!transactions?.length || !accounts?.length) return transactions;

  // Hesap isimlerini normalize et
  const accountEntries = accounts.map(acc => ({
    id: acc.id,
    name: acc.name || '',
    companyName: acc.company_name || '',
    normalizedName: normalize(acc.name || ''),
    normalizedCompany: normalize(acc.company_name || ''),
    nameParts: normalize(acc.name || '').split(' ').filter(p => p.length > 2),
    companyParts: normalize(acc.company_name || '').split(' ').filter(p => p.length > 2)
  }));

  return transactions.map(tx => {
    const rawNorm = normalize(tx.receiverName || tx.rawDescription || tx.description || '');

    let bestAccount = null;
    let bestScore = 0;

    for (const acc of accountEntries) {
      let score = 0;

      // Tam isim eşleşmesi (alıcı adı hesap adını içerir veya hesap adı alıcıyı içerir)
      if (acc.normalizedName && rawNorm.includes(acc.normalizedName)) {
        score = 100;
      } else if (acc.normalizedCompany && rawNorm.includes(acc.normalizedCompany)) {
        score = 100;
      } else if (tx.receiverName && acc.normalizedName && acc.normalizedName.includes(rawNorm) && rawNorm.length >= 5) {
        score = 90;
      } else if (tx.receiverName && acc.normalizedCompany && acc.normalizedCompany.includes(rawNorm) && rawNorm.length >= 5) {
        score = 90;
      }
      // Kısmi isim eşleşmesi
      else if (acc.nameParts.length >= 2) {
        const hits = acc.nameParts.filter(p => rawNorm.includes(p));
        if (hits.length / acc.nameParts.length >= 0.5 || hits.length >= 2) {
          score = Math.round((hits.length / acc.nameParts.length) * 80);
          if (score < 60 && hits.length >= 2) score = 65; // En az 2 kelime eşleştiyse kabul edilebilir
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestAccount = acc;
      }
    }

    if (bestAccount && bestScore >= 60) {
      return { ...tx, routedAccountId: bestAccount.id, routedAccountName: bestAccount.name };
    }

    return tx;
  });
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
    const normalizedDesc = normalize(tx.senderName || tx.description);
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
// METİN (TEXT/PASTE) PARSER — Esnek Format
// ══════════════════════════════════════════
// Desteklenen formatlar (tam uyum gerekmez, akıllı tespit yapar):
//
// Format A (standart):
//   Müşteri Adı
//   dd/mm/yyyy: 1.234,56 TL
//
// Format B (tarih önce, isim sonra):
//   05/01/2026 Yavuz Tekstil 300.000,00
//
// Format C (karışık, tab/space ayrılmış):
//   Yavuz Tekstil   05.01.2026   300000,00
//
// Format D (sadece isim + tutar):
//   Yavuz Tekstil 300.000,00 TL
//
export function parseTextStatement(text) {
  if (!text || !text.trim()) return [];

  const transactions = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Regex'ler
  const dateRegex = /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/;
  const amountRegex = /(\d{1,3}(?:\.\d{3})*,\d{1,2}|\d+,\d{1,2})/;
  const totalLineRegex = /^toplam\s*[:;=\-]/i;
  const skipRegex = /^(toplam|genel\s*toplam|ara\s*toplam|not|aciklama|tarih|tutar|musteri|---)/i;

  let currentCustomer = null;

  for (const line of lines) {
    // Atlanacak satırlar
    if (totalLineRegex.test(line)) continue;
    if (skipRegex.test(normalize(line))) continue;

    const hasDate = dateRegex.test(line);
    const hasAmount = amountRegex.test(line);

    // ─── Satırda hem tarih hem tutar var → işlem satırı ───
    if (hasDate && hasAmount) {
      const dateMatch = line.match(dateRegex);
      const amountMatch = line.match(amountRegex);
      const date = parseDate(dateMatch[1]);
      const amount = parseAmount(amountMatch[1]);

      if (date && amount > 0) {
        // Tarih ve tutarı çıkarınca kalan metin: ya müşteri adı ya açıklama
        let remaining = line
          .replace(dateRegex, '')
          .replace(amountRegex, '')
          .replace(/TL|₺|TRY/gi, '')
          .replace(/[:;=\-\t|]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Kalan metin müşteri adı olabilir (en az 3 harf karakter)
        const hasName = remaining.length >= 3 && /[a-zA-ZğüşöçıİĞÜŞÖÇ]{2,}/.test(remaining);
        const customer = hasName ? remaining : currentCustomer;

        if (hasName && !currentCustomer) {
          currentCustomer = remaining;
        }

        if (customer) {
          transactions.push({
            date,
            amount,
            description: customer,
            displayDescription: 'Gelen Ödeme',
            rawDescription: `${customer} — ${line}`,
            source: 'text'
          });
        }
      }
      continue;
    }

    // ─── Sadece tutar var (tarih yok) → currentCustomer ile eşle, bugünü kullan ───
    if (hasAmount && !hasDate) {
      const amountMatch = line.match(amountRegex);
      const amount = parseAmount(amountMatch[1]);

      // Tutarı çıkarınca kalan isim olabilir
      let remaining = line
        .replace(amountRegex, '')
        .replace(/TL|₺|TRY/gi, '')
        .replace(/[:;=\-\t|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const hasName = remaining.length >= 3 && /[a-zA-ZğüşöçıİĞÜŞÖÇ]{2,}/.test(remaining);
      if (hasName) currentCustomer = remaining;

      if (amount > 0 && currentCustomer) {
        // Tarih yoksa bugünü kullan
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        transactions.push({
          date: `${yyyy}-${mm}-${dd}`,
          amount,
          description: currentCustomer,
          displayDescription: 'Gelen Ödeme',
          rawDescription: `${currentCustomer} — ${line}`,
          source: 'text'
        });
      }
      continue;
    }

    // ─── Sadece tarih var (tutar yok) → bir sonraki satır tutar olabilir, atla ───
    if (hasDate && !hasAmount) continue;

    // ─── Ne tarih ne tutar → müşteri adı olabilir ───
    if (line.length >= 3 && /[a-zA-ZğüşöçıİĞÜŞÖÇ]{2,}/.test(line) && !/^\d+$/.test(line)) {
      currentCustomer = line
        .replace(/\(.*?\)/g, '')
        .replace(/[:;=]+$/, '')
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
  if (name.endsWith('.csv')) return 'csv';

  // Bilinmeyen formatı SheetJS'e dene (HTML-xls vs.)
  return 'excel-fallback';
}

export async function parseStatementFile(file) {
  if (!file) throw new Error('Dosya seçilmedi.');

  const type = await detectFileType(file);
  let txs;

  if (type === 'xlsx' || type === 'xls' || type === 'csv' || type === 'excel-fallback') {
    txs = await parseExcelStatement(file);
  } else if (type === 'pdf') {
    txs = await parsePdfStatement(file);
  } else {
    throw new Error('Desteklenmeyen dosya formatı. Lütfen PDF, Excel (.xlsx/.xls) veya CSV yükleyin.');
  }

  const fileName = file.name || '';
  return (txs || []).map(tx => ({ ...tx, fileName: tx.fileName || fileName }));
}
