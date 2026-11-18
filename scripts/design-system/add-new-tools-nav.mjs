#!/usr/bin/env node
/**
 * add-new-tools-nav.mjs — 把四个新工具加入 .tool-nav（Combine / Split / Batch / Freeform）
 *
 * 背景：combine/split/batch/freeform 四页只出现在首页 guide 卡与 footer-tools，
 * 顶部 .tool-nav 仍是 6 个编辑器家族工具。本脚本把四个新工具补进 .tool-nav：
 *   - 有 Collage Maker 链接的页面（首页）：插在 Collage Maker 之后；
 *   - 工具页（无 Collage Maker）：插在 .tool-nav-container 开头；
 *   - 四个链接之后插入 <span class="tool-nav-break">（桌面 5+5 分组，移动隐藏）。
 *
 * 幂等：已含 /combine-images/ 链接的页面跳过。默认 dry-run。
 *
 * 用法：
 *   node scripts/design-system/add-new-tools-nav.mjs            # dry-run
 *   node scripts/design-system/add-new-tools-nav.mjs --apply    # 写盘
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = process.cwd();
const args = parseArgs({ options: { apply: { type: 'boolean', default: false } } });

const LABELS = {
  '': ['Combine Images', 'Split Image', 'Batch Compress', 'Freeform Collage'],
  zh: ['在线图片拼接', '在线图片分割', '批量压缩图片', '自由摆放拼图'],
  tw: ['線上圖片拼接', '線上圖片分割', '批次壓縮圖片', '自由擺放拼圖'],
  ja: ['画像を結合', '画像を分割', '画像を一括圧縮', '自由配置コラージュ'],
  es: ['Combinar imágenes', 'Dividir imagen', 'Comprimir imágenes en lote', 'Collage libre'],
};
const SLUGS = ['combine-images', 'split-image', 'batch-compress', 'freeform-collage'];
const ICONS = ['fa-object-group', 'fa-scissors', 'fa-compress', 'fa-arrows-up-down-left-right'];
const INDENT = '                    ';

const files = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' })
  .trim().split('\n')
  .filter((f) => f && f !== '404.html' && !/^(docs|audit|scripts)\//.test(f));

const changed = [];
const skipped = [];
const errors = [];

for (const file of files) {
  let html;
  try { html = readFileSync(resolve(ROOT, file), 'utf8'); } catch (e) { errors.push({ file, error: e.message }); continue; }
  const nav = html.match(/<nav class="tool-nav"[\s\S]*?<\/nav>/);
  if (!nav) continue;
  if (nav[0].includes('/combine-images/')) { skipped.push(file); continue; }
  const prefix = (file.match(/^(zh|tw|ja|es)\//) || [])[1] || '';
  const labels = LABELS[prefix] || LABELS[''];
  const links = SLUGS.map((slug, i) =>
    INDENT + '<a href="/' + (prefix ? prefix + '/' : '') + slug + '/" class="tool-nav-link"><i class="fas ' + ICONS[i] + '"></i> <span>' + labels[i] + '</span></a>'
  ).join('\n');
  const block = nav[0];
  const collage = block.match(/<a[^>]*class="tool-nav-link[^"]*"[^>]*>[\s\S]*?<\/a>/);
  let updated;
  if (collage && ((collage[0].match(/href="([^"]+)"/) || [])[1] || '') === (prefix ? '/' + prefix + '/' : '/')) {
    updated = block.replace(collage[0], collage[0] + '\n' + links + '\n' + INDENT + '<span class="tool-nav-break" aria-hidden="true"></span>');
  } else {
    // 工具页没有 Collage Maker：把新工具放到工具组之后，保持当前工具在移动端首个可见
    const close = block.lastIndexOf('</div>');
    const head = block.slice(0, close).replace(/\s+$/, '\n');
    updated = head + INDENT + '<span class="tool-nav-break" aria-hidden="true"></span>\n' + links + '\n                ' + block.slice(close);
  }
  if (updated === block) { errors.push({ file, error: 'no insertion point' }); continue; }
  const next = html.replace(block, updated);
  if (args.values.apply) writeFileSync(resolve(ROOT, file), next, 'utf8');
  changed.push(file);
}

console.log(JSON.stringify({ mode: args.values.apply ? 'apply' : 'dry-run', filesScanned: files.length, changed: changed.length, skipped: skipped.length, errors, changedFiles: changed }, null, 2));
