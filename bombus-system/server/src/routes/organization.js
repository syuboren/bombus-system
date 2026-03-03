/**
 * Organization Management Routes — 組織管理 API
 *
 * 需租戶認證（authMiddleware + tenantMiddleware 由 index.js 注入）
 *
 * === 公司管理 ===
 * GET    /api/organization/companies              — 公司列表
 * GET    /api/organization/companies/headquarters  — 取得總公司
 * GET    /api/organization/companies/:id           — 公司詳情
 * GET    /api/organization/companies/:id/subsidiaries — 子公司列表
 * POST   /api/organization/companies               — 新增公司
 * PUT    /api/organization/companies/:id            — 更新公司
 * DELETE /api/organization/companies/:id            — 刪除公司
 *
 * === 部門管理 ===
 * GET    /api/organization/departments              — 全部門列表
 * GET    /api/organization/departments/:id          — 部門詳情
 * POST   /api/organization/departments              — 新增部門
 * PUT    /api/organization/departments/:id          — 更新部門
 * DELETE /api/organization/departments/:id          — 刪除部門
 *
 * === 統計 ===
 * GET    /api/organization/stats                    — 組織統計
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ══════════════════════════════════════════════════════════
//  公司管理（org_units type=group/subsidiary）
// ══════════════════════════════════════════════════════════

// ─── 公司列表 ───

router.get('/companies', (req, res) => {
  try {
    const companies = req.tenantDB.query(`
      SELECT ou.id, ou.name, ou.type, ou.parent_id, ou.level, ou.created_at,
             (SELECT COUNT(*) FROM org_units sub WHERE sub.parent_id = ou.id AND sub.type = 'department') as departmentCount,
             (SELECT COUNT(*) FROM employees e
              JOIN departments d ON d.name = e.department
              JOIN org_units dep ON dep.name = d.name AND dep.type = 'department' AND dep.parent_id = ou.id
              WHERE 1=0) as _placeholder
      FROM org_units ou
      WHERE ou.type IN ('group', 'subsidiary')
      ORDER BY ou.level ASC, ou.name ASC
    `);

    // 附加員工統計（透過 departments 表關聯）
    const result = companies.map(c => {
      const deptCount = req.tenantDB.queryOne(
        "SELECT COUNT(*) as count FROM org_units WHERE parent_id = ? AND type = 'department'",
        [c.id]
      );

      // 計算此公司下所有部門的員工數
      const depts = req.tenantDB.query(
        "SELECT name FROM org_units WHERE parent_id = ? AND type = 'department'",
        [c.id]
      );
      const deptNames = depts.map(d => d.name);
      let employeeCount = 0;
      if (deptNames.length > 0) {
        const placeholders = deptNames.map(() => '?').join(',');
        const empResult = req.tenantDB.queryOne(
          `SELECT COUNT(*) as count FROM employees WHERE department IN (${placeholders})`,
          deptNames
        );
        employeeCount = empResult ? empResult.count : 0;
      }

      return {
        id: c.id,
        name: c.name,
        code: c.name, // 使用 name 作為 code（org_units 無 code 欄位）
        type: c.type === 'group' ? 'headquarters' : 'subsidiary',
        parentCompanyId: c.parent_id,
        employeeCount,
        departmentCount: deptCount ? deptCount.count : 0,
        status: 'active',
        createdAt: c.created_at
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Get companies error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得公司列表失敗' });
  }
});

// ─── 取得總公司 ───

router.get('/companies/headquarters', (req, res) => {
  try {
    const hq = req.tenantDB.queryOne(
      "SELECT * FROM org_units WHERE type = 'group' AND parent_id IS NULL LIMIT 1"
    );

    if (!hq) {
      return res.status(404).json({ error: 'NotFound', message: '尚未建立集團總部' });
    }

    res.json({
      id: hq.id,
      name: hq.name,
      type: 'headquarters',
      status: 'active',
      createdAt: hq.created_at
    });
  } catch (err) {
    console.error('Get headquarters error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得總公司失敗' });
  }
});

// ─── 公司詳情 ───

router.get('/companies/:id', (req, res) => {
  try {
    const company = req.tenantDB.queryOne(
      "SELECT * FROM org_units WHERE id = ? AND type IN ('group', 'subsidiary')",
      [req.params.id]
    );

    if (!company) {
      return res.status(404).json({ error: 'NotFound', message: '公司不存在' });
    }

    const deptCount = req.tenantDB.queryOne(
      "SELECT COUNT(*) as count FROM org_units WHERE parent_id = ? AND type = 'department'",
      [company.id]
    );

    res.json({
      id: company.id,
      name: company.name,
      code: company.name,
      type: company.type === 'group' ? 'headquarters' : 'subsidiary',
      parentCompanyId: company.parent_id,
      departmentCount: deptCount ? deptCount.count : 0,
      status: 'active',
      createdAt: company.created_at
    });
  } catch (err) {
    console.error('Get company error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得公司詳情失敗' });
  }
});

// ─── 子公司列表 ───

router.get('/companies/:id/subsidiaries', (req, res) => {
  try {
    const subs = req.tenantDB.query(
      "SELECT * FROM org_units WHERE parent_id = ? AND type = 'subsidiary' ORDER BY name ASC",
      [req.params.id]
    );

    const result = subs.map(s => ({
      id: s.id,
      name: s.name,
      code: s.name,
      type: 'subsidiary',
      parentCompanyId: s.parent_id,
      status: 'active',
      createdAt: s.created_at
    }));

    res.json(result);
  } catch (err) {
    console.error('Get subsidiaries error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得子公司列表失敗' });
  }
});

// ─── 新增公司 ───

router.post('/companies', (req, res) => {
  const { name, type, parentCompanyId } = req.body;

  if (!name || !type) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：name, type'
    });
  }

  const orgType = type === 'headquarters' ? 'group' : 'subsidiary';

  let level = 0;
  if (parentCompanyId) {
    const parent = req.tenantDB.queryOne(
      'SELECT level FROM org_units WHERE id = ?',
      [parentCompanyId]
    );
    if (!parent) {
      return res.status(400).json({
        error: 'BadRequest',
        message: '上層公司不存在'
      });
    }
    level = parent.level + 1;
  }

  const id = uuidv4();

  try {
    req.tenantDB.run(
      'INSERT INTO org_units (id, name, type, parent_id, level) VALUES (?, ?, ?, ?, ?)',
      [id, name, orgType, parentCompanyId || null, level]
    );

    res.status(201).json({
      id,
      name,
      type,
      parentCompanyId,
      status: 'active'
    });
  } catch (err) {
    console.error('Create company error:', err);
    res.status(500).json({ error: 'InternalError', message: '新增公司失敗' });
  }
});

// ─── 更新公司 ───

router.put('/companies/:id', (req, res) => {
  const { name } = req.body;

  const company = req.tenantDB.queryOne(
    "SELECT * FROM org_units WHERE id = ? AND type IN ('group', 'subsidiary')",
    [req.params.id]
  );

  if (!company) {
    return res.status(404).json({ error: 'NotFound', message: '公司不存在' });
  }

  if (name) {
    req.tenantDB.run('UPDATE org_units SET name = ? WHERE id = ?', [name, req.params.id]);
  }

  const updated = req.tenantDB.queryOne('SELECT * FROM org_units WHERE id = ?', [req.params.id]);
  res.json({
    id: updated.id,
    name: updated.name,
    type: updated.type === 'group' ? 'headquarters' : 'subsidiary',
    parentCompanyId: updated.parent_id,
    status: 'active'
  });
});

// ─── 刪除公司 ───

router.delete('/companies/:id', (req, res) => {
  const company = req.tenantDB.queryOne(
    "SELECT * FROM org_units WHERE id = ? AND type IN ('group', 'subsidiary')",
    [req.params.id]
  );

  if (!company) {
    return res.status(404).json({ error: 'NotFound', message: '公司不存在' });
  }

  // 檢查有無子公司
  const subCount = req.tenantDB.queryOne(
    "SELECT COUNT(*) as count FROM org_units WHERE parent_id = ? AND type = 'subsidiary'",
    [req.params.id]
  );
  if (subCount.count > 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '此公司下有子公司，請先刪除子公司'
    });
  }

  // 檢查有無部門
  const deptCount = req.tenantDB.queryOne(
    "SELECT COUNT(*) as count FROM org_units WHERE parent_id = ? AND type = 'department'",
    [req.params.id]
  );
  if (deptCount.count > 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '此公司下有部門，請先刪除部門'
    });
  }

  req.tenantDB.run('DELETE FROM org_units WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: '公司已刪除' });
});

// ══════════════════════════════════════════════════════════
//  部門管理（org_units type=department + departments 表）
// ══════════════════════════════════════════════════════════

// ─── 全部門列表 ───

router.get('/departments', (req, res) => {
  const { companyId } = req.query;

  try {
    let whereClause = "WHERE ou.type = 'department'";
    let params = [];

    if (companyId) {
      whereClause += ' AND ou.parent_id = ?';
      params.push(companyId);
    }

    const departments = req.tenantDB.query(
      `SELECT ou.id, ou.name, ou.parent_id as companyId, ou.level, ou.created_at,
              d.manager_id, d.head_count
       FROM org_units ou
       LEFT JOIN departments d ON d.name = ou.name
       ${whereClause}
       ORDER BY ou.name ASC`,
      params
    );

    const result = departments.map(dept => {
      // 員工數
      const empCount = req.tenantDB.queryOne(
        'SELECT COUNT(*) as count FROM employees WHERE department = ?',
        [dept.name]
      );

      // 主管名
      let managerName = null;
      if (dept.manager_id) {
        const mgr = req.tenantDB.queryOne(
          'SELECT name FROM employees WHERE id = ?',
          [dept.manager_id]
        );
        managerName = mgr ? mgr.name : null;
      }

      return {
        id: dept.id,
        companyId: dept.companyId,
        name: dept.name,
        code: dept.name,
        managerId: dept.manager_id,
        managerName,
        level: dept.level,
        employeeCount: empCount ? empCount.count : 0,
        createdAt: dept.created_at
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得部門列表失敗' });
  }
});

// ─── 部門詳情 ───

router.get('/departments/:id', (req, res) => {
  try {
    const dept = req.tenantDB.queryOne(
      `SELECT ou.*, d.manager_id, d.head_count
       FROM org_units ou
       LEFT JOIN departments d ON d.name = ou.name
       WHERE ou.id = ? AND ou.type = 'department'`,
      [req.params.id]
    );

    if (!dept) {
      return res.status(404).json({ error: 'NotFound', message: '部門不存在' });
    }

    const empCount = req.tenantDB.queryOne(
      'SELECT COUNT(*) as count FROM employees WHERE department = ?',
      [dept.name]
    );

    res.json({
      id: dept.id,
      companyId: dept.parent_id,
      name: dept.name,
      code: dept.name,
      managerId: dept.manager_id,
      level: dept.level,
      employeeCount: empCount ? empCount.count : 0,
      createdAt: dept.created_at
    });
  } catch (err) {
    console.error('Get department error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得部門詳情失敗' });
  }
});

// ─── 新增部門 ───

router.post('/departments', (req, res) => {
  const { name, companyId } = req.body;

  if (!name || !companyId) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：name, companyId'
    });
  }

  // 驗證上層公司存在
  const parent = req.tenantDB.queryOne(
    "SELECT * FROM org_units WHERE id = ? AND type IN ('group', 'subsidiary')",
    [companyId]
  );

  if (!parent) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '上層公司不存在'
    });
  }

  const id = uuidv4();
  const level = parent.level + 1;

  try {
    // 建立 org_units 記錄
    req.tenantDB.run(
      "INSERT INTO org_units (id, name, type, parent_id, level) VALUES (?, ?, 'department', ?, ?)",
      [id, name, companyId, level]
    );

    // 同步建立 departments 表記錄（既有業務表）
    const deptExists = req.tenantDB.queryOne(
      'SELECT id FROM departments WHERE name = ?',
      [name]
    );
    if (!deptExists) {
      req.tenantDB.run(
        'INSERT INTO departments (id, name) VALUES (?, ?)',
        [uuidv4(), name]
      );
    }

    res.status(201).json({
      id,
      name,
      companyId,
      level,
      employeeCount: 0
    });
  } catch (err) {
    console.error('Create department error:', err);
    res.status(500).json({ error: 'InternalError', message: '新增部門失敗' });
  }
});

// ─── 更新部門 ───

router.put('/departments/:id', (req, res) => {
  const { name, managerId } = req.body;

  const dept = req.tenantDB.queryOne(
    "SELECT * FROM org_units WHERE id = ? AND type = 'department'",
    [req.params.id]
  );

  if (!dept) {
    return res.status(404).json({ error: 'NotFound', message: '部門不存在' });
  }

  if (name) {
    req.tenantDB.run('UPDATE org_units SET name = ? WHERE id = ?', [name, req.params.id]);
    // 同步更新 departments 表
    req.tenantDB.run('UPDATE departments SET name = ? WHERE name = ?', [name, dept.name]);
  }

  if (managerId !== undefined) {
    req.tenantDB.run(
      'UPDATE departments SET manager_id = ? WHERE name = ?',
      [managerId || null, name || dept.name]
    );
  }

  const updated = req.tenantDB.queryOne('SELECT * FROM org_units WHERE id = ?', [req.params.id]);
  res.json({
    id: updated.id,
    name: updated.name,
    companyId: updated.parent_id,
    level: updated.level
  });
});

// ─── 刪除部門 ───

router.delete('/departments/:id', (req, res) => {
  const dept = req.tenantDB.queryOne(
    "SELECT * FROM org_units WHERE id = ? AND type = 'department'",
    [req.params.id]
  );

  if (!dept) {
    return res.status(404).json({ error: 'NotFound', message: '部門不存在' });
  }

  // 檢查有無員工
  const empCount = req.tenantDB.queryOne(
    'SELECT COUNT(*) as count FROM employees WHERE department = ?',
    [dept.name]
  );

  if (empCount && empCount.count > 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `此部門仍有 ${empCount.count} 名員工，請先移動員工`
    });
  }

  // 刪除 org_units 記錄
  req.tenantDB.run('DELETE FROM org_units WHERE id = ?', [req.params.id]);

  // 同步刪除 departments 表記錄
  req.tenantDB.run('DELETE FROM departments WHERE name = ?', [dept.name]);

  res.json({ success: true, message: '部門已刪除' });
});

// ══════════════════════════════════════════════════════════
//  組織統計
// ══════════════════════════════════════════════════════════

router.get('/stats', (req, res) => {
  try {
    const totalCompanies = req.tenantDB.queryOne(
      "SELECT COUNT(*) as count FROM org_units WHERE type IN ('group', 'subsidiary')"
    );

    const totalDepartments = req.tenantDB.queryOne(
      "SELECT COUNT(*) as count FROM org_units WHERE type = 'department'"
    );

    const totalEmployees = req.tenantDB.queryOne(
      'SELECT COUNT(*) as count FROM employees'
    );

    const activeEmployees = req.tenantDB.queryOne(
      "SELECT COUNT(*) as count FROM employees WHERE status = 'active' OR status IS NULL"
    );

    res.json({
      totalCompanies: totalCompanies ? totalCompanies.count : 0,
      totalDepartments: totalDepartments ? totalDepartments.count : 0,
      totalEmployees: totalEmployees ? totalEmployees.count : 0,
      activeEmployees: activeEmployees ? activeEmployees.count : 0
    });
  } catch (err) {
    console.error('Get org stats error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得組織統計失敗' });
  }
});

module.exports = router;
