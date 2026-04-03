import fs from 'fs';
async function test() {
  try {
    const res = await fetch('https://unpkg.com/world-atlas@1.1.4/world/110m.json');
    const data = await res.json();
    console.log("Keys:", Object.keys(data.objects));
  } catch (e) {
    console.error(e);
  }
}
test();
