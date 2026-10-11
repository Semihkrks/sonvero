import allowed from './nilvera-allowlist.json' with {type:'json'};
// Path match is case-insensitive so Pdf/pdf and Html/html client variants stay allowlisted.
const patterns=allowed.map(([method,path])=>({method,regex:new RegExp('^'+path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\\{[^}]+\\\}/g,'[^/?#]+')+'$','i')}));
export function isAllowedOperation(method:string,path:string){
 if(typeof path!=='string'||!path.startsWith('/')||path.includes('\\'))return false;
 try{if(path.split('/').some(segment=>{const s=decodeURIComponent(segment);return s==='.'||s==='..'||/[\\/?#]/.test(s);} ))return false;}catch{return false;}
 return patterns.some(p=>p.method===method&&p.regex.test(path));
}
