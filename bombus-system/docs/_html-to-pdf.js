#!/usr/bin/env node
/**
 * 將簡報 HTML 轉換為 PDF（每頁 Slide = 一頁 PDF）
 * 策略：逐頁截圖再合併，確保不切割
 * 用法: node docs/_html-to-pdf.js <html-file>
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// A4 landscape at 2x for crisp text
const WIDTH = 1440;
const HEIGHT = 900;

async function convertToPDF(htmlFile) {
  const absPath = path.resolve(htmlFile);
  if (!fs.existsSync(absPath)) {
    console.error(`找不到檔案: ${absPath}`);
    process.exit(1);
  }

  const outputPath = absPath.replace(/\.html$/, '.pdf');
  const fileUrl = `file://${absPath}`;

  console.log(`來源: ${path.basename(absPath)}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

  // Hide nav, get slide count
  const slideCount = await page.evaluate(() => {
    // Hide navigation
    document.querySelectorAll('.nav-bar, .key-hint').forEach(el => el.style.display = 'none');
    return document.querySelectorAll('.slide').length;
  });

  console.log(`共 ${slideCount} 頁，開始逐頁截圖...`);

  // Collect screenshots as buffers
  const screenshots = [];

  for (let i = 0; i < slideCount; i++) {
    // Activate only this slide, hide all others
    await page.evaluate((idx) => {
      document.querySelectorAll('.slide').forEach((s, j) => {
        if (j === idx) {
          s.style.cssText = `
            position: fixed !important; inset: 0 !important;
            opacity: 1 !important; visibility: visible !important;
            transform: none !important; z-index: 9999 !important;
            overflow: hidden !important;
            display: flex !important; flex-direction: column !important;
          `;
        } else {
          s.style.display = 'none';
        }
      });
    }, i);

    await new Promise(r => setTimeout(r, 100));

    const buf = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT }
    });
    screenshots.push(buf);
    process.stdout.write(`  截圖 ${i + 1}/${slideCount}\r`);
  }

  console.log(`\n逐頁截圖完成，合併 PDF...`);

  // Create a new page to build the PDF from images
  const pdfPage = await browser.newPage();
  await pdfPage.setViewport({ width: WIDTH, height: HEIGHT });

  // Build an HTML page with all screenshots, each exactly one page
  const imgTags = screenshots.map((buf, i) => {
    const b64 = buf.toString('base64');
    const pageBreak = i < screenshots.length - 1 ? 'page-break-after: always;' : '';
    return `<div style="width:${WIDTH}px;height:${HEIGHT}px;${pageBreak}overflow:hidden;">
      <img src="data:image/png;base64,${b64}" style="width:${WIDTH}px;height:${HEIGHT}px;display:block;" />
    </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html><html><head><style>
    * { margin:0; padding:0; }
    body { width:${WIDTH}px; }
    @page { size: ${WIDTH}px ${HEIGHT}px; margin: 0; }
  </style></head><body>${imgTags}</body></html>`;

  await pdfPage.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 300));

  await pdfPage.pdf({
    path: outputPath,
    width: `${WIDTH}px`,
    height: `${HEIGHT}px`,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    preferCSSPageSize: true,
    timeout: 120000
  });

  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);

  console.log(`✓ PDF 已產生: ${path.basename(outputPath)}`);
  console.log(`  大小: ${sizeMB} MB, 共 ${slideCount} 頁`);

  await browser.close();
}

const htmlFile = process.argv[2];
if (!htmlFile) {
  console.log('用法: node docs/_html-to-pdf.js <html-file>');
  process.exit(1);
}

convertToPDF(htmlFile).catch(err => {
  console.error('轉換失敗:', err.message);
  process.exit(1);
});
