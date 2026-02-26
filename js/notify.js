export function notify(msg, type='') {
  const el = document.createElement('div');
  el.className = 'toast'+(type?' '+type:'');
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>el.remove(), 3100);
}
