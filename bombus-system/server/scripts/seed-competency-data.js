/**
 * 種子資料腳本 - 職能評估系統
 * 為現有員工建立月度檢核、季度面談、週報測試資料
 * 
 * 執行方式: node scripts/seed-competency-data.js
 */

const { v4: uuidv4 } = require('uuid');

// 載入資料庫 (使用與後端相同的模組)
const { initDatabase, prepare, saveDatabase } = require('../src/db');

// =====================================================
// 週報範本資料 (依據 PDF 範本)
// =====================================================

// 例行工作範本
const routineWorkTemplates = {
  '專案部': [
    { content: '專案進度追蹤與更新', estimatedTime: 60, actualTime: 55 },
    { content: '參與每日站立會議', estimatedTime: 30, actualTime: 30 },
    { content: '回覆客戶問題與需求確認', estimatedTime: 45, actualTime: 50 },
    { content: '專案文件維護與整理', estimatedTime: 30, actualTime: 25 },
    { content: '進度報告撰寫', estimatedTime: 40, actualTime: 45 }
  ],
  '行政部': [
    { content: '每日行政文件處理', estimatedTime: 60, actualTime: 65 },
    { content: '會議室預約與管理', estimatedTime: 20, actualTime: 15 },
    { content: '辦公用品盤點與申購', estimatedTime: 30, actualTime: 35 },
    { content: '訪客接待與登記', estimatedTime: 40, actualTime: 45 },
    { content: '公文收發與歸檔', estimatedTime: 45, actualTime: 40 }
  ],
  '人力資源部': [
    { content: '員工出勤紀錄核對', estimatedTime: 45, actualTime: 50 },
    { content: '人事資料維護更新', estimatedTime: 30, actualTime: 30 },
    { content: '招募面試安排', estimatedTime: 60, actualTime: 55 },
    { content: '教育訓練追蹤', estimatedTime: 40, actualTime: 45 },
    { content: '員工福利事務處理', estimatedTime: 35, actualTime: 30 }
  ],
  '業務部': [
    { content: '客戶聯繫與拜訪', estimatedTime: 90, actualTime: 100 },
    { content: '銷售報表更新', estimatedTime: 30, actualTime: 35 },
    { content: '報價單製作', estimatedTime: 45, actualTime: 40 },
    { content: '訂單處理與追蹤', estimatedTime: 60, actualTime: 65 },
    { content: '市場情報收集', estimatedTime: 30, actualTime: 25 }
  ],
  '研發部': [
    { content: '程式碼開發與維護', estimatedTime: 180, actualTime: 200 },
    { content: 'Code Review', estimatedTime: 45, actualTime: 50 },
    { content: '技術文件更新', estimatedTime: 30, actualTime: 25 },
    { content: 'Bug 修復與測試', estimatedTime: 60, actualTime: 70 },
    { content: '每日 Standup 會議', estimatedTime: 15, actualTime: 15 }
  ],
  '財務部': [
    { content: '日常帳務處理', estimatedTime: 120, actualTime: 130 },
    { content: '發票開立與管理', estimatedTime: 45, actualTime: 40 },
    { content: '銀行往來核對', estimatedTime: 30, actualTime: 35 },
    { content: '費用報銷審核', estimatedTime: 40, actualTime: 45 },
    { content: '財務報表編製', estimatedTime: 60, actualTime: 55 }
  ]
};

// 非例行工作範本
const nonRoutineWorkTemplates = {
  '專案部': [
    { content: 'SYC1300162 啟動會議紀錄撰寫', estimatedTime: 60, actualTime: 55 },
    { content: '新專案需求分析文件', estimatedTime: 90, actualTime: 100 },
    { content: '12079 驗收文件追蹤聯繫', estimatedTime: 45, actualTime: 40 },
    { content: '專案結案報告整理', estimatedTime: 60, actualTime: 65 }
  ],
  '行政部': [
    { content: '年度辦公設備盤點', estimatedTime: 120, actualTime: 130 },
    { content: '公司活動籌備規劃', estimatedTime: 90, actualTime: 85 },
    { content: '廠商合約審核', estimatedTime: 60, actualTime: 55 }
  ],
  '人力資源部': [
    { content: '年度教育訓練計畫擬定', estimatedTime: 120, actualTime: 110 },
    { content: '績效考核系統優化', estimatedTime: 90, actualTime: 100 },
    { content: '新進員工引導手冊更新', estimatedTime: 60, actualTime: 65 }
  ],
  '業務部': [
    { content: '客戶滿意度調查分析', estimatedTime: 90, actualTime: 95 },
    { content: '新產品報價策略擬定', estimatedTime: 60, actualTime: 55 },
    { content: '年度業績目標檢討', estimatedTime: 45, actualTime: 50 }
  ],
  '研發部': [
    { content: '新功能 API 設計文件', estimatedTime: 120, actualTime: 130 },
    { content: '系統架構優化評估', estimatedTime: 90, actualTime: 85 },
    { content: '第三方套件升級測試', estimatedTime: 60, actualTime: 70 }
  ],
  '財務部': [
    { content: '年度預算編列', estimatedTime: 180, actualTime: 200 },
    { content: '稅務申報準備', estimatedTime: 120, actualTime: 110 },
    { content: 'ERP 系統資料轉換', estimatedTime: 90, actualTime: 100 }
  ]
};

// 代辦事項範本
const todoTemplates = [
  { task: 'CISCO 序號紀錄', priority: 'normal', status: 'not_started' },
  { task: '安華發票請款單', priority: 'normal', status: 'not_started' },
  { task: '倉庫流程完善、櫃位標籤製作', priority: 'high', status: 'not_started' },
  { task: '硬碟採購', priority: 'normal', status: 'not_started' },
  { task: 'CISCO 產地變更電傳單傳真', priority: 'high', status: 'not_started' },
  { task: '客戶回訪安排', priority: 'medium', status: 'in_progress' },
  { task: '專案文件歸檔', priority: 'normal', status: 'not_started' },
  { task: '週報系統功能測試', priority: 'high', status: 'in_progress' },
  { task: '教育訓練報名', priority: 'medium', status: 'completed' },
  { task: '年度計畫草案', priority: 'high', status: 'not_started' }
];

// 問題與解決方案範本
const problemTemplates = [
  { problem: '專案品名命名進度落後', solution: '每週固定時段須告知該時段「請勿打擾」', resolved: true },
  { problem: '跨部門溝通效率低', solution: '建立定期協調會議機制', resolved: false },
  { problem: '系統回應速度慢', solution: '已提報 IT 部門進行效能優化', resolved: true },
  { problem: '文件版本管理混亂', solution: '導入版本控制工具，統一命名規則', resolved: true },
  { problem: '客戶需求變更頻繁', solution: '建立變更管理流程，定期確認需求', resolved: false }
];

// 教育訓練範本
const trainingTemplates = [
  { courseName: '專案管理報表一日訓', status: 'completed', totalHours: 6, completedHours: 6 },
  { courseName: '採購非學不可的財務分析', status: 'not_started', totalHours: 6, completedHours: 0 },
  { courseName: 'Excel 進階應用', status: 'in_progress', totalHours: 8, completedHours: 4 },
  { courseName: '職場溝通技巧', status: 'completed', totalHours: 4, completedHours: 4 },
  { courseName: '資訊安全基礎', status: 'in_progress', totalHours: 3, completedHours: 1.5 },
  { courseName: 'ISO 品質管理', status: 'not_started', totalHours: 8, completedHours: 0 }
];

// 階段性任務範本
const projectTemplates = [
  { task: 'ERP 專案 2016-2022', progressRate: 40, collaboration: '財務部', challenges: '已更新至 2018/6 月', expectedDate: '2024-03-31' },
  { task: 'F4C5 專案成本分析表', progressRate: 20, collaboration: '業務部協作', challenges: '收集廠商報價單', expectedDate: '2024-04-16' },
  { task: '客戶管理系統升級', progressRate: 65, collaboration: '研發部、業務部', challenges: '資料遷移測試中', expectedDate: '2024-05-01' },
  { task: '年度報告編製', progressRate: 30, collaboration: '各部門', challenges: '等待各部門資料', expectedDate: '2024-04-30' },
  { task: '內部流程優化', progressRate: 80, collaboration: '行政部', challenges: '文件審核中', expectedDate: '2024-03-20' }
];

// 工作總結範本
const summaryTemplates = [
  '本週主要完成了專案進度追蹤與客戶需求確認，並參與了跨部門的技術討論會議。在文件處理方面有效率地完成了所有例行工作，另外也開始著手準備下個階段的專案規劃。整體工作進度符合預期，將持續保持良好的工作節奏。',
  '這週的重點工作集中在系統測試與文件整理。成功完成了三項重要的驗收文件，並協助解決了客戶反映的問題。在團隊協作方面，與其他部門保持良好的溝通，確保專案順利推進。下週將繼續跟進待辦事項。',
  '本週工作順利完成，主要聚焦於日常運營維護與專案支援。參與了兩場重要會議，並提供了相關的資料分析報告。在問題處理方面，已與相關部門協調解決了流程上的瓶頸。整體來說，本週工作成效良好。',
  '完成了本週所有例行工作項目，並額外處理了臨時性的專案需求。在教育訓練方面，參加了專案管理課程並取得了預期的學習成果。下週將著重於階段性任務的推進，確保如期完成目標。',
  '本週主要工作包括客戶溝通、文件處理及內部協調。成功解決了一項長期存在的流程問題，獲得主管的肯定。在時間管理方面，合理分配了例行與非例行工作的時間，整體效率有所提升。'
];

async function main() {
  console.log('🌱 開始建立職能評估測試資料...\n');

  // 初始化資料庫
  await initDatabase();

  // 取得所有 active 員工
  const employeeList = prepare(`
    SELECT id, name, department, position, manager_id 
    FROM employees 
    WHERE status = 'active'
    LIMIT 20
  `).all();

  if (!employeeList || employeeList.length === 0) {
    console.log('❌ 沒有找到員工資料，請先執行 init.js');
    return;
  }

  console.log(`📋 找到 ${employeeList.length} 位員工\n`);

  const currentYear = 2026;
  const currentMonth = 2;
  const currentQuarter = 1;

  // =====================================================
  // 1. 建立月度檢核記錄
  // =====================================================
  console.log('📅 建立月度檢核記錄...');
  
  let monthlyCount = 0;
  for (const emp of employeeList) {
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      let year = currentYear;
      let month = currentMonth - monthOffset;
      if (month <= 0) {
        month += 12;
        year -= 1;
      }

      const existing = prepare(`
        SELECT id FROM monthly_checks WHERE employee_id = ? AND year = ? AND month = ?
      `).get(emp.id, year, month);
      
      if (existing) continue;

      const checkId = uuidv4();
      const status = monthOffset === 0 ? 'self_assessment' : 'completed';
      const totalScore = monthOffset === 0 ? null : (70 + Math.random() * 25).toFixed(1);
      
      prepare(`
        INSERT INTO monthly_checks (
          id, employee_id, year, month, status, total_score,
          manager_id, self_assessment_date, manager_review_date, hr_review_date,
          manager_comment, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        checkId,
        emp.id,
        year,
        month,
        status,
        totalScore,
        emp.manager_id,
        status !== 'self_assessment' ? `${year}-${String(month).padStart(2, '0')}-05` : null,
        status === 'completed' ? `${year}-${String(month).padStart(2, '0')}-10` : null,
        status === 'completed' ? `${year}-${String(month).padStart(2, '0')}-15` : null,
        status === 'completed' ? '本月表現良好，持續保持！' : null
      );

      const templates = prepare(`
        SELECT id, name, points, description, measurement
        FROM monthly_check_templates
        WHERE department = ? AND position = ? AND is_active = 1
        ORDER BY order_num
      `).all(emp.department, emp.position);

      if (templates && templates.length > 0) {
        templates.forEach((tpl, idx) => {
          const selfScore = status === 'self_assessment' ? null : Math.floor(3 + Math.random() * 2);
          const managerScore = status === 'completed' ? Math.floor(3 + Math.random() * 2) : null;
          
          prepare(`
            INSERT INTO monthly_check_items (
              id, monthly_check_id, template_id, name, points,
              description, measurement, self_score, manager_score, order_num
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(),
            checkId,
            tpl.id,
            tpl.name,
            tpl.points,
            tpl.description,
            tpl.measurement,
            selfScore,
            managerScore,
            idx + 1
          );
        });
      }

      monthlyCount++;
    }
  }
  console.log(`   ✅ 已建立 ${monthlyCount} 筆月度檢核記錄\n`);

  // =====================================================
  // 2. 建立季度面談記錄
  // =====================================================
  console.log('🗓️ 建立季度面談記錄...');
  
  let quarterlyCount = 0;
  for (const emp of employeeList) {
    const existing = prepare(`
      SELECT id FROM quarterly_reviews WHERE employee_id = ? AND year = ? AND quarter = ?
    `).get(emp.id, currentYear, currentQuarter);
    
    if (existing) continue;

    const reviewId = uuidv4();
    const status = Math.random() > 0.5 ? 'completed' : 'manager_reviewed';
    const monthlyAvg = (75 + Math.random() * 20).toFixed(1);
    const totalScore = status === 'completed' ? (parseFloat(monthlyAvg) + Math.random() * 5).toFixed(1) : null;

    prepare(`
      INSERT INTO quarterly_reviews (
        id, employee_id, year, quarter, status, monthly_avg_score, total_score,
        manager_id, interview_date, interview_location,
        manager_comment, development_plan, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      reviewId,
      emp.id,
      currentYear,
      currentQuarter,
      status,
      monthlyAvg,
      totalScore,
      emp.manager_id,
      status === 'completed' ? `${currentYear}-03-20` : null,
      status === 'completed' ? '會議室 A' : null,
      status === 'completed' ? '本季度整體表現優秀，建議可以更主動參與專案討論。' : null,
      status === 'completed' ? '1. 加強跨部門溝通\n2. 參與技術分享會' : null
    );

    const sections = [
      { type: 'work_summary', content: '本季度主要完成了系統優化與新功能開發...' },
      { type: 'achievement', content: '成功交付三個專案，達成季度目標...' },
      { type: 'difficulty', content: '跨部門協調上遇到一些溝通障礙...' },
      { type: 'next_plan', content: '下季度將專注於效能優化與團隊協作...' }
    ];

    sections.forEach((section, idx) => {
      prepare(`
        INSERT INTO quarterly_review_sections (
          id, review_id, section_type, content, order_num
        ) VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), reviewId, section.type, section.content, idx + 1);
    });

    quarterlyCount++;
  }
  console.log(`   ✅ 已建立 ${quarterlyCount} 筆季度面談記錄\n`);

  // =====================================================
  // 3. 建立週報記錄 (完整版)
  // =====================================================
  console.log('📝 建立週報記錄 (完整版)...');
  
  // 先清除舊的週報資料
  console.log('   🗑️ 清除舊的週報資料...');
  prepare(`DELETE FROM weekly_project_items`).run();
  prepare(`DELETE FROM weekly_training_items`).run();
  prepare(`DELETE FROM weekly_problem_items`).run();
  prepare(`DELETE FROM weekly_todo_items`).run();
  prepare(`DELETE FROM weekly_report_items`).run();
  prepare(`DELETE FROM weekly_reports`).run();
  
  let weeklyCount = 0;
  // 取得當前週
  const today = new Date();
  const jan4Current = new Date(today.getFullYear(), 0, 4);
  const dayNumCurrent = jan4Current.getDay() || 7;
  jan4Current.setDate(jan4Current.getDate() + 4 - dayNumCurrent);
  const yearStartCurrent = new Date(jan4Current.getFullYear(), 0, 1);
  const currentWeek = Math.ceil((((today.getTime() - yearStartCurrent.getTime()) / 86400000) + 1) / 7);
  
  for (const emp of employeeList) {
    // 為每個員工建立最近 5 週的週報 (含當週)
    for (let weekOffset = 0; weekOffset < 5; weekOffset++) {
      const week = currentWeek - weekOffset; // 當週往前推
      if (week < 1) continue; // 跳過去年的週
      
      const reportId = uuidv4();
      // 當週為 not_started，上週為 submitted 或 draft，更早的為 approved/submitted
      let status;
      if (weekOffset === 0) {
        status = 'not_started'; // 當週尚未填寫
      } else if (weekOffset === 1) {
        status = Math.random() > 0.5 ? 'submitted' : 'draft'; // 上週可能已提交或草稿
      } else {
        status = Math.random() > 0.2 ? 'approved' : 'submitted'; // 更早的週大多已核准
      }
      
      // 計算週期
      const jan4 = new Date(currentYear, 0, 4);
      const dayOfWeek = jan4.getDay() || 7;
      const firstMonday = new Date(jan4);
      firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
      
      const weekStart = new Date(firstMonday);
      weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 4); // Friday

      // 計算總時數
      const dept = emp.department || '專案部';
      const routineWork = routineWorkTemplates[dept] || routineWorkTemplates['專案部'];
      const nonRoutineWork = nonRoutineWorkTemplates[dept] || nonRoutineWorkTemplates['專案部'];
      
      // 隨機選擇項目
      const selectedRoutine = routineWork.slice(0, 3 + Math.floor(Math.random() * 3));
      const selectedNonRoutine = nonRoutineWork.slice(0, Math.floor(Math.random() * 3));
      
      const routineTotalMinutes = selectedRoutine.reduce((sum, item) => sum + item.actualTime, 0);
      const nonRoutineTotalMinutes = selectedNonRoutine.reduce((sum, item) => sum + item.actualTime, 0);
      
      // 週報總結
      const summary = summaryTemplates[Math.floor(Math.random() * summaryTemplates.length)];

      // 插入週報主表
      prepare(`
        INSERT INTO weekly_reports (
          id, employee_id, year, week, week_start, week_end,
          status, submit_date, review_date, reviewer_id, reviewer_comment,
          next_week_plan, weekly_summary, routine_total_minutes, non_routine_total_minutes,
          employee_signature, employee_signature_date, manager_signature, manager_signature_date,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        reportId,
        emp.id,
        currentYear,
        week,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0],
        status,
        (status === 'submitted' || status === 'approved') ? weekEnd.toISOString().split('T')[0] : null,
        status === 'approved' ? weekEnd.toISOString().split('T')[0] : null,
        status === 'approved' ? emp.manager_id : null,
        status === 'approved' ? '週報內容完整，持續保持良好的工作表現！' : null,
        status !== 'not_started' ? '1. 繼續推進專案進度\n2. 準備下週會議報告\n3. 跟進客戶需求' : null,
        (status === 'submitted' || status === 'approved') ? summary : null,
        status !== 'not_started' ? routineTotalMinutes : 0,
        status !== 'not_started' ? nonRoutineTotalMinutes : 0,
        (status === 'submitted' || status === 'approved') ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' : null,
        (status === 'submitted' || status === 'approved') ? weekEnd.toISOString().split('T')[0] : null,
        status === 'approved' ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' : null,
        status === 'approved' ? weekEnd.toISOString().split('T')[0] : null
      );

      // 只有非 not_started 狀態的週報才有工作項目
      if (status !== 'not_started') {
        // 插入例行工作項目 (含時間)
        selectedRoutine.forEach((item, idx) => {
          const completedDate = new Date(weekStart);
          completedDate.setDate(completedDate.getDate() + Math.floor(Math.random() * 5));
          
          prepare(`
            INSERT INTO weekly_report_items (
              id, report_id, item_type, content, order_num, estimated_time, actual_time, completed_date
            ) VALUES (?, ?, 'routine', ?, ?, ?, ?, ?)
          `).run(
            uuidv4(), 
            reportId, 
            item.content, 
            idx + 1,
            item.estimatedTime,
            item.actualTime + Math.floor(Math.random() * 20) - 10,
            completedDate.toISOString().split('T')[0]
          );
        });

        // 插入非例行工作項目 (含時間)
        selectedNonRoutine.forEach((item, idx) => {
          const completedDate = new Date(weekStart);
          completedDate.setDate(completedDate.getDate() + Math.floor(Math.random() * 5));
          
          prepare(`
            INSERT INTO weekly_report_items (
              id, report_id, item_type, content, order_num, estimated_time, actual_time, completed_date
            ) VALUES (?, ?, 'non_routine', ?, ?, ?, ?, ?)
          `).run(
            uuidv4(), 
            reportId, 
            item.content, 
            idx + 1,
            item.estimatedTime,
            item.actualTime + Math.floor(Math.random() * 30) - 15,
            completedDate.toISOString().split('T')[0]
          );
        });

        // 插入代辦事項
        const selectedTodos = todoTemplates.slice(0, 2 + Math.floor(Math.random() * 4));
        selectedTodos.forEach((todo, idx) => {
          const startDate = new Date(weekEnd);
          startDate.setDate(startDate.getDate() + 1);
          const dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + 3 + Math.floor(Math.random() * 7));
          
          prepare(`
            INSERT INTO weekly_todo_items (
              id, report_id, order_num, task, start_date, due_date, priority, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(),
            reportId,
            idx + 1,
            todo.task,
            startDate.toISOString().split('T')[0],
            dueDate.toISOString().split('T')[0],
            todo.priority,
            todo.status
          );
        });

        // 插入問題與解決方案 (隨機)
        if (Math.random() > 0.4) {
          const selectedProblems = problemTemplates.slice(0, 1 + Math.floor(Math.random() * 2));
          selectedProblems.forEach((problem, idx) => {
            prepare(`
              INSERT INTO weekly_problem_items (
                id, report_id, order_num, problem, solution, resolved
              ) VALUES (?, ?, ?, ?, ?, ?)
            `).run(
              uuidv4(),
              reportId,
              idx + 1,
              problem.problem,
              problem.solution,
              problem.resolved ? 1 : 0
            );
          });
        }

        // 插入教育訓練進度 (隨機)
        if (Math.random() > 0.5) {
          const selectedTrainings = trainingTemplates.slice(0, 1 + Math.floor(Math.random() * 2));
          selectedTrainings.forEach((training, idx) => {
            const completedDate = training.status === 'completed' 
              ? new Date(weekStart.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              : null;
            
            prepare(`
              INSERT INTO weekly_training_items (
                id, report_id, order_num, course_name, status, total_hours, completed_hours, completed_date
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              uuidv4(),
              reportId,
              idx + 1,
              training.courseName,
              training.status,
              training.totalHours,
              training.completedHours,
              completedDate
            );
          });
        }

        // 插入階段性任務進度 (隨機)
        if (Math.random() > 0.3) {
          const selectedProjects = projectTemplates.slice(0, 1 + Math.floor(Math.random() * 2));
          selectedProjects.forEach((project, idx) => {
            const actualDate = project.progressRate === 100 
              ? project.expectedDate 
              : null;
            
            prepare(`
              INSERT INTO weekly_project_items (
                id, report_id, order_num, task, progress_rate, collaboration, challenges, expected_date, actual_date
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              uuidv4(),
              reportId,
              idx + 1,
              project.task,
              project.progressRate + Math.floor(Math.random() * 10) - 5,
              project.collaboration,
              project.challenges,
              project.expectedDate,
              actualDate
            );
          });
        }
      } // End of if (status !== 'not_started')

      weeklyCount++;
    }
  }
  console.log(`   ✅ 已建立 ${weeklyCount} 筆週報記錄\n`);

  // 儲存資料庫
  saveDatabase();

  console.log('✨ 職能評估測試資料建立完成！');
  console.log('');
  console.log('📊 統計：');
  console.log(`   - 月度檢核：${monthlyCount} 筆`);
  console.log(`   - 季度面談：${quarterlyCount} 筆`);
  console.log(`   - 週報記錄：${weeklyCount} 筆 (含完整項目資料)`);
}

main().catch(console.error);
