const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/w\.title/g, 't(`reports.${w.id}`)');
content = content.replace(/widget\.title/g, 't(`reports.${widget.id}`)');

fs.writeFileSync('src/App.tsx', content);
