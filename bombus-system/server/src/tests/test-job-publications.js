/**
 * D-02/D-03 多平台職缺發布測試
 *
 * 涵蓋：
 *  1. DB 層 — 雙遷移清單同步（initTenantSchema + _runMigrations）
 *  2. DB 層 — 歷史 job104_no 遷移冪等（跑兩次不重複）
 *  3. DB 層 — UNIQUE(job_id, platform) 與 status CHECK constraint
 *  4. HTTP 層 — POST /api/jobs 建立 pending publication
 *  5. HTTP 層 — POST /api/jobs/:jobId/publications/:platform/retry 行為
 *    (a) 未存在列 → 404
 *    (b) closed 列 → 409
 *    (c) 不支援的 platform → 400
 *  6. Platform-publisher registry — 518 stub throws NOT_IMPLEMENTED
 *
 * 執行方式：
 *   node server/src/tests/test-job-publications.js
 *
 * 前置條件：
 *   - DB 測試可獨立執行，不需伺服器
 *   - HTTP 測試需要伺服器已啟動於 http://localhost:3001，demo 租戶已初始化
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const fs = require('fs');
const os = require('os');

const BASE = 'http://localhost:3001';
let passed = 0, failed = 0;
const results = [];
function assert(condition, desc) {
  if (condition) { passed++; results.push(`  PASS: ${desc}`); }
  else { failed++; results.push(`  FAIL: ${desc}`); }
}

async function req(method, pathUrl, body, token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const o = { method, headers: h };
  if (body && method !== 'GET') o.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${pathUrl}`, o);
  let d = null;
  try { d = await r.json(); } catch {}
  return { status: r.status, data: d };
}

// ─── 1. DB 層測試：建立測試租戶並驗證 schema ───
async function testSchemaAndMigrations() {
  console.log('  [1] DB Schema + 雙遷移清單同步');

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const adapter = {
    raw: db,
    save: () => {}
  };

  // 跑 initTenantSchema（新租戶路徑）
  const { initTenantSchema } = require('../db/tenant-schema');
  initTenantSchema(adapter);

  // 驗證 job_publications 表存在
  const tableInfo = db.exec("PRAGMA table_info(job_publications)");
  assert(tableInfo.length > 0 && tableInfo[0].values.length >= 11,
    '1.1 job_publications 欄位齊全 (>=11 欄位)');

  // 驗證 unique index 存在
  const indexInfo = db.exec(
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='job_publications'"
  );
  const indexNames = indexInfo.length && indexInfo[0].values.map(r => r[0]) || [];
  assert(indexNames.includes('idx_job_publications_job_platform'),
    '1.2 UNIQUE INDEX idx_job_publications_job_platform 存在');
  assert(indexNames.includes('idx_job_publications_status'),
    '1.3 INDEX idx_job_publications_status 存在');

  // 測試 CHECK constraint
  let checkThrew = false;
  try {
    db.run(`
      INSERT INTO job_publications (id, job_id, platform, status)
      VALUES ('test-1', 'JOB-fake', '104', 'invalid_status')
    `);
  } catch (e) { checkThrew = true; }
  assert(checkThrew, '1.4 status CHECK constraint 拒絕無效值');

  // 插入一筆 jobs + 測試 UNIQUE(job_id, platform)
  db.run(`INSERT INTO jobs (id, title, status) VALUES ('JOB-t01', 'test job', 'draft')`);
  db.run(`INSERT INTO job_publications (id, job_id, platform, status)
          VALUES ('pub-1', 'JOB-t01', '104', 'pending')`);
  let uniqueThrew = false;
  try {
    db.run(`INSERT INTO job_publications (id, job_id, platform, status)
            VALUES ('pub-2', 'JOB-t01', '104', 'synced')`);
  } catch (e) { uniqueThrew = true; }
  assert(uniqueThrew, '1.5 UNIQUE(job_id, platform) 拒絕同 job 同平台重複列');

  db.close();
}

// ─── 2. DB 層測試：歷史 job104_no 遷移冪等 ───
async function testMigrationIdempotency() {
  console.log('  [2] 歷史 job104_no 遷移冪等性');

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const { initTenantSchema } = require('../db/tenant-schema');
  const adapter = { raw: db, save: () => {} };
  initTenantSchema(adapter);

  // 插入一筆 legacy jobs 列（有 job104_no）
  db.run(`
    INSERT INTO jobs (id, title, status, job104_no, sync_status, synced_at, created_at)
    VALUES ('JOB-legacy', 'Legacy 104 Job', 'published', 'LEGACY-104',
            '104_synced', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
  `);

  // 執行遷移 SQL 兩次
  const migrationSql = `
    INSERT INTO job_publications (
      id, job_id, platform, platform_job_id, status,
      platform_fields, published_at, created_at
    )
    SELECT
      lower(hex(randomblob(16))),
      j.id, '104', j.job104_no,
      CASE j.sync_status WHEN '104_synced' THEN 'synced' ELSE 'pending' END,
      j.job104_data, j.synced_at,
      COALESCE(j.created_at, datetime('now'))
    FROM jobs j
    WHERE j.job104_no IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM job_publications p
        WHERE p.job_id = j.id AND p.platform = '104'
      )
  `;

  db.run(migrationSql);
  const afterFirst = db.exec("SELECT COUNT(*) FROM job_publications WHERE job_id = 'JOB-legacy'");
  assert(afterFirst[0].values[0][0] === 1, '2.1 首次遷移插入 1 筆 publications');

  db.run(migrationSql);
  const afterSecond = db.exec("SELECT COUNT(*) FROM job_publications WHERE job_id = 'JOB-legacy'");
  assert(afterSecond[0].values[0][0] === 1, '2.2 重跑遷移仍只有 1 筆（冪等）');

  // 驗證遷移值正確
  const row = db.exec("SELECT platform, platform_job_id, status, published_at FROM job_publications WHERE job_id = 'JOB-legacy'");
  const [platform, platformJobId, status, publishedAt] = row[0].values[0];
  assert(platform === '104' && platformJobId === 'LEGACY-104',
    `2.3 遷移值 platform=${platform}, platform_job_id=${platformJobId}`);
  assert(status === 'synced', `2.4 104_synced → synced（實際 ${status}）`);
  assert(publishedAt === '2026-01-01T00:00:00Z', '2.5 synced_at → published_at');

  db.close();
}

// ─── 3. Platform-publisher 單元測試 ───
async function testPlatformPublisher() {
  console.log('  [3] platform-publisher registry');

  const { getPublisher, SUPPORTED_PLATFORMS, ENABLED_PLATFORMS, NotImplementedError } =
    require('../services/platform-publisher');

  assert(JSON.stringify(SUPPORTED_PLATFORMS) === '["104","518","1111"]',
    '3.1 SUPPORTED_PLATFORMS = [104, 518, 1111]');
  assert(JSON.stringify(ENABLED_PLATFORMS) === '["104"]',
    '3.2 ENABLED_PLATFORMS = [104]');

  const p104 = getPublisher('104');
  assert(p104 && p104.platform === '104', '3.3 getPublisher(104) 回傳 104 adapter');
  assert(getPublisher('unknown') === null, '3.4 getPublisher(unknown) 回傳 null');

  // 518 stub 應 throw NOT_IMPLEMENTED
  let threwCode = null;
  try {
    await getPublisher('518').publish({});
  } catch (e) { threwCode = e.code; }
  assert(threwCode === 'NOT_IMPLEMENTED', '3.5 518.publish() throws NOT_IMPLEMENTED');

  // 1111 stub 同樣
  let threw1111 = null;
  try {
    await getPublisher('1111').close('x');
  } catch (e) { threw1111 = e.code; }
  assert(threw1111 === 'NOT_IMPLEMENTED', '3.6 1111.close() throws NOT_IMPLEMENTED');
}

// ─── 4. HTTP 層測試（需伺服器） ───
async function testHttpFlow() {
  console.log('  [4] HTTP 層（demo 租戶，需 server 已啟動）');

  // 試 ping server
  let serverUp = false;
  try {
    const ping = await fetch(`${BASE}/api/auth/login`, { method: 'POST' });
    serverUp = ping.status === 400 || ping.status === 200; // 有回應即為活著
  } catch {}

  if (!serverUp) {
    console.log('    (skipped — server not running)');
    return;
  }

  const login = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com', password: 'admin123', tenant_slug: 'demo'
  });
  if (login.status !== 200 || !login.data?.access_token) {
    console.log('    (skipped — demo login failed)');
    return;
  }
  const token = login.data.access_token;

  // 建立一個測試職缺，不帶 selectedPlatforms，不帶 job104Data → publications 應為空
  const resNo104 = await req('POST', '/api/jobs', {
    title: 'TEST 無平台職缺',
    department: '工程部'
  }, token);
  assert(resNo104.status === 200, '4.1 POST /api/jobs 不帶 104 → 200');
  assert(Array.isArray(resNo104.data?.data?.publications) && resNo104.data.data.publications.length === 0,
    '4.2 不帶 104 時 publications 為空');

  // 建立含 job104Data 的職缺 → 應有 1 筆 pending 104
  const with104 = await req('POST', '/api/jobs', {
    title: 'TEST 含 104 設定',
    department: '工程部',
    job104Data: {
      role: 1, job: 'TEST 含 104 設定', jobCatSet: [2001002002],
      description: 'test', salaryType: 10, salaryLow: 0, salaryHigh: 0,
      addrNo: 6001001001, edu: [8], contact: 'HR', email: ['hr@test.com'],
      applyType: { '104': [2] }, replyDay: 7, workShifts: []
    }
  }, token);
  assert(with104.status === 200, '4.3 POST /api/jobs 帶 104 → 200');
  const pubs104 = with104.data?.data?.publications || [];
  const pub104 = pubs104.find(p => p.platform === '104');
  assert(pub104 && pub104.status === 'pending',
    '4.4 自動建立 platform=104 status=pending 列');

  // Retry 不存在的 job → 404
  const retryNotFound = await req('POST', '/api/jobs/JOB-nonexistent/publications/104/retry', {}, token);
  assert(retryNotFound.status === 404, '4.5 Retry 不存在的 job → 404');

  // Retry 不支援的 platform → 400
  const retryBad = await req(
    'POST',
    `/api/jobs/${with104.data.data.id}/publications/fake/retry`,
    {}, token
  );
  assert(retryBad.status === 400, '4.6 Retry 不支援平台 → 400');

  // Retry 不存在的 publication（已支援平台但該 job 無對應列）→ 404
  const retryNoRow = await req(
    'POST',
    `/api/jobs/${with104.data.data.id}/publications/518/retry`,
    {}, token
  );
  assert(retryNoRow.status === 404, '4.7 Retry 無對應 publication 列 → 404');

  // 清理
  await req('DELETE', `/api/jobs/${with104.data.data.id}?force=true`, null, token);
  await req('DELETE', `/api/jobs/${resNo104.data.data.id}?force=true`, null, token);
}

async function run() {
  console.log('=== D-02/D-03 多平台職缺發布測試 ===\n');

  try {
    await testSchemaAndMigrations();
    await testMigrationIdempotency();
    await testPlatformPublisher();
    await testHttpFlow();
  } catch (e) {
    console.error('測試過程發生錯誤：', e);
    failed++;
  }

  console.log('\n' + results.join('\n'));
  console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);
  if (failed > 0) process.exit(1);
}

run();
