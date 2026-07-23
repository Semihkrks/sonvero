// ══════════════════════════════════════════
// PDF Redaction — Nilvera Alt Bilgi İbaresini Gizleme
//
// Nilvera'nın ürettiği fatura PDF'lerinin altında sabit bir ibare
// (ör. "Bu fatura Nilvera tarafından üretilmiştir") gömülü gelir.
// Bu modül pdf.js ile o metnin sayfa üzerindeki konumunu bulur,
// pdf-lib ile üstünü beyaz dikdörtgenle kapatır. Metin bulunamazsa
// veya herhangi bir adımda hata olursa PDF DEĞİŞTİRİLMEDEN döner —
// kullanıcı hiçbir zaman PDF'siz kalmaz.
//
// NOT: Bu, PDF'in görsel bir kopyasını kapatır; GİB'e iletilen orijinal
// belge değişmez. Kullanıcı isteğiyle eklenmiştir (kozmetik amaçlıdır).
// ══════════════════════════════════════════

// Nilvera'nın kullandığı bilinen ibare varyasyonları (büyük/küçük harf duyarsız)
const FOOTER_PATTERNS = [
  /bu\s+fatura\s+nilvera\s+taraf[ıi]ndan\s+[uü]retilmi[şs]tir\.?/i,
  /nilvera\s+taraf[ıi]ndan\s+[uü]retilmi[şs]tir\.?/i,
];

let pdfjsLibPromise = null;
async function getPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      const pdfjsLib = await import('pdfjs-dist');
      const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjsLib;
    })();
  }
  return pdfjsLibPromise;
}

export function base64ToBytes(base64) {
  const clean = String(base64).replace(/\s/g, '');
  const byteChars = atob(clean);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000; // String.fromCharCode argüman limiti için parça parça işle
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Bir sayfadaki text item'ları birleştirip regex ile ibareyi arar,
 * eşleşen item'ların birleşik (union) kutusunu döner.
 */
function findFooterRectOnPage(items) {
  let fullText = '';
  const charItemMap = [];
  items.forEach((item, idx) => {
    for (let c = 0; c < item.str.length; c++) charItemMap.push(idx);
    fullText += item.str + ' ';
    charItemMap.push(-1);
  });

  for (const pattern of FOOTER_PATTERNS) {
    const match = fullText.match(pattern);
    if (!match || match.index == null) continue;

    const start = match.index;
    const end = start + match[0].length;
    const involvedIdx = new Set();
    for (let c = start; c < end && c < charItemMap.length; c++) {
      const idx = charItemMap[c];
      if (idx >= 0) involvedIdx.add(idx);
    }
    if (involvedIdx.size === 0) continue;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    involvedIdx.forEach((idx) => {
      const it = items[idx];
      const tx = it.transform;
      const x0 = tx[4];
      const y0 = tx[5];
      const w = it.width || 0;
      const h = it.height || Math.abs(tx[3]) || 10;
      minX = Math.min(minX, x0);
      minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x0 + w);
      maxY = Math.max(maxY, y0 + h);
    });

    if (Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY)) {
      const pad = 2;
      return {
        x: minX - pad,
        y: minY - pad,
        width: (maxX - minX) + pad * 2,
        height: (maxY - minY) + pad * 2,
      };
    }
  }
  return null;
}

/**
 * PDF byte'larını alır, Nilvera alt bilgi ibaresini bulup üstünü beyaz
 * dikdörtgenle kapatır. Bulunamazsa veya hata olursa orijinal byte'ları
 * aynen döner (asla PDF'i bozmaz / boş bırakmaz).
 * @param {Uint8Array} pdfBytes
 * @returns {Promise<Uint8Array>}
 */
export async function redactNilveraFooter(pdfBytes) {
  try {
    const pdfjsLib = await getPdfjs();
    // pdf.js worker'a veri transfer ederken orijinal buffer'ı "detach" edebilir;
    // bu yüzden ona bir kopya veriyoruz, aşağıda pdf-lib orijinal pdfBytes'ı kullanır.
    const pdfjsDoc = await pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise;

    const redactionsByPage = [];
    for (let i = 1; i <= pdfjsDoc.numPages; i++) {
      const page = await pdfjsDoc.getPage(i);
      const content = await page.getTextContent();
      const items = content.items.filter((it) => typeof it.str === 'string' && it.str.trim());
      const rect = findFooterRectOnPage(items);
      if (rect) redactionsByPage.push({ pageIndex: i - 1, rect });
    }

    if (redactionsByPage.length === 0) return pdfBytes; // ibare bulunamadı, dokunma

    const { PDFDocument, rgb } = await import('pdf-lib');
    const pdfLibDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfLibDoc.getPages();

    redactionsByPage.forEach(({ pageIndex, rect }) => {
      const page = pages[pageIndex];
      if (!page) return;
      page.drawRectangle({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      });
    });

    return await pdfLibDoc.save();
  } catch (e) {
    console.warn('[pdf-redact] İbare kaldırılamadı, orijinal PDF kullanılıyor:', e?.message || e);
    return pdfBytes;
  }
}
