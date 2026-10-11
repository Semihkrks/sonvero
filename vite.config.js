import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
export default defineConfig({
  plugins:[{name:'version-service-worker',apply:'build',closeBundle(){
    const path='dist/sw.js';
    writeFileSync(path,readFileSync(path,'utf8').replaceAll('__BUILD_ID__',randomUUID()));
  }}],
  server:{port:5173,host:'127.0.0.1'},
  build:{outDir:'dist',minify:'terser',manifest:true},
  worker:{format:'es'}
});
