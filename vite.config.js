import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
export default defineConfig({
  plugins:[{name:'version-service-worker',apply:'build',closeBundle(){
    const path='dist/sw.js';
    writeFileSync(path,readFileSync(path,'utf8').replaceAll('__BUILD_ID__',randomUUID()));
  }}],
  server:{port:5173,host:'127.0.0.1'},
  // Export worker imports these lazily; a mid-session re-optimize returns 504 and kills the worker.
  optimizeDeps:{include:['exceljs','file-saver','decimal.js']},
  build:{outDir:'dist',minify:'terser',manifest:true},
  worker:{format:'es'}
});
