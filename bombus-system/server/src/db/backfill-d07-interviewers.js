/**
 * backfill-d07-interviewers.js — D-07 一次性修補現有 demo DB 的面試官資料
 *
 * 目的：
 *  1. 確保 interview_invitations 有 interviewer_id 欄位（若無則 ALTER）
 *  2. 將既有 interviews.interviewer_id 從硬編碼 INT-001~004 對應到真實員工
 *  3. 為既有 interview_invitations 補 interviewer_id（依 candidate 的既有面試官推斷，否則用 HR 預設）
 *
 * 注意：執行前確認後端 server 已停止（sql.js 多進程寫會毀損資料）
 *
 * 用法：cd bombus-system/server && node src/db/backfill-d07-interviewers.js
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const TENANT_DB_PATH = path.join(__dirname, '../../data/tenants/tenant_demo.db');

// INT-001~004 → 真實 demo 員工（與 seeds/*.json 保持一致）
const INTERVIEWER_MAP = {
    'INT-001': '7',   // 吳俊賢 / 人資部 / 管理師
    'INT-002': '5',   // 李志偉 / 工程部 / 技術長
    'INT-003': '11',  // 許志豪 / 專案部 / 經理
    'INT-004': '6'    // 黃雅琪 / 業務部 / 業務長
};

const DEFAULT_INTERVIEWER = '7'; // 無法推斷時預設給人資

function hasColumn(db, table, column) {
    const stmt = db.prepare(`PRAGMA table_info(${table})`);
    const cols = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        cols.push(row.name);
    }
    stmt.free();
    return cols.includes(column);
}

function runStep(label, fn) {
    try {
        const changes = fn();
        console.log(`  ✅ ${label}${changes !== undefined ? ` (${changes} rows)` : ''}`);
        return true;
    } catch (e) {
        console.error(`  ❌ ${label}: ${e.message}`);
        return false;
    }
}

async function main() {
    if (!fs.existsSync(TENANT_DB_PATH)) {
        console.error(`❌ tenant_demo.db 不存在：${TENANT_DB_PATH}`);
        process.exit(1);
    }

    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(TENANT_DB_PATH);
    const db = new SQL.Database(buffer);
    db.run('PRAGMA foreign_keys = ON');

    console.log('═══ D-07 Interviewer Backfill ═══\n');

    // 1. ALTER TABLE interview_invitations ADD interviewer_id（若無）
    runStep('interview_invitations.interviewer_id 欄位', () => {
        if (!hasColumn(db, 'interview_invitations', 'interviewer_id')) {
            db.run('ALTER TABLE interview_invitations ADD COLUMN interviewer_id TEXT');
            db.run('CREATE INDEX IF NOT EXISTS idx_invitations_interviewer ON interview_invitations(interviewer_id)');
            return 1;
        }
        return 0;
    });

    // 1b. 建立相關 indexes
    runStep('interviews + meeting_attendees indexes', () => {
        db.run('CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_at ON interviews(interviewer_id, interview_at)');
        db.run('CREATE INDEX IF NOT EXISTS idx_meeting_attendees_employee_time ON meeting_attendees(employee_id)');
        return 0;
    });

    // 2. UPDATE interviews：將 INT-* 映射到真實員工
    let totalInterviewUpdates = 0;
    for (const [oldId, newId] of Object.entries(INTERVIEWER_MAP)) {
        runStep(`interviews: ${oldId} → ${newId}`, () => {
            db.run('UPDATE interviews SET interviewer_id = ? WHERE interviewer_id = ?', [newId, oldId]);
            const changes = db.getRowsModified();
            totalInterviewUpdates += changes;
            return changes;
        });
    }

    // 3. 把無效 interviewer_id（不屬於 INT-*，也不在 employees 表）的 interviews 改為預設
    runStep(`interviews: 非員工 ID 統一改為預設 ${DEFAULT_INTERVIEWER}`, () => {
        db.run(`
            UPDATE interviews
            SET interviewer_id = ?
            WHERE interviewer_id IS NOT NULL
              AND interviewer_id NOT IN (SELECT id FROM employees)
        `, [DEFAULT_INTERVIEWER]);
        return db.getRowsModified();
    });

    // 4. 補 invitations 的 interviewer_id：
    //    4a. 若 candidate 有對應的 interviews 紀錄 → 用同一個面試官
    runStep('invitations: 從同候選人的 interviews 推斷', () => {
        db.run(`
            UPDATE interview_invitations
            SET interviewer_id = (
                SELECT i.interviewer_id
                FROM interviews i
                WHERE i.candidate_id = interview_invitations.candidate_id
                  AND i.interviewer_id IS NOT NULL
                ORDER BY i.created_at DESC
                LIMIT 1
            )
            WHERE interviewer_id IS NULL
              AND EXISTS (
                SELECT 1 FROM interviews i
                WHERE i.candidate_id = interview_invitations.candidate_id
                  AND i.interviewer_id IS NOT NULL
              )
        `);
        return db.getRowsModified();
    });

    //    4b. 仍為 NULL 的用預設
    runStep(`invitations: 剩餘 NULL 用預設 ${DEFAULT_INTERVIEWER}`, () => {
        db.run('UPDATE interview_invitations SET interviewer_id = ? WHERE interviewer_id IS NULL', [DEFAULT_INTERVIEWER]);
        return db.getRowsModified();
    });

    // 5. 驗證
    console.log('\n─── 驗證 ───');
    const intRes = db.exec(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN interviewer_id IS NULL THEN 1 ELSE 0 END) as nulls,
               SUM(CASE WHEN interviewer_id LIKE 'INT-%' THEN 1 ELSE 0 END) as old_format
        FROM interviews
    `);
    const invRes = db.exec(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN interviewer_id IS NULL THEN 1 ELSE 0 END) as nulls
        FROM interview_invitations
    `);
    if (intRes.length > 0) {
        const [total, nulls, old] = intRes[0].values[0];
        console.log(`  interviews: 共 ${total} 筆，NULL ${nulls} 筆，舊 INT-* 格式 ${old} 筆`);
    }
    if (invRes.length > 0) {
        const [total, nulls] = invRes[0].values[0];
        console.log(`  interview_invitations: 共 ${total} 筆，NULL ${nulls} 筆`);
    }

    // 6. 寫回檔案
    const newBuffer = Buffer.from(db.export());
    fs.writeFileSync(TENANT_DB_PATH, newBuffer);
    db.close();

    console.log('\n✅ 已寫回 tenant_demo.db');
    console.log('💡 重新啟動 server 後可在 UI 測試 D-07 功能');
}

main().catch(err => {
    console.error('❌ 執行失敗:', err);
    process.exit(1);
});
