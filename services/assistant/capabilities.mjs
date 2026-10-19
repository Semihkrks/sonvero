// Public capability descriptions shared by the UI and the model prompt.
// Examples describe existing tools; this catalog never executes a command.
export const assistantCapabilities=[
 {id:'reports',title:'Cari rapor ve Excel',tools:['report'],summary:'Hesap, müşteri, dönem, satış/alış ve tahsilat filtreleriyle Excel veya fotoğraf hazırla.',examples:['Ayşe hesabından Harmanda için eylül satış alış tahsilat dahil Excel hazırla','Aynısını geçen ay için hazırla','Tahsilatları çıkar','Sadece satışlar olsun']},
 {id:'balance',title:'Müşteri borcu ve alacağı',tools:['balance'],summary:'Seçilen gerçek müşterinin arşivdeki TL bakiyesini oku.',examples:['Serkan hesabındaki Harmanda bize ne kadar borçlu','Harmanda bakiyesi ne','Peki onun alacağı ne kadar']},
 {id:'summaries',title:'Satış, alış ve tahsilat toplamları',tools:['summary'],summary:'Seçilen hesap/müşteri ve dönemin gerçek kayıtlarından toplam veya borçlu müşteri sıralaması hesapla.',examples:['Bu ay kaç para topladık','Ayşe hesabında eylül satış toplamı ne','Tüm hesaplarda en borçlu beş müşteriyi göster','Satıştan tahsilatı çıkar']},
 {id:'latest',title:'Son tahsilat',tools:['latest_collection'],summary:'Tahsilat tarihine göre değil, kaydın eklenme zamanına göre son kaydı oku.',examples:['Serkan hesabında en son eklediğim tahsilat ne','Harmanda’nın son tahsilatını göster']},
 {id:'create',title:'Tahsilat ekleme',tools:['collection'],summary:'Gerçek hesap ve müşteriye yeni tahsilat taslağı hazırla; açık onaydan sonra kaydet.',examples:['Bugün Serkan hesabındaki Harmanda müşterisine 60 bin tahsilat ekle','Buna 2k daha ekle','Harmanda’ya 60 bin, Cihan’a 20 bin tahsilat ekle']},
 {id:'edit',title:'Tahsilat düzeltme ve iptal',tools:['update_collection','cancel_collection'],summary:'Gerçek kaydı seç, tutarı/tarihi düzelt veya geçmişi koruyarak iptal et; açık onay iste.',examples:['Serkan’daki son tahsilatı 75 bin olarak düzeltir misin','Tutar','75 bin, tarihi de dün olsun','Az önce eklediğim tahsilatı iptal et']},
 {id:'invoices',title:'Fatura sorgulama',tools:['invoices'],summary:'Arşivdeki satış (giden) ve alış (gelen) faturalarını hesap, müşteri ve döneme göre say; son veya en büyük faturaları göster. Yalnız okur.',examples:['Bu ay kaç satış faturası kestik','Harmanda’ya kestiğimiz son fatura ne','Eylülde gelen faturalar','Ayşe hesabında en büyük fatura','Ya gelenler?']},
 {id:'invoice_create',title:'Fatura kesme',tools:['navigate'],summary:'Fatura oluştur ekranını açar; fatura bilgileri orada görülür ve kullanıcı onayıyla kesilir. SonAI kendiliğinden fatura kesmez.',examples:['Harmanda’ya fatura kesmek istiyorum','Yeni fatura oluştur']},
 {id:'delivery',title:'Rapor biçimi ve gönderim',tools:['report_format','report_send'],summary:'Hazır raporun biçimini değiştir, dosyayı indir veya mevcut yapılandırılmış WhatsApp alıcısına onayla gönder.',examples:['Sadece Excel olsun','Excel yerine fotoğraf olsun','WhatsApp’a gönder','Gönderme']},
 {id:'navigation',title:'Uygulama ekranları',tools:['navigate'],summary:'İlgili ekranı aç; ekran açmak belge oluşturmak veya değiştirmek değildir.',examples:['Giden faturaları aç','Gelen faturaları göster','Müşteri bakiyelerini aç','Hesaplara git']},
 {id:'conversation',title:'Konuşmaya devam ve seçim',tools:['select_customer','dialogue'],summary:'Sohbet geçmişini ve son sonucu (hesap, müşteri, dönem, metrik) hatırla; takip sorularında yalnız değişen alanı değiştir, belirsizlikte seçim iste. Sohbet panel kapansa da aynı sekmede sürer.',examples:['Harmanda müşterimiz','Peki geçen ayki?','Ya satışlar?','Onu Excel yap','Aynı müşteriye 5 bin tahsilat ekle','İkincisi olsun','Yeni sohbet']},
];
export const assistantLimitations='Banka/kasa bakiyesi, stok, kâr, vade takibi ve dönem karşılaştırması için doğrudan araç yok. Net hareket toplamı kâr değildir. Fatura/irsaliye SonAI tarafından kesilmez veya gönderilmez (yalnız ilgili ekran açılır, işlem orada onaylanır); dekont işleme, ödeme ve kalıcı silme yapılmaz. Veriyi okumadan sonuç veya tutar söylenmez. Birden fazla olası hesap/müşteri varsa seçim gerekir.';
const fold=value=>String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim();
export function capabilityReply(text){
 const value=fold(text);
 if(!/(?:ne(?:ler)?\s+(?:yapabil\w*|sorabil\w*)|hangi\s+(?:soru\w*|komut\w*|islem\w*)|(?:ornek|komut)\w*\s+(?:ver|soyle|goster)|(?:sistemi|yeteneklerini)\s+anlat|nasil\b.*\b(?:ekle\w*|duzelt\w*|degistir\w*|iptal edebil\w*|gonder\w*|hazirla\w*))/ .test(value))return null;
 let ids=[];
 if(/fatura/.test(value))ids=/kes|olustur/.test(value)?['invoice_create']:['invoices','invoice_create'];
 else if(/tahsilat/.test(value))ids=/duzelt|degistir|iptal/.test(value)?['edit']:/son/.test(value)?['latest']:['create','edit','latest'];
 else if(/borc|alacak|bakiye/.test(value))ids=['balance','summaries'];
 else if(/rapor|excel|ekstre|cari/.test(value))ids=['reports','delivery'];
 else if(/whatsapp|gonder|fotograf|gorsel/.test(value))ids=['delivery'];
 else if(/satis|alis|toplam|ozet/.test(value))ids=['summaries'];
 else if(/ekran|sayfa/.test(value))ids=['navigation'];
 if(!ids.length)return 'Müşteri bakiyesi, satış–alış–tahsilat toplamları ve son tahsilatı sorabilir; tahsilat ekleyip düzeltebilir veya iptal edebilirsin. Arşivdeki faturaları sorgulayabilir, Cari raporu Excel ya da fotoğraf olarak hazırlayıp WhatsApp’a gönderebilirim. Örnekler için “tahsilatla ilgili ne sorabilirim” veya “rapor için örnek ver” de.';
 const selected=ids.map(id=>assistantCapabilities.find(item=>item.id===id));
 const examples=selected.flatMap(item=>item.examples.slice(0,ids.length>1?1:3));
 return selected[0].summary+' '+examples.map(example=>'“'+example+'”').join('; ')+'.';
}
export function capabilityPrompt(){
 return assistantCapabilities.map(item=>`${item.title} [${item.tools.join(', ')}]: ${item.summary} Örnekler: ${item.examples.join(' / ')}`).join('\n')+'\nSınırlar: '+assistantLimitations;
}
