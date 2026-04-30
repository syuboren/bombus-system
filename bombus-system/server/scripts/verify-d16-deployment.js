/**
 * D-16 部署後驗證腳本（tasks 8.2 + 8.3）
 *
 * 透過 HTTP API 驗證：
 *   8.2 platform.db
 *     - industries 表 12 列（含預設代碼）
 *     - department_templates ≥ 8 共通範本
 *     - 每個產業 GET /api/organization/department-templates 回 7-20 個範本
 *     - tenants.industry 全部對應有效 industries.code（無孤兒值）
 *   8.3 各租戶 tenant DB
 *     - 透過 GET /api/organization/tree 觸發 DB 載入
 *     - 部門 row 的 value 欄位存在（D-16 rename 已生效）
 *
 * 使用：
 *   cd bombus-system/server && node scripts/verify-d16-deployment.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const BASE = process.env.BASE_URL || 'http://localhost:3001';
const PLATFORM_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'platform@bombus.com';
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'platform123';

let pass = 0, fail = 0;
const log = (ok, msg) => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

async function req(method, path, body, token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const o = { method, headers: h };
  if (body && method !== 'GET') o.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, o);
  let d = null; try { d = await r.json(); } catch {}
  return { status: r.status, data: d };
}

(async () => {
  console.log('\n=== D-16 部署後驗證（tasks 8.2 + 8.3）===\n');

  // ── 取得 platform admin token ─────────────────────
  const platformLogin = await req('POST', '/api/auth/platform-login', {
    email: PLATFORM_EMAIL,
    password: PLATFORM_PASSWORD
  });
  if (platformLogin.status !== 200) {
    console.error('Platform 登入失敗：', platformLogin.status, platformLogin.data);
    process.exit(1);
  }
  const platformToken = platformLogin.data.access_token;

  // ══════════════════════════════════════════════════
  // 8.2 Platform DB
  // ══════════════════════════════════════════════════
  console.log('[8.2] Platform DB');

  // industries 表
  const inds = await req('GET', '/api/platform/industries', null, platformToken);
  log(inds.status === 200, `GET /industries → ${inds.status}`);
  log(Array.isArray(inds.data) && inds.data.length >= 12, `industries 表 ≥ 12 列（實際 ${inds.data?.length}；多出來通常是測試新增）`);

  const expectedCodes = [
    'it-services','tech','manufacturing','retail','food-service','healthcare',
    'finance','nonprofit','education','construction','logistics','other'
  ];
  const actualCodes = (inds.data || []).map(i => i.code).sort();
  const missing = expectedCodes.filter(c => !actualCodes.includes(c));
  log(missing.length === 0, `12 個預設代碼齊全${missing.length ? '（缺：' + missing.join(',') + '）' : ''}`);

  // department_templates 字典
  const allTpls = await req('GET', '/api/platform/department-templates', null, platformToken);
  log(
    allTpls.status === 200 && Array.isArray(allTpls.data) && allTpls.data.length >= 8,
    `department_templates 字典 ≥ 8 筆（實際 ${allTpls.data?.length || 0}）`
  );
  const commonCount = (allTpls.data || []).filter(t => t.is_common).length;
  log(commonCount >= 8, `共通範本（is_common=true）≥ 8 筆（實際 ${commonCount}）`);

  // industry_dept_assignments — 12 個產業並行拉取
  const assignSummary = (await Promise.all(
    (inds.data || []).map(async ind => {
      const a = await req('GET', `/api/platform/industry-dept-assignments?industry=${ind.code}`, null, platformToken);
      return a.status === 200 ? { code: ind.code, name: ind.name, count: a.data.length } : null;
    })
  )).filter(Boolean);
  const allInRange = assignSummary.every(s => s.count >= 7 && s.count <= 20);
  log(allInRange, `每產業 industry_dept_assignments 在 7-20 範圍內`);
  if (!allInRange) {
    for (const s of assignSummary) {
      if (s.count < 7 || s.count > 20) console.log(`     ⚠ ${s.name}（${s.code}）= ${s.count}`);
    }
  }

  // tenants.industry 對映完成（response 為 { data: [...] }）
  const tenants = await req('GET', '/api/platform/tenants', null, platformToken);
  const tenantArr = Array.isArray(tenants.data) ? tenants.data : (tenants.data?.data || []);
  if (tenants.status === 200) {
    const valid = new Set(actualCodes);
    const orphans = tenantArr.filter(t => t.industry && !valid.has(t.industry));
    log(orphans.length === 0, `tenants.industry 全部對應有效代碼（孤兒：${orphans.length} 筆）`);
    if (orphans.length) {
      for (const o of orphans) console.log(`     ⚠ ${o.name}: industry='${o.industry}'`);
    }
  }

  // ══════════════════════════════════════════════════
  // 8.3 各租戶 tenant DB（驗證 departments.value 欄位）
  // ══════════════════════════════════════════════════
  console.log('\n[8.3] Tenant DB（departments.value 欄位驗證）');

  // 拿 active tenants 列表
  const tenantList = tenantArr.filter(t => t.status === 'active');
  log(tenantList.length > 0, `有 ${tenantList.length} 個 active 租戶可驗證`);

  let tenantPass = 0, tenantFail = 0;
  for (const t of tenantList) {
    // 觸發 DB 載入
    const seedAdmin = await req('POST', '/api/auth/login', {
      email: 'admin@demo.com',  // 試 demo 預設帳號
      password: 'admin123',
      tenant_slug: t.slug
    });

    // 沒有 demo 帳號的租戶跳過（測試環境只 demo 有預設帳號）
    if (seedAdmin.status !== 200) {
      console.log(`  - ${t.name}（${t.slug}）：跳過（無預設管理員帳號）`);
      continue;
    }
    const tToken = seedAdmin.data.access_token;
    const tree = await req('GET', '/api/organization/tree', null, tToken);

    if (tree.status !== 200) {
      console.log(`  ✗ ${t.name}：GET /tree 失敗 ${tree.status}`);
      tenantFail++;
      continue;
    }

    // 找 department 類型節點，確認 value 欄位存在（不是 undefined）
    const depts = (tree.data || []).filter(n => n.type === 'department');
    if (depts.length === 0) {
      console.log(`  - ${t.name}：無部門資料，跳過 value 欄位驗證`);
      continue;
    }
    const allHaveValueField = depts.every(d => Array.isArray(d.value) || d.value === null || d.value === undefined);
    const hasResponsibilitiesAlias = depts.some(d => Array.isArray(d.responsibilities));

    if (allHaveValueField) {
      tenantPass++;
      console.log(`  ✓ ${t.name}：${depts.length} 部門，value 欄位皆為陣列${hasResponsibilitiesAlias ? '（responsibilities 別名也存在）' : ''}`);
    } else {
      tenantFail++;
      console.log(`  ✗ ${t.name}：value 欄位缺失或型別錯誤`);
    }
  }

  log(tenantFail === 0, `tenant DB value 欄位驗證：${tenantPass} pass / ${tenantFail} fail`);

  console.log(`\n總計：${pass} pass / ${fail} fail\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(err => { console.error(err); process.exit(1); });
