import {summarizeRows} from './report-data.js';
const currency=value=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(Number(value));
const palette=['#16a34a','#0f766e','#2563eb','#dc2626'];
export function reportCardModel(group,accounts,options,opening){
 const visible=accounts.filter(a=>group.rows.some(r=>r.accountId===a.id));
 const total=summarizeRows(group.rows);
 // Match the screen and the exported period exactly. Never add unrelated archived history.
 const full=options.direction==='both'&&options.withCollections;
 const balance=total.net;
 return {name:group.name,tax:group.tax||'Belirtilmemiş',balanceLabel:full?'Bakiye':'Dönem neti',balance,columns:visible.map((account,index)=>{
  const rows=group.rows.filter(r=>r.accountId===account.id),part=summarizeRows(rows);
  return {name:account.name,color:account.color||palette[index%palette.length],count:rows.length,satis:part.satis,alis:part.alis,tahsilat:part.tahsilat};
 })};
}
export async function createReportImage(group,accounts,options,opening){
 await document.fonts.ready;
 const card=reportCardModel(group,accounts,options,opening);
 const perRow=Math.min(4,Math.max(card.columns.length,1)),rows=Math.max(1,Math.ceil(card.columns.length/4));
 const pad=36,colW=250,gap=20,width=Math.max(1040,pad*2+perRow*colW+(perRow-1)*gap),colH=188;
 const measure=document.createElement('canvas').getContext('2d');
 const wrap=(value,max,size,bold)=>{measure.font=`${bold?600:400} ${size}px Inter, sans-serif`;const words=String(value||'').split(/\s+/),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(line&&measure.measureText(next).width>max){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines.length?lines:[''];};
 const nameLines=wrap(card.name,width-pad*2-250,22,true);
 const height=nameLines.length*28+rows*colH+168;
 const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;
 const c=canvas.getContext('2d');c.scale(2,2);c.fillStyle='#f5f7fb';c.fillRect(0,0,width,height);
 c.fillStyle='#ffffff';c.fillRect(16,16,width-32,height-32);
 const paint=(value,x,y,size,color,bold=false,max=700,align='left')=>{c.fillStyle=color;c.font=`${bold?600:400} ${size}px Inter, sans-serif`;c.textAlign=align;c.fillText(String(value),x,y,max);c.textAlign='left';};
 nameLines.forEach((line,index)=>paint(line,pad,58+index*28,22,'#172033',true,width-pad*2-250));
 const nameBottom=58+nameLines.length*28;
 paint(`VKN: ${card.tax}`,pad,nameBottom+4,14,'#64748b',false,width-pad*2-250);
 paint(card.balanceLabel,width-pad,52,13,'#94a3b8',true,220,'right');
 paint(currency(card.balance),width-pad,84,22,'#e07a2f',true,280,'right');
 c.strokeStyle='#e7edf4';c.beginPath();c.moveTo(pad,nameBottom+28);c.lineTo(width-pad,nameBottom+28);c.stroke();
 let y=nameBottom+62;paint('HESAPLARA GÖRE KIRILIM',pad,y,12,'#94a3b8',true);y+=22;
 card.columns.forEach((column,index)=>{
  const columnX=pad+(index%4)*(colW+gap),top=y+Math.floor(index/4)*colH;
  c.fillStyle=column.color;c.fillRect(columnX,top,3,colH-28);
  const title=wrap(column.name.toLocaleUpperCase('tr-TR'),colW-24,13,true).slice(0,2);
  title.forEach((line,lineIndex)=>paint(line,columnX+16,top+18+lineIndex*18,13,'#172033',true,colW-24));
  let lineY=top+18+title.length*18+6;
  paint(`${column.count} hareket`,columnX+16,lineY,12,'#64748b',false,colW-24);lineY+=28;
  for(const [label,key,color] of [['Satış','satis','#15803d'],['Alış','alis','#c2410c'],['Tahsilat','tahsilat','#15803d']]){paint(label+':',columnX+16,lineY,12,'#64748b',false,70);paint(currency(column[key]),columnX+78,lineY,13,color,true,colW-100);lineY+=24;}
 });
 paint(`${options.start} – ${options.end} · Seçili dönem`,pad,height-28,12,'#94a3b8');
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Rapor görseli oluşturulamadı.')),'image/png'));
}
