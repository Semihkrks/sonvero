import {showModal} from './modal.js';
// Capture the validated summary before sending; never interpolate customer data as HTML.
export function confirmDocument({title,fields,lines=[],total}){
 return new Promise(resolve=>{
  const body=document.createElement('div');body.className='sv-form';
  const details=document.createElement('dl');details.className='sv-document-summary';
  for(const [label,value] of Object.entries(fields)){
   const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=String(value??'');details.append(term,description);
  }
  body.append(details);
  if(lines.length){const list=document.createElement('div');list.className='sv-history';for(const line of lines){const row=document.createElement('div');row.className='sv-history-row';row.textContent=line;list.append(row);}body.append(list);}
  if(total){const amount=document.createElement('strong');amount.className='sv-customer-amount';amount.textContent='Genel toplam: '+total;body.append(amount);}
  const footer=document.createElement('div');footer.className='sv-actions';
  const cancel=document.createElement('button'),send=document.createElement('button');cancel.type=send.type='button';cancel.className='btn btn-secondary';send.className='btn btn-primary';cancel.textContent='Düzenlemeye dön';send.textContent='Onayla ve gönder';footer.append(cancel,send);
  const modal=showModal({title,body,footer,onClose:()=>resolve(false)});
  if(!modal){resolve(false);return;}
  cancel.onclick=()=>modal.close();send.onclick=()=>{resolve(true);modal.close();};
 });
}
