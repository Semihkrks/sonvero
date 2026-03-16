const fs = require('fs');

let code = fs.readFileSync('src/pages/invoices-outgoing.js', 'utf8');

// Title changes
code = code.replace(/Outgoing Invoices \(Giden Faturalar\)/g, 'E-Archive Invoices (e-Arşiv Faturaları)');
code = code.replace(/Giden Faturalar/g, 'e-Arşiv Faturaları');
code = code.replace(/renderOutgoingInvoices/g, 'renderEArsivInvoices');

// API Replacements
code = code.replace(/EInvoice\.listSales/g, 'EArchive.listInvoices');
code = code.replace(/EInvoice\.getSalePdf/g, 'EArchive.getInvoicePdf');
code = code.replace(/EInvoice\.getSaleXml/g, 'EArchive.getInvoiceXml');
code = code.replace(/EInvoice\.getSaleHtml/g, 'EArchive.getInvoiceHtml');
code = code.replace(/EInvoice\.sendSaleEmail/g, 'EArchive.sendEmail');

// "Cevap" Column Removal:
// The <thead> has <th>Cevap</th>
code = code.replace('<th>Cevap</th>', '');
// The rendering string logic for Cevap:
// `<td><span class="badge ${cevapBg}">${cevapText}</span></td>`
code = code.replace(/<td><span class="badge "\$\{cevapBg\}">\$\{cevapText\}<\/span><\/td>/g, '');
code = code.replace(/<td><span class="badge \$\{cevapBg\}">\$\{cevapText\}<\/span><\/td>/g, '');

// GİB Durumu from detail actions mapping, let's keep or remove. Wait, the dropdown actions:
code = code.replace(/<div class="action-dropdown-item" data-act="gib">.*?<\/div>/s, '');
// Instead of complex regex for "GİB Sorgula", let's leave it or remove `case 'gib':` block?
// For safety we'll replace the case block
code = code.replace(/case 'gib':[\s\S]*?break;/g, `case 'gib':\n        showToast('E-Arşiv için durum sorgulama desteklenmemektedir', 'info');\n        break;`);
// And remove it from the template:
code = code.replace(/<div class="action-dropdown-item" data-act="gib">[^<]+<\/div>/, '');

// File UUID types
code = code.replace(/source = btn.dataset.source \|\| 'efatura'/g, "source = btn.dataset.source || 'earsiv'");

// Caching and loading variables
code = code.replace(/cachedOutgoing/g, "cachedEarsiv");
code = code.replace(/filteredOutgoing/g, "filteredEarsiv");
code = code.replace(/loadOutgoing/g, "loadEarsiv");

// Source bindings in DOM elements
code = code.replace(/data-source="efatura"/g, 'data-source="earsiv"');

fs.writeFileSync('src/pages/earsiv-faturalar.js', code, 'utf8');

// App.js injection
let app = fs.readFileSync('src/app.js', 'utf8');
if (!app.includes('renderEArsivInvoices')) {
  app = app.replace(
      "import { renderOutgoingInvoices } from './pages/invoices-outgoing.js';",
      "import { renderOutgoingInvoices } from './pages/invoices-outgoing.js';\nimport { renderEArsivInvoices } from './pages/earsiv-faturalar.js';"
  );
  
  app = app.replace(
      "registerRoute('/outgoing'", 
      "registerRoute('/earsiv-faturalar', async () => ({\n  page: await renderEArsivInvoices(),\n  title: 'e-Arşiv Faturaları'\n}));\n\nregisterRoute('/outgoing'"
  );
  
  fs.writeFileSync('src/app.js', app, 'utf8');
}
console.log('Conversion successful!');