/**
 * 招募流程資料重置腳本
 * 用途：清空所有面試、招募、入職、人才庫、會議記錄，以便重新測試整個流程
 * 
 * 清除項目：
 * 【面試相關】
 * - interview_invitations - 面試邀請
 * - interviews - 面試記錄
 * - candidate_interview_forms - 面試表單
 * - invitation_decisions - 錄用決策
 * 
 * 【入職相關】
 * - submissions - 入職文件簽署記錄
 * - employee_documents - 員工上傳文件
 * - 試用期員工（由候選人轉入的員工）
 * 
 * 【人才庫相關】
 * - talent_pool - 人才庫
 * - talent_contact_history - 聯絡記錄
 * - talent_reminders - 提醒
 * - talent_tag_mapping - 標籤對應
 * - talent_job_matches - 職缺配對
 * 
 * 【會議相關】
 * - meetings - 會議
 * - meeting_reminders - 會議提醒
 * - meeting_attendees - 會議參與者
 * - meeting_agenda_items - 會議議程
 * - meeting_conclusions - 會議結論
 * - meeting_attachments - 會議附件
 * 
 * 重置項目：
 * - candidates.status -> 'new'
 * - candidates.stage -> 'Collected'
 * - candidates.scoring_status -> 'Pending'
 * 
 * 保留項目：
 * - 候選人基本資料
 * - 正式員工資料（非試用期轉入的員工）
 * - 入職文件模板
 * - 人才標籤定義
 * 
 * 執行方式：node server/scripts/reset-recruitment-flow.js
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

// 安全刪除表格資料
function safeDelete(db, tableName, description) {
  try {
    const countBefore = db.exec(`SELECT COUNT(*) FROM ${tableName}`);
    const count = countBefore[0]?.values[0]?.[0] || 0;
    
    db.run(`DELETE FROM ${tableName}`);
    console.log(`   ✅ 已清空 ${count} 筆記錄`);
    return count;
  } catch (err) {
    console.log(`   ⚠️ 表格不存在或已清空`);
    return 0;
  }
}

// 安全刪除符合條件的資料
function safeDeleteWhere(db, tableName, whereClause, description) {
  try {
    const countBefore = db.exec(`SELECT COUNT(*) FROM ${tableName} WHERE ${whereClause}`);
    const count = countBefore[0]?.values[0]?.[0] || 0;
    
    if (count > 0) {
      db.run(`DELETE FROM ${tableName} WHERE ${whereClause}`);
    }
    console.log(`   ✅ 已清空 ${count} 筆記錄`);
    return count;
  } catch (err) {
    console.log(`   ⚠️ 表格不存在或已清空: ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('招募流程資料重置腳本');
  console.log('='.repeat(60));
  console.log('');
  
  const { db, DB_PATH, fs } = await initDb();
  
  let totalDeleted = 0;
  let step = 1;
  
  try {
    // ==================== 面試相關 ====================
    console.log('📋 【面試相關】');
    
    console.log(`${step}️⃣ 清空面試邀請 (interview_invitations)...`);
    totalDeleted += safeDelete(db, 'interview_invitations', '面試邀請');
    step++;
    
    console.log(`${step}️⃣ 清空面試記錄 (interviews)...`);
    totalDeleted += safeDelete(db, 'interviews', '面試記錄');
    step++;
    
    console.log(`${step}️⃣ 清空候選人面試表單 (candidate_interview_forms)...`);
    totalDeleted += safeDelete(db, 'candidate_interview_forms', '面試表單');
    step++;
    
    console.log(`${step}️⃣ 清空錄用決策 (invitation_decisions)...`);
    totalDeleted += safeDelete(db, 'invitation_decisions', '錄用決策');
    step++;
    
    console.log('');
    
    // ==================== 入職相關 ====================
    console.log('📋 【入職相關】');
    
    console.log(`${step}️⃣ 清空入職文件簽署記錄 (submissions)...`);
    totalDeleted += safeDelete(db, 'submissions', '文件簽署');
    step++;
    
    console.log(`${step}️⃣ 清空員工上傳文件 (employee_documents)...`);
    totalDeleted += safeDelete(db, 'employee_documents', '員工文件');
    step++;
    
    // 清除由候選人轉入的試用期員工
    console.log(`${step}️⃣ 清空試用期員工 (由候選人轉入)...`);
    totalDeleted += safeDeleteWhere(db, 'employees', "candidate_id IS NOT NULL AND candidate_id != ''", '試用期員工');
    step++;
    
    console.log('');
    
    // ==================== 人才庫相關 ====================
    console.log('📋 【人才庫相關】');
    
    console.log(`${step}️⃣ 清空人才職缺配對 (talent_job_matches)...`);
    totalDeleted += safeDelete(db, 'talent_job_matches', '職缺配對');
    step++;
    
    console.log(`${step}️⃣ 清空人才標籤對應 (talent_tag_mapping)...`);
    totalDeleted += safeDelete(db, 'talent_tag_mapping', '標籤對應');
    step++;
    
    console.log(`${step}️⃣ 清空人才提醒 (talent_reminders)...`);
    totalDeleted += safeDelete(db, 'talent_reminders', '人才提醒');
    step++;
    
    console.log(`${step}️⃣ 清空人才聯絡記錄 (talent_contact_history)...`);
    totalDeleted += safeDelete(db, 'talent_contact_history', '聯絡記錄');
    step++;
    
    console.log(`${step}️⃣ 清空人才庫 (talent_pool)...`);
    totalDeleted += safeDelete(db, 'talent_pool', '人才庫');
    step++;
    
    console.log('');
    
    // ==================== 會議相關 ====================
    console.log('📋 【會議相關】');
    
    console.log(`${step}️⃣ 清空會議附件 (meeting_attachments)...`);
    totalDeleted += safeDelete(db, 'meeting_attachments', '會議附件');
    step++;
    
    console.log(`${step}️⃣ 清空會議結論 (meeting_conclusions)...`);
    totalDeleted += safeDelete(db, 'meeting_conclusions', '會議結論');
    step++;
    
    console.log(`${step}️⃣ 清空會議議程 (meeting_agenda_items)...`);
    totalDeleted += safeDelete(db, 'meeting_agenda_items', '會議議程');
    step++;
    
    console.log(`${step}️⃣ 清空會議參與者 (meeting_attendees)...`);
    totalDeleted += safeDelete(db, 'meeting_attendees', '會議參與者');
    step++;
    
    console.log(`${step}️⃣ 清空會議提醒 (meeting_reminders)...`);
    totalDeleted += safeDelete(db, 'meeting_reminders', '會議提醒');
    step++;
    
    console.log(`${step}️⃣ 清空會議 (meetings)...`);
    totalDeleted += safeDelete(db, 'meetings', '會議');
    step++;
    
    console.log('');
    
    // ==================== 重置候選人狀態 ====================
    console.log('📋 【重置候選人】');
    
    console.log(`${step}️⃣ 重置所有候選人為「待處理」狀態...`);
    db.run(`
      UPDATE candidates SET 
        status = 'new',
        stage = 'Collected',
        scoring_status = 'Pending',
        score = 0,
        updated_at = datetime('now')
    `);
    console.log('   ✅ 已重置候選人狀態');
    
    // 統計候選人數量
    const countResult = db.exec('SELECT COUNT(*) as count FROM candidates');
    const candidateCount = countResult[0]?.values[0]?.[0] || 0;
    console.log(`   📊 共 ${candidateCount} 位候選人已重置`);
    
    // 儲存資料庫
    console.log('');
    console.log('💾 正在儲存資料庫...');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    console.log('   ✅ 資料庫已儲存');
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 招募流程資料重置完成！');
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 清除統計：');
    console.log(`   - 總共清除 ${totalDeleted} 筆記錄`);
    console.log(`   - 重置 ${candidateCount} 位候選人狀態`);
    console.log('');
    console.log('候選人狀態說明：');
    console.log('  - status: new (待處理)');
    console.log('  - stage: Collected (已收集)');
    console.log('  - scoring_status: Pending (待評分)');
    console.log('  - score: 0');
    console.log('');
    console.log('保留的資料：');
    console.log('  - 候選人基本資料');
    console.log('  - 正式員工資料（非試用期轉入）');
    console.log('  - 入職文件模板');
    console.log('  - 人才標籤定義');
    console.log('');
    
  } catch (error) {
    console.error('❌ 執行失敗:', error.message);
    process.exit(1);
  }
}

main();
