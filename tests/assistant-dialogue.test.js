import {it,expect} from 'vitest';
import {dialogueCommand,requestedFormat} from '../src/lib/assistant-dialogue.js';
const candidates=[{name:'Volkan Tekstil',tax:'111'},{name:'Volkan Kumaş',tax:'222'}];
it('keeps attachment selection explicit and independent from direction',()=>{
 expect(requestedFormat('sadece excelini WhatsApp’a gönder')).toBe('excel');
 expect(requestedFormat('excel ve fotoğraf gönder')).toBe('both');
 expect(requestedFormat('sadece resmini gönder')).toBe('image');
 expect(requestedFormat('Excel değil fotoğraf olsun')).toBe('image');
 expect(requestedFormat('fotoğraf olmasın excel olsun')).toBe('excel');
});
it('selects the displayed customer by natural spoken ordinal',()=>{
 for(const text of ['ilki olsun','ilkini seç','kanka birincisi olsun','1'])expect(dialogueCommand(text,{candidates})).toMatchObject({action:'choose',index:0});
 expect(dialogueCommand('ikincisini seçelim',{candidates})).toMatchObject({action:'choose',index:1});
 expect(dialogueCommand('sonuncusu olsun',{candidates})).toMatchObject({index:1});
 expect(dialogueCommand('üçüncüsü olsun',{candidates})).toBe(null);
});
it('uses send confirmation only when a preview exists and preserves chat',()=>{
 expect(dialogueCommand('WhatsApp’a gönder kanka',{hasPreview:true})).toMatchObject({action:'send'});
 expect(dialogueCommand('sadece fotoğrafı gönder',{hasPreview:true})).toMatchObject({action:'send',format:'image'});
 expect(dialogueCommand('WhatsApp’a gönder')).toMatchObject({action:'needs_report'});
 expect(dialogueCommand('eylül ayındaki Harmanda excelini gönder',{hasPreview:true})).toBe(null);
 expect(dialogueCommand('nasılsın',{awaiting:'customer'})).toMatchObject({action:'chat'});
 expect(dialogueCommand('evet',{awaiting:'collections'})).toBe(null);
});
