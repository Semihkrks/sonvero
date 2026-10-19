import { defineConfig } from 'vite';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
export default defineConfig({
  // closeBundle can run before public/ is copied (seen on Vercel), so fall back to the source file.
  plugins:[{name:'version-service-worker',apply:'build',closeBundle(){
    const outDir=this.environment?.config?.build?.outDir||'dist',target=resolve(outDir,'sw.js');
    const source=existsSync(target)?target:resolve('public/sw.js');
    const text=readFileSync(source,'utf8');
    if(!text.includes('__BUILD_ID__'))return;
    mkdirSync(outDir,{recursive:true});
    writeFileSync(target,text.replaceAll('__BUILD_ID__',randomUUID()));
  }}],
  server:{port:5173,host:'127.0.0.1'},
  // Export worker imports these lazily; a mid-session re-optimize returns 504 and kills the worker.
  optimizeDeps:{include:['exceljs','file-saver','decimal.js']},
  build:{outDir:'dist',minify:'terser',manifest:true},
  worker:{format:'es'}
});
