// Opt-in evaluation using synthetic commands; never writes records or sends messages.
// Run with SONAI_SETTINGS_PATH pointing to this service's existing settings file.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildInterpretPrompt,interpretationConfig,interpretationSchema} from '../interpretation.mjs';
import {validateIntent} from '../validation.mjs';
const settingsPath=process.env.SONAI_SETTINGS_PATH;
if(!settingsPath)throw new Error('SONAI_SETTINGS_PATH is required for the opt-in live evaluation.');
const {geminiKey}=JSON.parse(await fs.readFile(settingsPath,'utf8'));
if(!geminiKey)throw new Error('No model key configured.');
const accounts=[{id:'a',name:'Ayşe Karabut'},{id:'b',name:'Serkan Bingöl'}];
const cases=[
 {name:'compound report',text:'ayşe karabut hesabından 9.ay satışalış tahsilatdahil harmanda müşterisinin excelini ver',expected:{action:null,account:'Ayşe Karabut',customer:'Harmanda',month:9,direction:'both',withCollections:true,format:'excel'}},
 {name:'latest persisted edit',text:'serkan bingöldeki son eklediğim tahsilatın tutarı yanlıştı onu 75 bin olarak düzeltir misin',expected:{action:'update_collection',account:'Serkan Bingöl',customer:null}},
 {name:'latest read is not create',text:'en son eklediğim tahsilat ne',expected:{action:'latest_collection'}},
 {name:'report customer continuation',text:'Harmanda eylül satış alış tahsilat dahil',context:{awaiting:'customer',draft:{accountIds:['a'],scope:'cari',format:'excel',year:2026}},expected:{action:null,customer:'Harmanda',month:9,direction:'both',withCollections:true}},
];
for(const example of cases){
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',{
  method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},
  body:JSON.stringify({contents:[{parts:[{text:buildInterpretPrompt({today:'2026-10-17',text:example.text,context:JSON.stringify({accounts,...example.context})})}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:interpretationSchema,...interpretationConfig}}),signal:AbortSignal.timeout(30000),
 });
 if(!response.ok)throw new Error(`Model evaluation HTTP ${response.status}; no fallback model used.`);
 const answer=await response.json();const raw=answer.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('');
 const actual=validateIntent(JSON.parse(raw));
 for(const [key,value] of Object.entries(example.expected))assert.equal(typeof actual[key]==='string'?actual[key].toLocaleLowerCase('tr-TR'):actual[key]??null,typeof value==='string'?value.toLocaleLowerCase('tr-TR'):value,`${example.name}: ${key}`);
 console.log(JSON.stringify({case:example.name,passed:true,finishReason:answer.candidates?.[0]?.finishReason}));
}
