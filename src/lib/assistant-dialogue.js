const normalize=value=>String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[’']/g,'').replace(/[.!?,]/g,' ').replace(/\s+/g,' ').trim();

export function requestedFormat(text){
 const value=normalize(text);
 let excel=/excel|eksel|xlsx/.test(value),image=/fotograf|gorsel|resim|resm|png/.test(value);
 if(/(?:excel|eksel)\w*\s+(?:degil|olmasin|istemi\w*|haric)/.test(value))excel=false;
 if(/(?:fotograf|gorsel|resim|resm)\w*\s+(?:degil|olmasin|istemi\w*|haric)/.test(value))image=false;
 return excel&&image?'both':excel?'excel':image?'image':null;
}
export const formatLabel=format=>({excel:'Excel',image:'fotoğraf',both:'Excel ve fotoğraf'}[format]||'Excel ve fotoğraf');

export function dialogueCommand(text,{candidates=[],awaiting,hasPreview=false}={}){
 const value=normalize(text),format=requestedFormat(text);
 if(/^(?:kanka )?(?:yeni sohbet|yeni istek|yeni rapor|bastan basla|sifirla)$/.test(value))return {action:'reset'};
 if(/^(?:iptal(?: et)?|vazgec|gonderme|hayir gonderme)$/.test(value))return {action:'cancel'};
 if(candidates.length){
  const ordinal=value.match(/\b(ilki|ilkini|ilk|birinci\w*|ikinci\w*|ucuncu\w*|dorduncu\w*|besinci\w*|altinci\w*|sonuncu\w*|sondaki|[1-9])\b/);
  if(ordinal&&!/\b(?:ay|ayda|ayinda|ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik|20\d{2})\b/.test(value)){
   const word=ordinal[1],names=['birinci','ikinci','ucuncu','dorduncu','besinci','altinci'];
   const index=/^ilk/.test(word)?0:/^son/.test(word)?candidates.length-1:/^\d$/.test(word)?Number(word)-1:names.findIndex(name=>word.startsWith(name));
   if(candidates[index])return {action:'choose',index,format};
  }
  const matches=candidates.map((candidate,index)=>({candidate,index})).filter(({candidate})=>normalize(candidate.name)===value||candidate.tax&&value.includes(candidate.tax));
  if(matches.length===1)return {action:'choose',index:matches[0].index,format};
 }
 const confirmation=value.split(' ').every(word=>/^(?:kanka|lutfen|bana|benim|whatsapp\w*|watsap\w*|gonder\w*|yolla\w*|ilet|onayliyorum|evet|tamam|olur|sadece|yalnizca|excel\w*|eksel\w*|fotograf\w*|gorsel\w*|resim\w*|resm\w*|ve|ikisini|de|olsun|bu|bunu|raporu|raporunu|dosyayi|dosyalari|degil|olmasin)$/.test(word));
 const send=confirmation&&(/\b(?:gonder\w*|yolla\w*|ilet|onayliyorum)\b/.test(value)||/^(evet|tamam|olur)$/.test(value));
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
