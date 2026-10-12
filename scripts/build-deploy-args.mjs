import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const shared = path.join(root, 'supabase/functions/_shared');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function buildNilvera() {
  return {
    project_id: 'ciaffmgszfvyrdoweirw',
    name: 'nilvera',
    entrypoint_path: 'index.ts',
    verify_jwt: false,
    files: [
      { name: 'index.ts', content: read('supabase/functions/nilvera/index.ts') },
      { name: '../_shared/runtime.ts', content: read('supabase/functions/_shared/runtime.ts') },
      { name: '../_shared/policy.ts', content: read('supabase/functions/_shared/policy.ts') },
      { name: '../_shared/invoice-validation.ts', content: read('supabase/functions/_shared/invoice-validation.ts') },
      { name: '../_shared/nilvera-allowlist.json', content: fs.readFileSync(path.join(shared, 'nilvera-allowlist.json'), 'utf8') },
    ],
  };
}

function buildJobRunner() {
  return {
    project_id: 'ciaffmgszfvyrdoweirw',
    name: 'job-runner',
    entrypoint_path: 'index.ts',
    verify_jwt: false,
    files: [
      { name: 'index.ts', content: read('supabase/functions/job-runner/index.ts') },
      { name: '../_shared/runtime.ts', content: read('supabase/functions/_shared/runtime.ts') },
      { name: '../_shared/reconciliation.ts', content: read('supabase/functions/_shared/reconciliation.ts') },
    ],
  };
}

const outDir = path.join(root, 'SAFE');
fs.writeFileSync(path.join(outDir, '_nilvera_args_only.json'), JSON.stringify(buildNilvera()));
fs.writeFileSync(path.join(outDir, '_job_args_only.json'), JSON.stringify(buildJobRunner()));
console.log('built deploy args');
