const normalize=value=>String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[’']/g,'').replace(/[.!?,]/g,' ').replace(/\s+/g,' ').trim();

const excelWords='(?:excel|eksel|xlsx)(?:ini|in|i|e|den)?';
const imageWords='(?:fotograf(?:ini|inin|i|a|tan)?|gorsel(?:ini|inin|i|e|den)?|resim(?:ini|inin|i|e|den)?|resm(?:ini|inin|i)|png)';
export function requestedFormat(text,{currentFormat}={}){
 const value=normalize(text);
 const negative='(?:degil|olmasin|istemiyorum|isteme|haric|yerine|cikar|kaldir|gonderme|yollama|dahil etme)';
 const hasExcel=new RegExp('\\b'+excelWords+'\\b').test(value),hasImage=new RegExp('\\b'+imageWords+'\\b').test(value);
 const excludeExcel=new RegExp('\\b'+excelWords+'\\s+(?:de\\s+|da\\s+)?'+negative+'\\b').test(value);
 const excludeImage=new RegExp('\\b'+imageWords+'\\s+(?:de\\s+|da\\s+)?'+negative+'\\b').test(value);
 let excel=hasExcel&&!excludeExcel,image=hasImage&&!excludeImage;
 const additive=/\b(?:de|da)\s+(?:olsun|ekle|hazirla)|\bekle\b/.test(value)&&!/\b(?:sadece|yalnizca|yerine)\b/.test(value);
 if(additive&&(hasExcel||hasImage)){excel ||= currentFormat==='excel'||currentFormat==='both';image ||= currentFormat==='image'||currentFormat==='both';}
 if(!excel&&!image&&currentFormat==='both'&&(excludeExcel!==excludeImage)){excel=excludeImage;image=excludeExcel;}
 return excel&&image?'both':excel?'excel':image?'image':null;
}
export const formatLabel=format=>({excel:'Excel',image:'fotoğraf',both:'Excel ve fotoğraf'}[format]||'Excel ve fotoğraf');

export function dialogueCommand(text,{candidates=[],awaiting,hasPreview=false,currentFormat}={}){
 const value=normalize(text),format=requestedFormat(text,{currentFormat});
 if(/^(?:kanka )?(?:yeni sohbet|yeni istek|yeni rapor|bastan basla|sifirla)$/.test(value))return {action:'reset'};
 if(/^(?:iptal(?: et)?|vazgec|gonderme|hayir gonderme)$/.test(value))return {action:'cancel'};
 if(candidates.length){
  const ordinal=value.match(/\b(ilki|ilkini|ilk|birinci\w*|ikinci\w*|ucuncu\w*|dorduncu\w*|besinci\w*|altinci\w*|sonuncu\w*|sondaki|[1-9])\b/);
  if(ordinal&&!/\b(?:ay|ayda|ayinda|ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik|20\d{2})\b/.test(value)){
   const word=ordinal[1],names=['birinci','ikinci','ucuncu','dorduncu','besinci','altinci'];
   const index=/^ilk/.test(word)?0:/^son/.test(word)?candidates.length-1:/^\d$/.test(word)?Number(word)-1:names.findIndex(name=>word.startsWith(name));
   if(candidates[index])return {action:'choose',index,format};
  }
  const nameQuery=value.replace(new RegExp('\\b(?:'+excelWords+'|'+imageWords+')\\b','g'),'').replace(/\b(?:kanka|lutfen|olan|olsun|sec|secelim|musteri|musterisi|vkn|tckn|de|da|ve)\b/g,'').replace(/\s+/g,' ').trim();
  const taxes=value.match(/\b\d+\b/g)||[];
  const matches=candidates.map((candidate,index)=>({candidate,index})).filter(({candidate})=>{
   if(candidate.tax&&taxes.includes(String(candidate.tax)))return true;
   if(!nameQuery||/\d/.test(nameQuery))return false;
   return (' '+normalize(candidate.name)+' ').includes(' '+nameQuery+' ');
  });
  if(matches.length===1)return {action:'choose',index:matches[0].index,format};
 }
 const confirmation=value.split(' ').every(word=>/^(?:kanka|lutfen|bana|benim|whatsapp\w*|watsap\w*|gonder\w*|yolla\w*|ilet|onayliyorum|evet|tamam|olur|sadece|yalnizca|excel\w*|eksel\w*|xlsx|fotograf\w*|gorsel\w*|resim\w*|resm\w*|png|ve|ikisini|de|da|olsun|bu|bunu|raporu|raporunu|dosyayi|dosyalari|degil|olmasin|yerine|ekle|cikar|kaldir|misin|misiniz)$/.test(word));
 const positiveSend=/\b(?:gonder(?:in|ir|ebilir)?|yolla(?:yin|r|yabilir)?|ilet|onayliyorum)\b/.test(value);
 const negativeSend=/\b(?:gonderme|yollama|iletme)\b/.test(value);
 if(confirmation&&negativeSend&&!positiveSend)return {action:'cancel'};
 const send=confirmation&&(positiveSend||/^(evet|tamam|olur)$/.test(value));
 if(hasPreview&&send)return {action:'send',format};
 if(hasPreview&&format&&confirmation)return {action:'format',format};
 if(!hasPreview&&send&&/gonder|yolla|ilet/.test(value))return {action:'needs_report',format};
 if(awaiting==='format'&&/^(ikisi de|her ikisi|ikisini de|ikisi|hepsi)$/.test(value))return {action:'format',format:'both'};
 if(awaiting==='collections'&&/^(evet|hayir|olsun|dahil|haric)$/.test(value))return null;
 if(/^(?:kanka\s+)?(?:merhaba|selam|selamlar|gunaydin|iyi aksamlar|hey)(?:\s+kanka)?$/.test(value))return {action:'chat',reply:'Merhaba! Ben SonAI. Nasılsın, bugün ne yapalım?'};
 if(/\b(nasilsin|naber|ne haber)\b/.test(value)&&!(/cari|rapor|fatura|tahsilat/.test(value)))return {action:'chat',reply:'İyiyim, teşekkür ederim! Sen nasılsın? Hazır olduğunda birlikte bir cari rapor hazırlayabiliriz.'};
 if(/^(?:ben de )?(?:iyiyim|iyidir|iyi|fena degil|tesekkurler|sag ol|sagol)(?: kanka)?$/.test(value))return {action:'chat',reply:'Ne güzel! Bugün ne yapmak istersin? Cari rapor hazırlayabilir, Excel veya fotoğrafını WhatsApp’a gönderebilirim.'};
 if(/^(?:kotuyum|iyi degilim|yorgunum|moralim bozuk)(?: kanka)?$/.test(value))return {action:'chat',reply:'Zor bir gün olmuş gibi. İstersen biraz konuşabiliriz. İşlerini kolaylaştırmamı istersen de buradayım.'};
 if(/ne yapabilirsin|neler yapabiliyorsun|yardim et|sistemi anlat/.test(value))return {action:'chat',reply:'Hesap ve müşteri adını söyleyerek tahsilat kaydedebilir, arşivdeki bakiyeyi sorgulayabilir, cari raporu Excel veya fotoğraf olarak hazırlayıp WhatsApp’a gönderebilirsin. “Giden faturaları aç” gibi ekran komutları da verebilirsin. Tahsilatı kaydetmeden önce hesap, müşteri, tutar ve tarihi onaylarsın. Fatura ve irsaliye düzenlemek için ilgili ekranı açabilirim.'};
 return null;
}
