export interface ModuleChild {
  id: string;
  label: string;
}

export interface ModuleGroup {
  id: string;
  label: string;
  icon: string;
  children: ModuleChild[];
}

export const MODULE_REGISTRY: ModuleGroup[] = [
  {
    id: 'L1', label: '員工管理', icon: 'ri-team-line',
    children: [
      { id: 'L1.jobs', label: '招募職缺管理' },
      { id: 'L1.recruitment', label: 'AI智能面試' },
      { id: 'L1.decision', label: '面試決策' },
      { id: 'L1.talent-pool', label: '人才庫與再接觸管理' },
      { id: 'L1.profile', label: '員工檔案與歷程管理' },
      { id: 'L1.meeting', label: '會議管理' },
      { id: 'L1.onboarding', label: '入職管理' }
    ]
  },
  {
    id: 'L2', label: '職能管理', icon: 'ri-medal-line',
    children: [
      { id: 'L2.grade-matrix', label: '職等職級管理' },
      { id: 'L2.framework', label: '職能模型基準' },
      { id: 'L2.job-description', label: '職務說明書' },
      { id: 'L2.assessment', label: '職能評估系統' },
      { id: 'L2.gap-analysis', label: '職能落差分析' }
    ]
  },
  {
    id: 'L3', label: '教育訓練', icon: 'ri-book-open-line',
    children: [
      { id: 'L3.course-management', label: '課程與報名管理' },
      { id: 'L3.learning-map', label: '學習地圖' },
      { id: 'L3.effectiveness', label: '培訓成效追蹤' },
      { id: 'L3.competency-heatmap', label: '組織職能熱力圖' },
      { id: 'L3.nine-box', label: '人才九宮格' },
      { id: 'L3.learning-path', label: '學習發展路徑圖' },
      { id: 'L3.key-talent', label: '關鍵人才儀表板' }
    ]
  },
  {
    id: 'L4', label: '專案管理', icon: 'ri-folder-chart-line',
    children: [
      { id: 'L4.list', label: '專案列表' },
      { id: 'L4.profit-prediction', label: 'AI損益預測' },
      { id: 'L4.forecast', label: 'Forecast追蹤' },
      { id: 'L4.report', label: '專案報表' }
    ]
  },
  {
    id: 'L5', label: '績效管理', icon: 'ri-line-chart-line',
    children: [
      { id: 'L5.profit-dashboard', label: '毛利監控儀表板' },
      { id: 'L5.bonus-distribution', label: '獎金分配計算' },
      { id: 'L5.goal-task', label: '目標與任務管理' },
      { id: 'L5.profit-settings', label: '毛利計算參數設定' },
      { id: 'L5.review', label: '績效考核' },
      { id: 'L5.360-feedback', label: '360度回饋' }
    ]
  },
  {
    id: 'L6', label: '文化管理', icon: 'ri-heart-line',
    children: [
      { id: 'L6.handbook', label: '企業文化手冊' },
      { id: 'L6.eap', label: 'EAP員工協助' },
      { id: 'L6.awards', label: '獎項資料庫' },
      { id: 'L6.documents', label: '文件儲存庫' },
      { id: 'L6.ai-assistant', label: 'AI申請助理' },
      { id: 'L6.analysis', label: '智慧文件分析' },
      { id: 'L6.impact', label: '影響力評估' }
    ]
  },
  {
    id: 'SYS', label: '系統管理', icon: 'ri-settings-3-line',
    children: [
      { id: 'SYS.org-structure', label: '組織架構管理' },
      { id: 'SYS.user-management', label: '員工與帳號管理' },
      { id: 'SYS.role-management', label: '角色權限管理' },
      { id: 'SYS.audit', label: '審計日誌' }
    ]
  }
];

export const FEATURE_LABEL_MAP = new Map<string, string>();
for (const mod of MODULE_REGISTRY) {
  FEATURE_LABEL_MAP.set(mod.id, mod.label);
  for (const child of mod.children) {
    FEATURE_LABEL_MAP.set(child.id, child.label);
  }
}
