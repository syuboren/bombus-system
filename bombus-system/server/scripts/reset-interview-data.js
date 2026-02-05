/**
 * 面試資料重置腳本
 * 用途：清空所有面試相關資料，將候選人重置為「新進履歷」狀態
 * 
 * 保留項目：
 * - 候選人基本資料（姓名、聯絡方式、履歷內容等）
 * - 職缺資料
 * - 人才庫資料
 * 
 * 執行方式：node server/scripts/reset-interview-data.js
 */

const path = require('path');

// 初始化資料庫連線
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
  console.log('面試資料重置腳本');
  console.log('='.repeat(60));
  console.log('');
  
  const { db, DB_PATH, fs } = await initDb();
  
  try {
    // 1. 清空面試評分資料
    console.log('1️⃣ 清空面試評分資料 (interview_evaluations)...');
    db.run('DELETE FROM interview_evaluations');
    console.log('   ✅ 已清空');
    
    // 2. 清空面試記錄
    console.log('2️⃣ 清空面試記錄 (interviews)...');
    db.run('DELETE FROM interviews');
    console.log('   ✅ 已清空');
    
    // 3. 清空面試邀請
    console.log('3️⃣ 清空面試邀請 (invitations)...');
    try {
      db.run('DELETE FROM invitations');
      console.log('   ✅ 已清空');
    } catch (err) {
      console.log('   ⚠️ 表格不存在或已清空');
    }
    
    // 4. 清空錄用決策
    console.log('4️⃣ 清空錄用決策 (invitation_decisions)...');
    try {
      db.run('DELETE FROM invitation_decisions');
      console.log('   ✅ 已清空');
    } catch (err) {
      console.log('   ⚠️ 表格不存在或已清空');
    }
    
    // 5. 清空候選人面試表單
    console.log('5️⃣ 清空候選人面試表單 (candidate_interview_forms)...');
    try {
      db.run('DELETE FROM candidate_interview_forms');
      console.log('   ✅ 已清空');
    } catch (err) {
      console.log('   ⚠️ 表格不存在或已清空');
    }
    
    // 6. 重置所有候選人為「新進履歷」狀態
    console.log('6️⃣ 重置所有候選人為「新進履歷」狀態...');
    const result = db.run(`
      UPDATE candidates SET 
        status = 'new',
        stage = 'Collected',
        scoring_status = 'Pending',
        score = 0,
        updated_at = datetime('now')
    `);
    console.log('   ✅ 已重置');
    
    // 統計候選人數量
    const countResult = db.exec('SELECT COUNT(*) as count FROM candidates');
    const candidateCount = countResult[0]?.values[0]?.[0] || 0;
    console.log(`   📊 共 ${candidateCount} 位候選人已重置為新進履歷狀態`);
    
    // 儲存資料庫
    console.log('');
    console.log('💾 正在儲存資料庫...');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    console.log('   ✅ 資料庫已儲存');
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 面試資料重置完成！');
    console.log('='.repeat(60));
    console.log('');
    console.log('候選人狀態說明：');
    console.log('  - status: new (新進履歷)');
    console.log('  - stage: Collected (已收集)');
    console.log('  - scoring_status: Pending (待評分)');
    console.log('  - score: 0');
    console.log('');
    
  } catch (error) {
    console.error('❌ 執行失敗:', error.message);
    process.exit(1);
  }
}

main();
