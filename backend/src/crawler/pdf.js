// PDF 文本提取工具：纯 JS（pdfjs-dist，无原生编译），Node24 可直接运行。
// 用于抓取培养方案等附件型资料（HTMl 之外的 application/pdf）。
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/** 提取 PDF 全部页文本（合并空白）。返回字符串。 */
export async function extractPdfText(uint8) {
  const pdf = await getDocument({ data: uint8 }).promise;
  const parts = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    parts.push(tc.items.map((it) => it.str).join(' '));
  }
  return parts.join('\n');
}