#!/usr/bin/env node
/**
 * add-new-tools-footer.mjs — 四个新工具补进所有 .footer-tools（6 → 10 条）
 *
 * 与 check-layout F 的 expectedFooterLinks 同步（10）。幂等：已含 /combine-images/ 的页跳过。
 * 本地化：zh/tw/ja/es 用本地化链接；ko 只有 combine/split/batch 本地页，freeform 指向英文页。
 *
 * 用法：
 *   node scripts/design-system/add-new-tools-footer.mjs            # dry-run
 *   node scripts/design-system/add-new-tools-footer.mjs --apply    # 写盘
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = process.cwd();
const args = parseArgs({ options: { apply: { type: 'boolean', default: false } } });

const SLUGS = ['combine-images', 'split-image', 'batch-compress', 'freeform-collage'];
const LABELS = {
  '': ['Combine Images', 'Split Image', 'Batch Compress', 'Freeform Collage'],
  zh: ['在线图片拼接', '在线图片分割', '批量压缩图片', '自由摆放拼图'],
  tw: ['線上圖片拼接', '線上圖片分割', '批次壓縮圖片', '自由擺放拼圖'],
  ja: ['画像を結合', '画像を分割', '画像を一括圧縮', '自由配置コラージュ'],
  es: ['Combinar imágenes', 'Dividir imagen', 'Comprimir imágenes en lote', 'Collage libre'],
  ko: ['사진 합치기', '이미지 분할', '이미지 일괄 압축', '자유 콜라주'],
};
const KO_EXISTS = { 'combine-images': true, 'split-image': true, 'batch-compress': true, 'freeform-collage': false };

const files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
  .trim().split('\n')
  .filter((f) => f && f !== '404.html' && !/^(docs|audit|scripts)\//.test(f));

const changed = [];
const skipped = [];
const errors = [];

for (const file of files) {
  const html = readFileSync(resolve(ROOT, file), 'utf8');
  const match = html.match(/<nav class="footer-tools[^"]*"[\s\S]*?<\/nav>/);
  if (!match) continue;
  if (match[0].includes('/combine-images/')) { skipped.push(file); continue; }
  const prefix = (file.match(/^(zh|tw|ja|es|ko)\//) || [])[1] || '';
  const labels = LABELS[prefix] || LABELS[''];
  const links = SLUGS.map((slug, i) => {
    const localized = prefix && (prefix !== 'ko' || KO_EXISTS[slug]);
    const href = localized ? '/' + prefix + '/' + slug + '/' : '/' + slug + '/';
    return { href, label: labels[i] };
  });
  const indentMatch = match[0].match(/\n([ \t]*)<a\s/);
  const indent = indentMatch ? indentMatch[1] : '    ';
  const block = match[0];
  const close = block.lastIndexOf('</nav>');
  const before = block.slice(0, close);
  const closeIndent = (before.match(/\n([ \t]*)$/) || [])[1] || '';
  const added = links.map((link) => indent + '<a href="' + link.href + '">' + link.label + '</a>').join('\n');
  const updated = before.replace(/\s*$/, '\n') + added + '\n' + closeIndent + block.slice(close);
  const next = html.replace(block, updated);
  if (args.values.apply) writeFileSync(resolve(ROOT, file), next, 'utf8');
  changed.push(file);
}

console.log(JSON.stringify({ mode: args.values.apply ? 'apply' : 'dry-run', filesScanned: files.length, changed: changed.length, skipped: skipped.length, errors, changedFiles: changed.slice(0, 5) }, null, 2));
