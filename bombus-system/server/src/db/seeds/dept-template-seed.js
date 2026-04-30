/**
 * 部門範本 seed 資料（Platform DB）
 *
 * 內含：
 * - 8 個跨產業共通部門範本（is_common=1），自動指派至全部 12 個產業
 * - 11 個產業各自 4 個專屬部門範本（"other" 不含專屬，僅使用共通池）
 *
 * 設計依據：openspec/changes/department-template-import/specs/department-template-import/spec.md
 *
 * 規模代碼：'micro' | 'small' | 'medium' | 'large'
 */

const { v4: uuidv4 } = require('uuid');

const ALL_SIZES = ['micro', 'small', 'medium', 'large'];

/** 共通池範本（is_common=1）— 每筆指派至全部 12 產業 */
const COMMON_TEMPLATES = [
  { name: '人資部', value: ['招募', '教育訓練', '員工關係', '薪酬福利'], sizes: ['small', 'medium', 'large'] },
  { name: '財務部', value: ['財務規劃', '會計處理', '稅務管理'], sizes: ['medium', 'large'] },
  { name: '資訊部', value: ['系統維運', '資安管理', '網路維護'], sizes: ['medium', 'large'] },
  { name: '行政管理部', value: ['行政庶務', '採購支援', '辦公室管理'], sizes: ALL_SIZES },
  { name: '法務部', value: ['法律諮詢', '合約審閱', '法規遵循'], sizes: ['large'] },
  { name: '行銷部', value: ['品牌推廣', '行銷企劃', '數位行銷'], sizes: ['small', 'medium', 'large'] },
  { name: '業務部', value: ['業務開發', '客戶關係維護', '銷售目標達成'], sizes: ALL_SIZES },
  { name: '採購部', value: ['供應商管理', '採購議價', '物料規劃'], sizes: ['medium', 'large'] }
];

/**
 * 各產業專屬範本（is_common=0）— 4 個 / 產業
 * 每個 industry_code 對應該產業專屬部門清單
 */
const INDUSTRY_SPECIFIC_TEMPLATES = {
  'it-services': [
    { name: '軟體開發部', value: ['應用程式開發', '系統設計', '程式碼維護'], sizes: ALL_SIZES },
    { name: '系統維運部', value: ['伺服器維運', '部署自動化', '監控告警'], sizes: ['small', 'medium', 'large'] },
    { name: '客戶支援部', value: ['客戶問題排除', '技術諮詢', '使用教學'], sizes: ALL_SIZES },
    { name: '產品管理部', value: ['產品規劃', '需求分析', '產品藍圖'], sizes: ['medium', 'large'] }
  ],
  'tech': [
    { name: '研發中心', value: ['核心技術研發', '專利規劃', '技術論文'], sizes: ['medium', 'large'] },
    { name: '產品設計部', value: ['UI/UX 設計', '使用者體驗研究', '原型製作'], sizes: ['small', 'medium', 'large'] },
    { name: '技術支援部', value: ['技術問題解決', 'B2B 支援', '系統整合協助'], sizes: ['small', 'medium', 'large'] },
    { name: '創新實驗室', value: ['前瞻技術探索', '概念驗證 (POC)', '創新提案'], sizes: ['large'] }
  ],
  'manufacturing': [
    { name: '製造部', value: ['生產製造', '產線管理', '生產效率優化'], sizes: ALL_SIZES },
    { name: '品保部', value: ['品質檢驗', '品質管理系統', '客訴處理'], sizes: ['small', 'medium', 'large'] },
    { name: '生產管理部 (PMC)', value: ['生產排程', '物料控制', '產能規劃'], sizes: ['medium', 'large'] },
    { name: '研發部', value: ['新產品開發', '製程改善', '材料研究'], sizes: ['large'] }
  ],
  'retail': [
    { name: '門市營運部', value: ['門市管理', '銷售達成', '陳列維護'], sizes: ALL_SIZES },
    { name: '商品企劃部', value: ['商品開發', '採購選品', '價格策略'], sizes: ['small', 'medium', 'large'] },
    { name: '倉儲物流部', value: ['倉儲管理', '配送調度', '存貨控制'], sizes: ['medium', 'large'] },
    { name: '視覺陳列部', value: ['店裝設計', '商品陳列', '櫥窗規劃'], sizes: ['medium', 'large'] }
  ],
  'food-service': [
    { name: '廚務部', value: ['菜單研發', '餐點製作', '備料管理'], sizes: ALL_SIZES },
    { name: '外場服務部', value: ['顧客接待', '點餐送餐', '用餐體驗'], sizes: ALL_SIZES },
    { name: '餐廳營運部', value: ['店務管理', '人員調度', '營收管理'], sizes: ['small', 'medium', 'large'] },
    { name: '食品安全部', value: ['食材檢驗', 'HACCP 管理', '衛生稽核'], sizes: ['medium', 'large'] }
  ],
  'healthcare': [
    { name: '醫療部', value: ['醫療診治', '臨床決策', '醫療品質'], sizes: ['small', 'medium', 'large'] },
    { name: '護理部', value: ['病患照護', '護理排班', '護理品質管理'], sizes: ALL_SIZES },
    { name: '醫務管理部', value: ['病歷管理', '醫療法規遵循', '健保申報'], sizes: ['medium', 'large'] },
    { name: '藥劑部', value: ['調劑作業', '藥品管理', '用藥諮詢'], sizes: ['medium', 'large'] }
  ],
  'finance': [
    { name: '風險管理部', value: ['風險辨識評估', '風險控管措施', '風險報告'], sizes: ['medium', 'large'] },
    { name: '法令遵循部', value: ['法規研析', '合規監控', '法令訓練'], sizes: ['medium', 'large'] },
    { name: '投資管理部', value: ['投資組合管理', '市場研究', '績效追蹤'], sizes: ['large'] },
    { name: '稽核部', value: ['內部稽核', '內控檢查', '稽核報告'], sizes: ['medium', 'large'] }
  ],
  'nonprofit': [
    { name: '募款發展部', value: ['捐款人經營', '募款活動規劃', '贊助提案'], sizes: ['small', 'medium', 'large'] },
    { name: '計畫執行部', value: ['專案規劃', '社會服務執行', '成效評估'], sizes: ALL_SIZES },
    { name: '志工管理部', value: ['志工招募訓練', '志工排班', '志工關懷'], sizes: ['small', 'medium', 'large'] },
    { name: '公共關係部', value: ['媒體關係', '形象傳播', '社群經營'], sizes: ['medium', 'large'] }
  ],
  'education': [
    { name: '教務部', value: ['課程規劃', '師資管理', '教學評鑑'], sizes: ALL_SIZES },
    { name: '學務部', value: ['學生輔導', '生活管理', '學生活動'], sizes: ['small', 'medium', 'large'] },
    { name: '教學發展部', value: ['教學品質提升', '教材研發', '教師培訓'], sizes: ['medium', 'large'] },
    { name: '招生中心', value: ['招生宣傳', '入學輔導', '學員諮詢'], sizes: ['small', 'medium', 'large'] }
  ],
  'construction': [
    { name: '工程部', value: ['工程施作', '工地管理', '進度控管'], sizes: ALL_SIZES },
    { name: '設計部', value: ['建築設計', '結構規劃', '圖面繪製'], sizes: ['small', 'medium', 'large'] },
    { name: '工務部', value: ['品質監造', '驗收管理', '工程協調'], sizes: ['medium', 'large'] },
    { name: '安全衛生部', value: ['工安管理', '勞安訓練', '災害預防'], sizes: ['medium', 'large'] }
  ],
  'logistics': [
    { name: '倉儲部', value: ['倉儲管理', '貨物進出庫', '庫存盤點'], sizes: ALL_SIZES },
    { name: '配送部', value: ['路線規劃', '配送執行', '到貨追蹤'], sizes: ALL_SIZES },
    { name: '車隊管理部', value: ['車輛調度', '駕駛管理', '車輛維護'], sizes: ['small', 'medium', 'large'] },
    { name: '報關部', value: ['報關文件', '進出口流程', '關務聯繫'], sizes: ['medium', 'large'] }
  ]
  // 'other' 不含專屬範本，僅使用共通池
};

/**
 * 在 platform.db 上 seed 部門範本與指派（冪等：以 name 唯一性檢查重複）
 * @param {import('sql.js').Database} db
 */
function seedDepartmentTemplates(db) {
  // 確認 industries 表已存在且已 seed
  const industriesResult = db.exec('SELECT code FROM industries');
  if (!industriesResult.length || !industriesResult[0].values.length) {
    console.warn('⚠️ seedDepartmentTemplates: industries 表為空，略過 seed');
    return;
  }
  const validIndustryCodes = new Set(industriesResult[0].values.map(r => r[0]));

  // 1. Seed 共通池範本 + 指派至全部 12 產業
  for (const tpl of COMMON_TEMPLATES) {
    const existing = db.exec('SELECT id FROM department_templates WHERE name = ? AND is_common = 1', [tpl.name]);
    let templateId;
    if (existing.length && existing[0].values.length) {
      templateId = existing[0].values[0][0];
    } else {
      templateId = uuidv4();
      db.run(
        'INSERT INTO department_templates (id, name, value, is_common) VALUES (?, ?, ?, 1)',
        [templateId, tpl.name, JSON.stringify(tpl.value)]
      );
    }
    // 指派至全部 12 產業
    for (const industryCode of validIndustryCodes) {
      const assignExisting = db.exec(
        'SELECT id FROM industry_dept_assignments WHERE industry_code = ? AND dept_template_id = ?',
        [industryCode, templateId]
      );
      if (!assignExisting.length || !assignExisting[0].values.length) {
        db.run(
          'INSERT INTO industry_dept_assignments (id, industry_code, dept_template_id, sizes_json, display_order) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), industryCode, templateId, JSON.stringify(tpl.sizes), 100]
        );
      }
    }
  }

  // 2. Seed 各產業專屬範本 + 指派至該產業
  let displayOrder = 10;
  for (const [industryCode, templates] of Object.entries(INDUSTRY_SPECIFIC_TEMPLATES)) {
    if (!validIndustryCodes.has(industryCode)) continue;
    let order = displayOrder;
    for (const tpl of templates) {
      const existing = db.exec(
        `SELECT t.id FROM department_templates t
         JOIN industry_dept_assignments a ON a.dept_template_id = t.id
         WHERE t.name = ? AND t.is_common = 0 AND a.industry_code = ?`,
        [tpl.name, industryCode]
      );
      let templateId;
      if (existing.length && existing[0].values.length) {
        templateId = existing[0].values[0][0];
      } else {
        templateId = uuidv4();
        db.run(
          'INSERT INTO department_templates (id, name, value, is_common) VALUES (?, ?, ?, 0)',
          [templateId, tpl.name, JSON.stringify(tpl.value)]
        );
        db.run(
          'INSERT INTO industry_dept_assignments (id, industry_code, dept_template_id, sizes_json, display_order) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), industryCode, templateId, JSON.stringify(tpl.sizes), order]
        );
      }
      order += 10;
    }
  }
}

module.exports = {
  seedDepartmentTemplates,
  COMMON_TEMPLATES,
  INDUSTRY_SPECIFIC_TEMPLATES,
  ALL_SIZES
};
