import { createHash } from 'node:crypto';

export function validatePackage(body) {
  if (body?.confirmed !== true) throw new Error('Gönderim onayı gerekli.');
  if (!/^[a-f0-9-]{36}$/i.test(body.id || '')) throw new Error('Geçersiz işlem kimliği.');
  if(!/^[1-9]\d{7,14}$/.test(body.recipient||''))throw new Error('Önizlemedeki alıcı numarası gerekli.');
  if (!Array.isArray(body.files) || body.files.length < 1 || body.files.length > 12) throw new Error('1–12 dosya seçin.');
  let total = 0;
  const files = body.files.map(file => {
    if (!file || typeof file.base64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.base64) || file.base64.length % 4) throw new Error('Dosya içeriği geçersiz.');
    const bytes = Buffer.from(file.base64, 'base64');
    total += bytes.length;
    const png = file.mime === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const xlsx = file.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && bytes.subarray(0, 2).toString() === 'PK';
    if (!png && !xlsx) throw new Error('Yalnız PNG ve Excel dosyaları gönderilebilir.');
    const name = String(file.name || '').replace(/[\\/\x00-\x1f]/g, '_').slice(0, 160);
    if (!name || !(png ? /\.png$/i : /\.xlsx$/i).test(name)) throw new Error('Dosya adı geçersiz.');
    return { name, mime: file.mime, base64: file.base64 };
  });
  if (total > 16 * 1024 * 1024) throw new Error('Toplam dosya boyutu en fazla 16 MB olabilir.');
  const caption = String(body.caption || '').slice(0, 900);
  const hash = createHash('sha256').update(JSON.stringify({ files, caption,recipient:body.recipient })).digest('hex');
  return { id: body.id, files, caption, hash,recipient:body.recipient };
}

export function validateIntent(value) {
  const nullableText = key => value[key] == null ? null : String(value[key]).slice(0, 200);
  const result = {
    account: nullableText('account'), customer: nullableText('customer'),
    scope: ['cari','selected','all'].includes(value.scope) ? value.scope : null,
    direction: ['satis','alis','both'].includes(value.direction) ? value.direction : null,
    withCollections: typeof value.withCollections === 'boolean' ? value.withCollections : null,
    start: nullableText('start'), end: nullableText('end'),
    layout: ['single','separate'].includes(value.layout) ? value.layout : null,
    format: ['excel','image','both'].includes(value.format) ? value.format : null,
    allCustomers: typeof value.allCustomers==='boolean'?value.allCustomers:null,
    month: Number.isInteger(value.month)&&value.month>=1&&value.month<=12?value.month:null,
    year: Number.isInteger(value.year)&&value.year>=2000&&value.year<=2100?value.year:null,
  };
  for (const key of ['start','end']) {
    if (result[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(result[key]) || !Number.isFinite(Date.parse(result[key])) || new Date(result[key]).toISOString().slice(0,10) !== result[key])) result[key] = null;
  }
  if (result.start && result.end && result.start > result.end) throw new Error('Başlangıç tarihi bitişten sonra olamaz.');
  return result;
}
