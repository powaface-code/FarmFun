export function fmtInt(n) {
  if (!isFinite(n) || isNaN(n)) return '0';
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return '∞ Kč';
  if (n<1e3)  return n.toFixed(0)+' Kč';
  if (n<1e6)  return (n/1e3).toFixed(1)+' tis';
  if (n<1e9)  return (n/1e6).toFixed(2)+' mil';
  if (n<1e12) return (n/1e9).toFixed(2)+' mld';
  if (n<1e15) return (n/1e12).toFixed(2)+' bil';
  if (n<1e18) return (n/1e15).toFixed(2)+' kvad';
  if (n<1e21) return (n/1e18).toFixed(2)+' kvint';
  if (n<1e24) return (n/1e21).toFixed(2)+' sext';
  if (n<1e27) return (n/1e24).toFixed(2)+' sept';
  if (n<1e30) return (n/1e27).toFixed(2)+' okt';
  return (n/1e30).toFixed(2)+' non';
}
