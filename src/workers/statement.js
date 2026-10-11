import { parseStatementFile } from '../services/bank-statement-parser.js';
self.onmessage=async event=>{try{self.postMessage({rows:await parseStatementFile(event.data)});}catch(error){self.postMessage({error:error.message||'Dosya okunamadı'});}};
