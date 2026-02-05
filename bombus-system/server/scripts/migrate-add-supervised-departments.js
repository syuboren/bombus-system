/**
 * Migration Script: 新增 supervised_departments 欄位
 * 用於支援跨部門高階主管功能
 * 
 * 執行方式: node scripts/migrate-add-supervised-departments.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'src', 'db', 'onboarding.db');

async function runMigration() {
  console.log('開始執行 migration...');
  console.log('資料庫路徑:', DB_PATH);

  // 檢查資料庫是否存在
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ 資料庫不存在，請先啟動 server 建立資料庫');
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  try {
    // 1. 檢查欄位是否已存在
    const tableInfo = db.exec("PRAGMA table_info(department_positions)");
    const columns = tableInfo[0]?.values || [];
    const hasColumn = columns.some(col => col[1] === 'supervised_departments');

    if (!hasColumn) {
      // 2. 新增 supervised_departments 欄位
      console.log('新增 supervised_departments 欄位...');
      db.run(`
        ALTER TABLE department_positions 
        ADD COLUMN supervised_departments TEXT DEFAULT NULL
      `);
      console.log('✓ 欄位新增成功');
    } else {
      console.log('✓ supervised_departments 欄位已存在，跳過');
    }

    // 3. 更新營運長資料：從人資部移到執行長辦公室，並設定管轄部門
    console.log('更新營運長資料...');
    
    // 先檢查是否有舊的營運長資料（在人資部）
    const oldCOOResult = db.exec(`SELECT * FROM department_positions WHERE title = '營運長' AND department = '人資部'`);
    
    if (oldCOOResult.length > 0 && oldCOOResult[0].values.length > 0) {
      // 刪除舊的營運長資料
      db.run(`DELETE FROM department_positions WHERE title = '營運長' AND department = '人資部'`);
      console.log('✓ 已移除人資部的舊營運長資料');
    }

    // 新增新的營運長資料（歸屬於執行長辦公室，管轄所有部門）
    const supervisedDepts = JSON.stringify(['行政部', '財務部', '專案部', '人資部', '業務部', '工程部']);
    
    const existingCOOResult = db.exec(`SELECT * FROM department_positions WHERE id = 'pos-coo-7-m'`);
    
    if (existingCOOResult.length === 0 || existingCOOResult[0].values.length === 0) {
      db.run(`
        INSERT INTO department_positions (id, department, grade, title, track, supervised_departments)
        VALUES ('pos-coo-7-m', '執行長辦公室', 7, '營運長', 'management', '${supervisedDepts}')
      `);
      console.log('✓ 已新增營運長資料（歸屬執行長辦公室）');
    } else {
      // 更新現有資料
      db.run(`
        UPDATE department_positions 
        SET supervised_departments = '${supervisedDepts}', department = '執行長辦公室'
        WHERE id = 'pos-coo-7-m'
      `);
      console.log('✓ 已更新營運長管轄部門');
    }

    // 儲存資料庫
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
    console.log('✓ 資料庫已儲存');

    console.log('\n✅ Migration 完成！');
    console.log('營運長現在歸屬於「執行長辦公室」，管轄以下部門：');
    console.log('  - 行政部、財務部、專案部、人資部、業務部、工程部');

  } catch (error) {
    console.error('❌ Migration 失敗:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

runMigration();
