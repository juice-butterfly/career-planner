// 一次性：把基础 seed + 补充 extra 幂等写入真实库
const { seedFromFile } = await import('./src/controllers/contestController.js');
console.log('result:', JSON.stringify(seedFromFile()));
const { all } = await import('./src/repos/base.js');
console.log('total now:', all('SELECT COUNT(*) c FROM contests')[0]?.c);