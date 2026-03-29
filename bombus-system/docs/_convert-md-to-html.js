#!/usr/bin/env node
/**
 * Markdown → Styled HTML 轉換器
 *
 * 用法：
 *   node _convert-md-to-html.js <md-filename> [module-color] [module-color-dark]
 *
 * 範例：
 *   node _convert-md-to-html.js 功能說明書_招募管理與AI智能面試.md          # 自動偵測模組色
 *   node _convert-md-to-html.js 功能說明書_招募管理與AI智能面試.md L1       # 使用 L1 色彩
 *   node _convert-md-to-html.js my-doc.md #8DA399 #6B8577                  # 自訂色彩
 *
 * 模組色彩預設值：
 *   L1 = #8DA399 / #6B8577 (sage)       — 員工管理
 *   L2 = #D6A28C / #B8876E (terracotta) — 職能管理
 *   L3 = #7F9CA0 / #5F7C80 (petrol)    — 教育訓練
 *   L4 = #9A8C98 / #7A6C78 (mauve)     — 專案管理
 *   L5 = #B87D7B / #9A5F5D (brick)     — 績效管理
 *   L6 = #C4A4A1 / #A6867E (rose)      — 文化管理
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// ── 模組色彩對照表 ──────────────────────────────────────
const MODULE_COLORS = {
  L1: { main: '#8DA399', dark: '#6B8577', name: '員工管理' },
  L2: { main: '#D6A28C', dark: '#B8876E', name: '職能管理' },
  L3: { main: '#7F9CA0', dark: '#5F7C80', name: '教育訓練' },
  L4: { main: '#9A8C98', dark: '#7A6C78', name: '專案管理' },
  L5: { main: '#B87D7B', dark: '#9A5F5D', name: '績效管理' },
  L6: { main: '#C4A4A1', dark: '#A6867E', name: '文化管理' },
};

// ── 工具函式 ─────────────────────────────────────────────
function lightenHex(hex, amount = 0.35) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

function autoDetectModule(content) {
  for (const [key, val] of Object.entries(MODULE_COLORS)) {
    if (content.includes(`（${key}）`) || content.includes(`(${key})`) || content.includes(key)) {
      return key;
    }
  }
  return 'L1'; // 預設
}

// ── 解析 Markdown 前置資料 ──────────────────────────────
function parseFrontmatter(md) {
  const lines = md.split('\n');
  let title = '';
  let subtitle = '';
  const docInfo = [];
  const tocItems = [];
  let contentStartIndex = 0;

  // 標題（前兩行 # 開頭）
  let titleLineCount = 0;
  for (let i = 0; i < lines.length && titleLineCount < 2; i++) {
    if (lines[i].startsWith('# ')) {
      if (titleLineCount === 0) title = lines[i].replace('# ', '');
      else subtitle = lines[i].replace('# ', '');
      titleLineCount++;
    }
  }

  // 文件資訊表格
  const docInfoMatch = md.match(/## 文件資訊\s*\n\s*\|[^\n]+\n\s*\|[-|\s]+\n([\s\S]*?)(?=\n---|\n## )/);
  if (docInfoMatch) {
    const rows = docInfoMatch[1].trim().split('\n');
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2) {
        docInfo.push({ label: cells[0], value: cells[1] });
      }
    }
  }

  // 目錄
  const tocMatch = md.match(/## 目錄\s*\n([\s\S]*?)(?=\n---)/);
  if (tocMatch) {
    const tocLines = tocMatch[1].trim().split('\n');
    for (const line of tocLines) {
      const m = line.match(/\d+\.\s*\[([^\]]+)\]\(([^)]+)\)/);
      if (m) {
        tocItems.push({ text: m[1], href: m[2] });
      }
    }
  }

  // 內容起始位置（第一個 ## 一、或 ## 二、等）
  const contentMatch = md.match(/\n(## [一二三四五六七八九十][、．])/);
  if (contentMatch) {
    contentStartIndex = md.indexOf(contentMatch[1]);
  }

  return { title, subtitle, docInfo, tocItems, contentStartIndex };
}

// ── 自訂 Marked 渲染器 ─────────────────────────────────
function createRenderer(moduleColor, moduleColorDark) {
  const renderer = new marked.Renderer();
  let sectionCounter = 0;

  renderer.heading = function({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    sectionCounter++;
    const id = `section-${sectionCounter}`;

    if (depth === 1) {
      // # = Part divider (大標題)
      return `<hr>\n<h2 id="${id}" class="section-title" style="font-size:1.5rem; text-align:center; margin: var(--spacing-2xl) 0 var(--spacing-xl);">${text}</h2>\n`;
    } else if (depth === 2) {
      return `<h2 id="${id}" class="section-title">${text}</h2>\n`;
    } else if (depth === 3) {
      return `<h3 id="${id}">${text}</h3>\n`;
    } else {
      return `<h4 id="${id}">${text}</h4>\n`;
    }
  };

  renderer.blockquote = function({ text }) {
    // 移除內部 <p> 標籤，保留內容
    const content = text.replace(/<\/?p>/g, '').trim();
    return `<div class="note">\n<div class="note-title">說明</div>\n<div>${content}</div>\n</div>\n`;
  };

  renderer.code = function({ text, lang }) {
    const isMermaid = lang === 'mermaid' || text.includes('graph ') || text.includes('flowchart ') || text.includes('sequenceDiagram');
    const isTree = /[├└│──┬┤┼]/.test(text) || (/^\s*(└|├)/.test(text));

    if (isMermaid) {
      return `<div class="flowchart">\n<div class="flowchart-title">流程圖</div>\n<div class="code-block">${escapeHtml(text)}</div>\n</div>\n`;
    } else if (isTree) {
      return `<div class="tree">${escapeHtml(text)}</div>\n`;
    } else {
      return `<div class="code-block">${escapeHtml(text)}</div>\n`;
    }
  };

  return renderer;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── 後處理 ──────────────────────────────────────────────
function postProcess(html) {
  // 1. 表格包裝
  html = html.replace(/<table>/g, '<div class="table-wrapper"><table>');
  html = html.replace(/<\/table>/g, '</table></div>');

  // 2. 殘留的 **bold** markdown 語法
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  return html;
}

// ── HTML 模板 ───────────────────────────────────────────
function generateHtml({ title, subtitle, docInfo, tocItems, bodyHtml, moduleColor, moduleColorDark, moduleColorLight }) {
  const cleanTitle = subtitle.replace(/^功能說明書[：:]?\s*/, '');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bombus 功能說明書 - ${cleanTitle || subtitle}</title>
  <style>
    :root {
      --color-cloud-gray: #F5F5F7;
      --color-pure-white: #FCFCFD;
      --color-soft-gray: #E8E8EA;
      --color-muted-gray: #C4C4C6;
      --color-text-secondary: #6B7280;
      --color-text-primary: #464E56;
      --color-text-dark: #1F2937;
      --color-brand-main: #64748B;
      --color-brand-light: #94A3B8;
      --color-brand-dark: #475569;
      --color-module: ${moduleColor};
      --color-module-light: ${moduleColorLight};
      --color-module-dark: ${moduleColorDark};
      --color-success: #7FB095;
      --color-success-light: #E8F5EE;
      --color-warning: #E3C088;
      --color-warning-light: #FFF8E7;
      --color-error: #C77F7F;
      --color-error-light: #FDEAEA;
      --color-info: #8DA8BE;
      --color-info-light: #EDF4F9;
      --spacing-xs: 0.25rem;
      --spacing-sm: 0.5rem;
      --spacing-md: 1rem;
      --spacing-lg: 1.5rem;
      --spacing-xl: 2rem;
      --spacing-2xl: 3rem;
      --radius-sm: 6px;
      --radius-md: 8px;
      --radius-lg: 12px;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: var(--color-text-primary);
      background: var(--color-cloud-gray);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: var(--spacing-xl);
    }

    .doc-header {
      background: linear-gradient(135deg, var(--color-module) 0%, var(--color-module-dark) 100%);
      color: white;
      padding: var(--spacing-2xl) var(--spacing-xl);
      border-radius: var(--radius-lg);
      margin-bottom: var(--spacing-xl);
      box-shadow: var(--shadow-lg);
    }

    .doc-header h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: var(--spacing-sm);
      letter-spacing: 0.5px;
    }

    .doc-header h2 {
      font-size: 1.25rem;
      font-weight: 400;
      opacity: 0.9;
    }

    .doc-info {
      background: var(--color-pure-white);
      border-radius: var(--radius-md);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-xl);
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-soft-gray);
    }

    .doc-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: var(--spacing-md);
    }

    .doc-info-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .doc-info-label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      min-width: 80px;
    }

    .doc-info-value {
      font-weight: 500;
      color: var(--color-text-dark);
    }

    .toc {
      background: var(--color-pure-white);
      border-radius: var(--radius-md);
      padding: var(--spacing-lg);
      margin-bottom: var(--spacing-xl);
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-soft-gray);
    }

    .toc-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-dark);
      margin-bottom: var(--spacing-md);
      padding-bottom: var(--spacing-sm);
      border-bottom: 2px solid var(--color-module);
    }

    .toc-list {
      list-style: none;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--spacing-sm);
    }

    .toc-list li { padding: var(--spacing-xs) 0; }

    .toc-list a {
      color: var(--color-module-dark);
      text-decoration: none;
      font-size: 0.9375rem;
      transition: color 0.2s ease;
    }

    .toc-list a:hover {
      color: var(--color-module);
      text-decoration: underline;
    }

    .content {
      background: var(--color-pure-white);
      border-radius: var(--radius-md);
      padding: var(--spacing-xl);
      margin-bottom: var(--spacing-xl);
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-soft-gray);
    }

    .section-title {
      background: linear-gradient(135deg, var(--color-module) 0%, var(--color-module-dark) 100%);
      color: white;
      padding: var(--spacing-md) var(--spacing-lg);
      border-radius: var(--radius-md);
      margin: var(--spacing-xl) 0 var(--spacing-lg);
      font-size: 1.25rem;
      font-weight: 600;
    }

    .section-title:first-child { margin-top: 0; }

    h3 {
      color: var(--color-text-dark);
      font-size: 1.125rem;
      font-weight: 600;
      margin: var(--spacing-lg) 0 var(--spacing-md);
      padding-bottom: var(--spacing-xs);
      border-bottom: 2px solid var(--color-module-light);
    }

    h4 {
      color: var(--color-module-dark);
      font-size: 1rem;
      font-weight: 600;
      margin: var(--spacing-md) 0 var(--spacing-sm);
    }

    p {
      margin-bottom: var(--spacing-md);
      color: var(--color-text-primary);
    }

    ul, ol {
      margin-bottom: var(--spacing-md);
      padding-left: var(--spacing-lg);
    }

    li { margin-bottom: var(--spacing-xs); }

    .table-wrapper {
      overflow-x: auto;
      margin: var(--spacing-md) 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9375rem;
    }

    th {
      background: var(--color-module);
      color: white;
      padding: var(--spacing-sm) var(--spacing-md);
      text-align: left;
      font-weight: 500;
      white-space: nowrap;
    }

    td {
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--color-soft-gray);
      vertical-align: top;
    }

    tr:nth-child(even) { background: var(--color-cloud-gray); }
    tr:hover { background: rgba(${parseInt(moduleColor.slice(1, 3), 16)}, ${parseInt(moduleColor.slice(3, 5), 16)}, ${parseInt(moduleColor.slice(5, 7), 16)}, 0.1); }

    .code-block {
      background: var(--color-text-dark);
      color: #E5E7EB;
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      font-family: 'SF Mono', 'Consolas', 'Liberation Mono', monospace;
      font-size: 0.875rem;
      overflow-x: auto;
      margin: var(--spacing-md) 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .flowchart {
      background: var(--color-cloud-gray);
      border: 1px solid var(--color-soft-gray);
      border-radius: var(--radius-md);
      padding: var(--spacing-lg);
      margin: var(--spacing-md) 0;
    }

    .flowchart-title {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: var(--spacing-md);
      text-align: center;
    }

    .flowchart .code-block {
      font-size: 0.8rem;
      line-height: 1.5;
      text-align: left;
    }

    .note {
      background: var(--color-info-light);
      border-left: 4px solid var(--color-info);
      padding: var(--spacing-md);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      margin: var(--spacing-md) 0;
    }

    .note-title {
      font-weight: 600;
      color: var(--color-info);
      margin-bottom: var(--spacing-xs);
    }

    .tree {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.875rem;
      background: var(--color-cloud-gray);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-soft-gray);
      white-space: pre;
      overflow-x: auto;
    }

    hr {
      border: none;
      height: 1px;
      background: var(--color-soft-gray);
      margin: var(--spacing-xl) 0;
    }

    strong { color: var(--color-text-dark); }

    .doc-footer {
      text-align: center;
      padding: var(--spacing-xl);
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .container { padding: var(--spacing-md); }
      .doc-header { padding: var(--spacing-lg); }
      .doc-header h1 { font-size: 1.5rem; }
      .content { padding: var(--spacing-md); }
      .section-title { font-size: 1.125rem; padding: var(--spacing-sm) var(--spacing-md); }
      table { font-size: 0.875rem; }
      th, td { padding: var(--spacing-xs) var(--spacing-sm); }
    }

    @media print {
      body { background: white; }
      .container { max-width: none; padding: 0; }
      .doc-header, .content { box-shadow: none; border: 1px solid #ddd; }
      .toc { page-break-after: always; }
      .section-title { break-after: avoid; }
      table { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="doc-header">
      <h1>${title}</h1>
      <h2>${subtitle}</h2>
    </header>

    <section class="doc-info">
      <div class="doc-info-grid">
${docInfo.map(item => `        <div class="doc-info-item">
          <span class="doc-info-label">${item.label}</span>
          <span class="doc-info-value">${item.value}</span>
        </div>`).join('\n')}
      </div>
    </section>

    <nav class="toc">
      <h2 class="toc-title">目錄</h2>
      <ol class="toc-list">
${tocItems.map(item => `        <li><a href="${item.href}">${item.text}</a></li>`).join('\n')}
      </ol>
    </nav>

    <main class="content">
      ${bodyHtml}
    </main>

    <footer class="doc-footer">
      <p>Bombus 人力資源管理系統 — 本文件由系統自動產生</p>
    </footer>
  </div>
</body>
</html>`;
}

// ── 主程式 ──────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('用法: node _convert-md-to-html.js <md-filename> [module-color|L1-L6] [module-color-dark]');
    console.error('範例: node _convert-md-to-html.js 功能說明書_招募管理.md L1');
    process.exit(1);
  }

  const mdFilename = args[0];
  const mdPath = path.resolve(__dirname, mdFilename);

  if (!fs.existsSync(mdPath)) {
    console.error(`找不到檔案: ${mdPath}`);
    process.exit(1);
  }

  const md = fs.readFileSync(mdPath, 'utf-8');

  // 決定模組色彩
  let moduleColor, moduleColorDark;
  const colorArg = args[1] || '';

  if (MODULE_COLORS[colorArg.toUpperCase()]) {
    const mc = MODULE_COLORS[colorArg.toUpperCase()];
    moduleColor = mc.main;
    moduleColorDark = mc.dark;
    console.log(`使用 ${colorArg.toUpperCase()} 模組色彩 (${mc.name}): ${moduleColor}`);
  } else if (colorArg.startsWith('#')) {
    moduleColor = colorArg;
    moduleColorDark = args[2] || moduleColor;
    console.log(`使用自訂色彩: ${moduleColor} / ${moduleColorDark}`);
  } else {
    const detected = autoDetectModule(md);
    const mc = MODULE_COLORS[detected];
    moduleColor = mc.main;
    moduleColorDark = mc.dark;
    console.log(`自動偵測模組: ${detected} (${mc.name}): ${moduleColor}`);
  }

  const moduleColorLight = lightenHex(moduleColor);

  // 解析前置資料
  const { title, subtitle, docInfo, tocItems, contentStartIndex } = parseFrontmatter(md);
  console.log(`標題: ${title}`);
  console.log(`副標: ${subtitle}`);
  console.log(`文件資訊: ${docInfo.length} 項`);
  console.log(`目錄項目: ${tocItems.length} 項`);

  // 取出內容區（跳過前置資料）
  const contentMd = contentStartIndex > 0 ? md.slice(contentStartIndex) : md;

  // 設定 marked
  const renderer = createRenderer(moduleColor, moduleColorDark);
  marked.setOptions({ renderer, breaks: false, gfm: true });

  // 轉換
  let bodyHtml = marked.parse(contentMd);
  bodyHtml = postProcess(bodyHtml);

  // 產生完整 HTML
  const html = generateHtml({
    title,
    subtitle,
    docInfo,
    tocItems,
    bodyHtml,
    moduleColor,
    moduleColorDark,
    moduleColorLight,
  });

  // 寫入
  const htmlFilename = mdFilename.replace(/\.md$/, '.html');
  const htmlPath = path.resolve(__dirname, htmlFilename);
  fs.writeFileSync(htmlPath, html, 'utf-8');

  // 統計
  const lines = html.split('\n').length;
  const size = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
  const tables = (html.match(/<table>/g) || []).length;
  const sections = (html.match(/class="section-title"/g) || []).length;
  const notes = (html.match(/class="note"/g) || []).length;
  const flowcharts = (html.match(/class="flowchart"/g) || []).length;
  const trees = (html.match(/class="tree"/g) || []).length;
  const boldRemain = (html.match(/\*\*[^*]+\*\*/g) || []).length;

  console.log(`\n✓ 產生: ${htmlFilename}`);
  console.log(`  行數: ${lines}, 大小: ${size} KB`);
  console.log(`  表格: ${tables}, 章節: ${sections}, 說明: ${notes}, 流程圖: ${flowcharts}, 樹狀: ${trees}`);
  if (boldRemain > 0) console.log(`  ⚠ 殘留 **bold**: ${boldRemain}`);
}

main();
