import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const payloadPath = process.argv[2];
if (!payloadPath) {
  console.error('Usage: node run-supabase-deploy.mjs <deploy-args.json>');
  process.exit(2);
}
const args = JSON.parse(fs.readFileSync(path.resolve(payloadPath), 'utf8'));
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@supabase/mcp-server-supabase@latest'],
  env: { ...process.env },
});
const client = new Client({ name: 'sonvera-deploy', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
const result = await client.callTool({ name: 'deploy_edge_function', arguments: args });
console.log(JSON.stringify(result));
await client.close();
