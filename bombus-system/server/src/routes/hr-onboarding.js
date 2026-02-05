/**
 * HR Onboarding API Routes
 * 候選人轉員工入職管理
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db');

// ============================================================
// Helper Functions
// ============================================================

/**
 * 產生員工編號
 * 格式：E + 年份(4位) + 序號(3位，補零)
 * 例如：E2026001, E2026002
 */
function generateEmployeeNo() {
  const year = new Date().getFullYear();
  const prefix = `E${year}`;
  
  // 查詢該年度最大的員工編號
  const result = prepare(`
    SELECT employee_no FROM employees
    WHERE employee_no LIKE ?
    ORDER BY employee_no DESC
    LIMIT 1
  `).get(`${prefix}%`);
  
  let nextSeq = 1;
  if (result && result.employee_no) {
    // 取得序號部分（最後3位）
    const currentSeq = parseInt(result.employee_no.slice(-3), 10);
    nextSeq = currentSeq + 1;
  }
  
  // 補零到3位
  const seqStr = nextSeq.toString().padStart(3, '0');
  return `${prefix}${seqStr}`;
}

/**
 * 計算試用期結束日期
 */
function calculateProbationEndDate(hireDate, months) {
  const date = new Date(hireDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

/**
 * 產生簽署 Token（16位）
 */
function generateToken() {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

// ============================================================
// API Endpoints
// ============================================================

/**
 * GET /api/hr/onboarding/pending-conversions
 * 取得待入職候選人列表（status = 'offer_accepted'）
 */
router.get('/pending-conversions', (req, res) => {
  try {
    // 使用子查詢取得每個候選人最新的 invitation_decision 記錄
    const candidates = prepare(`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.avatar,
        c.current_position as position,
        c.status,
        c.stage,
        d.candidate_response as offer_response,
        d.responded_at as offer_accepted_at,
        CAST((julianday('now') - julianday(d.responded_at)) AS INTEGER) as days_since_accepted
      FROM candidates c
      LEFT JOIN (
        SELECT candidate_id, candidate_response, responded_at,
               ROW_NUMBER() OVER (PARTITION BY candidate_id ORDER BY responded_at DESC) as rn
        FROM invitation_decisions
      ) d ON c.id = d.candidate_id AND d.rn = 1
      WHERE c.status = 'offer_accepted'
      ORDER BY d.responded_at DESC
    `).all();

    res.json(candidates);
  } catch (error) {
    console.error('Error fetching pending conversions:', error);
    res.status(500).json({ error: 'Failed to fetch pending conversions' });
  }
});

/**
 * POST /api/hr/onboarding/convert-candidate
 * 將候選人轉換為員工（試用期）
 */
router.post('/convert-candidate', (req, res) => {
  try {
    const {
      candidate_id,
      department,
      job_title,  // 職務（具體工作名稱，如「財務出納」）
      position,   // 職位（標準職位，如「會計」）
      level,
      grade,
      role = 'employee',  // 角色：manager(主管) 或 employee(員工)，預設為員工
      manager_id,
      hire_date,
      probation_months = 3,
      contract_type = 'full-time',
      work_location
    } = req.body;

    // 驗證必填欄位
    if (!candidate_id || !department || !position || !hire_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: candidate_id, department, position, hire_date' 
      });
    }

    // 檢查候選人是否存在且狀態正確
    const candidate = prepare(`
      SELECT * FROM candidates WHERE id = ?
    `).get(candidate_id);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (candidate.status !== 'offer_accepted') {
      return res.status(400).json({ 
        error: `Invalid candidate status: ${candidate.status}. Expected: offer_accepted` 
      });
    }

    // 檢查是否已經轉換過
    const existingEmployee = prepare(`
      SELECT id FROM employees WHERE candidate_id = ?
    `).get(candidate_id);

    if (existingEmployee) {
      return res.status(400).json({ 
        error: 'Candidate has already been converted to employee',
        employee_id: existingEmployee.id
      });
    }

    // 產生員工編號
    const employee_no = generateEmployeeNo();
    const employee_id = uuidv4();
    const probation_end_date = calculateProbationEndDate(hire_date, probation_months);
    const now = new Date().toISOString();

    // 建立員工記錄
    prepare(`
      INSERT INTO employees (
        id, employee_no, name, email, phone, avatar,
        department, job_title, position, level, grade, role, manager_id,
        hire_date, contract_type, work_location, status,
        candidate_id, probation_end_date, probation_months,
        onboarding_status, converted_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'probation', ?, ?, ?, 'pending', ?, ?)
    `).run(
      employee_id,
      employee_no,
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.avatar,
      department,
      job_title || position,  // 職務：如果沒有提供，使用職位名稱
      position,               // 職位（標準職位）
      level || null,
      grade || null,
      role,  // 角色：manager 或 employee
      manager_id || null,
      hire_date,
      contract_type,
      work_location || null,
      candidate_id,
      probation_end_date,
      probation_months,
      now,
      now
    );

    // 複製候選人學歷到員工學歷
    const candidateEducation = prepare(`
      SELECT * FROM candidate_education WHERE candidate_id = ?
    `).all(candidate_id);

    for (const edu of candidateEducation) {
      prepare(`
        INSERT INTO employee_education (id, employee_id, degree, school, major, graduation_year)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        employee_id,
        edu.degree_level || edu.degree || '',
        edu.school_name || edu.school || '',
        edu.major || '',
        edu.end_date ? new Date(edu.end_date).getFullYear() : null
      );
    }

    // 複製候選人技能到員工技能
    const candidateSkills = prepare(`
      SELECT * FROM candidate_specialities WHERE candidate_id = ?
    `).all(candidate_id);

    for (const skill of candidateSkills) {
      prepare(`
        INSERT INTO employee_skills (id, employee_id, skill_name)
        VALUES (?, ?, ?)
      `).run(uuidv4(), employee_id, skill.skill || skill.skill_name || '');
    }

    // 更新候選人狀態
    prepare(`
      UPDATE candidates SET status = 'onboarded', updated_at = ? WHERE id = ?
    `).run(now, candidate_id);

    // 為所有公開且必填的模板建立 submissions 記錄
    const templates = prepare(`
      SELECT id, name FROM templates
      WHERE is_public = 1 AND is_active = 1 AND is_required = 1
    `).all();

    const onboardingLinks = [];
    for (const template of templates) {
      const token = generateToken();
      const submission_id = uuidv4();
      
      prepare(`
        INSERT INTO submissions (id, template_id, employee_id, token, employee_name, employee_email, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'DRAFT', ?)
      `).run(
        submission_id,
        template.id,
        employee_id,
        token,
        candidate.name,
        candidate.email,
        now
      );

      onboardingLinks.push({
        template_id: template.id,
        template_name: template.name,
        token: token,
        url: `/employee/onboarding/sign/${token}`
      });
    }

    // 記錄職務異動（入職）
    prepare(`
      INSERT INTO employee_job_changes (
        id, employee_id, effective_date, change_type,
        to_position, to_department, reason, created_at
      ) VALUES (?, ?, ?, 'hire', ?, ?, '新進人員入職', ?)
    `).run(
      uuidv4(),
      employee_id,
      hire_date,
      position,
      department,
      now
    );

    res.status(201).json({
      success: true,
      data: {
        employee_id,
        employee_no,
        name: candidate.name,
        email: candidate.email,
        department,
        position,
        hire_date,
        probation_end_date,
        onboarding_status: 'pending',
        onboarding_links: onboardingLinks
      }
    });
  } catch (error) {
    console.error('Error converting candidate:', error);
    res.status(500).json({ error: 'Failed to convert candidate to employee' });
  }
});

/**
 * GET /api/hr/onboarding/in-progress
 * 取得入職中員工列表（onboarding_status != 'completed'）
 */
router.get('/in-progress', (req, res) => {
  try {
    const employees = prepare(`
      SELECT 
        e.id,
        e.employee_no,
        e.name,
        e.email,
        e.phone,
        e.avatar,
        e.department,
        e.position,
        e.hire_date,
        e.probation_end_date,
        e.probation_months,
        e.onboarding_status,
        e.converted_at,
        e.candidate_id
      FROM employees e
      WHERE e.onboarding_status != 'completed' 
        AND e.onboarding_status IS NOT NULL
        AND e.status = 'probation'
      ORDER BY e.converted_at DESC
    `).all();

    // 取得每個員工的入職進度
    const result = employees.map(emp => {
      // 模板簽署進度
      const templateProgress = prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'SIGNED' OR status = 'COMPLETED' THEN 1 ELSE 0 END) as signed,
          SUM(CASE WHEN approval_status = 'APPROVED' THEN 1 ELSE 0 END) as approved
        FROM submissions
        WHERE employee_id = ?
      `).get(emp.id);

      // 文件上傳進度（固定5種必填類型）
      const docProgress = prepare(`
        SELECT 
          COUNT(DISTINCT type) as uploaded
        FROM employee_documents
        WHERE employee_id = ? AND type != 'other'
      `).get(emp.id);

      const templateTotal = templateProgress?.total || 0;
      const templateSigned = templateProgress?.signed || 0;
      const templateApproved = templateProgress?.approved || 0;
      const docTotal = 5; // 固定5種必填文件
      const docUploaded = docProgress?.uploaded || 0;

      // 計算總進度
      const totalItems = templateTotal + docTotal;
      const completedItems = templateApproved + docUploaded;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        ...emp,
        progress: {
          overall: progress,
          templates: {
            total: templateTotal,
            signed: templateSigned,
            approved: templateApproved
          },
          documents: {
            total: docTotal,
            uploaded: docUploaded
          }
        }
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching in-progress employees:', error);
    res.status(500).json({ error: 'Failed to fetch in-progress employees' });
  }
});

/**
 * GET /api/hr/onboarding/progress/:employeeId
 * 取得單一員工的入職進度詳情
 */
router.get('/progress/:employeeId', (req, res) => {
  try {
    const { employeeId } = req.params;

    // 取得員工資料
    const employee = prepare(`
      SELECT 
        e.id,
        e.employee_no,
        e.name,
        e.email,
        e.department,
        e.position,
        e.hire_date,
        e.probation_end_date,
        e.onboarding_status,
        e.candidate_id
      FROM employees e
      WHERE e.id = ?
    `).get(employeeId);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // 取得模板簽署狀態
    const submissions = prepare(`
      SELECT 
        s.id,
        s.template_id,
        t.name as template_name,
        t.is_required,
        s.token,
        s.status,
        s.approval_status,
        s.signed_at,
        s.approved_at
      FROM submissions s
      JOIN templates t ON s.template_id = t.id
      WHERE s.employee_id = ?
      ORDER BY t.is_required DESC, s.created_at ASC
    `).all(employeeId);

    // 取得文件上傳狀態
    const documents = prepare(`
      SELECT 
        id,
        type,
        label,
        file_name,
        status,
        uploaded_at
      FROM employee_documents
      WHERE employee_id = ?
      ORDER BY type, uploaded_at DESC
    `).all(employeeId);

    // 固定文件類型
    const requiredDocTypes = [
      { type: 'id_card', label: '身分證件' },
      { type: 'bank_account', label: '銀行帳戶' },
      { type: 'health_report', label: '體檢報告' },
      { type: 'photo', label: '大頭照' },
      { type: 'education_cert', label: '學經歷證明' }
    ];

    // 建立文件狀態對照
    const docMap = new Map();
    documents.forEach(doc => {
      if (!docMap.has(doc.type) || doc.type === 'other') {
        if (doc.type === 'other') {
          if (!docMap.has('other')) docMap.set('other', []);
          docMap.get('other').push(doc);
        } else {
          docMap.set(doc.type, doc);
        }
      }
    });

    const documentStatus = requiredDocTypes.map(dt => {
      const uploaded = docMap.get(dt.type);
      return {
        type: dt.type,
        label: dt.label,
        required: true,
        status: uploaded ? uploaded.status : 'not_uploaded',
        file_name: uploaded?.file_name,
        uploaded_at: uploaded?.uploaded_at
      };
    });

    // 其他文件
    const otherDocs = docMap.get('other') || [];

    // 計算進度
    const templateTotal = submissions.length;
    const templateSigned = submissions.filter(s => s.status === 'SIGNED' || s.status === 'COMPLETED').length;
    const templateApproved = submissions.filter(s => s.approval_status === 'APPROVED').length;
    const docUploaded = documentStatus.filter(d => d.status !== 'not_uploaded').length;
    const docTotal = requiredDocTypes.length;

    const totalItems = templateTotal + docTotal;
    const completedItems = templateApproved + docUploaded;
    const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // 更新 onboarding_status
    let newStatus = employee.onboarding_status;
    if (overallProgress >= 100) {
      newStatus = 'completed';
    } else if (overallProgress > 0) {
      newStatus = 'in_progress';
    }

    if (newStatus !== employee.onboarding_status) {
      prepare(`UPDATE employees SET onboarding_status = ? WHERE id = ?`).run(newStatus, employeeId);
    }

    res.json({
      employee: {
        ...employee,
        onboarding_status: newStatus
      },
      progress: {
        overall: overallProgress,
        templates: {
          total: templateTotal,
          signed: templateSigned,
          approved: templateApproved,
          items: submissions.map(s => ({
            template_id: s.template_id,
            template_name: s.template_name,
            is_required: !!s.is_required,
            token: s.token,
            status: s.status,
            approval_status: s.approval_status,
            signed_at: s.signed_at,
            approved_at: s.approved_at,
            url: `/employee/onboarding/sign/${s.token}`
          }))
        },
        documents: {
          total: docTotal,
          uploaded: docUploaded,
          items: documentStatus,
          other: otherDocs
        }
      }
    });
  } catch (error) {
    console.error('Error fetching employee progress:', error);
    res.status(500).json({ error: 'Failed to fetch employee progress' });
  }
});

/**
 * GET /api/hr/onboarding/next-employee-no
 * 預覽下一個員工編號
 */
router.get('/next-employee-no', (req, res) => {
  try {
    const employeeNo = generateEmployeeNo();
    res.json({ employee_no: employeeNo });
  } catch (error) {
    console.error('Error generating employee no:', error);
    res.status(500).json({ error: 'Failed to generate employee number' });
  }
});

/**
 * GET /api/hr/onboarding/departments
 * 取得部門列表（用於下拉選單）
 */
router.get('/departments', (req, res) => {
  try {
    // 優先從 departments 資料表取得
    const deptFromTable = prepare(`
      SELECT id, name, code, sort_order FROM departments
      ORDER BY sort_order
    `).all();

    if (deptFromTable.length > 0) {
      res.json(deptFromTable);
    } else {
      // 向後相容：從員工資料取得
      const departments = prepare(`
        SELECT DISTINCT department FROM employees
        WHERE department IS NOT NULL AND department != ''
        ORDER BY department
      `).all();
      
      res.json(departments.map(d => ({ name: d.department })));
    }
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

/**
 * GET /api/hr/onboarding/grades
 * 取得職等列表
 */
router.get('/grades', (req, res) => {
  try {
    const grades = prepare(`
      SELECT 
        id,
        grade,
        code_range,
        title_management,
        title_professional,
        education_requirement,
        responsibility_description
      FROM grade_levels
      ORDER BY grade
    `).all();
    
    res.json(grades);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

/**
 * GET /api/hr/onboarding/salary-levels
 * 取得職級薪資列表
 */
router.get('/salary-levels', (req, res) => {
  try {
    const { grade } = req.query;
    
    let query = `
      SELECT 
        gsl.id,
        gsl.grade,
        gsl.code,
        gsl.salary,
        gsl.sort_order,
        gl.title_management,
        gl.title_professional
      FROM grade_salary_levels gsl
      JOIN grade_levels gl ON gsl.grade = gl.grade
    `;
    
    if (grade) {
      query += ` WHERE gsl.grade = ? ORDER BY gsl.sort_order`;
      const levels = prepare(query).all(parseInt(grade));
      res.json(levels);
    } else {
      query += ` ORDER BY gsl.grade, gsl.sort_order`;
      const levels = prepare(query).all();
      res.json(levels);
    }
  } catch (error) {
    console.error('Error fetching salary levels:', error);
    res.status(500).json({ error: 'Failed to fetch salary levels' });
  }
});

/**
 * GET /api/hr/onboarding/positions
 * 取得職位列表（可依部門/職等篩選）
 */
router.get('/positions', (req, res) => {
  try {
    const { department, grade, track } = req.query;
    
    let query = `
      SELECT 
        dp.id,
        dp.department,
        dp.grade,
        dp.title,
        dp.track,
        gl.title_management as grade_title_management,
        gl.title_professional as grade_title_professional
      FROM department_positions dp
      JOIN grade_levels gl ON dp.grade = gl.grade
      WHERE 1=1
    `;
    const params = [];
    
    if (department) {
      query += ` AND dp.department = ?`;
      params.push(department);
    }
    
    if (grade) {
      query += ` AND dp.grade = ?`;
      params.push(parseInt(grade));
    }
    
    if (track) {
      query += ` AND (dp.track = ? OR dp.track = 'both')`;
      params.push(track);
    }
    
    query += ` ORDER BY dp.grade DESC, dp.department, dp.track`;
    
    const positions = prepare(query).all(...params);
    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

/**
 * GET /api/hr/onboarding/managers
 * 取得可選主管列表
 */
router.get('/managers', (req, res) => {
  try {
    const managers = prepare(`
      SELECT id, name, department, position
      FROM employees
      WHERE status IN ('active', 'probation')
        AND (role = 'manager' OR position LIKE '%主管%' OR position LIKE '%經理%' OR position LIKE '%總監%')
      ORDER BY department, name
    `).all();
    
    res.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ error: 'Failed to fetch managers' });
  }
});

module.exports = router;
