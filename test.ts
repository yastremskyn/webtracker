import fs from 'fs';
fetch('https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json')
  .then(r=>r.json())
  .then(d => {
    const map = {};
    d.forEach(c => {
      map[c['country-code']] = { name: c.name, alpha2: c['alpha-2'] };
    });
    fs.writeFileSync('src/countryMap.json', JSON.stringify(map, null, 2));
  });
