export function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
export function safeColor(value){return /^#[0-9a-f]{6}$/i.test(value||'')?value:'#2563eb';}
