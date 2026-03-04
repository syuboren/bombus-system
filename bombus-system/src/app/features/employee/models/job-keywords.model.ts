/**
 * 職缺關鍵字管理模型
 * 用於定義面試評估維度、關鍵字庫與評估範本
 */

// ============================================================
// 評估維度 (Evaluation Dimensions)
// ============================================================

/**
 * 評估維度
 * 定義面試中需要評估的能力維度（如技術能力、溝通表達、文化適配等）
 */
export interface EvaluationDimension {
    id: string;
    name: string;           // 維度名稱，如「技術能力」、「溝通表達」
    weight: number;         // 權重 0-100 (百分比)
    description?: string;   // 維度說明
    order?: number;         // 排序順序
}

// ============================================================
// 關鍵字配置 (Keyword Configuration)
// ============================================================

/**
 * 關鍵字配置
 * 定義面試中需要偵測的關鍵字及其評分權重
 */
export interface KeywordConfig {
    id: string;
    jobId: string;                        // 關聯職缺 ID
    dimensionId: string;                  // 關聯評估維度 ID
    keyword: string;                      // 關鍵字內容
    type: 'positive' | 'negative';        // 類型：正向(加分) / 負向(扣分)
    weight: number;                       // 權重加成 1-10
    synonyms?: string[];                  // 同義詞列表
    createdAt: string;
    updatedAt?: string;
}

/**
 * 關鍵字匹配結果
 * 面試分析時記錄匹配到的關鍵字
 */
export interface KeywordMatch {
    keywordId: string;
    keyword: string;
    type: 'positive' | 'negative';
    dimensionId: string;
    dimensionName: string;
    weight: number;
    matchCount: number;     // 匹配次數
    contexts: string[];     // 匹配的上下文片段
}

// ============================================================
// 評估範本 (Evaluation Templates)
// ============================================================

/**
 * 評估範本
 * 可儲存常用的評估配置，方便快速套用到不同職缺
 */
export interface EvaluationTemplate {
    id: string;
    name: string;           // 範本名稱
    description?: string;   // 範本說明
    dimensions: EvaluationDimension[];
    keywords: Omit<KeywordConfig, 'jobId'>[];  // 範本中的關鍵字不綁定職缺
    source: 'manual' | 'imported';             // 來源：手動建立 / 匯入
    sourceEmployeeId?: string;                 // 若為匯入，記錄來源員工 ID
    sourceEmployeeName?: string;               // 來源員工姓名
    createdAt: string;
    updatedAt?: string;
}

// ============================================================
// 職缺關鍵字完整配置 (Job Keywords Config)
// ============================================================

/**
 * 職缺關鍵字完整配置
 * 整合特定職缺的所有評估維度與關鍵字設定
 */
export interface JobKeywordsConfig {
    jobId: string;
    jobTitle?: string;      // 職缺名稱（展示用）
    dimensions: EvaluationDimension[];
    keywords: KeywordConfig[];
    templateId?: string;    // 使用的範本 ID
    templateName?: string;  // 範本名稱
    updatedAt: string;
    updatedBy?: string;     // 更新者
}

// ============================================================
// 預設維度 (Default Dimensions)
// ============================================================

/**
 * 預設評估維度列表
 * 系統內建的通用評估維度
 */
export const DEFAULT_DIMENSIONS: EvaluationDimension[] = [
    { id: 'dim-1', name: '專業能力', weight: 25, description: '專業知識與技術能力表現', order: 1 },
    { id: 'dim-2', name: '溝通表達', weight: 20, description: '口語表達與邏輯清晰度', order: 2 },
    { id: 'dim-3', name: '團隊合作', weight: 15, description: '團隊協作與人際互動能力', order: 3 },
    { id: 'dim-4', name: '邏輯思考', weight: 20, description: '問題分析與解決能力', order: 4 },
    { id: 'dim-5', name: '學習潛力', weight: 10, description: '學習意願與成長潛力', order: 5 },
    { id: 'dim-6', name: '文化適配', weight: 10, description: '與公司文化價值觀的契合度', order: 6 }
];

/**
 * 預設正向關鍵字
 * 常見的面試正向表現關鍵字
 */
export const DEFAULT_POSITIVE_KEYWORDS: string[] = [
    // 專業能力
    '專案經驗', '技術', '系統', '架構', '優化', '效能',
    // 溝通表達
    '團隊', '合作', '溝通', '協調', '跨部門',
    // 主動積極
    '主動', '學習', '成長', '挑戰', '創新', '改善',
    // 成就導向
    '達成', '完成', '提升', '成功', '貢獻'
];

/**
 * 預設負向關鍵字
 * 常見的面試負面表現關鍵字
 */
export const DEFAULT_NEGATIVE_KEYWORDS: string[] = [
    '不知道', '不確定', '沒有經驗', '不會',
    '離職', '衝突', '困難', '失敗',
    '薪水', '休假', '加班'
];

// ============================================================
// 表單 DTO (Data Transfer Objects)
// ============================================================

/**
 * 新增/編輯關鍵字表單
 */
export interface KeywordFormData {
    keyword: string;
    dimensionId: string;
    type: 'positive' | 'negative';
    weight: number;
    synonyms?: string;  // 以逗號分隔的同義詞字串
}

/**
 * 批量新增關鍵字表單
 */
export interface BatchKeywordFormData {
    keywords: string;   // 以換行分隔的關鍵字
    dimensionId: string;
    type: 'positive' | 'negative';
    defaultWeight: number;
}
