import { adminClient, authenticated, cors, json, providerFetch, upstreamBase } from '../_shared/runtime.ts';
import { documentUuidFromRequest, reconciliationLookupPath, reconciliationState } from '../_shared/reconciliation.ts';
const routes: Record<string,string> = { efatura_sale:'/einvoice/Sale', efatura_purchase:'/einvoice/Purchase', earsiv:'/earchive/Invoices', earsiv_gib:'/earchive/Gib/Purchase' };
Deno.serve(async request=>{
  if(request.method==='OPTIONS') return new Response(null,{headers:cors(request)});
  if(request.method!=='POST') return json(request,{error:'Yöntem desteklenmiyor'},405);
  const schedulerSecret=Deno.env.get('SCHEDULER_SECRET');
  const supplied=request.headers.get('x-scheduler-secret');
  let allowed=false;
  if(schedulerSecret&&supplied) {
    const a=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(schedulerSecret)));
    const b=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(supplied)));
    allowed=a.reduce((v,x,i)=>v|(x^b[i]),0)===0;
  }
  if(!allowed) { try{await authenticated(request);allowed=true;}catch{} }
  if(!allowed) return json(request,{error:'Yetkisiz'},401);
  const admin=adminClient();
  await admin.rpc('schedule_recent_sync',{p_owner:Deno.env.get('OWNER_USER_ID')});
  const {data:jobs,error}=await admin.rpc('claim_background_jobs',{p_limit:2});
  if(error) return json(request,{error:'İş kuyruğu kullanılamıyor'},503);
  let done=0;
  for(const job of jobs||[]) {
    try {
      const {data:account}=await admin.from('accounts').select('environment,disabled_at').eq('id',job.account_id).eq('user_id',job.user_id).single();
      if(!account||account.disabled_at) throw new Error('Hesap devre dışı');
      const {data:key,error:keyError}=await admin.rpc('get_account_secret',{p_id:job.account_id,p_user_id:job.user_id});
      if(keyError) throw keyError;
      const base=upstreamBase(account.environment);
      if(job.kind==='sync') {
        const {data:health}=await admin.rpc('database_usage');
        if(health?.ratio>=0.85) throw new Error('Veritabanı kapasitesi yüzde 85 üzerinde; tarama durduruldu');
        const p=job.payload;
        if(!routes[p.docType]) throw new Error('Belge türü geçersiz');
        const url=new URL(base+routes[p.docType]);
        for(const [k,v] of Object.entries({StartDate:p.start+'T00:00:00',EndDate:p.end+'T23:59:59',Page:p.page||1,PageSize:50}))url.searchParams.set(k,String(v));
        const response=await providerFetch(url.href,key);
        if(!response.ok)throw new Error('Nilvera okuma hatası: '+response.status);
        const body=await response.json();
        const items=Array.isArray(body)?body:body.Content||body.Items||body.items;
        if(!Array.isArray(items))throw new Error('Beklenmeyen liste yanıtı');
        const total=Number(body.TotalPages||0),page=Number(p.page||1);
        if(items.length===0&&total>page)throw new Error('Eksik API sayfası');
        const normalized=items.map((item:Record<string,any>)=>({uuid:item.UUID||item.Uuid||item.InvoiceUUID,date:String(item.IssueDate||item.issueDate||'').slice(0,10),payload:item}));
        const finished=(total>0&&page>=total)||(!total&&items.length<50);
        const result=await admin.rpc('stage_archive_page',{p_job_id:job.id,p_lease:job.lease_token,p_items:normalized,p_next_page:page+1,p_complete:finished});
        if(result.error)throw result.error;
      } else {
        const {data:op}=await admin.from('operation_receipts').select('*').eq('id',job.payload.operationId).single();
        if(!op)throw new Error('İşlem bulunamadı');
        if(!['succeeded','failed'].includes(op.status)) {
          const req=op.request,model=req.data?.EInvoice||req.data?.ArchiveInvoice||req.data?.Invoice||req.data?.Despatch||req.data;
          if(Array.isArray(model)&&model.length!==1)throw new Error('Çoklu işlem satır bazında kontrol edilmeli');
          if(Array.isArray(req.data?.UUIDS)&&req.data.UUIDS.length!==1)throw new Error('Çoklu işlem satır bazında kontrol edilmeli');
          const uuid=documentUuidFromRequest(req.path,req.data);
          if(uuid&&!/^[0-9a-f-]{36}$/i.test(uuid))throw new Error('Geçersiz belge kimliği');
          if(!uuid)throw new Error('Manuel kontrol gerekli: bu işlemin belge kimliği yok');
          const statusPath=reconciliationLookupPath(req.path,uuid);
          if(!statusPath)throw new Error('Bu işlem türü belge durumuyla doğrulanamaz; manuel kontrol gerekli');
          const response=await providerFetch(base+statusPath,key);
          if(!response.ok)throw new Error('Belge durumu henüz doğrulanamadı');
          const data=await response.json();
          const state=reconciliationState(req.path,req.data||{},data);
          if(state==='unknown')throw new Error('Sağlayıcı işlemin tamamlandığını henüz doğrulamadı');
          const result=await admin.rpc('finish_nilvera_operation',{p_id:op.id,p_status:state,p_result:{success:state==='succeeded',data,error:state==='failed'?'Nilvera belge durumunu hata olarak bildirdi.':undefined,operationId:op.id,operationStatus:state,reconciled:true,status:200}});
          if(result.error)throw result.error;
        }
        await admin.from('background_jobs').update({status:'done',lease_until:null,lease_token:null,updated_at:new Date().toISOString()}).eq('id',job.id).eq('lease_token',job.lease_token);
      }
      done++;
    } catch(error) {
      const terminal=job.attempts>=8;
      await admin.from('background_jobs').update({status:terminal?'failed':'pending',last_error:String(error instanceof Error?error.message:'İş tamamlanamadı').slice(0,200),
        lease_until:null,lease_token:null,next_run_at:new Date(Date.now()+Math.min(3600000,60000*2**job.attempts)).toISOString(),updated_at:new Date().toISOString()}).eq('id',job.id).eq('lease_token',job.lease_token);
      if(terminal&&job.kind==='reconcile')await admin.from('operation_receipts').update({status:'unknown',updated_at:new Date().toISOString()}).eq('id',job.payload.operationId).eq('status','processing');
    }
  }
  return json(request,{processed:done,claimed:jobs?.length||0});
});
