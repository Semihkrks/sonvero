import { renderIncomingInvoices } from './invoices-incoming.js';
import { renderOutgoingInvoices } from './invoices-outgoing.js';
import { renderEDespatchIncoming } from './eirsaliye-incoming.js';
import { renderEDespatchOutgoing } from './eirsaliye-outgoing.js';

export async function renderEFaturaArchiveOutgoing() {
  return renderOutgoingInvoices({
    archivedOnly: true,
    moduleLabel: 'e-Fatura Arşiv',
    boxLabel: 'Giden Kutusu',
  });
}

export async function renderEFaturaArchiveIncoming() {
  return renderIncomingInvoices({
    archivedOnly: true,
    moduleLabel: 'e-Fatura Arşiv',
    boxLabel: 'Gelen Kutusu',
  });
}

export async function renderEirsaliyeArchiveOutgoing() {
  return renderEDespatchOutgoing({
    archivedOnly: true,
    moduleLabel: 'e-İrsaliye Arşiv',
    boxLabel: 'Giden Kutusu',
  });
}

export async function renderEirsaliyeArchiveIncoming() {
  return renderEDespatchIncoming({
    archivedOnly: true,
    moduleLabel: 'e-İrsaliye Arşiv',
    boxLabel: 'Gelen Kutusu',
  });
}
