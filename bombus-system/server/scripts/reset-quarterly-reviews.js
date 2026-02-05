/**
 * 季度面談資料重置腳本
 * 用途：清空所有季度面談相關資料（季度面談主表、區塊內容、滿意度作答）
 *
 * 執行方式：node server/scripts/reset-quarterly-reviews.js
 */

const path = require('path');

async function initDb() {
  const initSqlJs = require('sql.js');
  const fs = require('fs');

  const DB_PATH = path.join(__dirname, '../src/db/onboarding.db');
  const SQL = await initSqlJs();

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found:', DB_PATH);
    process.exit(1);
  }

  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  return { db, DB_PATH, fs };
}

async function main() {
  console.log('='.repeat(60));
  console.log('季度面談資料重置腳本');
  console.log('='.repeat(60));
  console.log('');

  const { db, DB_PATH, fs } = await initDb();

  try {
    // 1. 清空滿意度作答
    console.log('1️⃣ 清空滿意度作答 (satisfaction_surveys)...');
    db.run('DELETE FROM satisfaction_surveys');
    console.log('   ✅ 已清空');

    // 2. 清空面談區塊內容
    console.log('2️⃣ 清空季度面談區塊 (quarterly_review_sections)...');
    db.run('DELETE FROM quarterly_review_sections');
    console.log('   ✅ 已清空');

    // 3. 清空季度面談主表
    console.log('3️⃣ 清空季度面談主表 (quarterly_reviews)...');
    db.run('DELETE FROM quarterly_reviews');
    console.log('   ✅ 已清空');

    // 4. 儲存資料庫
    console.log('');
    console.log('💾 正在儲存資料庫...');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    console.log('   ✅ 資料庫已儲存');

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 季度面談資料已全部清除！');
    console.log('='.repeat(60));
    console.log('');
  } catch (error) {
    console.error('❌ 執行失敗:', error.message);
    process.exit(1);
  }
}

main();
