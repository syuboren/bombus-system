/**
 * 種子資料腳本 - 職能基準庫 (Competency Framework)
 * 讀取 seed_data JSON 檔案並寫入資料庫
 * 
 * 執行方式: node scripts/seed-competency-framework.js
 */

const fs = require('fs');
const path = require('path');

// 載入資料庫模組
const { initDatabase, prepare, saveDatabase } = require('../src/db');

// Seed 資料路徑
const SEED_DATA_PATH = path.join(__dirname, '../../../規劃文件/職能基準/seed_data');

/**
 * 讀取 JSON 檔案
 */
function readJsonFile(filename) {
  const filePath = path.join(SEED_DATA_PATH, filename);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 找不到檔案: ${filePath}`);
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 清空現有資料
 */
function clearExistingData() {
  console.log('🗑️  清空現有職能基準庫資料...');
  
  prepare('DELETE FROM competency_ksa_details').run();
  prepare('DELETE FROM competency_levels').run();
  prepare('DELETE FROM competencies').run();
  
  console.log('   ✅ 已清空現有資料\n');
}

/**
 * 填入職能主表資料
 */
function seedCompetencies(data) {
  console.log('📋 填入職能主表資料...');
  
  let count = 0;
  
  for (const item of data) {
    prepare(`
      INSERT INTO competencies (id, code, name, type, category, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.code,
      item.name,
      item.type,
      item.category,
      item.description,
      item.created_at,
      item.updated_at
    );
    count++;
  }
  
  console.log(`   ✅ 已填入 ${count} 筆職能主表資料\n`);
  return count;
}

/**
 * 填入職能等級資料
 */
function seedCompetencyLevels(data) {
  console.log('📊 填入職能等級資料...');
  
  let count = 0;
  
  for (const item of data) {
    prepare(`
      INSERT INTO competency_levels (id, competency_id, level, indicators)
      VALUES (?, ?, ?, ?)
    `).run(
      item.id,
      item.competency_id,
      item.level,
      item.indicators
    );
    count++;
  }
  
  console.log(`   ✅ 已填入 ${count} 筆職能等級資料\n`);
  return count;
}

/**
 * 填入 KSA 詳細資訊資料
 */
function seedKsaDetails(data) {
  console.log('📚 填入 KSA 詳細資訊資料...');
  
  let count = 0;
  
  for (const item of data) {
    prepare(`
      INSERT INTO competency_ksa_details (id, competency_id, behavior_indicators, linked_courses)
      VALUES (?, ?, ?, ?)
    `).run(
      item.id,
      item.competency_id,
      item.behavior_indicators,
      item.linked_courses
    );
    count++;
  }
  
  console.log(`   ✅ 已填入 ${count} 筆 KSA 詳細資訊資料\n`);
  return count;
}

/**
 * 驗證資料完整性
 */
function validateData() {
  console.log('🔍 驗證資料完整性...');
  
  const competenciesCount = prepare('SELECT COUNT(*) as count FROM competencies').get().count;
  const levelsCount = prepare('SELECT COUNT(*) as count FROM competency_levels').get().count;
  const ksaDetailsCount = prepare('SELECT COUNT(*) as count FROM competency_ksa_details').get().count;
  
  // 各類型職能數量
  const coreCount = prepare("SELECT COUNT(*) as count FROM competencies WHERE category = 'core'").get().count;
  const mgmtCount = prepare("SELECT COUNT(*) as count FROM competencies WHERE category = 'management'").get().count;
  const profCount = prepare("SELECT COUNT(*) as count FROM competencies WHERE category = 'professional'").get().count;
  const ksaCount = prepare("SELECT COUNT(*) as count FROM competencies WHERE category = 'ksa'").get().count;
  
  console.log('\n📊 資料庫統計：');
  console.log('   ┌─────────────────────────────────────┐');
  console.log(`   │ 職能主表 (competencies)    : ${String(competenciesCount).padStart(4)} 筆 │`);
  console.log(`   │   - 核心職能 (Core)        : ${String(coreCount).padStart(4)} 筆 │`);
  console.log(`   │   - 管理職能 (Management)  : ${String(mgmtCount).padStart(4)} 筆 │`);
  console.log(`   │   - 專業職能 (Professional): ${String(profCount).padStart(4)} 筆 │`);
  console.log(`   │   - KSA 職能               : ${String(ksaCount).padStart(4)} 筆 │`);
  console.log('   ├─────────────────────────────────────┤');
  console.log(`   │ 等級資料 (competency_levels): ${String(levelsCount).padStart(4)} 筆 │`);
  console.log(`   │ KSA 詳細 (ksa_details)      : ${String(ksaDetailsCount).padStart(4)} 筆 │`);
  console.log('   └─────────────────────────────────────┘\n');
  
  // 驗證預期數量
  const expectedCompetencies = 70; // Core: 5, Mgmt: 3, Prof: 9, KSA: 53
  const expectedLevels = 102;       // (5 + 3 + 9) × 6 levels
  const expectedKsaDetails = 53;    // KSA 職能數量
  
  let hasError = false;
  
  if (competenciesCount !== expectedCompetencies) {
    console.warn(`   ⚠️  職能主表數量不符：期望 ${expectedCompetencies}，實際 ${competenciesCount}`);
    hasError = true;
  }
  if (levelsCount !== expectedLevels) {
    console.warn(`   ⚠️  等級資料數量不符：期望 ${expectedLevels}，實際 ${levelsCount}`);
    hasError = true;
  }
  if (ksaDetailsCount !== expectedKsaDetails) {
    console.warn(`   ⚠️  KSA 詳細數量不符：期望 ${expectedKsaDetails}，實際 ${ksaDetailsCount}`);
    hasError = true;
  }
  
  if (!hasError) {
    console.log('   ✅ 資料驗證通過！\n');
  }
  
  return !hasError;
}

/**
 * 主程式
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     職能基準庫 Seed Script                            ║');
  console.log('║     Competency Framework Seeding                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  try {
    // 初始化資料庫
    console.log('🔌 初始化資料庫連線...');
    await initDatabase();
    console.log('   ✅ 資料庫連線成功\n');
    
    // 讀取 seed 資料
    console.log('📂 讀取 Seed 資料...');
    console.log(`   路徑: ${SEED_DATA_PATH}\n`);
    
    const competencies = readJsonFile('competencies.json');
    const levels = readJsonFile('competency_levels.json');
    const ksaDetails = readJsonFile('competency_ksa_details.json');
    
    if (!competencies || !levels || !ksaDetails) {
      console.error('\n❌ 無法讀取 Seed 資料檔案，請確認檔案存在');
      process.exit(1);
    }
    
    console.log(`   ✅ competencies.json: ${competencies.length} 筆`);
    console.log(`   ✅ competency_levels.json: ${levels.length} 筆`);
    console.log(`   ✅ competency_ksa_details.json: ${ksaDetails.length} 筆\n`);
    
    // 清空現有資料
    clearExistingData();
    
    // 填入資料
    seedCompetencies(competencies);
    seedCompetencyLevels(levels);
    seedKsaDetails(ksaDetails);
    
    // 儲存資料庫
    saveDatabase();
    
    // 驗證資料
    validateData();
    
    console.log('✨ 職能基準庫 Seed 完成！\n');
    
  } catch (error) {
    console.error('\n❌ 執行失敗:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 執行主程式
main();
