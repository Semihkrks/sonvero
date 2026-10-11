const contexts=new WeakMap();
export function rememberExportPeriod(page,{start='',end='',complete=true}){contexts.set(page,{start,end,complete});}
export function exportPeriod(page,startSelector,endSelector){
 const period=contexts.get(page);
 if(!period)throw new Error('Önce seçilen dönemin verilerini yükleyin.');
 const start=page.querySelector(startSelector)?.value||'',end=page.querySelector(endSelector)?.value||'';
 if(start!==period.start||end!==period.end)throw new Error('Tarih aralığı değişti. Dosyayı almadan önce Ara ile verileri yenileyin.');
 if(!period.complete)throw new Error('Bazı firma veya belge verileri yüklenemedi. Eksik Excel oluşturmamak için taramayı tekrar çalıştırın.');
 return {start:period.start,end:period.end};
}
