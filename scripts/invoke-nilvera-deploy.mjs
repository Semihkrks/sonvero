import fs from 'node:fs';
import path from 'node:path';

const payloadPath = path.resolve(import.meta.dirname, '../SAFE/_nilvera_for_mcp.json');
const args = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const outPath = path.resolve(import.meta.dirname, '../SAFE/_nilvera_mcp_invoke.json');
fs.writeFileSync(outPath, JSON.stringify({
  namespace: 'plugin-supabase-supabase',
  toolName: 'deploy_edge_function',
  arguments: args,
}));
console.log(JSON.stringify({ ok: true, bytes: Buffer.byteLength(JSON.stringify(args)), files: args.files.length }));
