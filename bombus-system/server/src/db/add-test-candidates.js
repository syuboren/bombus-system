/**
 * 一次性腳本：新增 D-07 手測用候選人（全部 status=new / stage=Collected）
 *
 * 執行前：確認後端 server 已停止
 * 用法：cd bombus-system/server && node src/db/add-test-candidates.js
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const TENANT_DB_PATH = path.join(__dirname, '../../data/tenants/tenant_demo.db');

const CANDIDATES = [
    { id: 'C030', job_id: 'JOB-20268652', name: '陳雅芳', email: 'chen.yf@example.com', phone: '0912-111-001', score: 82 },
    { id: 'C031', job_id: 'JOB-2025001', name: '黃俊傑', email: 'huang.jj@example.com', phone: '0912-111-002', score: 76 },
    { id: 'C032', job_id: 'JOB-2025003', name: '林佩珊', email: 'lin.ps@example.com',   phone: '0912-111-003', score: 88 },
    { id: 'C033', job_id: 'JOB-2025004', name: '劉德昌', email: 'liu.dc@example.com',   phone: '0912-111-004', score: 79 },
    { id: 'C034', job_id: 'JOB-2025006', name: '王筱蓉', email: 'wang.xr@example.com',  phone: '0912-111-005', score: 85 },
    { id: 'C035', job_id: 'JOB-20268652', name: '吳美惠', email: 'wu.mh@example.com',   phone: '0912-111-006', score: 73 },
    { id: 'C036', job_id: 'JOB-2025001', name: '張文昌', email: 'chang.wc@example.com', phone: '0912-111-007', score: 81 },
    { id: 'C037', job_id: 'JOB-2025003', name: '鄭宜庭', email: 'cheng.yt@example.com', phone: '0912-111-008', score: 77 }
];

async function main() {
    if (!fs.existsSync(TENANT_DB_PATH)) {
        console.error('❌ tenant_demo.db 不存在');
        process.exit(1);
    }
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(TENANT_DB_PATH);
    const db = new SQL.Database(buffer);
    db.run('PRAGMA foreign_keys = ON');

    const now = new Date().toISOString();
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO candidates (
            id, job_id, status, stage, scoring_status, score,
            apply_date, name, email, phone
        ) VALUES (?, ?, 'new', 'Collected', 'Pending', ?, ?, ?, ?, ?)
    `);

    let added = 0;
    for (const c of CANDIDATES) {
        stmt.bind([c.id, c.job_id, c.score, now, c.name, c.email, c.phone]);
        stmt.step();
        stmt.reset();
        // 檢查是否真有新增（INSERT OR IGNORE）
        const exists = db.exec(`SELECT COUNT(*) FROM candidates WHERE id='${c.id}'`);
        if (exists[0].values[0][0] > 0) added++;
    }
    stmt.free();

    // 寫回檔案
    const newBuffer = Buffer.from(db.export());
    fs.writeFileSync(TENANT_DB_PATH, newBuffer);
    db.close();

    console.log(`✅ 新增 ${added} 位候選人（若 ID 已存在則略過）`);
    console.log('─── 清單 ───');
    for (const c of CANDIDATES) {
        console.log(`  ${c.id} | ${c.name} | ${c.email} | ${c.job_id}`);
    }
    console.log('\n💡 全部 status=new / stage=Collected，可用於發邀約測試');
}

main().catch(err => {
    console.error('❌ 失敗:', err);
    process.exit(1);
});
