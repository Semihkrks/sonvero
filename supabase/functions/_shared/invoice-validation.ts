import { Decimal } from 'npm:decimal.js@10';

export function validateInvoice(payload: Record<string, any>) {
  const model = payload?.EInvoice || payload?.ArchiveInvoice || payload?.Invoice || payload;
  if (!model?.InvoiceInfo || !Array.isArray(model.InvoiceLines) || !model.InvoiceLines.length) throw new Error('Fatura satırları gerekli');
  if (model.InvoiceInfo.CurrencyCode !== 'TRY') throw new Error('Yalnızca TL destekleniyor');
  if (!/^[0-9a-f-]{36}$/i.test(model.InvoiceInfo.UUID || '')) throw new Error('Belge kimliği gerekli');
  if (!/^\d{10,11}$/.test(model.CustomerInfo?.TaxNumber || '')) throw new Error('Geçerli VKN/TCKN gerekli');
  for (const line of model.InvoiceLines) {
    const q = new Decimal(line.Quantity), p = new Decimal(line.Price), discount = new Decimal(line.AllowanceTotal || 0), rate = new Decimal(line.KDVPercent || 0);
    const gross = q.mul(p).toDecimalPlaces(2);
    if (![q,p,discount,rate].every(v=>v.isFinite()) || q.lte(0) || p.lt(0) || discount.lt(0) || discount.gt(gross) || rate.lt(0) || rate.gt(100)) throw new Error('Geçersiz satır');
    const expected = gross.minus(discount).mul(rate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    if (!expected.equals(new Decimal(line.KDVTotal))) throw new Error('Vergi toplamı uyuşmuyor');
  }
}

export function validateDespatch(payload: Record<string, any>) {
 const model=payload?.Despatch||payload;
 if(!model?.DespatchInfo||!Array.isArray(model.DespatchLines)||!model.DespatchLines.length)throw new Error('İrsaliye satırları gerekli');
 if(model.DespatchInfo.CurrencyCode!=='TRY')throw new Error('Yalnızca TL destekleniyor');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(model.DespatchInfo.UUID||''))throw new Error('Belge kimliği gerekli');
 if(!/^\d{10,11}$/.test(model.ReceiverInfo?.TaxNumber||''))throw new Error('Geçerli VKN/TCKN gerekli');
 for(const line of model.DespatchLines){
  const quantity=new Decimal(line.Quantity),price=new Decimal(line.Price),amount=new Decimal(line.Amount);
  if(!line.Name||![quantity,price,amount].every(v=>v.isFinite())||quantity.lte(0)||price.lt(0)||!quantity.mul(price).toDecimalPlaces(2,Decimal.ROUND_HALF_UP).eq(amount))throw new Error('İrsaliye satır tutarı veya miktarı geçersiz');
 }
}
