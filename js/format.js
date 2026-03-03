export function fmtInt(n) {
  if (!isFinite(n) || isNaN(n)) return '0';
  return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Každá řada = 10^3 navíc; latinské číselné předpony (1–20)
const _T = [
  [1e3,  'tis',  1],
  [1e6,  'mil',  2],
  [1e9,  'mld',  2],
  [1e12, 'bil',  2],
  [1e15, 'kvad', 2],
  [1e18, 'kvint',2],
  [1e21, 'sext', 2],
  [1e24, 'sept', 2],
  [1e27, 'okt',  2],
  [1e30, 'non',  2],  // 9  – nonilion
  [1e33, 'dec',  2],  // 10 – decilion
  [1e36, 'und',  2],  // 11 – undecilion
  [1e39, 'dod',  2],  // 12 – duodecilion
  [1e42, 'trd',  2],  // 13 – tredecilion
  [1e45, 'qad',  2],  // 14 – quattuordecilion
  [1e48, 'qid',  2],  // 15 – quindecilion
  [1e51, 'sxd',  2],  // 16 – sexdecilion
  [1e54, 'std',  2],  // 17 – septemdecilion
  [1e57, 'okd',  2],  // 18 – oktodecilion
  [1e60, 'nvd',  2],  // 19 – novemdecilion
  [1e63, 'vig',  2],  // 20 – vigintilion
];

export function fmt(n) {
  if (!isFinite(n) || isNaN(n)) return '∞ Kč';
  if (n < 1e3) return n.toFixed(0) + ' Kč';
  for (let i = _T.length - 1; i >= 0; i--) {
    if (n >= _T[i][0]) return (n / _T[i][0]).toFixed(_T[i][2]) + ' ' + _T[i][1];
  }
  return n.toFixed(0) + ' Kč';
}
