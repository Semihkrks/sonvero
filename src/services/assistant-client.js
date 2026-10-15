import {getSupabase} from '../lib/supabase.js';
export const ASSISTANT_URL=import.meta.env.VITE_ASSISTANT_URL||'https://193-122-1-32.sslip.io';
export async function assistantRequest(endpoint,body){
 const {data:{session}}=await getSupabase().auth.getSession();
 if(!session)throw new Error('Oturumunuz sona erdi. Tekrar giriş yapın.');
 let response;
 try{response=await fetch(ASSISTANT_URL+endpoint,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${session.access_token}`,...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});}
 catch{throw new Error('Asistan sunucusuna ulaşılamadı. Bağlantıyı kontrol edip yeniden deneyin.');}
 const result=await response.json();
 if(!response.ok)throw new Error(result.error||'İşlem tamamlanamadı.');
 return result;
}
export function blobBase64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Dosya okunamadı.'));reader.readAsDataURL(blob);});}
