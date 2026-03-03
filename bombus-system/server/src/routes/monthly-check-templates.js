/**
 * 月度指標模板 API Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');


/**
 * GET /api/monthly-check-templates
 * 取得指標模板列表
 */
router.get('/', (req, res) => {
  try {
    const { department, position, isActive } = req.query;
    
    let conditions = ['1=1'];
    let params = [];
    
    if (department) {
      conditions.push('department = ?');
      params.push(department);
    }
    if (position) {
      conditions.push('position = ?');
      params.push(position);
    }
    if (isActive !== undefined) {
      conditions.push('is_active = ?');
      params.push(isActive === 'true' ? 1 : 0);
    }
    
    const whereClause = conditions.join(' AND ');
    
    const rows = req.tenantDB.prepare(`
      SELECT * FROM monthly_check_templates 
      WHERE ${whereClause}
      ORDER BY department, position, order_num
    `).all(...params);
    
    const templates = rows.map(row => ({
      id: row.id,
      department: row.department,
      position: row.position,
      name: row.name,
      points: row.points,
      description: row.description,
      measurement: row.measurement,
      orderNum: row.order_num,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/monthly-check-templates
 * 建立指標模板
 */
router.post('/', (req, res) => {
  try {
    const { department, position, name, points, description, measurement, orderNum, isActive = true } = req.body;
    
    if (!department || !position || !name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '部門、職務、指標名稱為必填欄位' }
      });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    req.tenantDB.prepare(`
      INSERT INTO monthly_check_templates (id, department, position, name, points, description, measurement, order_num, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, department, position, name, points || 1, description, measurement, orderNum || 0, isActive ? 1 : 0, now);
    
    res.status(201).json({
      success: true,
      data: { id, department, position, name, points: points || 1 }
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/monthly-check-templates/:id
 * 更新指標模板
 */
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, points, description, measurement, orderNum, isActive } = req.body;
    
    const existing = req.tenantDB.prepare(`SELECT * FROM monthly_check_templates WHERE id = ?`).get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此指標模板' } });
    }
    
    const updates = [];
    const params = [];
    
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (points !== undefined) { updates.push('points = ?'); params.push(points); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (measurement !== undefined) { updates.push('measurement = ?'); params.push(measurement); }
    if (orderNum !== undefined) { updates.push('order_num = ?'); params.push(orderNum); }
    if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
    
    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);
      
      req.tenantDB.prepare(`UPDATE monthly_check_templates SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/monthly-check-templates/:id
 * 刪除指標模板 (軟刪除)
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = req.tenantDB.prepare(`SELECT * FROM monthly_check_templates WHERE id = ?`).get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此指標模板' } });
    }
    
    // Soft delete
    req.tenantDB.prepare(`UPDATE monthly_check_templates SET is_active = 0, updated_at = ? WHERE id = ?`)
      .run(new Date().toISOString(), id);
    
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/monthly-check-templates/copy
 * 複製模板至其他職務
 */
router.post('/copy', (req, res) => {
  try {
    const { sourceDepartment, sourcePosition, targetDepartment, targetPosition } = req.body;
    
    if (!sourceDepartment || !sourcePosition || !targetDepartment || !targetPosition) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '來源與目標部門/職務為必填' }
      });
    }
    
    // Get source templates
    const templates = req.tenantDB.prepare(`
      SELECT * FROM monthly_check_templates 
      WHERE department = ? AND position = ? AND is_active = 1
      ORDER BY order_num
    `).all(sourceDepartment, sourcePosition);
    
    if (templates.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '來源職務無指標模板' }
      });
    }
    
    // Copy templates
    const now = new Date().toISOString();
    const newIds = [];
    
    templates.forEach(tpl => {
      const id = uuidv4();
      newIds.push(id);
      req.tenantDB.prepare(`
        INSERT INTO monthly_check_templates (id, department, position, name, points, description, measurement, order_num, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(id, targetDepartment, targetPosition, tpl.name, tpl.points, tpl.description, tpl.measurement, tpl.order_num, now);
    });
    
    res.status(201).json({
      success: true,
      data: { count: newIds.length, ids: newIds }
    });
  } catch (error) {
    console.error('Error copying templates:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/monthly-check-templates/import
 * 批次匯入指標模板
 */
router.post('/import', (req, res) => {
  try {
    const { templates } = req.body;
    
    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '請提供指標模板陣列' }
      });
    }
    
    const now = new Date().toISOString();
    const results = { success: 0, failed: 0, errors: [] };
    
    templates.forEach((tpl, idx) => {
      try {
        if (!tpl.department || !tpl.position || !tpl.name) {
          results.failed++;
          results.errors.push({ index: idx, error: '缺少必要欄位' });
          return;
        }
        
        const id = tpl.id || uuidv4();
        req.tenantDB.prepare(`
          INSERT OR REPLACE INTO monthly_check_templates (id, department, position, name, points, description, measurement, order_num, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, tpl.department, tpl.position, tpl.name,
          tpl.points || 1, tpl.description || '', tpl.measurement || '',
          tpl.order_num || tpl.orderNum || idx + 1,
          tpl.is_active !== undefined ? (tpl.is_active ? 1 : 0) : 1,
          now, now
        );
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ index: idx, error: e.message });
      }
    });
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error importing templates:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

module.exports = router;
