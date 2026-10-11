export async function saveExportFile(blob,fileName,{signal}={}){
 if(signal?.aborted)throw new DOMException('İndirme iptal edildi','AbortError');
 if(typeof document==='undefined'){self.postMessage({type:'file',blob,fileName});return;}
 const {saveAs}=await import('file-saver');
 if(signal?.aborted)throw new DOMException('İndirme iptal edildi','AbortError');
 saveAs(blob,fileName);
}
