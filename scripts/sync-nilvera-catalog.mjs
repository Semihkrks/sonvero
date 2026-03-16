import fs from 'fs';

const services = [
  'general',
  'einvoice',
  'earchive',
  'edespatch',
  'evoucher',
  'eproducer',
  'eledger',
  'einsurance',
];

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

function summarizeSpec(service, spec) {
  const paths = spec.paths || {};
  const entries = [];

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const m = method.toUpperCase();
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(m)) continue;
      entries.push({
        service,
        method: m,
        path,
        operationId: op.operationId || '',
        summary: op.summary || op.description || '',
        tags: Array.isArray(op.tags) ? op.tags : [],
      });
    }
  }

  entries.sort((a, b) => {
    if (a.path === b.path) return a.method.localeCompare(b.method);
    return a.path.localeCompare(b.path);
  });

  return {
    service,
    title: spec.info?.title || service,
    version: spec.info?.version || 'v1',
    endpointCount: entries.length,
    endpoints: entries,
  };
}

const out = {
  generatedAt: new Date().toISOString(),
  source: 'https://apitest.nilvera.com/{service}/swagger/v1/swagger.json',
  services: {},
};

for (const service of services) {
  const url = `https://apitest.nilvera.com/${service}/swagger/v1/swagger.json`;
  try {
    const spec = await fetchJson(url);
    out.services[service] = summarizeSpec(service, spec);
    console.log(`OK ${service}: ${out.services[service].endpointCount} endpoint`);
  } catch (err) {
    out.services[service] = { error: String(err) };
    console.error(`FAIL ${service}: ${err.message}`);
  }
}

const jsonPath = 'src/api/nilvera-catalog.generated.json';
fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2), 'utf8');

const mdLines = [];
mdLines.push('# Nilvera API Catalog (Generated)');
mdLines.push('');
mdLines.push(`GeneratedAt: ${out.generatedAt}`);
mdLines.push('');
for (const [name, data] of Object.entries(out.services)) {
  if (data.error) {
    mdLines.push(`## ${name}`);
    mdLines.push(`- Error: ${data.error}`);
    mdLines.push('');
    continue;
  }
  mdLines.push(`## ${name} (${data.endpointCount})`);
  const preview = data.endpoints.slice(0, 40);
  for (const ep of preview) {
    const summary = ep.summary ? ` - ${ep.summary.replace(/\s+/g, ' ').trim()}` : '';
    mdLines.push(`- ${ep.method} ${ep.path}${summary}`);
  }
  if (data.endpoints.length > preview.length) {
    mdLines.push(`- ... +${data.endpoints.length - preview.length} more`);
  }
  mdLines.push('');
}

fs.writeFileSync('analiz.md', mdLines.join('\n'), 'utf8');
console.log(`Wrote ${jsonPath} and analiz.md`);
