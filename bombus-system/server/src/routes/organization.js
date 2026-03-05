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

    // 子公司列表
    const subsidiaries = req.tenantDB.query(
      "SELECT id, name FROM org_units WHERE parent_id = ? AND type = 'subsidiary' ORDER BY name ASC",
      [company.id]
    ).map(s => {
      const empDepts = req.tenantDB.query(
        "SELECT name FROM org_units WHERE parent_id = ? AND type = 'department'", [s.id]
      );
      let empCount = 0;
      for (const d of empDepts) {
        const c = req.tenantDB.queryOne('SELECT COUNT(*) as count FROM employees WHERE department = ?', [d.name]);
        empCount += c ? c.count : 0;
      }
      return { id: s.id, name: s.name, employeeCount: empCount };
    });

    // 直屬部門列表
    const departments = req.tenantDB.query(
      "SELECT id, name FROM org_units WHERE parent_id = ? AND type = 'department' ORDER BY name ASC",
      [company.id]
    ).map(d => {
      const c = req.tenantDB.queryOne('SELECT COUNT(*) as count FROM employees WHERE department = ?', [d.name]);
      return { id: d.id, name: d.name, employeeCount: c ? c.count : 0 };
    });

    res.json({
      id: company.id,
      name: company.name,
      code: company.code || company.name,
      type: company.type === 'group' ? 'headquarters' : 'subsidiary',
      parentCompanyId: company.parent_id,
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      description: company.description || '',
      taxId: company.tax_id || '',
      status: company.status || 'active',
      establishedDate: company.established_date || null,
      departmentCount: deptCount ? deptCount.count : 0,
      subsidiaries,
      departments,
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

    const result = subs.map(s => {
      const empDepts = req.tenantDB.query(
        "SELECT name FROM org_units WHERE parent_id = ? AND type = 'department'", [s.id]
      );
      let employeeCount = 0;
      for (const d of empDepts) {
        const c = req.tenantDB.queryOne('SELECT COUNT(*) as count FROM employees WHERE department = ?', [d.name]);
        employeeCount += c ? c.count : 0;
      }
      return {
        id: s.id,
        name: s.name,
        code: s.code || s.name,
        type: 'subsidiary',
        parentCompanyId: s.parent_id,
        employeeCount,
        status: s.status || 'active',
        createdAt: s.created_at
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Get subsidiaries error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得子公司列表失敗' });
  }
});

// ─── 新增公司 ───

router.post('/companies', (req, res) => {
  const { name, type, parentCompanyId, code, address, phone, email, description, taxId, status, establishedDate } = req.body;

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
      `INSERT INTO org_units (id, name, type, parent_id, level, code, address, phone, email, description, tax_id, status, established_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, orgType, parentCompanyId || null, level,
       code || null, address || null, phone || null, email || null,
       description || null, taxId || null, status || 'active', establishedDate || null]
    );

    res.status(201).json({
      id, name, type, parentCompanyId,
      code: code || null,
      address: address || '',
      phone: phone || '',
      email: email || '',
      description: description || '',
      taxId: taxId || '',
      status: status || 'active',
      establishedDate: establishedDate || null
    });
  } catch (err) {
    console.error('Create company error:', err);
    res.status(500).json({ error: 'InternalError', message: '新增公司失敗' });
  }
});

// ─── 更新公司 ───

router.put('/companies/:id', (req, res) => {
  const company = req.tenantDB.queryOne(
    "SELECT * FROM org_units WHERE id = ? AND type IN ('group', 'subsidiary')",
    [req.params.id]
  );

  if (!company) {
    return res.status(404).json({ error: 'NotFound', message: '公司不存在' });
  }

  // 動態構建 UPDATE
  const fieldMap = {
    name: 'name', code: 'code', address: 'address', phone: 'phone',
    email: 'email', description: 'description', taxId: 'tax_id',
    status: 'status', establishedDate: 'established_date'
  };
  const updates = [];
  const params = [];
  for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
    if (req.body[bodyKey] !== undefined) {
      updates.push(`${dbCol} = ?`);
      params.push(req.body[bodyKey]);
    }
  }

  if (updates.length > 0) {
    params.push(req.params.id);
    req.tenantDB.run(`UPDATE org_units SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const updated = req.tenantDB.queryOne('SELECT * FROM org_units WHERE id = ?', [req.params.id]);
  res.json({
    id: updated.id,
    name: updated.name,
    code: updated.code || updated.name,
    type: updated.type === 'group' ? 'headquarters' : 'subsidiary',
    parentCompanyId: updated.parent_id,
    address: updated.address || '',
    phone: updated.phone || '',
    email: updated.email || '',
    description: updated.description || '',
    taxId: updated.tax_id || '',
    status: updated.status || 'active',
    establishedDate: updated.established_date || null
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

  // 驗證上層單位存在（支援 group/subsidiary/department 作為 parent）
  const parent = req.tenantDB.queryOne(
    "SELECT * FROM org_units WHERE id = ? AND type IN ('group', 'subsidiary', 'department')",
    [companyId]
  );

  if (!parent) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '上層單位不存在'
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
  const { name, code, managerId, responsibilities, kpiItems, competencyFocus } = req.body;

  const dept = req.tenantDB.queryOne(
    "SELECT * FROM org_units WHERE id = ? AND type = 'department'",
    [req.params.id]
  );

  if (!dept) {
    return res.status(404).json({ error: 'NotFound', message: '部門不存在' });
  }

  const currentName = dept.name;

  if (name) {
    req.tenantDB.run('UPDATE org_units SET name = ? WHERE id = ?', [name, req.params.id]);
    // 同步更新 departments 表
    req.tenantDB.run('UPDATE departments SET name = ? WHERE name = ?', [name, currentName]);
  }

  if (code !== undefined) {
    req.tenantDB.run('UPDATE org_units SET code = ? WHERE id = ?', [code || null, req.params.id]);
    const deptNameForCode = name || currentName;
    req.tenantDB.run('UPDATE departments SET code = ? WHERE name = ?', [code || null, deptNameForCode]);
  }

  const deptName = name || currentName;

  if (managerId !== undefined) {
    req.tenantDB.run(
      'UPDATE departments SET manager_id = ? WHERE name = ?',
      [managerId || null, deptName]
    );
  }

  // 擴充欄位更新
  if (responsibilities !== undefined) {
    req.tenantDB.run(
      'UPDATE departments SET responsibilities = ? WHERE name = ?',
      [JSON.stringify(responsibilities), deptName]
    );
  }

  if (kpiItems !== undefined) {
    req.tenantDB.run(
      'UPDATE departments SET kpi_items = ? WHERE name = ?',
      [JSON.stringify(kpiItems), deptName]
    );
  }

  if (competencyFocus !== undefined) {
    req.tenantDB.run(
      'UPDATE departments SET competency_focus = ? WHERE name = ?',
      [JSON.stringify(competencyFocus), deptName]
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

  // 檢查有無子部門
  const childDeptCount = req.tenantDB.queryOne(
    "SELECT COUNT(*) as count FROM org_units WHERE parent_id = ? AND type = 'department'",
    [req.params.id]
  );

  if (childDeptCount && childDeptCount.count > 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `此部門下有 ${childDeptCount.count} 個子部門，請先刪除子部門`
    });
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

// ══════════════════════════════════════════════════════════
//  統一組織樹
// ══════════════════════════════════════════════════════════

// ─── 統一組織樹 ───

router.get('/tree', (req, res) => {
  try {
    const nodes = req.tenantDB.query(`
      SELECT ou.id, ou.name, ou.type, ou.parent_id, ou.level,
             ou.code, ou.address, ou.phone, ou.email, ou.description,
             ou.tax_id, ou.status, ou.established_date,
             d.manager_id, d.head_count, d.responsibilities, d.kpi_items, d.competency_focus
      FROM org_units ou
      LEFT JOIN departments d ON d.name = ou.name AND ou.type = 'department'
      ORDER BY ou.level ASC, ou.name ASC
    `);

    const result = nodes.map(node => {
      // 員工數（僅部門節點）
      let employeeCount = 0;
      if (node.type === 'department') {
        const emp = req.tenantDB.queryOne(
          'SELECT COUNT(*) as count FROM employees WHERE department = ?',
          [node.name]
        );
        employeeCount = emp ? emp.count : 0;
      }

      // 部門數（group/subsidiary 節點）
      let departmentCount = 0;
      if (node.type === 'group' || node.type === 'subsidiary') {
        const dc = req.tenantDB.queryOne(
          "SELECT COUNT(*) as count FROM org_units WHERE parent_id = ? AND type = 'department'",
          [node.id]
        );
        departmentCount = dc ? dc.count : 0;
        // 也計算員工數（所有直屬部門的員工總和）
        const depts = req.tenantDB.query(
          "SELECT name FROM org_units WHERE parent_id = ? AND type = 'department'", [node.id]
        );
        for (const dept of depts) {
          const ec = req.tenantDB.queryOne('SELECT COUNT(*) as count FROM employees WHERE department = ?', [dept.name]);
          employeeCount += ec ? ec.count : 0;
        }
      }

      // 主管名
      let managerName = null;
      if (node.manager_id) {
        const mgr = req.tenantDB.queryOne(
          'SELECT name FROM employees WHERE id = ?',
          [node.manager_id]
        );
        managerName = mgr ? mgr.name : null;
      }

      return {
        id: node.id,
        name: node.name,
        type: node.type,
        parentId: node.parent_id,
        level: node.level,
        managerId: node.manager_id || null,
        managerName,
        employeeCount,
        departmentCount,
        // 公司詳情欄位（group/subsidiary）
        code: node.code || null,
        address: node.address || null,
        phone: node.phone || null,
        email: node.email || null,
        description: node.description || null,
        taxId: node.tax_id || null,
        status: node.status || 'active',
        establishedDate: node.established_date || null,
        // 部門詳情欄位
        responsibilities: node.responsibilities ? JSON.parse(node.responsibilities) : [],
        kpiItems: node.kpi_items ? JSON.parse(node.kpi_items) : [],
        competencyFocus: node.competency_focus ? JSON.parse(node.competency_focus) : []
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Get org tree error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得組織樹失敗' });
  }
});

// ─── 部門員工列表 ───

router.get('/departments/:id/employees', (req, res) => {
  try {
    const dept = req.tenantDB.queryOne(
      "SELECT name FROM org_units WHERE id = ? AND type = 'department'",
      [req.params.id]
    );

    if (!dept) {
      return res.status(404).json({ error: 'NotFound', message: '部門不存在' });
    }

    const employees = req.tenantDB.query(
      `SELECT id, name, employee_no, position, avatar, status
       FROM employees
       WHERE department = ?
       ORDER BY name ASC`,
      [dept.name]
    );

    res.json(employees.map(e => ({
      id: e.id,
      name: e.name,
      employeeNo: e.employee_no,
      position: e.position,
      avatar: e.avatar,
      status: e.status || 'active'
    })));
  } catch (err) {
    console.error('Get department employees error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得部門員工列表失敗' });
  }
});

// ─── 部門職務配置 ───

router.get('/departments/:id/positions', (req, res) => {
  try {
    const dept = req.tenantDB.queryOne(
      "SELECT name FROM org_units WHERE id = ? AND type = 'department'",
      [req.params.id]
    );

    if (!dept) {
      return res.status(404).json({ error: 'NotFound', message: '部門不存在' });
    }

    const positions = req.tenantDB.query(
      `SELECT dp.id, dp.title, dp.track, dp.grade,
              gl.title_management, gl.title_professional
       FROM department_positions dp
       LEFT JOIN grade_levels gl ON gl.grade = dp.grade
       WHERE dp.department = ?
       ORDER BY dp.grade ASC`,
      [dept.name]
    );

    res.json(positions.map(p => ({
      id: p.id,
      title: p.title,
      track: p.track,
      grade: p.grade,
      gradeTitle: p.track === 'management' ? p.title_management : p.title_professional
    })));
  } catch (err) {
    console.error('Get department positions error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得部門職務配置失敗' });
  }
});

// ══════════════════════════════════════════════════════════
//  部門協作關係
// ══════════════════════════════════════════════════════════

// ─── 協作關係列表 ───

router.get('/collaborations', (req, res) => {
  try {
    const collaborations = req.tenantDB.query(`
      SELECT dc.*,
             src.name as source_name,
             tgt.name as target_name
      FROM department_collaborations dc
      LEFT JOIN org_units src ON src.id = dc.source_dept_id
      LEFT JOIN org_units tgt ON tgt.id = dc.target_dept_id
      ORDER BY dc.created_at DESC
    `);

    res.json(collaborations.map(c => ({
      id: c.id,
      sourceDeptId: c.source_dept_id,
      targetDeptId: c.target_dept_id,
      sourceName: c.source_name,
      targetName: c.target_name,
      relationType: c.relation_type,
      description: c.description,
      sourceAnchor: c.source_anchor || null,
      targetAnchor: c.target_anchor || null,
      createdAt: c.created_at
    })));
  } catch (err) {
    console.error('Get collaborations error:', err);
    res.status(500).json({ error: 'InternalError', message: '取得協作關係列表失敗' });
  }
});

// ─── 新增協作關係 ───

router.post('/collaborations', (req, res) => {
  const { sourceDeptId, targetDeptId, relationType, description, sourceAnchor, targetAnchor } = req.body;

  if (!sourceDeptId || !targetDeptId || !relationType) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：sourceDeptId, targetDeptId, relationType'
    });
  }

  if (!['parallel', 'downstream'].includes(relationType)) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'relationType 必須為 parallel 或 downstream'
    });
  }

  const id = uuidv4();

  try {
    req.tenantDB.run(
      `INSERT INTO department_collaborations (id, source_dept_id, target_dept_id, relation_type, description, source_anchor, target_anchor)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, sourceDeptId, targetDeptId, relationType, description || null, sourceAnchor || null, targetAnchor || null]
    );

    res.status(201).json({
      id,
      sourceDeptId,
      targetDeptId,
      relationType,
      description: description || null,
      sourceAnchor: sourceAnchor || null,
      targetAnchor: targetAnchor || null
    });
  } catch (err) {
    console.error('Create collaboration error:', err);
    res.status(500).json({ error: 'InternalError', message: '新增協作關係失敗' });
  }
});

// ─── 更新協作關係 ───

router.put('/collaborations/:id', (req, res) => {
  const { relationType, description, sourceAnchor, targetAnchor } = req.body;

  const collab = req.tenantDB.queryOne(
    'SELECT * FROM department_collaborations WHERE id = ?',
    [req.params.id]
  );

  if (!collab) {
    return res.status(404).json({ error: 'NotFound', message: '協作關係不存在' });
  }

  if (relationType && !['parallel', 'downstream'].includes(relationType)) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'relationType 必須為 parallel 或 downstream'
    });
  }

  if (relationType !== undefined) {
    req.tenantDB.run(
      'UPDATE department_collaborations SET relation_type = ? WHERE id = ?',
      [relationType, req.params.id]
    );
  }

  if (description !== undefined) {
    req.tenantDB.run(
      'UPDATE department_collaborations SET description = ? WHERE id = ?',
      [description, req.params.id]
    );
  }

  if (sourceAnchor !== undefined) {
    req.tenantDB.run(
      'UPDATE department_collaborations SET source_anchor = ? WHERE id = ?',
      [sourceAnchor, req.params.id]
    );
  }

  if (targetAnchor !== undefined) {
    req.tenantDB.run(
      'UPDATE department_collaborations SET target_anchor = ? WHERE id = ?',
      [targetAnchor, req.params.id]
    );
  }

  const updated = req.tenantDB.queryOne(
    'SELECT * FROM department_collaborations WHERE id = ?',
    [req.params.id]
  );

  res.json({
    id: updated.id,
    sourceDeptId: updated.source_dept_id,
    targetDeptId: updated.target_dept_id,
    relationType: updated.relation_type,
    description: updated.description,
    sourceAnchor: updated.source_anchor || null,
    targetAnchor: updated.target_anchor || null
  });
});

// ─── 刪除協作關係 ───

router.delete('/collaborations/:id', (req, res) => {
  const collab = req.tenantDB.queryOne(
    'SELECT * FROM department_collaborations WHERE id = ?',
    [req.params.id]
  );

  if (!collab) {
    return res.status(404).json({ error: 'NotFound', message: '協作關係不存在' });
  }

  req.tenantDB.run('DELETE FROM department_collaborations WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: '協作關係已刪除' });
});

module.exports = router;
