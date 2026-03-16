// ══════════════════════════════════════════
// Excel Export Engine — SheetJS (XLSX)
// ══════════════════════════════════════════
import * as XLSX from 'xlsx';

// ── Default Column Config ──
export const INVOICE_COLUMNS = [
  { key: 'invoiceNumber', label: 'Fatura No', checked: true },
  { key: 'ettn', label: 'ETTN (UUID)', checked: true },
  { key: 'date', label: 'Tarih', checked: true },
  { key: 'profile', label: 'Profil', checked: true },
  { key: 'type', label: 'Tür', checked: true },
  { key: 'customerName', label: 'Müşteri', checked: true },
  { key: 'customerTaxNo', label: 'VKN/TCKN', checked: true },
  { key: 'currency', label: 'Para Birimi', checked: true },
  { key: 'subtotal', label: 'Matrah', checked: true },
  { key: 'taxTotal', label: 'KDV Toplam', checked: true },
  { key: 'total', label: 'Genel Toplam', checked: true },
  { key: 'status', label: 'Durum', checked: true },
  { key: 'direction', label: 'Yön (Gelen/Giden)', checked: false },
  { key: 'taxOffice', label: 'Vergi Dairesi', checked: false },
  { key: 'city', label: 'Şehir', checked: false },
  { key: 'notes', label: 'Notlar', checked: false }
];

export const LINE_COLUMNS = [
  { key: 'invoiceNumber', label: 'Fatura No', checked: true },
  { key: 'lineIndex', label: 'Satır No', checked: true },
  { key: 'itemName', label: 'Ürün/Hizmet', checked: true },
  { key: 'quantity', label: 'Miktar', checked: true },
  { key: 'unitType', label: 'Birim', checked: true },
  { key: 'unitPrice', label: 'Birim Fiyat', checked: true },
  { key: 'discountRate', label: 'İskonto %', checked: true },
  { key: 'lineTotal', label: 'Satır Toplam', checked: true },
  { key: 'taxRate', label: 'KDV %', checked: true },
  { key: 'taxAmount', label: 'KDV Tutar', checked: true },
  { key: 'lineTotalWithTax', label: 'KDV Dahil Toplam', checked: true }
];

// ── Normalize invoice data for export ──
function normalizeInvoice(raw) {
  const info = raw.InvoiceInfo || raw.invoiceInfo || {};
  const customer = raw.CustomerInfo || raw.customerInfo || raw.BuyerCustomerInfo || {};
  const lines = raw.InvoiceLines || raw.invoiceLines || [];
  const notes = raw.Notes || raw.notes || [];

  return {
    invoiceNumber: info.InvoiceSerieOrNumber || info.invoiceSerieOrNumber || '',
    ettn: raw.UUID || raw.uuid || raw.Id || '',
    date: info.IssueDate || info.issueDate || '',
    profile: info.InvoiceProfile || info.invoiceProfile || '',
    type: info.InvoiceType || info.invoiceType || '',
    customerName: customer.Name || customer.name || customer.Title || '',
    customerTaxNo: customer.TaxNumber || customer.taxNumber || '',
    currency: info.CurrencyCode || info.currencyCode || 'TRY',
    subtotal: info.TaxExclusiveAmount || info.taxExclusiveAmount || 0,
    taxTotal: info.TaxTotal || info.taxTotal || 0,
    total: info.PayableAmount || info.payableAmount || 0,
    status: raw.Status || raw.status || '',
    direction: raw._direction || '',
    taxOffice: customer.TaxOffice || customer.taxOffice || '',
    city: customer.City || customer.city || '',
    notes: notes.map(n => n.Note || n.note || n).join(' | '),
    _lines: lines.map((l, idx) => ({
      invoiceNumber: info.InvoiceSerieOrNumber || info.invoiceSerieOrNumber || '',
      lineIndex: l.Index || idx + 1,
      itemName: l.Name || l.name || '',
      quantity: l.Quantity || l.quantity || 0,
      unitType: l.UnitType || l.unitType || '',
      unitPrice: l.UnitPrice || l.unitPrice || 0,
      discountRate: l.DiscountRate || l.discountRate || 0,
      lineTotal: (l.Quantity || l.quantity || 0) * (l.UnitPrice || l.unitPrice || 0),
      taxRate: l.Taxes?.[0]?.Percent || l.taxes?.[0]?.percent || 0,
      taxAmount: l.Taxes?.[0]?.Total || l.taxes?.[0]?.total || 0,
      lineTotalWithTax: ((l.Quantity || 0) * (l.UnitPrice || 0)) + (l.Taxes?.[0]?.Total || 0)
    }))
  };
}

// ── Export invoices to Excel with multi-sheet ──
export function exportInvoicesToExcel(invoices, options = {}) {
  const {
    fileName = `efatura_export_${new Date().toISOString().slice(0, 10)}`,
    accountName = '',
    selectedColumns = INVOICE_COLUMNS.filter(c => c.checked),
    selectedLineColumns = LINE_COLUMNS.filter(c => c.checked),
    includeLines = true,
    includeSummary = true,
    dateRange = null
  } = options;

  // Normalize all invoices
  let normalized = invoices.map(normalizeInvoice);

  // Apply date filter if set
  if (dateRange?.start || dateRange?.end) {
    normalized = normalized.filter(inv => {
      const d = new Date(inv.date);
      if (dateRange.start && d < new Date(dateRange.start)) return false;
      if (dateRange.end && d > new Date(dateRange.end)) return false;
      return true;
    });
  }

  const workbook = XLSX.utils.book_new();

  // ── Sheet 1: Fatura Listesi ──
  const invoiceHeaders = selectedColumns.map(c => c.label);
  const invoiceRows = normalized.map(inv =>
    selectedColumns.map(c => {
      const val = inv[c.key];
      if (typeof val === 'number') return val;
      return val || '';
    })
  );

  const ws1 = XLSX.utils.aoa_to_sheet([invoiceHeaders, ...invoiceRows]);

  // Style column widths
  ws1['!cols'] = selectedColumns.map(c => ({
    wch: Math.max(c.label.length + 2, 15)
  }));

  XLSX.utils.book_append_sheet(workbook, ws1, 'Faturalar');

  // ── Sheet 2: Kalem Detayları ──
  if (includeLines) {
    const allLines = normalized.flatMap(inv => inv._lines);
    const lineHeaders = selectedLineColumns.map(c => c.label);
    const lineRows = allLines.map(line =>
      selectedLineColumns.map(c => {
        const val = line[c.key];
        if (typeof val === 'number') return val;
        return val || '';
      })
    );

    const ws2 = XLSX.utils.aoa_to_sheet([lineHeaders, ...lineRows]);
    ws2['!cols'] = selectedLineColumns.map(c => ({
      wch: Math.max(c.label.length + 2, 14)
    }));
    XLSX.utils.book_append_sheet(workbook, ws2, 'Kalemler');
  }

  // ── Sheet 3: Özet ──
  if (includeSummary) {
    const totalAmount = normalized.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const totalTax = normalized.reduce((s, i) => s + (Number(i.taxTotal) || 0), 0);
    const totalSubtotal = normalized.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);

    const summaryData = [
      ['Sonvera 2.0 — Export Özeti'],
      [],
      ['Hesap', accountName || 'Bilinmiyor'],
      ['Export Tarihi', new Date().toLocaleDateString('tr-TR')],
      ['Fatura Sayısı', normalized.length],
      [],
      ['Toplam Matrah', totalSubtotal],
      ['Toplam KDV', totalTax],
      ['Genel Toplam', totalAmount],
      [],
      ['Para Birimi Dağılımı'],
      ...Object.entries(
        normalized.reduce((acc, inv) => {
          acc[inv.currency] = (acc[inv.currency] || 0) + 1;
          return acc;
        }, {})
      ).map(([cur, count]) => [`  ${cur}`, count]),
      [],
      ['Profil Dağılımı'],
      ...Object.entries(
        normalized.reduce((acc, inv) => {
          acc[inv.profile || 'Bilinmiyor'] = (acc[inv.profile || 'Bilinmiyor'] || 0) + 1;
          return acc;
        }, {})
      ).map(([profile, count]) => [`  ${profile}`, count])
    ];

    const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
    ws3['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, ws3, 'Özet');
  }

  // ── Generate file ──
  const finalName = accountName
    ? `${accountName}_${fileName}.xlsx`
    : `${fileName}.xlsx`;

  XLSX.writeFile(workbook, finalName);
  return { fileName: finalName, count: normalized.length };
}

// ── Export single invoice detail ──
export function exportSingleInvoice(invoice, accountName = '') {
  const inv = normalizeInvoice(invoice);
  const workbook = XLSX.utils.book_new();

  // Invoice header info
  const headerData = [
    ['Fatura Detayı'],
    [],
    ['Fatura No', inv.invoiceNumber],
    ['ETTN', inv.ettn],
    ['Tarih', inv.date],
    ['Profil', inv.profile],
    ['Tür', inv.type],
    ['Müşteri', inv.customerName],
    ['VKN/TCKN', inv.customerTaxNo],
    ['Vergi Dairesi', inv.taxOffice],
    ['Şehir', inv.city],
    ['Para Birimi', inv.currency],
    [],
    ['Matrah', inv.subtotal],
    ['KDV Toplam', inv.taxTotal],
    ['GENEL TOPLAM', inv.total],
    [],
    ['Notlar', inv.notes]
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(headerData);
  ws1['!cols'] = [{ wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, ws1, 'Fatura Bilgisi');

  // Line items
  if (inv._lines.length > 0) {
    const lineHeaders = ['#', 'Ürün/Hizmet', 'Miktar', 'Birim', 'Birim Fiyat', 'İskonto %', 'Satır Toplam', 'KDV %', 'KDV Tutar', 'KDV Dahil'];
    const lineRows = inv._lines.map(l => [
      l.lineIndex, l.itemName, l.quantity, l.unitType,
      l.unitPrice, l.discountRate, l.lineTotal,
      l.taxRate, l.taxAmount, l.lineTotalWithTax
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([lineHeaders, ...lineRows]);
    ws2['!cols'] = lineHeaders.map(h => ({ wch: Math.max(h.length + 2, 14) }));
    XLSX.utils.book_append_sheet(workbook, ws2, 'Kalemler');
  }

  const fileName = `${accountName ? accountName + '_' : ''}fatura_${inv.invoiceNumber || inv.ettn}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return { fileName };
}
