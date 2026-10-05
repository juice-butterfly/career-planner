// 学校官网资料抓取器：同 host BFS + 关键词过滤 + 去重入库。
// 依赖：Node 内置 fetch + cheerio（纯 JS，无原生编译）。
import * as cheerio from 'cheerio';
import { all, one, insert, run } from '../repos/base.js';
import { extractPdfText } from './pdf.js';
import { SCHOOL_COLLEGES } from '../schoolColleges.js';

// HTML 正文抽取：去脚本/样式/导航/页脚，合并缩进空白
export function extractHtml(html) {
  const $ = cheerio.load(html);
  $( 'script, style, noscript, iframe, header, footer, nav, .menu, .nav, .sidebar, form, dialog, [hidden], script[src]' ).remove();
  const title = $('title').first().text().trim() || $('h1').first().text().trim();
  const body = $('body');
  const text = body
    .find('h1, h2, h3, h4, p, li, td, th, li, span')
    .map((i, el) => $(el).text().trim())
    .get()
    .filter((t) => t && t.length >= 2)
    .join('\n');
  return { title, text: text.trim() };
}

// 关键词 -> 分类推断
const CATEGORY_KEYWORDS = [
  { cat: '升学', kw: ['升学', '考研', '保研', '推免', '研究生', '第二学位', '深造'] },
  { cat: '考公', kw: ['考公', '公务员', '选调', '事业单位', '编制', '招录'] },
  { cat: '就业', kw: ['就业', '招聘', '求职', '双选', '宣讲会', '秋招', '春招', '毕业去向', '就业质量', '签约', '就业率'] },
  { cat: '培养方案', kw: ['培养方案', '教学计划', '培养计划', '专业介绍', '课程体系', '毕业要求', '专业目录'] },
];
export function inferCategory(text = '') {
  for (const { cat, kw } of CATEGORY_KEYWORDS) {
    if (kw.some((k) => text.includes(k))) return cat;
  }
  return '通用';
}

// 是否值得入库
const RELEVANT_KW = ['升学', '考研', '保研', '推免', '公务员', '考公', '选调', '事业单位', '就业', '招聘', '求职', '培养方案', '教学计划', '专业介绍', '毕业去向', '就业质量', '本科', 'employment', 'job', 'admission', 'graduate'];
export function isRelevant(text = '') {
  return RELEVANT_KW.some((k) => text.toLowerCase().includes(k.toLowerCase()));
}

/**
 * 推断页面归属的学院：优先按 URL 子域精确匹配官网学院子域；否则按正文/标题首次出现学院名/别名。
 * @returns {string|null} 学院名（schoolColleges 中的 name）
 */
export function inferCollege(url = '', text = '', title = '') {
  // 1) 优先按 URL 子域精确匹配学院官网子域（最可靠）
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    for (const c of SCHOOL_COLLEGES) {
      if (c.host && (host === c.host || host.endsWith('.' + c.host))) return c.name;
    }
  } catch { /* 忽略非法 URL */ }
  // 2) 正文/标题推断：要求学院名在标题中出现，或正文中出现 ≥2 次，
  //    避免网站导航目录（每页都列出全部学院）造成的误判。
  const body = text || '';
  const ttl = title || '';
  for (const c of SCHOOL_COLLEGES) {
    if (ttl.includes(c.name)) return c.name;
    const count = body.split(c.name).length - 1;
    if (count >= 2) return c.name;
  }
  return null;
}

function isSameHost(baseUrl, link, baseHost) {
  try {
    const u = new URL(baseUrl, link);
    return u.hostname === baseHost;
  } catch {
    return false;
  }
}

/**
 * 执行一次抓取：从 settings 读起始 URL，同 host BFS，将值得入库的页面写入 school_docs。
 * @param {object} cfg { maxPages, maxDepth, sleepMs }
 * @returns {{added, skipped, logs, error}}
 */
export async function crawlOnce(cfg = {}) {
  const { maxPages = 120, maxDepth = 3, sleepMs = 120 } = cfg;
  let seeds = [];
  const seedRaw = (await one('SELECT value FROM settings WHERE key = ?', 'crawl_seed_urls'))?.value;
  try {
    seeds = seedRaw ? JSON.parse(seedRaw) : [];
  } catch { seeds = []; }
  if (!Array.isArray(seeds) || seeds.length === 0) {
    return { added: 0, skipped: 0, logs: [{ url: '-', status: 'error', message: '未配置起始 URL，请在管理端设置 crawl_seed_urls' }], error: 'no_seed' };
  }

  const baseHost = new URL(seeds[0]).hostname;
  const queue = seeds.map((u) => ({ url: normalizeUrl(u), depth: 0 }));
  const visited = new Set();
  const seen = new Set(queue.map((q) => q.url));
  let added = 0;
  let skipped = 0;
  const logs = [];
  const log = async (url, status, message) => {
    logs.push({ url, status, message });
    await insert('crawl_logs', { url, status, message });
  };

  while (queue.length && visited.size < maxPages) {
    const { url, depth } = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    let html = null, title = url, text = '';
    let isPdf = false;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (career-planner-school-crawler)' }, redirect: 'follow' });
      if (!res.ok) { await log(url, 'error', `HTTP ${res.status}`); skipped++; continue; }
      const ctype = res.headers.get('content-type') || '';
      isPdf = ctype.includes('pdf') || url.toLowerCase().endsWith('.pdf');
      if (!isPdf && !ctype.includes('text/html') && !ctype.includes('application/xhtml')) { skipped++; continue; }
      if (isPdf) {
        // PDF 附件（培养方案等）：用 pdfjs 纯 JS 提取文本
        text = await extractPdfText(new Uint8Array(await res.arrayBuffer()));
      } else {
        html = await res.text();
        const ex = extractHtml(html);
        title = ex.title;
        text = ex.text;
      }
    } catch (e) {
      await log(url, 'error', `fetch/pdf: ${e.message}`);
      skipped++;
      continue;
    }
    if (!text || !text.trim()) { skipped++; continue; }

    const blob = `${title} ${text}`;
    if (!isRelevant(blob)) { skipped++; continue; }

    // 去重：按 url hash
    const hash = makeHash(url + blob.slice(0, 200));
    const existed = await one('SELECT id FROM school_docs WHERE hash = ?', hash);
    if (existed) { skipped++; continue; }

    // 同 host 链接入队（BFS）——但只往下钻浅层，避免无限扩散。PDF 无可抽取链接，跳过
    if (!isPdf && depth < maxDepth) {
      const $ = cheerio.load(html);
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const abs = normalizeAbs(url, href);
        if (!abs || !isSameHost(url, abs, baseHost)) return;
        if (visited.has(abs) || seen.has(abs)) return;
        seen.add(abs);
        queue.push({ url: abs, depth: depth + 1 });
      });
    }

    const category = inferCategory(blob);
    const college = inferCollege(url, text, title);
    const cleaned = text.replace(/\n{3,}/g, '\n\n').slice(0, 60000); // 截断，控制体积
    await insert('school_docs', { category, title: title || url, url, content: cleaned, major: null, college, source: '', hash });
    await log(url, 'ok', `[${category}${college ? `|${college}` : ''}] ${title || ''}`);
    added++;
    if (sleepMs) await new Promise((r) => setTimeout(r, sleepMs));
  }

  const summary = (await one('SELECT COUNT(*) AS n FROM school_docs')).n;
  return { added, skipped, total: summary, logs };
}

function normalizeAbs(base, href) {
  try { return new URL(href, base).href; } catch { return null; }
}
function normalizeUrl(u) {
  try {
    const x = new URL(u);
    // 去掉常见追踪参数，避免重复
    return x.href;
  } catch { return u; }
}
function makeHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export default crawlOnce;