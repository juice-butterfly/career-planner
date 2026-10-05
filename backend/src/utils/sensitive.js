// 违禁词审核模块：硬违禁(发布即拒) + 软违禁(进待审)
import { all, one, run } from '../repos/base.js';

/**
 * 检查文本是否命中违禁词。
 * @param {string} text 待检查文本（title + content 拼接后检查）
 * @returns {{ ok: boolean, hard?: string, soft?: string }}
 *   ok=true 通过；ok=false 且 hard 命中硬违禁（应拒绝），soft 命中软违禁（应进待审）
 */
export async function checkSensitive(text) {
  if (!text) return { ok: true };
  const words = await all('SELECT word, level FROM sensitive_words');
  for (const w of words) {
    if (text.includes(w.word)) {
      if (w.level === 'hard') return { ok: false, hard: w.word, soft: undefined };
      // 命中软违禁但未命中硬违禁才记 soft（硬违禁优先）
      if (!text.split('\n').some((ln) => words.some((x) => x.level === 'hard' && ln.includes(x.word)))) {
        return { ok: false, hard: undefined, soft: w.word };
      }
    }
  }
  return { ok: true };
}

/**
 * 管理员用的违禁词增删查
 */
export async function listWords() {
  return all('SELECT * FROM sensitive_words ORDER BY level DESC, id DESC');
}

export async function addWord(word, level = 'hard') {
  // UNIQUE 冲突时忽略；changes>0 表示本次新增，lastInsertRowid 为新增 id（跨 SQLite/MySQL 通用）
  try {
    const info = await run('INSERT OR IGNORE INTO sensitive_words (word, level) VALUES (?, ?)', word, level);
    if (info.changes > 0) return { added: true, id: info.lastInsertRowid };
    const r = await one('SELECT id FROM sensitive_words WHERE word = ?', word);
    return { added: false, id: r?.id };
  } catch (e) {
    return { added: false, error: e.message };
  }
}

export async function removeWord(id) {
  const info = await run('DELETE FROM sensitive_words WHERE id = ?', id);
  return { removed: info.changes > 0 };
}
