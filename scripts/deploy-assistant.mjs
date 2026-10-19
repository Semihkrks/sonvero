// Deploy only the isolated assistant service. No frontend publication or WhatsApp messages.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const host=process.env.ASSISTANT_SSH_HOST||'opc@193.122.1.32';
const identity=process.env.ASSISTANT_SSH_KEY||path.join(os.homedir(),'Downloads','ssh-key-2026-10-15.key');
const source=fs.readFileSync('src/lib/supabase.js','utf8');
const url=source.match(/EMBEDDED_SUPABASE_URL = .*?\|\| '([^']+)'/)[1];
const anon=source.match(/EMBEDDED_SUPABASE_ANON_KEY = .*?\|\| '([^']+)'/)[1];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sonvera-assistant-'));
const ssh=command=>execFileSync('ssh',['-i',identity,'-o','BatchMode=yes',host,command],{stdio:'inherit'});
const copy=(files,destination)=>execFileSync('scp',['-i',identity,...files,`${host}:${destination}`],{stdio:'inherit'});
try{
 const envPath=path.join(dir,'service.env');
 fs.writeFileSync(envPath,`SUPABASE_URL=${url}\nSUPABASE_ANON_KEY=${anon}\nOWNER_EMAIL=sonvera@gmail.com\nALLOWED_ORIGINS=https://sonvera.com.tr,https://www.sonvera.com.tr,http://localhost:5173,http://127.0.0.1:5173\n`,{mode:0o600});
 const unitPath=path.join(dir,'sonvera-assistant.service');
 fs.writeFileSync(unitPath,`[Unit]\nDescription=Sonvera WhatsApp and report assistant\nAfter=network-online.target\n[Service]\nRestart=always\nRestartSec=10\nTimeoutStartSec=180\nTimeoutStopSec=45\nExecStart=/usr/bin/podman run --rm --replace --name sonvera-assistant --userns=keep-id --memory=3g --shm-size=256m -p 127.0.0.1:8787:8787 --env-file /home/opc/sonvera/config/service.env --env-file /home/opc/sonvera/config/recipient.env -v /home/opc/sonvera/data:/data:Z localhost/sonvera-assistant:1\nExecStop=/usr/bin/podman stop -t 30 sonvera-assistant\n[Install]\nWantedBy=default.target\n`);
 ssh('mkdir -p /home/opc/.config/systemd/user /home/opc/sonvera/config');
 copy(['services/assistant/package.json','services/assistant/package-lock.json','services/assistant/Containerfile','services/assistant/server.mjs','services/assistant/interpretation.mjs','services/assistant/capabilities.mjs','services/assistant/validation.mjs','services/assistant/delivery.mjs','services/assistant/wa-compat.mjs'],'/home/opc/sonvera/');
 copy([envPath],'/home/opc/sonvera/config/service.env');
 copy([unitPath],'/home/opc/.config/systemd/user/sonvera-assistant.service');
 ssh('chmod 600 /home/opc/sonvera/config/service.env && cd /home/opc/sonvera && podman build -t localhost/sonvera-assistant:1 . && systemctl --user daemon-reload && systemctl --user enable sonvera-assistant && systemctl --user restart sonvera-assistant');
}finally{if(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'sonvera-assistant-'))fs.rmSync(dir,{recursive:true,force:true});}
