/**
 * AI 行銷決策儀表板 資料模型
 */

// 洞察優先級類型
export type InsightPriority = 'urgent' | 'warning' | 'success' | 'info';

// 洞察摘要統計
export interface InsightSummary {
  urgent: number;    // 緊急事項數量
  warning: number;   // 需關注事項數量
  success: number;   // 機會事項數量
  total: number;     // 總數
}

// 單一洞察項目
export interface InsightItem {
  id: string;
  title: string;
  description: string;
  priority: InsightPriority;
  reason?: string;           // 為什麼？展開後的說明
  actionLabel?: string;      // 建議行動標籤
  impact?: string;           // 影響說明
  metric?: {                 // 相關指標
    label: string;
    value: string | number;
    trend?: number;          // 趨勢變化（正負值）
  };
}

// 廣告洞察師資料
export interface AdsInsight {
  roas: number;              // 廣告投報率
  roasTrend: number;         // ROAS 趨勢變化
  totalSpend?: number;       // 總廣告支出
  conversionRate?: number;   // 轉換率
  insights: InsightItem[];   // 洞察項目列表
}

// 選品洞察師資料
export interface ProductInsight {
  topAttribute: string;      // 熱銷屬性（如：黑色/棉質）
  topCategory?: string;      // 熱銷類別
  inventoryHealth?: number;  // 庫存健康度 (0-100)
  insights: InsightItem[];   // 洞察項目列表
}

// 客戶類型
export interface CustomerSegment {
  id: string;
  name: string;              // 客戶類型名稱
  percentage: number;         // 客戶比例 (0-100)
  description: string;        // 描述
  revenueContribution?: number; // 營收貢獻比例 (0-100)
  color?: string;            // 顯示顏色
}

// 顧客洞察師資料
export interface CustomerInsight {
  retentionRate: number;     // 回購率
  retentionTrend?: number;   // 回購率趨勢
  avgOrderValue?: number;    // 平均客單價
  ltv?: number;              // 顧客終身價值
  segments?: CustomerSegment[]; // 客戶比例分析
  insights: InsightItem[];   // 洞察項目列表
}

// 交叉洞察項目
export interface CrossInsightItem {
  id: string;
  title: string;
  description: string;
  sources: ('ads' | 'product' | 'customer')[];  // 來源領域
  priority: InsightPriority;
  actionLabel?: string;
}

// 交叉分析資料
export interface CrossInsight {
  items: CrossInsightItem[];
  flowSteps?: {              // 流程圖步驟（可選）
    step: number;
    label: string;
    description: string;
  }[];
}

// AI 行銷決策儀表板主資料結構
export interface AiMarketingDashboard {
  lastUpdated: string;       // 最後更新時間 (ISO 格式)
  summary: InsightSummary;   // 摘要指標
  ads: AdsInsight;           // 廣告洞察
  products: ProductInsight;  // 選品洞察
  customers: CustomerInsight;// 顧客洞察
  crossInsights?: CrossInsight; // 交叉分析（可選）
}
