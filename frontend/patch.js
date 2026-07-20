import fs from 'fs';
let content = fs.readFileSync('src/pages/CarryOverPage.jsx', 'utf8');
content = content.replace(
  "return (\\n                      <React.Fragment key={kat}>",
  "console.log('Rendering group:', kat, groupData.length); return (\\n                      <React.Fragment key={kat}>"
);
fs.writeFileSync('src/pages/CarryOverPage.jsx', content);
