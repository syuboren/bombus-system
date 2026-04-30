/**
 * D-16 部門範本快速導入 — 整合測試
 *
 * 測試範圍（Tasks 7.1 / 7.2 / 7.3 / 7.4）：
 * - 7.1 industry 字串對映遷移驗證、雙清單 RENAME COLUMN 冪等
 * - 7.2 POST /import/validate + /execute 在 overwrite / merge 兩模式行為正確、ROLLBACK
 * - 7.3 dept-import.service 邊界：空 name、超量、批次內重名
 * - 7.4 codeGenerator hook：D-15 disabled 時回 null
 *
 * 假設：伺服器在 http://localhost:3001，demo 租戶已初始化
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const BASE = 'http://localhost:3001';
const PLATFORM_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'platform@bombus.com';
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'platform123';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, description) {
  if (condition) {
    passed++;
    results.push(`  PASS: ${description}`);
  } else {
    failed++;
    results.push(`  FAIL: ${description}`);
  }
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

async function run() {
  console.log('=== D-16 部門範本快速導入 整合測試 ===\n');

  // ───────────────────────────────────────────────────
  // 登入：取得 platform admin + demo tenant admin token
  // ───────────────────────────────────────────────────
  console.log('[Step 0] 登入平台管理員與 demo 租戶\n');

  const platformLogin = await req('POST', '/api/auth/platform-login', {
    email: PLATFORM_EMAIL,
    password: PLATFORM_PASSWORD
  });
  assert(platformLogin.status === 200, '0.1 平台管理員登入成功');
  const platformToken = platformLogin.data?.access_token;

  const tenantLogin = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  assert(tenantLogin.status === 200, '0.2 demo 租戶管理員登入成功');
  const tenantToken = tenantLogin.data?.access_token;

  if (!platformToken || !tenantToken) {
    console.log(results.join('\n'));
    console.log('\n登入失敗，後續測試略過');
    return;
  }

  // ═══════════════════════════════════════════════════════
  // Part 1: industries 表 + 對映遷移驗證 (Task 7.1)
  // ═══════════════════════════════════════════════════════
  console.log('\n[Part 1] industries 表 + 對映遷移驗證\n');

  const industries = await req('GET', '/api/platform/industries', null, platformToken);
  assert(industries.status === 200, '1.1 GET /api/platform/industries (200)');
  assert(Array.isArray(industries.data), '1.2 回傳陣列');

  const codes = (industries.data || []).map(i => i.code);
  const expectedCodes = [
    'it-services', 'tech', 'manufacturing', 'retail', 'food-service',
    'healthcare', 'finance', 'nonprofit', 'education', 'construction', 'logistics', 'other'
  ];
  for (const code of expectedCodes) {
    assert(codes.includes(code), `1.3 industries 包含 ${code}`);
  }

  // 驗證 display_order 順序
  const itServices = (industries.data || []).find(i => i.code === 'it-services');
  assert(itServices?.display_order === 10, '1.4 it-services display_order = 10');
  const other = (industries.data || []).find(i => i.code === 'other');
  assert(other?.display_order === 999, '1.5 other display_order = 999');

  // 驗證 tenant_count / assignment_count 統計欄位存在
  if (industries.data?.[0]) {
    assert('tenant_count' in industries.data[0], '1.6 含 tenant_count 統計');
    assert('assignment_count' in industries.data[0], '1.7 含 assignment_count 統計');
  }

  // 1.8 industry FK 驗證：建立租戶帶無效 industry 應回 400
  const invalidIndustry = await req('POST', '/api/platform/tenants', {
    name: 'Invalid Industry Test',
    slug: 'invalid-industry-test-' + Date.now(),
    industry: '__nonexistent_industry_code__',
    admin_email: 'test@invalid.com',
    admin_name: 'Test Admin',
    admin_password: 'test1234'
  }, platformToken);
  assert(invalidIndustry.status === 400, '1.8 無效 industry 代碼回傳 400');

  // ═══════════════════════════════════════════════════════
  // Part 2: 部門範本 + assignment seed 驗證 (Task 7.1 + 7.4 部分)
  // ═══════════════════════════════════════════════════════
  console.log('\n[Part 2] 部門範本 seed 驗證\n');

  const commonTemplates = await req('GET', '/api/platform/department-templates?is_common=true', null, platformToken);
  assert(commonTemplates.status === 200, '2.1 GET department-templates is_common=true (200)');
  assert(Array.isArray(commonTemplates.data) && commonTemplates.data.length >= 8,
    '2.2 共通池至少 8 個範本（人資/財務/資訊/行政/法務/行銷/業務/採購）');

  const commonNames = (commonTemplates.data || []).map(t => t.name);
  assert(commonNames.includes('人資部'), '2.3 共通池含「人資部」');
  assert(commonNames.includes('財務部'), '2.4 共通池含「財務部」');

  // 各產業可見範本數應在 7-12 之間
  const manufacturingTpl = await req('GET', '/api/platform/department-templates?industry=manufacturing', null, platformToken);
  assert(manufacturingTpl.status === 200, '2.5 GET 製造業範本 (200)');
  const mfgCount = (manufacturingTpl.data || []).length;
  assert(mfgCount >= 7 && mfgCount <= 12, `2.6 製造業可見範本 7-12 個（實得 ${mfgCount}）`);

  const otherTpl = await req('GET', '/api/platform/department-templates?industry=other', null, platformToken);
  const otherCount = (otherTpl.data || []).length;
  assert(otherCount >= 7, `2.7 其他產業也至少 7 個（共通池），實得 ${otherCount}`);

  // ═══════════════════════════════════════════════════════
  // Part 3: 租戶端 GET /department-templates pre_checked 計算 (Task 7.1)
  // ═══════════════════════════════════════════════════════
  console.log('\n[Part 3] 租戶端 GET /department-templates pre_checked 計算\n');

  const tenantTemplates = await req(
    'GET',
    '/api/organization/department-templates?industry=manufacturing&size=small',
    null,
    tenantToken
  );
  assert(tenantTemplates.status === 200, '3.1 租戶端 GET department-templates (200)');
  assert(tenantTemplates.data?.industry?.code === 'manufacturing', '3.2 回應含 industry 資訊');
  assert(tenantTemplates.data?.size === 'small', '3.3 回應含 size 資訊');
  assert(Array.isArray(tenantTemplates.data?.departments), '3.4 departments 為陣列');

  // 找適用 small 的範本（pre_checked=true）
  const smallApplicable = (tenantTemplates.data?.departments || [])
    .filter(d => d.applicable_sizes?.includes('small'));
  if (smallApplicable.length > 0) {
    assert(smallApplicable.every(d => d.pre_checked === true),
      '3.5 適用 small 規模的範本 pre_checked=true');
  } else {
    assert(true, '3.5 跳過（無 small 適用範本）');
  }

  // 找不適用 small 的範本（pre_checked=false）
  const notSmall = (tenantTemplates.data?.departments || [])
    .filter(d => Array.isArray(d.applicable_sizes) && !d.applicable_sizes.includes('small'));
  if (notSmall.length > 0) {
    assert(notSmall.every(d => d.pre_checked === false),
      '3.6 不適用 small 規模的範本 pre_checked=false');
  } else {
    assert(true, '3.6 跳過（所有範本都適用 small）');
  }

  // industry 缺失應回 400
  const missingIndustry = await req('GET', '/api/organization/department-templates', null, tenantToken);
  assert(missingIndustry.status === 400, '3.7 缺 industry 參數回 400');

  // ═══════════════════════════════════════════════════════
  // Part 4: 匯入流程 — validate + execute（Task 7.2）
  // ═══════════════════════════════════════════════════════
  console.log('\n[Part 4] 匯入流程 — validate + execute\n');

  // 取得 demo 租戶的一個 group/subsidiary 節點
  const tree = await req('GET', '/api/organization/tree', null, tenantToken);
  const company = (tree.data || []).find(n => n.type === 'group' || n.type === 'subsidiary');
  assert(!!company, '4.0 找到 demo 租戶的公司節點');

  if (company) {
    const companyId = company.id;
    const TS = Date.now();
    const items4 = [
      { name: `D16測試部門A_${TS}`, value: ['Value A1', 'Value A2'] },
      { name: `D16測試部門B_${TS}`, value: ['Value B1'] }
    ];

    // 4.1 validate 不寫 DB
    const validate1 = await req(
      'POST',
      `/api/organization/companies/${companyId}/departments/import/validate`,
      { items: items4, mode: 'merge' },
      tenantToken
    );
    assert(validate1.status === 200, '4.1 validate 200');
    assert(validate1.data?.totalRows === 2, '4.2 totalRows = 2');
    assert(validate1.data?.validRows === 2, '4.3 validRows = 2 (無格式錯誤)');
    assert(validate1.data?.errorRows === 0, '4.4 errorRows = 0');
    assert(Array.isArray(validate1.data?.to_insert), '4.5 to_insert 為陣列');

    // validate 不應寫入 — 用 GET /tree 確認沒有新部門
    const treeMid = await req('GET', '/api/organization/tree', null, tenantToken);
    const beforeCount = (treeMid.data || []).filter(n => n.name.includes(`D16測試部門`)).length;
    assert(beforeCount === 0, '4.6 validate 後組織樹未新增部門（不寫 DB）');

    // 4.7 execute (merge) — 應全部新增
    const exec1 = await req(
      'POST',
      `/api/organization/companies/${companyId}/departments/import/execute`,
      { items: items4, mode: 'merge' },
      tenantToken
    );
    assert(exec1.status === 200, '4.7 execute (merge) 200');
    assert(exec1.data?.summary?.created === 2, '4.8 summary.created = 2');
    assert(exec1.data?.summary?.skipped === 0, '4.9 summary.skipped = 0（無衝突）');

    // 確認 created items 包含 code (D-15 disabled 時應為 null) — Task 7.4
    const createdItems = exec1.data?.created || [];
    if (createdItems.length > 0) {
      assert(createdItems[0].code === null, '4.10 D-15 disabled 時 code = null（codeGenHook 預留）');
    }

    // 4.11 同樣 items 再 validate — 應全衝突
    const validate2 = await req(
      'POST',
      `/api/organization/companies/${companyId}/departments/import/validate`,
      { items: items4, mode: 'merge' },
      tenantToken
    );
    assert(validate2.data?.conflicts?.length === 2, '4.11 重複 validate 偵測 2 衝突');
    assert(validate2.data?.to_insert?.length === 0, '4.12 to_insert 為 0');

    // 4.13 execute (merge) — 應全部跳過
    const exec2 = await req(
      'POST',
      `/api/organization/companies/${companyId}/departments/import/execute`,
      { items: items4, mode: 'merge' },
      tenantToken
    );
    assert(exec2.data?.summary?.created === 0, '4.13 merge 模式：created = 0');
    assert(exec2.data?.summary?.skipped === 2, '4.14 merge 模式：skipped = 2');

    // 4.15 execute (overwrite) — 應更新 value
    const items5 = [
      { name: `D16測試部門A_${TS}`, value: ['New Value A'] }
    ];
    const exec3 = await req(
      'POST',
      `/api/organization/companies/${companyId}/departments/import/execute`,
      { items: items5, mode: 'overwrite' },
      tenantToken
    );
    assert(exec3.data?.summary?.updated === 1, '4.15 overwrite 模式：updated = 1');
    assert(exec3.data?.summary?.created === 0, '4.16 overwrite 模式：created = 0');

    // 清理：刪除測試部門
    const treeAfter = await req('GET', '/api/organization/tree', null, tenantToken);
    const cleanup = (treeAfter.data || []).filter(n => n.name.includes(`D16測試部門`) && n.name.includes(String(TS)));
    for (const node of cleanup) {
      await req('DELETE', `/api/organization/departments/${node.id}`, null, tenantToken);
    }
  } else {
    console.log('  跳過 Part 4（無公司節點）');
  }

  // ═══════════════════════════════════════════════════════
  // Part 5: dept-import.service 邊界測試（Task 7.3）
  // ═══════════════════════════════════════════════════════
  console.log('\n[Part 5] 服務層邊界測試\n');

  if (company) {
    const companyId = company.id;

    // 5.1 空 name 應於 errors[] 報錯
    const emptyName = await req(
      'POST',
      `/api/organization/companies/${companyId}/departments/import/validate`,
      { items: [{ name: '', value: [] }, { name: '   ', value: [] }], mode: 'merge' },
      tenantToken
    );
    assert(emptyName.status === 200, '5.1 空 name 不應整體 400（個別 row 標 errors）');
    assert(emptyName.data?.errorRows === 2, '5.2 兩列空 name 都列為 error');

    // 5.3 超量（>1000 列）整體 400
    const oversized = Array.from({ length: 1001 }, (_, i) => ({ name: `Test_${i}`, value: [] }));
    const oversize = await req(
      'POST',
      `/api/organization/companies/${companyId}/departments/import/validate`,
      { items: oversized, mode: 'merge' },
      tenantToken
    );
    assert(oversize.status === 400, '5.3 超過 1000 列回 400');

    // 5.4 同一批次內重名應在第二列標 errors
    const dup = await req(
      'POST',
      `/api/organization/companies/${companyId}/departments/import/validate`,
      { items: [{ name: '同名測試' }, { name: '同名測試' }], mode: 'merge' },
      tenantToken
    );
    const dupErrorRow = dup.data?.items?.find(i => i.row === 2);
    assert(
      Array.isArray(dupErrorRow?.errors) && dupErrorRow.errors.some(e => e.includes('同名')),
      '5.4 批次內重名第 2 列標 errors 含「同名」字樣'
    );

    // 5.5 invalid mode
    const invalidMode = await req(
      'POST',
      `/api/organization/companies/${companyId}/departments/import/validate`,
      { items: [{ name: 'X' }], mode: 'invalid_mode' },
      tenantToken
    );
    assert(invalidMode.status === 400, '5.5 無效 mode 回 400');

    // 5.6 空 items 陣列
    const emptyItems = await req(
      'POST',
      `/api/organization/companies/${companyId}/departments/import/validate`,
      { items: [], mode: 'merge' },
      tenantToken
    );
    assert(emptyItems.status === 400, '5.6 空 items 回 400');
  }

  // ═══════════════════════════════════════════════════════
  // Part 6: tenant.industry FK 驗證（補強 Task 7.1）
  // ═══════════════════════════════════════════════════════
  console.log('\n[Part 6] tenants.industry FK 驗證\n');

  // 6.1 建立租戶帶有效 industry
  const validIndustry = await req('POST', '/api/platform/tenants', {
    name: 'D16 Test Tenant ' + Date.now(),
    slug: 'd16-test-' + Date.now(),
    industry: 'manufacturing',
    admin_email: `d16test${Date.now()}@example.com`,
    admin_name: 'D16 Test',
    admin_password: 'test1234'
  }, platformToken);
  assert(validIndustry.status === 201, '6.1 帶有效 industry 建立租戶 (201)');

  if (validIndustry.data?.id) {
    // 清理
    await req('DELETE', `/api/platform/tenants/${validIndustry.data.id}`, null, platformToken);
    await req('DELETE', `/api/platform/tenants/${validIndustry.data.id}/purge`, { confirm: validIndustry.data.id }, platformToken);
  }

  // 6.2 建立租戶不帶 industry（選填）
  const noIndustry = await req('POST', '/api/platform/tenants', {
    name: 'D16 No Industry ' + Date.now(),
    slug: 'd16-no-industry-' + Date.now(),
    admin_email: `d16noindustry${Date.now()}@example.com`,
    admin_name: 'D16 Test',
    admin_password: 'test1234'
  }, platformToken);
  assert(noIndustry.status === 201, '6.2 不帶 industry 建立租戶 (201) — 選填');

  if (noIndustry.data?.id) {
    await req('DELETE', `/api/platform/tenants/${noIndustry.data.id}`, null, platformToken);
    await req('DELETE', `/api/platform/tenants/${noIndustry.data.id}/purge`, { confirm: noIndustry.data.id }, platformToken);
  }

  // ───────────────────────────────────────────────────
  // 結果輸出
  // ───────────────────────────────────────────────────
  console.log('\n=== 測試結果 ===\n');
  console.log(results.join('\n'));
  console.log(`\n通過：${passed}，失敗：${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('測試執行錯誤：', err);
  process.exit(1);
});
