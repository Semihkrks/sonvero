import { getActiveAccount } from '../services/account-manager.js';
import nilveraCatalog from './nilvera-catalog.generated.json';
import { callNilvera, retryRead } from '../lib/api-transport.js';
import { calculateLine } from '../lib/money.js';

function request(method,path,data=null,params=null,options={}) { return callNilvera(getActiveAccount(),method,path,data,params,options); }
export function requestWithAccount(account,method,path,data=null,params=null,options={}) { return callNilvera(account,method,path,data,params,options); }
export function requestRetry3(method,path,data=null,params=null) { const account=getActiveAccount(); return method==='GET' ? retryRead(()=>callNilvera(account,method,path,data,params)) : callNilvera(account,method,path,data,params); }
export function requestWithAccountRetry3(account,method,path,data=null,params=null,options={}) { return method==='GET' ? retryRead(()=>callNilvera(account,method,path,data,params,options),options) : callNilvera(account,method,path,data,params,options); }

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
    const pathParams=options.pathParams||{};
    const missing=[];
    const path=op.path.replace(/\{([^}]+)\}/g,(_,name)=>{const value=pathParams[name];if(value===undefined||value===null||value===''){missing.push(name);return ''; }return encodeURIComponent(String(value));});
    if(missing.length)return Promise.resolve({success:false,status:400,error:'Eksik adres parametresi: '+missing.join(', ')});
    return request(op.method, path, options.data ?? null, options.params ?? null);
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
  createDraft: (model, options = {}) =>
    request('POST', '/einvoice/Draft/Create', model, null, options),
  listDrafts: (params = {}) =>
    request('GET', '/einvoice/Draft', null, params),

  getDraft: (uuid) =>
    request('GET', `/einvoice/Draft/${uuid}/model`),

  getDraftHtml: (uuid) =>
    request('GET', `/einvoice/Draft/${uuid}/html`),

  getDraftModel: (uuid) =>
    request('GET', `/einvoice/Draft/${uuid}/model`),

  getDraftPdf: (uuid) =>
    request('GET', `/einvoice/Draft/${uuid}/pdf`),

  getDraftXml: (uuid) =>
    request('GET', `/einvoice/Draft/${uuid}/xml`),

  deleteDraft: (uuid) =>
    request('DELETE', '/einvoice/Draft', [uuid]),

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
  sendModel: (invoiceModel, options = {}) =>
    request('POST', '/einvoice/Send/Model', invoiceModel, null, options),

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
    request('GET', `/einvoice/Sale/${uuid}/html`),

  getSaleDetails: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/Details`),

  getSaleTags: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/Tags`),

  getSaleEnvelopeInfo: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/EnvelopeInfo`),

  getSalePdf: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/pdf`),

  getSaleXml: (uuid) =>
    request('GET', `/einvoice/Sale/${uuid}/xml`),

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
    request('GET', `/einvoice/Purchase/${uuid}/Details`),

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

  createPurchaseDraft: (uuid) =>
    request('POST', `/einvoice/Purchase/${uuid}/CreateDraft`),

  setPurchaseOperation: (operationType, uuids) =>
    request('PUT', `/einvoice/Purchase/Operation/${operationType}`, uuids),

  setPurchaseSpecialCode: (uuid, code) =>
    request('PUT', '/einvoice/Purchase/SpecialCode', { UUID: uuid, SpecialCode: code }),

  getPurchaseHtml: (uuid) =>
    request('GET', `/einvoice/Purchase/${uuid}/html`),

  getPurchasePdf: (uuid) =>
    request('GET', `/einvoice/Purchase/${uuid}/pdf`),

  getPurchaseXml: (uuid) =>
    request('GET', `/einvoice/Purchase/${uuid}/xml`),

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
    request('GET', '/einvoice/Tags'),

  // ── Templates ──
  listTemplates: () =>
    request('GET', '/einvoice/Templates'),
};

// ═══════════════════════════════════════
// E-ARŞİV API
// ═══════════════════════════════════════

export const EArchive = {
  // ── Draft ──
  createDraft: (model, options = {}) =>
    request('POST', '/earchive/Draft/Create', model, null, options),
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
    request('GET', `/earchive/Invoices/${uuid}/Details`),

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
    request('GET', `/earchive/Invoices/${uuid}/html`),

  getInvoicePdf: (uuid) =>
    request('GET', `/earchive/Invoices/${uuid}/pdf`),

  getInvoiceXml: (uuid) =>
    request('GET', `/earchive/Invoices/${uuid}/xml`),

  sendEmail: (emailRequest) =>
    request('POST', '/earchive/Invoices/Email/Send', emailRequest),

  // ── GIB Purchase ──
  listGibPurchases: (params = {}) =>
    request('GET', '/earchive/Gib/Purchase', null, params),

  // ── Reports ──
  sendReport: (reportData) =>
    request('POST', '/earchive/Send/Report', reportData),

  // ── Send Model ──
  sendModel: (invoiceModel, options = {}) =>
    request('POST', '/earchive/Send/Model', invoiceModel, null, options),
};

// ═══════════════════════════════════════
// E-IRSALIYE API
// ═══════════════════════════════════════

export const EDespatch = {
  // ── Draft ──
  createDraft: (model, options = {}) =>
    request('POST', '/edespatch/Draft/Create', model, null, options),
  editAndSend: (model, options = {}) =>
    request('POST', '/edespatch/Draft/EditAndSend', model, null, options),
  listDrafts: (params = {}) =>
    request('GET', '/edespatch/Draft', null, params),
  getDraft: (uuid) =>
    request('GET', `/edespatch/Draft/${uuid}/model`),
  deleteDraft: (uuid) =>
    request('DELETE', '/edespatch/Draft', [uuid]),
  confirmAndSend: (items) => {
    const payload = Array.isArray(items) ? items.map(i => ({ UUID: i.UUID || i })).filter(x => x.UUID) : [];
    return request('POST', '/edespatch/Draft/ConfirmAndSend', payload);
  },

  // ── Send ──
  sendModel: (despatchModel, options = {}) =>
    request('POST', '/edespatch/Send/Model', despatchModel, null, options),
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

  setSaleSpecialCode: (uuid, code) =>
    request('PUT', '/edespatch/Sale/SpecialCode', { UUID: uuid, SpecialCode: code }),

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
  uuid,
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
  if (currencyCode !== 'TRY') throw new Error('Yeni faturalar yalnızca TL olarak düzenlenebilir.');
  if (!uuid) throw new Error('Belge kimliği eksik.');
  const needsExemption = type === 'ISTISNA' || lines.some(l => l.taxRate === 0 || l.unitPrice === 0 || l.discountRate === 100);
  const finalExemptionCode = exemptionCode || "351";
  const exemptionDesc = "KDV İstisnası";

  return {
    InvoiceInfo: {
      UUID: uuid,
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
      const q = line.quantity;
      const discountRate = line.discountRate || 0;
      const taxRate = typeof line.taxRate === 'number' ? line.taxRate : 20;
      
      const totals = calculateLine({ unitPrice: p, quantity: q, discountRate, taxRate });
      const allowanceTotal = Number(totals.discount);
      const kdvTotal = Number(totals.tax);

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
