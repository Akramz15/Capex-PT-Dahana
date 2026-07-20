const fs = require('fs');
// Let's assume data has a few items
const data = [
  { kategori: "Tanah & Bangunan", daftar_capex: "Renovasi Kantor", anggaran_rkap: 1000000, items: { 1: {real:0, bast:0} } },
  { kategori: "Peralatan Teknik", daftar_capex: "Pompa", anggaran_rkap: 50000, items: { 1: {real:0, bast:0} } }
];

const groups = data.reduce((acc, current) => {
  const kat = current.kategori || 'Lain-lain';
  if (!acc.includes(kat)) acc.push(kat);
  return acc;
}, []);

console.log("Groups:", groups);
const result = groups.map(kat => {
    const groupData = data.filter(d => d.kategori === kat);
    return groupData.length;
});
console.log("Result lengths:", result);
