import fs from 'node:fs';
import path from 'node:path';

const argsPath = process.argv[2];
if (!argsPath) {
  console.error('Usage: node mcp-deploy-edge.mjs <deploy-args.json>');
  process.exit(2);
}
const args = JSON.parse(fs.readFileSync(path.resolve(argsPath), 'utf8'));
process.stdout.write(JSON.stringify(args));
