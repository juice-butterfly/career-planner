// 临时脚本：把更新后的 certificates-seed.json 重新灌入数据库（幂等 upsert，按 name 更新）
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/db.js';
import { update, jstr } from './src/repos/base.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const list = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/certificates-seed.json'), 'utf8'));
let updated = 0, created = 0;
for (const it of list) {
  const exist = db.prepare('SELECT id FROM certificates WHERE name = ?').get(it.name);
  const data = {
    name: it.name, type: it.type || 'general', category: it.category || '其他',
    host: it.host || null, majors: jstr(it.majors || []),
    applyTime: it.applyTime || null, examTime: it.examTime || null, frequency: it.frequency || null,
    bonus: it.bonus || null, require: it.require || null, website: it.website || null, note: it.note || null,
    schoolEligible: it.schoolEligible || 'yes', sort: it.sort || 0, enabled: 1,
  };
  if (exist) { update('certificates', exist.id, data); updated += 1; }
  else {
    db.prepare(`INSERT INTO certificates (name,type,category,host,majors,applyTime,examTime,frequency,bonus,require,website,note,schoolEligible,sort,enabled)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      data.name, data.type, data.category, data.host, data.majors, data.applyTime, data.examTime,
      data.frequency, data.bonus, data.require, data.website, data.note, data.schoolEligible, data.sort, data.enabled);
    created += 1;
  }
}
console.log(`证书 seed 完成：updated=${updated} created=${created}`);
const rows = db.prepare('SELECT name, schoolEligible FROM certificates ORDER BY sort').all();
for (const r of rows) console.log(`${r.schoolEligible.padEnd(11)} ${r.name}`);
