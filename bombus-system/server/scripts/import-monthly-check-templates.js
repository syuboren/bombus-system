/**
 * 匯入月度檢核指標模板種子資料
 * 
 * 使用方式:
 * node server/scripts/import-monthly-check-templates.js
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '../src/db/onboarding.db');
const SEED_DATA_PATH = path.join(__dirname, '../../規劃文件/職能評估系統/seed_data/monthly_check_templates.json');

// Alternative path for when running from different locations
const ALT_SEED_DATA_PATH = path.join(__dirname, '../../../規劃文件/職能評估系統/seed_data/monthly_check_templates.json');

async function importTemplates() {
  console.log('🚀 開始匯入月度檢核指標模板...\n');
  
  try {
    // Initialize SQL.js
    const SQL = await initSqlJs();
    
    // Load database
    if (!fs.existsSync(DB_PATH)) {
      console.error('❌ 資料庫檔案不存在:', DB_PATH);
      console.log('   請先啟動伺服器以初始化資料庫');
      process.exit(1);
    }
    
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);
    console.log('✅ 資料庫載入成功');
    
    // Load seed data
    let seedDataPath = SEED_DATA_PATH;
    if (!fs.existsSync(seedDataPath)) {
      seedDataPath = ALT_SEED_DATA_PATH;
    }
    
    if (!fs.existsSync(seedDataPath)) {
      console.error('❌ 種子資料檔案不存在');
      console.log('   嘗試路徑:', SEED_DATA_PATH);
      console.log('   嘗試路徑:', ALT_SEED_DATA_PATH);
      process.exit(1);
    }
    
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
    const templates = seedData.monthly_check_templates || seedData;
    
    console.log(`📄 載入 ${templates.length} 筆指標模板資料\n`);
    
    // Clear existing templates (optional)
    // db.run('DELETE FROM monthly_check_templates');
    // console.log('🗑️ 已清除現有模板資料\n');
    
    // Insert templates
    const now = new Date().toISOString();
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO monthly_check_templates 
      (id, department, position, name, points, description, measurement, order_num, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    templates.forEach((tpl, index) => {
      try {
        insertStmt.run([
          tpl.id,
          tpl.department,
          tpl.position,
          tpl.name,
          tpl.points || 1,
          tpl.description || '',
          tpl.measurement || '',
          tpl.order || tpl.order_num || index + 1,
          tpl.is_active !== false ? 1 : 0,
          now
        ]);
        
        // Check if inserted (changes > 0 means inserted)
        const changes = db.getRowsModified();
        if (changes > 0) {
          successCount++;
        } else {
          skipCount++;
        }
      } catch (e) {
        errorCount++;
        console.error(`   ❌ 第 ${index + 1} 筆匯入失敗:`, e.message);
      }
    });
    
    insertStmt.free();
    
    // Save database
    const data = db.export();
    const outputBuffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, outputBuffer);
    
    console.log('\n📊 匯入結果:');
    console.log(`   ✅ 成功: ${successCount} 筆`);
    console.log(`   ⏭️ 略過 (已存在): ${skipCount} 筆`);
    console.log(`   ❌ 失敗: ${errorCount} 筆`);
    
    // Show summary by department/position
    const summaryStmt = db.prepare(`
      SELECT department, position, COUNT(*) as count 
      FROM monthly_check_templates 
      WHERE is_active = 1 
      GROUP BY department, position 
      ORDER BY department, position
    `);
    
    console.log('\n📋 各職務指標數量:');
    while (summaryStmt.step()) {
      const row = summaryStmt.getAsObject();
      console.log(`   ${row.department} - ${row.position}: ${row.count} 項`);
    }
    summaryStmt.free();
    
    db.close();
    console.log('\n✅ 匯入完成!');
    
  } catch (error) {
    console.error('❌ 匯入失敗:', error);
    process.exit(1);
  }
}

importTemplates();
