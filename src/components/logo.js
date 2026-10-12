// Inline copy of public/logo.svg; ids are suffixed per call so multiple logos on a page don't clash.
let seq = 0;
export function logoMark(size = 36) {
  const id = 'sv' + (++seq);
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}b" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#${id}b)"/><rect width="64" height="64" rx="15" fill="url(#${id}s)"/><path d="M42.5 22.5C40.4 18.6 36.4 16.5 31.6 16.5c-6 0-10.4 3.2-10.4 8.1 0 5.3 4.6 6.9 11 8.2 6.5 1.4 11.3 3.1 11.3 8.6 0 5.1-4.6 7.6-10.8 7.6-5.1 0-9.2-2-11.6-5.6" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="47.5" cy="16.5" r="3.6" fill="#7dd3fc"/></svg>`;
}
