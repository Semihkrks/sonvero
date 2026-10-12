import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const argsPath = path.join(root, 'SAFE', '_nilvera_redeploy.json');
const args = JSON.parse(fs.readFileSync(argsPath, 'utf8'));

// Emit deploy args as a single JSON line for MCP tooling.
process.stdout.write(JSON.stringify(args));
