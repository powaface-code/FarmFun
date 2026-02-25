// ═══════════════════════════════════════════════
// FORMAT — formátování čísel (K, M, B, T...)
// ═══════════════════════════════════════════════
function fmt(n) {
  if (n<1e3)  return n.toFixed(0)+' Kč';
  if (n<1e6)  return (n/1e3).toFixed(1)+' tis';
  if (n<1e9)  return (n/1e6).toFixed(2)+' mil';
  if (n<1e12) return (n/1e9).toFixed(2)+' mld';
  if (n<1e15) return (n/1e12).toFixed(2)+' bil';
  return (n/1e15).toFixed(2)+' kvad';
}
