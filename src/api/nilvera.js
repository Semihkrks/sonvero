// ══════════════════════════════════════════
// Nilvera API Service Layer
// All E-Fatura & E-Arşiv Endpoints
// ══════════════════════════════════════════
import axios from 'axios';
import { getActiveAccount } from '../services/account-manager.js';
import nilveraCatalog from './nilvera-catalog.generated.json';

// ── Create Axios Instance ──
function createApi() {
  return axios.create({
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ── Build base URL for a given account (or active account) ──
// getActiveAccount() artık SENKRON: aktif hesap istek anında yeniden çözülmez,
// bellek-içi tek kaynaktan okunur.
function baseUrlFor(account) {
  if (!account) throw new Error('Aktif hesap bulunamadı. Lütfen bir hesap seçin.');
  // In dev mode, use Vite proxy to bypass CORS
  return account.environment === 'live' ? '/nilvera-live' : '/nilvera-api';
}

// ── Build auth headers for a given account ──
function headersFor(account) {
  if (!account || !account.api_key) {
    throw new Error('API anahtarı bulunamadı. Lütfen hesap ayarlarını kontrol edin.');
  }
  return {
    'Authorization': `Bearer ${account.api_key}`,
    'Content-Type': 'application/json'
  };
}

// ── Generic request wrapper with error handling ──
// Aktif hesabı TEK SEFER yakalar; baseUrl ve header aynı hesaptan türetilir.
async function request(method, path, data = null, params = null, options = {}) {
  const account = getActiveAccount();
  const baseUrl = baseUrlFor(account);
  const headers = headersFor(account);
  const api = createApi();

  try {
    const config = {
      method,
      url: `${baseUrl}${path}`,
      headers,
      ...(data && { data }),
      ...(params && { params }),
      ...(options.signal && { signal: options.signal })
    };

    console.log(`[Nilvera API] Request -> ${method} ${config.url}`, params);

    const response = await api(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    const errData = error.response?.data;
    const status = error.response?.status;

    // Parse Nilvera specific error codes
    let message = 'Bilinmeyen bir hata oluştu';
    let code = null;

    if (errData) {
      if (errData.Errors && errData.Errors.length > 0) {
        message = errData.Errors.map(e => e.Message || e).join(', ');
        code = errData.Errors[0]?.Code;
      } else if (errData.Message) {
        message = errData.Message;
      } else if (typeof errData === 'string') {
        message = errData;
      }
    }

    // HTTP-level error descriptions
    const httpErrors = {
      400: 'Geçersiz istek — gönderilen veri yapısı hatalı',
      403: 'Yetkisiz erişim — API anahtarı bu işlem için yetkili değil',
      404: 'Kaynak bulunamadı — belge sistemde mevcut değil',
      409: 'Çakışma — bu işlem daha önce zaten yapılmış',
      422: 'İşlenemeyen veri — iş kurallarını ihlal ediyor',
      500: 'Sunucu hatası — Nilvera tarafında bir sorun oluştu'
    };

    if (!errData && status && httpErrors[status]) {
      message = httpErrors[status];
    }

    return { success: false, error: message, code, status };
  }
}

// ── Account-specific request (bypasses getActiveAccount) ──
// Bir yükleme boyunca hesap açıkça verilir: kullanıcı arada hesap değiştirse
// bile bu isteğin anahtarı/ortamı değişmez. options.signal ile iptal edilebilir.
async function requestWithAccount(account, method, path, data = null, params = null, options = {}) {
  if (!account || !account.api_key) {
    return { success: false, error: 'Hesap veya API anahtarı bulunamadı.', status: 0 };
  }
  const baseUrl = account.environment === 'live' ? '/nilvera-live' : '/nilvera-api';
  const headers = {
    'Authorization': `Bearer ${account.api_key}`,
    'Content-Type': 'application/json'
  };
  const api = createApi();

  try {
    const config = {
      method,
      url: `${baseUrl}${path}`,
      headers,
      ...(data && { data }),
      ...(params && { params }),
      ...(options.signal && { signal: options.signal })
    };
    const response = await api(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    const errData = error.response?.data;
    const status = error.response?.status;
    let message = 'Bilinmeyen bir hata oluştu';
    if (errData) {
      if (errData.Errors && errData.Errors.length > 0) {
        message = errData.Errors.map(e => e.Message || e).join(', ');
      } else if (errData.Message) {
        message = errData.Message;
      } else if (typeof errData === 'string') {
        message = errData;
      }
    }
    return { success: false, error: message, status };
  }
}

// ── Helper to extract items for counting ──
function _extractItemsLength(data) {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data.Content)) return data.Content.length;
  if (Array.isArray(data.Items)) return data.Items.length;
  if (Array.isArray(data.items)) return data.items.length;
  return 0;
}

// ── 3x Retry: Call API up to 3 times, keep the result with the most items or last success ──
async function requestRetry3(method, path, data = null, params = null) {
  let bestResult = null;
  let maxCount = -1;
  let lastError = null;
  
  for (let i = 0; i < 3; i++) {
    const result = await request(method, path, data, params);
    if (result.success) {
      const count = _extractItemsLength(result.data);
      if (count > maxCount || !bestResult) {
        maxCount = count;
        bestResult = result;
      }
    } else {
      lastError = result;
    }
    // Delay to avoid 429 Too Many Requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return bestResult || lastError;
}

async function requestWithAccountRetry3(account, method, path, data = null, params = null, options = {}) {
  let bestResult = null;
  let maxCount = -1;
  let lastError = null;

  for (let i = 0; i < 3; i++) {
    if (options.signal?.aborted) return bestResult || lastError || { success: false, error: 'İstek iptal edildi', status: 0 };
    const result = await requestWithAccount(account, method, path, data, params, options);
    if (result.success) {
      const count = _extractItemsLength(result.data);
      if (count >= maxCount || !bestResult) {
        maxCount = count;
        bestResult = result;
      }
    } else {
      lastError = result;
    }
    // Delay to avoid 429 Too Many Requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return bestResult || lastError;
}

// ── Exported helpers for multi-account operations ──
export { requestWithAccount, requestRetry3, requestWithAccountRetry3 };

// ── Account-specific listeleme uçları ──
// Sayfalar yükleme başında hesabı yakalar ve TÜM çağrılarını bu hesapla yapar.
// Böylece hesaplar arası veri karışması imkânsızlaşır. options.signal = AbortSignal.
export const EInvoiceWithAccount = {
  listSales: (account, params = {}, options = {}) =>
    requestWithAccountRetry3(account, 'GET', '/einvoice/Sale', null, params, options),
  listPurchases: (account, params = {}, options = {}) =>
    requestWithAccountRetry3(account, 'GET', '/einvoice/Purchase', null, params, options),
  listDrafts: (account, params = {}, options = {}) =>
    requestWithAccountRetry3(account, 'GET', '/einvoice/Draft', null, params, options),
};

export const EArchiveWithAccount = {
  listInvoices: (account, params = {}, options = {}) =>
    requestWithAccountRetry3(account, 'GET', '/earchive/Invoices', null, params, options),
  listDrafts: (account, params = {}, options = {}) =>
    requestWithAccountRetry3(account, 'GET', '/earchive/Draft', null, params, options),
  listGibPurchases: (account, params = {}, options = {}) =>
    requestWithAccountRetry3(account, 'GET', '/earchive/Gib/Purchase', null, params, options),
};

export const EDespatchWithAccount = {
  listSales: (account, params = {}, options = {}) =>
    requestWithAccountRetry3(account, 'GET', '/edespatch/Sale', null, params, options),
  listPurchases: (account, params = {}, options = {}) =>
    requestWithAccountRetry3(account, 'GET', '/edespatch/Purchase', null, params, options),
};

// Public generic caller for endpoints not yet wrapped with named functions.
export async function nilveraRequest(method, path, { data = null, params = null } = {}) {
  return request(method, path, data, params);
}

const operationIndex = {};
for (const service of Object.values(nilveraCatalog.services || {})) {
  if (!service?.endpoints) continue;
  for (const ep of service.endpoints) {
    if (!ep.operationId) continue;
    operationIndex[ep.operationId] = { method: ep.method, path: ep.path, service: ep.service };
  }
}

export const NilveraApi = {
  catalog: nilveraCatalog,

  call: (method, path, options = {}) =>
    request(method, path, options.data ?? null, options.params ?? null),

  callOperation: (operationId, options = {}) => {
    const op = operationIndex[operationId];
    if (!op) {
      return Promise.resolve({ success: false, error: `Operation bulunamadı: ${operationId}` });
    }
    return request(op.method, op.path, options.data ?? null, options.params ?? null);
  },

  findEndpoints: (query) => {
    const q = String(query || '').toLowerCase();
    const all = [];
    for (const s of Object.values(nilveraCatalog.services || {})) {
      if (!s?.endpoints) continue;
      for (const ep of s.endpoints) {
        const hay = `${ep.service} ${ep.method} ${ep.path} ${ep.operationId} ${ep.summary}`.toLowerCase();
        if (hay.includes(q)) all.push(ep);
      }
    }
    return all;
  },
};

// ═══════════════════════════════════════
// E-FATURA API
// ═══════════════════════════════════════

export const EInvoice = {
  // ── Draft ──
  createDraft: (model) =>
    request('POST', '/einvoice/Draft/Create', model),
  listDrafts: (params = {}) =>
    request('GET', '/einvoice/Draft', null, params),

  getDraft: (uuid) =>
    request('GET', `/einvoice/Draft/${uuid}`),

  getDraftHtml: (uuid) =>
    request('GET', `/einvoice/Draft/${uuid}/html`),

  getDraftModel: (uuid) =>
    request('GET', `/einvoice/Draft/${uuid}/model`),

  getDraftPdf: (uuid) =>
    request('GET', `/einvoice/Draft/${uuid}/pdf`),

  getDraftXml: (uuid) =>
    request('GET', `/einvoice/Draft/${uuid}/xml`),

  deleteDraft: (uuid) =>
    request('DELETE', `/einvoice/Draft/${uuid}`),

  deleteDrafts: (uuids) =>
    request('DELETE', '/einvoice/Draft', uuids),

  assignSpecialCode: (uuid, code) =>
    request('PUT', '/einvoice/Draft/SpecialCode', { UUID: uuid, SpecialCode: code }),

  exportDrafts: (fileType, uuids) =>
    request('POST', `/einvoice/Draft/Export/${fileType}`, uuids),

  confirmAndSend: (items) => {
    const payload = Array.isArray(items)
      ? items.map((item) => {
          if (typeof item === 'string') return { UUID: item };
          if (item && typeof item === 'object') {
            return {
              UUID: item.UUID || item.uuid || '',
              ...(item.Alias || item.alias ? { Alias: item.Alias || item.alias } : {}),
            };
          }
          return { UUID: '' };
        }).filter((x) => x.UUID)
      : [];

    return request('POST', '/einvoice/Draft/ConfirmAndSend', payload);
  },

  // ── Send ──
  sendModel: (invoiceModel) =>
    request('POST', '/einvoice/Send/Model', invoiceModel),

  sendXmlPreview: (invoiceModel) =>
    request('POST', '/einvoice/Send/Xml/Preview', invoiceModel),

  // ── Sale (Giden Faturalar) ──
  listSales: (params = {}) =>
    request('GET', '/einvoice/Sale', null, params),

  getSaleStatus: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/Status`),

  setSaleOperation: (operationType, uuids) =>
    request('PUT', `/einvoice/Sale/Operation/${operationType}`, uuids),

  sendSaleEmail: (emailRequest) =>
    request('POST', '/einvoice/Sale/Email/Send', emailRequest),

  getSaleHtml: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/Html`),

  getSaleDetails: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/Details`),

  getSaleTags: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/Tags`),

  getSaleEnvelopeInfo: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/EnvelopeInfo`),

  getSalePdf: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/Pdf`),

  getSaleXml: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/Xml`),

  createSaleDraft: (uuid) =>
    request('POST', `/einvoice/Sale/${uuid}/CreateDraft`),

  setSaleSpecialCode: (uuid, code) =>
    request('PUT', '/einvoice/Sale/SpecialCode', { UUID: uuid, SpecialCode: code }),

  setSaleTags: (tagModel) =>
    request('PUT', '/einvoice/Sale/Tags', tagModel),

  // ── Purchase (Gelen Faturalar) ──
  listPurchases: (params = {}) =>
    request('GET', '/einvoice/Purchase', null, params),

  getPurchase: (uuid) =>
    request('GET', `/einvoice/Purchase/${uuid}`),

  sendAnswer: (answerModel) =>
    request('POST', '/einvoice/Purchase/SendAnswer', answerModel),

  getRejectedNote: (uuid) =>
    request('GET', `/einvoice/Purchase/${uuid}/RejectedNote`),

  getAttachments: (uuid) =>
    request('GET', `/einvoice/Purchase/${uuid}/Attachments`),

  sendPurchaseEmail: (emailRequest) =>
    request('POST', '/einvoice/Purchase/Email/Send', emailRequest),

  createReturn: (uuid) =>
    request('POST', `/einvoice/Purchase/${uuid}/CreateReturn`),

  getPurchaseHtml: (uuid) =>
    request('GET', `/einvoice/Purchase/${uuid}/Html`),

  getPurchasePdf: (uuid) =>
    request('GET', `/einvoice/Purchase/${uuid}/Pdf`),

  getPurchaseXml: (uuid) =>
    request('GET', `/einvoice/Purchase/${uuid}/Xml`),

  // ── Statistics ──
  getPurchaseStats: () =>
    request('GET', '/einvoice/Statistics/Purchase'),

  getSaleStats: () =>
    request('GET', '/einvoice/Statistics/Sale'),

  // ── Notification Settings ──
  getSaleNotifications: () =>
    request('GET', '/einvoice/Notification/Sale'),

  getPurchaseNotifications: () =>
    request('GET', '/einvoice/Notification/Purchase'),

  // ── Tags ──
  listTags: () =>
    request('GET', '/einvoice/Tag'),

  // ── Templates ──
  listTemplates: () =>
    request('GET', '/einvoice/Template'),
};

// ═══════════════════════════════════════
// E-ARŞİV API
// ═══════════════════════════════════════

export const EArchive = {
  // ── Draft ──
  createDraft: (model) =>
    request('POST', '/earchive/Draft/Create', model),
  listDrafts: (params = {}) =>
    request('GET', '/earchive/Draft', null, params),

  getDraftHtml: (uuid) =>
    request('GET', `/earchive/Draft/${uuid}/html`),

  getDraftModel: (uuid) =>
    request('GET', `/earchive/Draft/${uuid}/model`),

  getDraftPdf: (uuid) =>
    request('GET', `/earchive/Draft/${uuid}/pdf`),

  getDraftXml: (uuid) =>
    request('GET', `/earchive/Draft/${uuid}/xml`),

  deleteDrafts: (uuids) =>
    request('DELETE', '/earchive/Draft', uuids),

  exportDrafts: (fileType, uuids) =>
    request('POST', `/earchive/Draft/Export/${fileType}`, uuids),

  confirmAndSend: (uuids) =>
    request('POST', '/earchive/Draft/ConfirmAndSend', uuids),

  // ── Invoices ──
  listInvoices: (params = {}) =>
    request('GET', '/earchive/Invoices', null, params),

  getInvoice: (uuid) =>
    request('GET', `/earchive/Invoices/${uuid}`),

  getInvoiceStatus: (uuid) =>
    request('GET', `/earchive/Invoices/${uuid}/Status`),

  getInvoiceDetails: (uuid) =>
    request('GET', `/earchive/Invoices/${uuid}/Details`),

  getInvoiceTags: (uuid) =>
    request('GET', `/earchive/Invoices/${uuid}/Tags`),

  cancelInvoice: (uuid) =>
    request('PUT', `/earchive/Invoices/${uuid}/Cancel`),

  createInvoiceDraft: (uuid) =>
    request('POST', `/earchive/Invoices/${uuid}/CreateDraft`),

  setInvoiceOperation: (operationType, uuids) =>
    request('PUT', `/earchive/Invoices/Operation/${operationType}`, uuids),

  setInvoiceSpecialCode: (uuid, code) =>
    request('PUT', '/earchive/Invoices/SpecialCode', { UUID: uuid, SpecialCode: code }),

  setInvoiceTags: (tagModel) =>
    request('PUT', '/earchive/Invoices/Tags', tagModel),

  getInvoiceHtml: (uuid) =>
    request('GET', `/earchive/Invoices/${uuid}/Html`),

  getInvoicePdf: (uuid) =>
    request('GET', `/earchive/Invoices/${uuid}/Pdf`),

  getInvoiceXml: (uuid) =>
    request('GET', `/earchive/Invoices/${uuid}/Xml`),

  sendEmail: (emailRequest) =>
    request('POST', '/earchive/Invoices/Email/Send', emailRequest),

  // ── GIB Purchase ──
  listGibPurchases: (params = {}) =>
    request('GET', '/earchive/Gib/Purchase', null, params),

  // ── Reports ──
  sendReport: (reportData) =>
    request('POST', '/earchive/Send/Report', reportData),

  // ── Send Model ──
  sendModel: (invoiceModel) =>
    request('POST', '/earchive/Send/Model', invoiceModel),
};

// ═══════════════════════════════════════
// E-IRSALIYE API
// ═══════════════════════════════════════

export const EDespatch = {
  // ── Draft ──
  createDraft: (model) =>
    request('POST', '/edespatch/Draft/Create', model),
  listDrafts: (params = {}) =>
    request('GET', '/edespatch/Draft', null, params),
  getDraft: (uuid) =>
    request('GET', `/edespatch/Draft/${uuid}`),
  deleteDraft: (uuid) =>
    request('DELETE', `/edespatch/Draft/${uuid}`),
  confirmAndSend: (items) => {
    const payload = Array.isArray(items) ? items.map(i => ({ UUID: i.UUID || i })).filter(x => x.UUID) : [];
    return request('POST', '/edespatch/Draft/ConfirmAndSend', payload);
  },

  // ── Send ──
  sendModel: (despatchModel) =>
    request('POST', '/edespatch/Send/Model', despatchModel),
  sendXmlPreview: (despatchModel) =>
    request('POST', '/edespatch/Send/Xml/Preview', despatchModel),

  // ── Series & Templates ──
  listSeries: (params = {}) =>
    request('GET', '/edespatch/Series', null, params),
  listTemplates: (params = {}) =>
    request('GET', '/edespatch/Templates', null, params),

  // Outgoing (Sale)
  listSales: (params = {}) =>
    request('GET', '/edespatch/Sale', null, params),

  getSaleDetails: (uuid) =>
    request('GET', `/edespatch/Sale/${uuid}/Details`),

  getSaleStatus: (uuid) =>
    request('GET', `/edespatch/Sale/${uuid}/Status`),

  checkSaleFromGib: (uuid) =>
    request('GET', `/edespatch/Sale/${uuid}/CheckFromGib`),

  createSaleDraft: (uuid) =>
    request('POST', `/edespatch/Sale/${uuid}/CreateDraft`),

  setSaleTags: (documentUUID, tags = []) =>
    request('PUT', '/edespatch/Sale/Tags', { DocumentUUID: documentUUID, Tags: tags }),

  sendSaleEmail: (emailRequest) =>
    request('POST', '/edespatch/Sale/Email/Send', emailRequest),

  setSaleOperation: (operationType, uuids = []) =>
    request('PUT', `/edespatch/Sale/Operation/${operationType}`, uuids),

  toInvoice: (uuids = []) =>
    request('POST', '/edespatch/Sale/ToInvoice', { UUIDS: uuids }),

  getSaleEnvelopeInfo: (uuid) =>
    request('GET', `/edespatch/Sale/${uuid}/EnvelopeInfo`),

  getSalePdf: (uuid) =>
    request('GET', `/edespatch/Sale/${uuid}/pdf`),

  getSaleXml: (uuid) =>
    request('GET', `/edespatch/Sale/${uuid}/xml`),

  // Incoming (Purchase)
  listPurchases: (params = {}) =>
    request('GET', '/edespatch/Purchase', null, params),

  listAnswerSeries: (params = {}) =>
    request('GET', '/edespatch/AnswerSeries', null, params),

  listAnswerTemplates: (params = {}) =>
    request('GET', '/edespatch/AnswerTemplates', null, params),

  getPurchaseDetails: (uuid) =>
    request('GET', `/edespatch/Purchase/${uuid}/Details`),

  getPurchaseLines: (uuid) =>
    request('GET', `/edespatch/Purchase/${uuid}/Lines`),

  getPurchaseStatus: (uuid) =>
    request('GET', `/edespatch/Purchase/${uuid}/Status`),

  checkPurchaseFromGib: (uuid) =>
    request('GET', `/edespatch/Purchase/${uuid}/CheckFromGib`),

  createPurchaseDraft: (uuid) =>
    request('POST', `/edespatch/Purchase/${uuid}/CreateDraft`),

  sendPurchaseAnswer: (answerModel) =>
    request('POST', '/edespatch/Purchase/SendAnswer', answerModel),

  getPurchaseTags: (uuid) =>
    request('GET', `/edespatch/Purchase/${uuid}/Tags`),

  setPurchaseTags: (documentUUID, tags = []) =>
    request('PUT', '/edespatch/Purchase/Tags', { DocumentUUID: documentUUID, Tags: tags }),

  setPurchaseOperation: (operationType, uuids = []) =>
    request('PUT', `/edespatch/Purchase/Operation/${operationType}`, uuids),

  setPurchaseSpecialCode: (uuid, code) =>
    request('PUT', '/edespatch/Purchase/SpecialCode', { UUID: uuid, SpecialCode: code }),

  sendPurchaseEmail: (emailRequest) =>
    request('POST', '/edespatch/Purchase/Email/Send', emailRequest),

  getPurchaseEnvelopeInfo: (uuid) =>
    request('GET', `/edespatch/Purchase/${uuid}/EnvelopeInfo`),

  getPurchasePdf: (uuid) =>
    request('GET', `/edespatch/Purchase/${uuid}/pdf`),

  getPurchaseXml: (uuid) =>
    request('GET', `/edespatch/Purchase/${uuid}/xml`),
};

// ═══════════════════════════════════════
// GENERAL API
// ═══════════════════════════════════════

export const General = {
  // GİB E-Fatura Mükellef Listesi
  getGlobalCompanies: (params = {}) =>
    request('GET', '/general/GlobalCompany', null, params),

  searchCompany: (searchText) =>
    request('GET', `/general/GlobalCompany/Search/${encodeURIComponent(searchText)}`),
  searchStock: (searchText) =>
    request('GET', `/general/Stocks/SearchStock/${encodeURIComponent(searchText)}`),
  getGlobalCustomerInfo: (taxNumber) =>
    request('GET', `/general/GlobalCompany/GetGlobalCustomerInfo/${taxNumber}`),

  // Company Info
  getCompanyInfo: () =>
    request('GET', '/general/Company'),
};

// ═══════════════════════════════════════
// Helper: Build Invoice Model
// ═══════════════════════════════════════

export function buildEInvoiceModel({
  profile = 'TEMELFATURA',
  type = 'SATIS',
  issueDate = new Date().toISOString(),
  currencyCode = 'TRY',
  seriesOrNumber = '',
  exchangeRate = null,
  exemptionCode = '',
  customer = {},
  lines = [],
  notes = []
}) {
  const needsExemption = type === 'ISTISNA' || lines.some(l => l.taxRate === 0 || l.unitPrice === 0 || l.discountRate === 100);
  const finalExemptionCode = exemptionCode || "351";
  const exemptionDesc = "KDV İstisnası";

  return {
    InvoiceInfo: {
      InvoiceProfile: profile,
      InvoiceType: type,
      IssueDate: issueDate,
      CurrencyCode: currencyCode,
      ...(seriesOrNumber && { InvoiceSerieOrNumber: seriesOrNumber }),
      ...(exchangeRate && { ExchangeRate: exchangeRate }),
      ...(needsExemption && {
        TaxExemptionReasonInfo: {
          KDVExemptionReasonCode: finalExemptionCode
        }
      })
    },
    CustomerInfo: {
      TaxNumber: customer.taxNumber || '',
      Name: customer.name || '',
      TaxOffice: customer.taxOffice || '',
      Address: customer.address || '',
      District: customer.district || '',
      City: customer.city || '',
      Country: customer.country || 'Türkiye',
      ...(customer.email && { Email: customer.email }),
      ...(customer.phone && { Phone: customer.phone })
    },
    InvoiceLines: lines.map((line, idx) => {
      const p = line.unitPrice || 0;
      const q = line.quantity || 1;
      const discountRate = line.discountRate || 0;
      const taxRate = typeof line.taxRate === 'number' ? line.taxRate : 20;
      
      const gross = p * q;
      const allowanceTotal = gross * (discountRate / 100);
      const net = gross - allowanceTotal;
      const kdvTotal = net * (taxRate / 100);

      return {
        Index: (idx + 1).toString(),
        Type: line.type || 'MAL',
        Name: line.name || '',
        Quantity: q,
        UnitType: line.unitType || 'C62',
        Price: p,
        AllowanceTotal: allowanceTotal,
        KDVPercent: taxRate,
        KDVTotal: kdvTotal,
        Taxes: [{
          TaxCode: line.taxCode || '0015',
          Total: kdvTotal,
          Percent: taxRate,
          ...(taxRate === 0 || p === 0 || type === 'ISTISNA' ? {
            ReasonCode: finalExemptionCode,
            ReasonDesc: exemptionDesc
          } : {})
        }]
      }
    }),
    Notes: notes.map(note => typeof note === 'string' ? { Note: note } : note)
  };
}
