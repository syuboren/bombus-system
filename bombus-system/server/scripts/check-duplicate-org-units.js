/**
 * 組織單位重複檢查工具（D-16 後續健全性檢查）
 *
 * 透過 HTTP API 走訪租戶組織樹，找出同一上層單位下「同名 + 同類型」的重複節點，
 * 方便人工決定保留哪一筆（無自動刪除動作 — read-only）。
 *
 * 使用：
 *   node scripts/check-duplicate-org-units.js                       # 預設 demo 租戶
 *   TENANT_SLUG=acme EMAIL=admin@acme.com PASSWORD=xxx node scripts/check-duplicate-org-units.js
 *
 * 輸出範例：
 *   [TEST 子公司]  業務部 (department) × 2
 *     - 業務部  id=abc-123  level=2  created_at=2026-01-12T03:21:55Z
 *     - 業務部  id=def-456  level=2  created_at=2026-04-29T10:08:11Z
 */

const BASE = process.env.BASE_URL || 'http://localhost:3001';
const TENANT_SLUG = process.env.TENANT_SLUG || 'demo';
const EMAIL = process.env.EMAIL || 'admin@demo.com';
const PASSWORD = process.env.PASSWORD || 'admin123';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
}

(async () => {
  console.log(`\n=== 組織單位重複檢查 (tenant=${TENANT_SLUG}) ===\n`);

  // 1. 登入
  const login = await req('POST', '/api/auth/login', {
    email: EMAIL,
    password: PASSWORD,
    tenant_slug: TENANT_SLUG
  });
  if (login.status !== 200) {
    console.error('登入失敗：', login.status, login.data);
    process.exit(1);
  }
  const token = login.data.access_token;

  // 2. 拉組織樹
  const tree = await req('GET', '/api/organization/tree', null, token);
  if (tree.status !== 200) {
    console.error('取組織樹失敗：', tree.status, tree.data);
    process.exit(1);
  }

  // GET /tree 回扁平陣列（不是巢狀），每節點欄位：id, name, type, parentId, level, employeeCount, departmentCount...
  const nodes = Array.isArray(tree.data) ? tree.data : [];
  const byId = new Map(nodes.map(n => [n.id, n]));

  // 3. 分組：以 parentId + name + type 為 key（同一上層下不該有同名同類型）
  const groups = new Map();
  for (const node of nodes) {
    const key = `${node.parentId || '__root__'}::${(node.name || '').trim()}::${node.type}`;
    if (!groups.has(key)) groups.set(key, { parentId: node.parentId, items: [] });
    groups.get(key).items.push(node);
  }

  // 4. 輸出重複組
  const dups = [...groups.values()].filter(g => g.items.length > 1);

  if (dups.length === 0) {
    console.log('未發現重複的組織單位 ✓\n');
    process.exit(0);
  }

  console.log(`發現 ${dups.length} 組重複：\n`);
  for (const { parentId, items } of dups) {
    const parent = parentId ? byId.get(parentId) : null;
    const parentLabel = parent ? `${parent.name}（${parent.type}）` : '(根層級)';
    const sample = items[0];
    console.log(`[${parentLabel}]  ${sample.name} (${sample.type}) × ${items.length}`);
    for (const n of items) {
      const meta = [
        `id=${n.id}`,
        `level=${n.level}`,
        n.type === 'department' ? `員工=${n.employeeCount ?? 0}` : `部門=${n.departmentCount ?? 0}/員工=${n.employeeCount ?? 0}`
      ].join('  ');
      console.log(`  - ${n.name}  ${meta}`);
    }
    console.log('');
  }

  console.log('---');
  console.log('處理方式：在「組織架構」頁面點擊欲刪除的節點 → 刪除。');
  console.log('（建議保留：員工綁定較多、或建立時間較早的那筆）\n');
})();
