#!/usr/bin/env node
/**
 * add-tool-nav-to-new-pages.mjs — 给 combine / split / batch / freeform 四类页面补 .tool-nav
 *
 * 这四个页面此前只有 footer-tools 与 related links；顶部没有工具切换器。
 * 本脚本在 <p class="subtitle"> 之后插入与首页一致的 10 工具 nav（5+5 分组），
 * 当前工具加 active。幂等：已有 <nav class="tool-nav"> 的页面跳过。
 *
 * 用法：
 *   node scripts/design-system/add-tool-nav-to-new-pages.mjs            # dry-run
 *   node scripts/design-system/add-tool-nav-to-new-pages.mjs --apply    # 写盘
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = process.cwd();
const args = parseArgs({ options: { apply: { type: 'boolean', default: false } } });

const SLUGS = ['combine-images', 'split-image', 'batch-compress', 'freeform-collage'];
const UTILS = ['squarecrop', 'roundedcorners', 'square', 'blurredframe', 'aspectratiocalculator'];
const LABELS = {
  '': ['Collage Maker', 'Combine Images', 'Split Image', 'Batch Compress', 'Freeform Collage', 'Square Crop', 'Rounded Corners', 'Square Image', 'Blurred Frame', 'Aspect Ratio'],
  zh: ['拼图制作', '在线图片拼接', '在线图片分割', '批量压缩图片', '自由摆放拼图', '方形裁剪', '圆角工具', '方形图片', '模糊边框', '宽高比'],
  tw: ['拼圖製作', '線上圖片拼接', '線上圖片分割', '批次壓縮圖片', '自由擺放拼圖', '方形裁剪', '圓角工具', '方形圖片', '模糊邊框', '寬高比'],
  ja: ['コラージュ作成', '画像を結合', '画像を分割', '画像を一括圧縮', '自由配置コラージュ', '正方形に切り抜き', '角丸', '正方形画像', 'ぼかしフレーム', 'アスペクト比'],
  es: ['Creador de collages', 'Combinar imágenes', 'Dividir imagen', 'Comprimir imágenes en lote', 'Collage libre', 'Recorte cuadrado', 'Esquinas redondeadas', 'Imagen cuadrada', 'Marco difuminado', 'Proporción'],
  ko: ['콜라주 만들기', '사진 합치기', '이미지 분할', '이미지 일괄 압축', '자유 콜라주', '정사각형 자르기', '둥근 모서리', '정사각형 이미지', '블러 프레임', '화면 비율'],
};
const LOCALES = ['', 'zh', 'tw', 'ja', 'es', 'ko'];
const ICONS = ['fa-home', 'fa-object-group', 'fa-scissors', 'fa-compress', 'fa-arrows-up-down-left-right', 'fa-crop-square', 'fa-border-radius', 'fa-square', 'fa-image', 'fa-expand'];

function hrefs(prefix) {
  const has = (slug) => existsSync(resolve(ROOT, (prefix ? prefix + '/' : '') + slug + '.html'));
  const tool = (slug) => prefix && prefix !== 'ko' && existsSync(resolve(ROOT, prefix + '/tools/' + slug + '/index.html')) ? '/' + prefix + '/tools/' + slug + '/' : '/tools/' + slug + '/';
  const out = [];
  out.push(prefix ? '/' + prefix + '/' : '/');
  for (const slug of SLUGS) {
    out.push(prefix && has(slug) ? '/' + prefix + '/' + slug + '/' : '/' + slug + '/');
  }
  for (const slug of UTILS) out.push(tool(slug));
  return out;
}

const actions = [];
for (const locale of LOCALES) {
  for (const slug of SLUGS) {
    const file = (locale ? locale + '/' : '') + slug + '.html';
    if (!existsSync(resolve(ROOT, file))) continue;
    let html = readFileSync(resolve(ROOT, file), 'utf8');
    if (html.includes('<nav class="tool-nav"')) continue;
    const labels = LABELS[locale] || LABELS[''];
    const urls = hrefs(locale);
    const currentIndex = 1 + SLUGS.indexOf(slug);
    const items = labels.map((label, i) => {
      const cls = 'tool-nav-link' + (i === currentIndex ? ' active' : '');
      return '                    <a href="' + urls[i] + '" class="' + cls + '"><i class="fas ' + ICONS[i] + '"></i> <span>' + label + '</span></a>';
    });
    const nav = '\n        <nav class="tool-nav" aria-label="Tools">\n            <div class="tool-nav-container">\n' +
      items.slice(0, 5).join('\n') + '\n                    <span class="tool-nav-break" aria-hidden="true"></span>\n' +
      items.slice(5).join('\n') + '\n            </div>\n        </nav>\n';
    let updated;
    const sub = html.match(/<p class="subtitle">[\s\S]*?<\/p>/);
    if (sub) {
      updated = html.replace(sub[0], sub[0] + nav);
    } else {
      const h1 = html.match(/<\/h1>/);
      if (!h1) continue;
      updated = html.replace('</h1>', '</h1>' + nav);
    }
    if (args.values.apply) writeFileSync(resolve(ROOT, file), updated, 'utf8');
    actions.push({ file, active: slug });
  }
}

console.log(JSON.stringify({ mode: args.values.apply ? 'apply' : 'dry-run', changed: actions.length, actions }, null, 2));
