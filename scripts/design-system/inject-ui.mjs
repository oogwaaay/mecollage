#!/usr/bin/env node
/**
 * scripts/design-system/inject-ui.mjs
 * =============================================================================
 * 在站点 HTML 的 </body> 前注入共享 UI 脚本（R0）：
 *
 *     <script src="/assets/js/ui.js" defer></script>
 *
 * 契约：audit/design-migration/IMPLEMENTATION-SPEC.md §2.4
 *   - 目标：94 个站点 HTML（排除 404.html；排除 audit/、docs/、scripts/ 等非站点目录）
 *   - 位置：统一插在最后一个 </body> 前；含 i18n.js 的页面确保注入行在 i18n.js 之后
 *   - 幂等：已存在则跳过；--remove 只删除本脚本注入的那一行
 *   - 不修改 head / 其他内容；保留原文件换行符（LF/CRLF）与局部缩进
 *
 * 用法：
 *   node scripts/design-system/inject-ui.mjs                     # 默认 dry-run，只报告
 *   node scripts/design-system/inject-ui.mjs --dry-run \
 *     --report audit/design-migration/r0/ui/inject-ui-dryrun.md \
 *     --json audit/design-migration/r0/ui/inject-ui-dryrun.json
 *   node scripts/design-system/inject-ui.mjs --apply             # 真正写入（由 Lead 统一执行）
 *   node scripts/design-system/inject-ui.mjs --remove            # 回滚 dry-run（只报告）
 *   node scripts/design-system/inject-ui.mjs --remove --apply    # 真正回滚注入
 *   node scripts/design-system/inject-ui.mjs --root /tmp/site-copy --apply   # 沙箱测试
 *
 * 参数：
 *   --dry-run | --apply | --remove   三选一，默认 --dry-run
 *   --report <path.md>               写 Markdown 报告
 *   --json <path.json>               写 JSON 报告
 *   --root <dir>                     覆盖扫描根目录（默认脚本所在仓库根）
 *   --quiet                          不打印逐文件明细
 *   --help
 *
 * 退出码：0 成功；1 有异常（结构异常 / 写失败 / 站点页面数不是 94 等）
 * =============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const TAG = '<script src="/assets/js/ui.js" defer></script>';
const EXPECTED_TARGETS = 94;

// 站点 HTML 只可能出现在：仓库根目录、blog/、4 个语言目录（含其 tools/）、public/tools/
const SITE_TOP_DIRS = ['blog', 'es', 'ja', 'tw', 'zh'];
const EXCLUDED_HTML_BASENAMES = new Set(['404.html']);

/* ------------------------------------------------------------------ */
/* 参数解析                                                           */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const args = {
    action: 'inject',   // inject | remove
    write: false,       // false = dry-run（默认）；true = --apply 真正写盘
    report: null,
    json: null,
    root: DEFAULT_ROOT,
    quiet: false,
    help: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--dry-run':
        args.write = false;
        break;
      case '--apply':
        args.write = true;
        break;
      case '--remove':
        args.action = 'remove';
        break;
      case '--report':
        args.report = path.resolve(process.cwd(), argv[++i] || '');
        break;
      case '--json':
        args.json = path.resolve(process.cwd(), argv[++i] || '');
        break;
      case '--root':
        args.root = path.resolve(process.cwd(), argv[++i] || '');
        break;
      case '--quiet':
        args.quiet = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        throw new Error(`未知参数：${arg}（--help 查看用法）`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`用法: node scripts/design-system/inject-ui.mjs [选项]

在 94 个站点 HTML 的 </body> 前注入（或移除）：
  ${TAG}

选项:
  --dry-run        只报告不写盘（默认）
  --apply          真正写入（与 --remove 组合时才真正回滚）
  --remove         方向=删除已注入的行（回滚）；单独使用只做 dry-run 报告
  --report <path>  写入 Markdown 报告
  --json <path>    写入 JSON 报告
  --root <dir>     覆盖扫描根目录（默认仓库根，用于沙箱测试）
  --quiet          不打印逐文件明细
  --help           显示帮助

退出码: 0 成功；1 有异常（见报告）`);
}

/* ------------------------------------------------------------------ */
/* 文件扫描                                                           */
/* ------------------------------------------------------------------ */

function walkHtml(root, dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    if (entry.isDirectory()) {
      walkHtml(root, absolute, out);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    if (EXCLUDED_HTML_BASENAMES.has(entry.name)) continue;
    out.push(relative);
  }
}

function collectSiteHtml(root) {
  const files = [];
  let rootEntries;
  try {
    rootEntries = fs.readdirSync(root, { withFileTypes: true });
  } catch (error) {
    return files;
  }
  rootEntries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of rootEntries) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    if (EXCLUDED_HTML_BASENAMES.has(entry.name)) continue;
    files.push(entry.name);
  }
  for (const dirName of SITE_TOP_DIRS) {
    const dir = path.join(root, dirName);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) walkHtml(root, dir, files);
  }
  const toolsRoot = path.join(root, 'public', 'tools');
  if (fs.existsSync(toolsRoot) && fs.statSync(toolsRoot).isDirectory()) walkHtml(root, toolsRoot, files);
  files.sort();
  return files;
}

/* ------------------------------------------------------------------ */
/* 注入 / 移除逻辑                                                    */
/* ------------------------------------------------------------------ */

const TAG_ANY_RE = /<script\s+src=["']\/assets\/js\/ui\.js["'][^>]*><\/script>/i;
const TAG_ANY_RE_G = /<script\s+src=["']\/assets\/js\/ui\.js["'][^>]*><\/script>/gi;
const I18N_SCRIPT_RE = /<script\s+src=["']\/assets\/js\/i18n\.js["'][^>]*><\/script>/i;

function detectEol(content) {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

function lineNumberAt(content, index) {
  if (index == null || index < 0) return null;
  return content.slice(0, index).split(/\r?\n/).length;
}

// 取 </body> 所在行之前、最近一个非空行的缩进，保持与原文件局部风格一致
function previousLineIndent(content, index) {
  const lines = content.slice(0, index).split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].trim() === '') continue;
    const match = lines[i].match(/^[ \t]*/);
    return match ? match[0] : '';
  }
  return '';
}

/**
 * 分析单个文件。
 * 返回 { status, content?, originalContent, details }
 * status: insert | present | remove | missing-body | multiple-body | invalid-insert
 */
function analyzeFile(root, relative, action) {
  const absolute = path.join(root, relative);
  const content = fs.readFileSync(absolute, 'utf8');
  const eol = detectEol(content);
  const tagMatches = [...content.matchAll(TAG_ANY_RE_G)];
  const hasTag = tagMatches.length > 0;
  const hasI18nJs = I18N_SCRIPT_RE.test(content);
  const bodyIndexes = [...content.matchAll(/<\/body\s*>/gi)].map((match) => match.index);

  const details = {
    hasI18nJs,
    hasUiTag: hasTag,
    tagCount: tagMatches.length,
    tagLineNumber: hasTag ? lineNumberAt(content, tagMatches[0].index) : null,
    bodyCount: bodyIndexes.length
  };

  if (action === 'remove') {
    if (!hasTag) return { status: 'present', originalContent: content, details };
    const tagIndex = tagMatches[0].index;
    const tagText = tagMatches[0][0];
    // 优先整行删除（避免留下空行）；标签不在独立行时退回字符串删除
    const lineStart = content.lastIndexOf('\n', tagIndex - 1) + 1;
    const lineEnd = content.indexOf('\n', tagIndex);
    const lineText = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);
    let next;
    if (lineText.trim() === tagText) {
      next = content.slice(0, lineStart) +
        content.slice(lineEnd === -1 ? content.length : lineEnd + 1);
    } else {
      next = content.slice(0, tagIndex) + content.slice(tagIndex + tagText.length);
    }
    if (TAG_ANY_RE.test(next)) return { status: 'invalid-insert', content: next, originalContent: content, details };
    return { status: 'remove', content: next, originalContent: content, details };
  }

  if (hasTag) return { status: 'present', originalContent: content, details };
  if (bodyIndexes.length === 0) return { status: 'missing-body', originalContent: content, details };
  if (bodyIndexes.length > 1) return { status: 'multiple-body', originalContent: content, details };

  const bodyIndex = bodyIndexes[0];
  const indent = previousLineIndent(content, bodyIndex);
  const insertion = indent + TAG + eol;
  const next = content.slice(0, bodyIndex) + insertion + content.slice(bodyIndex);

  const insertedTagIndex = next.search(TAG_ANY_RE);
  const i18nIndex = next.search(I18N_SCRIPT_RE);
  details.insertedLineNumber = lineNumberAt(next, insertedTagIndex);
  details.afterI18n = i18nIndex === -1 || insertedTagIndex > i18nIndex;
  if (insertedTagIndex === -1 || !details.afterI18n) {
    return { status: 'invalid-insert', content: next, originalContent: content, details };
  }
  return { status: 'insert', content: next, originalContent: content, details };
}

/* ------------------------------------------------------------------ */
/* 报告                                                               */
/* ------------------------------------------------------------------ */

function buildMarkdown(report) {
  const lines = [];
  const changed = report.files.filter((file) => ['insert', 'inserted', 'would-insert', 'removed', 'would-remove'].includes(file.action));
  const errors = report.files.filter((file) => file.action === 'error');
  lines.push('# inject-ui.mjs 报告');
  lines.push('');
  lines.push(`- 生成时间：${report.generatedAt}`);
  const modeLabel = `${report.action === 'remove' ? 'remove（回滚）' : 'inject（注入）'} / ${report.write ? 'apply（写盘）' : 'dry-run（不写盘）'}`;
  lines.push(`- 模式：**${modeLabel}**`);
  lines.push(`- 扫描根目录：\`${report.root}\``);
  lines.push(`- 注入标签：\`${report.tag}\``);
  lines.push(`- 站点页面数：**${report.stats.filesScanned}**（期望 ${report.stats.expectedTargets}）`);
  lines.push('');
  lines.push('## 统计');
  lines.push('');
  lines.push('| 项 | 数量 |');
  lines.push('|---|---|');
  lines.push(`| 扫描站点 HTML | ${report.stats.filesScanned} |`);
  lines.push(`| 含 i18n.js 的页面 | ${report.stats.withI18nJs} |`);
  const future = !report.write;
  if (report.action === 'remove') {
    lines.push(`| ${future ? '将删除' : '已删除'}注入行 | ${report.stats.filesChanged} |`);
    lines.push(`| 本来就没有（跳过） | ${report.stats.alreadyPresent} |`);
  } else {
    lines.push(`| ${future ? '将插入' : '已插入'} | ${report.stats.filesChanged} |`);
    lines.push(`| 已存在（幂等跳过） | ${report.stats.alreadyPresent} |`);
  }
  lines.push(`| 异常 | ${report.stats.errors} |`);
  lines.push(`| 退出码 | ${report.exitCode} |`);
  lines.push('');
  if (report.warnings.length) {
    lines.push('## 警告 / 异常');
    lines.push('');
    report.warnings.forEach((warning) => lines.push(`- ⚠ ${warning}`));
    lines.push('');
  }
  lines.push(`## ${report.action === 'remove' ? '删除' : '变更'}明细（${changed.length} 个文件）`);
  lines.push('');
  if (!report.write) {
    lines.push('> dry-run：以下为“将会执行”的操作，**未写入任何文件**。');
    lines.push('');
  }
  if (!changed.length) {
    lines.push('无（所有目标文件均已符合预期）。');
  } else {
    lines.push('| 文件 | 操作 | 行号 | i18n.js |');
    lines.push('|---|---|---|---|');
    changed.forEach((file) => {
      lines.push(`| ${file.path} | ${file.action} | ${file.lineNumber == null ? '-' : file.lineNumber} | ${file.hasI18nJs ? 'yes' : 'no'} |`);
    });
  }
  lines.push('');
  if (errors.length) {
    lines.push(`## 异常文件（${errors.length}）`);
    lines.push('');
    errors.forEach((file) => lines.push(`- ${file.path}：${file.error}`));
    lines.push('');
  }
  lines.push('## 已存在（幂等跳过，前 20 条）');
  lines.push('');
  const present = report.files.filter((file) => file.action === 'present').slice(0, 20);
  if (!present.length) {
    lines.push('无。');
  } else {
    present.forEach((file) => lines.push(`- ${file.path}${file.lineNumber == null ? '' : `（第 ${file.lineNumber} 行）`}`));
  }
  lines.push('');
  lines.push('## 校验');
  lines.push('');
  lines.push('```bash');
  lines.push('# dry-run（默认）：应报告 94 个站点页面；--apply 之后再跑一次应变 0 变更（幂等）');
  lines.push('node scripts/design-system/inject-ui.mjs --dry-run');
  lines.push('# 回滚');
  lines.push('node scripts/design-system/inject-ui.mjs --remove');
  lines.push('# 注入后：应有 94 个页面包含 ui.js，且每页恰好 1 次');
  lines.push("grep -rc 'assets/js/ui.js' --include='*.html' . | grep -v ':0'");
  lines.push('```');
  lines.push('');
  lines.push('## 边界');
  lines.push('');
  lines.push('- 只动 `</body>` 前的一行 `<script>`，不改 head / 其他脚本 / 页面内容；不含 header 与 SEO 标签。');
  lines.push('- 站点范围：根目录 HTML + `blog/` + `{es,ja,tw,zh}/`（含各自 tools/）+ `public/tools/`；排除 `404.html` 与非站点目录。');
  lines.push('- 幂等：已存在标签时不再插入；`--remove` 只删除本脚本定义的同一标签行。');
  lines.push('- 单个文件找不到唯一 `</body>`、或插入后自检失败时整文件跳过并记录异常，不半写。');
  lines.push('');
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/* 主流程                                                             */
/* ------------------------------------------------------------------ */

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[inject-ui] ${error.message}`);
    process.exitCode = 1;
    return;
  }
  if (args.help) {
    printHelp();
    return;
  }

  const root = args.root;
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`[inject-ui] 根目录不存在：${root}`);
    process.exitCode = 1;
    return;
  }

  const files = collectSiteHtml(root);
  const report = {
    generatedAt: new Date().toISOString(),
    action: args.action,
    write: args.write,
    root,
    tag: TAG,
    stats: {
      expectedTargets: EXPECTED_TARGETS,
      filesScanned: files.length,
      filesChanged: 0,
      alreadyPresent: 0,
      withI18nJs: 0,
      errors: 0
    },
    warnings: [],
    files: []
  };

  if (files.length !== EXPECTED_TARGETS) {
    report.warnings.push(`站点页面数 ${files.length} ≠ 期望 ${EXPECTED_TARGETS}（可能新增/删除页面，或 --root 不对）`);
  }

  for (const relative of files) {
    let result;
    try {
      result = analyzeFile(root, relative, args.action);
    } catch (error) {
      report.stats.errors += 1;
      report.warnings.push(`${relative}: 读取/分析失败 - ${error.message}`);
      report.files.push({ path: relative, action: 'error', error: error.message });
      continue;
    }

    const details = result.details || {};
    if (details.hasI18nJs) report.stats.withI18nJs += 1;

    if (result.status === 'present') {
      report.stats.alreadyPresent += 1;
      report.files.push({
        path: relative,
        action: 'present',
        lineNumber: details.tagLineNumber,
        hasI18nJs: !!details.hasI18nJs
      });
      continue;
    }
    if (result.status === 'missing-body' || result.status === 'multiple-body') {
      report.stats.errors += 1;
      report.warnings.push(`${relative}: 结构异常（${result.status}），已跳过，不写入`);
      report.files.push({ path: relative, action: 'error', error: result.status, hasI18nJs: !!details.hasI18nJs });
      continue;
    }
    if (result.status === 'invalid-insert') {
      report.stats.errors += 1;
      report.warnings.push(`${relative}: 插入/删除后自检失败，已跳过，不写入`);
      report.files.push({ path: relative, action: 'error', error: 'invalid-insert', hasI18nJs: !!details.hasI18nJs });
      continue;
    }

    // 真正写盘只在 --apply；dry-run 一律不写
    if (args.write) {
      try {
        fs.writeFileSync(path.join(root, relative), result.content);
      } catch (error) {
        report.stats.errors += 1;
        report.warnings.push(`${relative}: 写入失败 - ${error.message}`);
        report.files.push({ path: relative, action: 'error', error: error.message, hasI18nJs: !!details.hasI18nJs });
        continue;
      }
    }

    report.stats.filesChanged += 1;
    let action;
    if (result.status === 'remove') {
      action = args.write ? 'removed' : 'would-remove';
    } else {
      action = args.write ? 'inserted' : 'would-insert';
    }
    report.files.push({
      path: relative,
      action,
      lineNumber: result.status === 'remove' ? details.tagLineNumber : details.insertedLineNumber,
      hasI18nJs: !!details.hasI18nJs
    });
  }

  report.exitCode = report.stats.errors > 0 || files.length !== EXPECTED_TARGETS ? 1 : 0;

  if (!args.quiet) {
    console.log(`[inject-ui] 方向=${args.action === 'remove' ? 'remove（回滚）' : 'inject（注入）'} 写盘=${args.write ? 'APPLY' : 'dry-run'} 根目录=${root}`);
    console.log(`[inject-ui] 站点页面 ${files.length} 个（期望 ${EXPECTED_TARGETS}）：变更 ${report.stats.filesChanged}，已存在 ${report.stats.alreadyPresent}，含 i18n.js ${report.stats.withI18nJs}，异常 ${report.stats.errors}`);
    report.warnings.forEach((warning) => console.warn(`[inject-ui] ⚠ ${warning}`));
    report.files.forEach((file) => {
      if (file.action === 'present') return;
      console.log(`  行 ${String(file.lineNumber == null ? '-' : file.lineNumber).padStart(5)}  ${file.action.padEnd(13)} ${file.path}`);
    });
    console.log(`[inject-ui] 退出码 ${report.exitCode}`);
  }

  if (args.report) {
    fs.mkdirSync(path.dirname(args.report), { recursive: true });
    fs.writeFileSync(args.report, buildMarkdown(report));
    if (!args.quiet) console.log(`[inject-ui] Markdown 报告：${args.report}`);
  }
  if (args.json) {
    fs.mkdirSync(path.dirname(args.json), { recursive: true });
    fs.writeFileSync(args.json, JSON.stringify(report, null, 2) + '\n');
    if (!args.quiet) console.log(`[inject-ui] JSON 报告：${args.json}`);
  }

  process.exitCode = report.exitCode;
}

main();
