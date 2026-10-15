const SENDS = 3;

export function messageFileName(message) {
  const data = message?._data || {};
  return String(message?.filename || data.filename || message?.media?.filename || data.mediaData?.filename || '').trim();
}

export function findSentMessage(messages, { fileName, caption, sinceMs, usedIds = [] } = {}) {
  const used = new Set(usedIds.filter(Boolean));
  const captionText = String(caption || '').trim();
  const since = Number(sinceMs) - 20000;
  const wantsImage = /\.png$/i.test(fileName || '');
  for (const message of messages || []) {
    if (!message?.fromMe) continue;
    const id = typeof message.id === 'string' ? message.id : message.id?._serialized;
    if (!id || used.has(id)) continue;
    const stamp = Number(message.timestamp || 0);
    const ms = stamp > 1e12 ? stamp : stamp * 1000;
    if (!ms || ms < since) continue;
    const name = messageFileName(message);
    const body = String(message.body || message._data?.caption || '').trim();
    if ((name && name === fileName) || body === fileName) return { id };
    const media = message.hasMedia === true || ['document', 'image', 'video'].includes(message.type);
    if (!name && media && captionText && body === captionText) return { id };
    // Photos are sent as image media; WhatsApp often drops the original filename.
    if (wantsImage && (message.type === 'image' || (media && /\.png$/i.test(name)))) return { id };
  }
  return null;
}

/** found → record, unread before any send → send, unread after a send → unknown, missing within the limit → send, otherwise fail. */
export function nextDeliveryStep({ lookup, sends, resumed }) {
  if (lookup === 'found') return 'record';
  if (lookup === 'unread') return sends === 0 && !resumed ? 'send' : 'unknown';
  if (sends >= SENDS) return 'fail';
  return 'send';
}
