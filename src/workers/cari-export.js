import {exportCariDefter,exportCustomerCari,exportAllTransactions,exportMultiAccountCari,exportLedgerRows} from '../services/cari-export.js';
const operations={exportCariDefter,exportCustomerCari,exportAllTransactions,exportMultiAccountCari};
self.onmessage=async({data})=>{
 try{
  if(!Object.hasOwn(operations,data.name))throw new Error('Geçersiz dışa aktarma');
  const result=await operations[data.name](...data.args);self.postMessage({type:'result',result});
 }catch{self.postMessage({type:'result',result:{success:false,error:'Dosya hazırlanamadı.'}});}
};
