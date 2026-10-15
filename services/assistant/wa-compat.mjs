// Keep MediaData model internals out of outgoing Message models. Current WhatsApp
// MediaData includes __x_id and collection state that overwrite the message identity.
export function installMediaCompatibility(){
 if(window.WWebJS.sonveraMediaCompatibility)return;
 const original=window.WWebJS.processMediaData;
 window.WWebJS.processMediaData=async(...args)=>{
  const data=await original(...args);
  const plain=Object.fromEntries(Object.entries(data.toJSON?data.toJSON():data).filter(([key,value])=>value!==undefined&&!key.startsWith('_')&&!['id','from','to','parent','collection','mirror'].includes(key)));
  for(const key of ['mediaBlob','preview','filename','mimetype','filehash','size','directPath','mediaKey','mediaKeyTimestamp','encFilehash','uploadhash','clientUrl','deprecatedMms3Url','mediaHandle'])if(data[key]!==undefined)plain[key]=data[key];
  return plain;
 };
 window.WWebJS.sonveraMediaCompatibility=true;
}
