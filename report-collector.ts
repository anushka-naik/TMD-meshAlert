
const res = await fetch('http://localhost:3000/api/health');
const data = await res.json();
console.log('--- STRESS TEST REPORT ---');
console.log(JSON.stringify(data, null, 2));
