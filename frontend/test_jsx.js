const React = require('react');
const data = [{kategori: 'A'}, {kategori: 'B'}];

const result = data.length === 0 ? "Empty" : (
  data.reduce((acc, current) => {
    const kat = current.kategori || 'Lain-lain';
    if (!acc.includes(kat)) acc.push(kat);
    return acc;
  }, []).map((kat) => {
    return React.createElement('div', {key: kat}, kat);
  })
);

console.log(JSON.stringify(result, null, 2));
