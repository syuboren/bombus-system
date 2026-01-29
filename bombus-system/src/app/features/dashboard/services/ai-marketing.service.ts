import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  AiMarketingDashboard,
  InsightSummary,
  AdsInsight,
  ProductInsight,
  CustomerInsight,
  CrossInsight
} from '../models/ai-marketing.model';

@Injectable({ providedIn: 'root' })
export class AiMarketingService {

  /**
   * 取得 AI 行銷決策儀表板完整資料
   */
  getAiMarketingData(): Observable<AiMarketingDashboard> {
    const data: AiMarketingDashboard = {
      lastUpdated: new Date().toISOString(),
      summary: this.getMockSummary(),
      ads: this.getMockAdsInsight(),
      products: this.getMockProductInsight(),
      customers: this.getMockCustomerInsight(),
      crossInsights: this.getMockCrossInsight()
    };
    return of(data).pipe(delay(300));
  }

  /**
   * 取得摘要指標
   */
  private getMockSummary(): InsightSummary {
    return {
      urgent: 2,
      warning: 3,
      success: 4,
      total: 9
    };
  }

  /**
   * 取得廣告洞察師資料
   */
  private getMockAdsInsight(): AdsInsight {
    return {
      roas: 2.8,
      roasTrend: -0.3,
      totalSpend: 125000,
      conversionRate: 3.2,
      insights: [
        {
          id: 'ads-1',
          title: 'Facebook 廣告 ROAS 下滑',
          description: '過去 7 天 ROAS 從 3.2 下降至 2.5，低於目標值',
          priority: 'urgent',
          reason: '主要原因：受眾疲勞導致點擊率下降 15%，建議更新素材或調整受眾定向。同時競品在同期加大投放力度，CPC 上升 8%。',
          actionLabel: '調降預算或暫停檢視',
          impact: '預估影響每日轉換 -12%',
          metric: {
            label: 'ROAS',
            value: 2.5,
            trend: -0.7
          }
        },
        {
          id: 'ads-2',
          title: 'Google 購物廣告表現優異',
          description: '轉換成本降低 18%，建議增加預算',
          priority: 'success',
          reason: '產品頁面優化後，品質分數提升至 9 分，廣告排名改善。建議將預算從 Facebook 調配至 Google 購物。',
          actionLabel: '評估是否加碼預算',
          impact: '預估可提升轉換 +25%',
          metric: {
            label: 'CPA',
            value: '$45',
            trend: -18
          }
        },
        {
          id: 'ads-3',
          title: 'Instagram 限動廣告曝光不足',
          description: '實際曝光僅達預期 60%',
          priority: 'warning',
          reason: '出價策略過於保守，錯失高峰時段流量。建議調整為「最大化觸及」策略並提高出價上限。',
          actionLabel: '維持現狀，觀察一週',
          metric: {
            label: '觸及率',
            value: '60%',
            trend: -15
          }
        }
      ]
    };
  }

  /**
   * 取得選品洞察師資料
   */
  private getMockProductInsight(): ProductInsight {
    return {
      topAttribute: '黑色 / 棉質',
      topCategory: '休閒上衣',
      inventoryHealth: 72,
      insights: [
        {
          id: 'prod-1',
          title: '暢銷款庫存即將售罄',
          description: 'SKU-2024春季黑T 庫存剩餘 15%，需盡快補貨',
          priority: 'urgent',
          reason: '該款式過去 30 天銷售速度較預期快 2.3 倍，目前庫存僅可支撐 5 天銷售。供應商交期需 10 天，建議立即下單並考慮空運。',
          actionLabel: '擴大開發同屬性商品',
          impact: '預估缺貨損失 $32,000'
        },
        {
          id: 'prod-2',
          title: '滯銷品佔用倉儲成本',
          description: '12 款商品超過 90 天未出貨',
          priority: 'warning',
          reason: '主要為去年冬季款式，建議進行清倉促銷或捆綁銷售，釋放倉儲空間約 200 坪。',
          actionLabel: '停止開發，現有庫存清倉',
          metric: {
            label: '佔用成本',
            value: '$8,500/月'
          }
        },
        {
          id: 'prod-3',
          title: '新品類表現超預期',
          description: '運動配件類首月銷售達目標 150%',
          priority: 'success',
          reason: '瑜珈墊、彈力帶等商品受健身風潮帶動，退貨率僅 2%（低於平均 8%）。建議擴充 SKU 並增加採購量。',
          actionLabel: '建議 擴大開發同屬性商品',
          metric: {
            label: '達成率',
            value: '150%',
            trend: 50
          }
        },
        {
          id: 'prod-4',
          title: '季節性商品需提前佈局',
          description: '夏季泳裝建議於 3 月中前完成採購',
          priority: 'warning',
          reason: '根據歷史數據，泳裝銷售高峰為 5-7 月，提前 6-8 週上架可獲得較好的廣告曝光與自然搜尋排名。',
          actionLabel: '減少開發比例'
        }
      ]
    };
  }

  /**
   * 取得顧客洞察師資料
   */
  private getMockCustomerInsight(): CustomerInsight {
    return {
      retentionRate: 0.35,
      retentionTrend: 0.02,
      avgOrderValue: 1280,
      ltv: 4500,
      segments: [
        {
          id: 'segment-1',
          name: '高價值鐵粉',
          percentage: 12,
          description: '用心維繫，貢獻 40% 營收',
          revenueContribution: 40,
          color: 'l1-sage'
        },
        {
          id: 'segment-2',
          name: '穩定回購客',
          percentage: 35,
          description: '定期提醒，維持關係',
          color: 'l3-petrol'
        },
        {
          id: 'segment-3',
          name: '折扣驅動客',
          percentage: 28,
          description: '大檔期再喚醒',
          color: 'l2-terracotta'
        },
        {
          id: 'segment-4',
          name: '一次客',
          percentage: 25,
          description: '14 天內推回購誘因',
          color: 'l4-mauve'
        }
      ],
      insights: [
        {
          id: 'cust-1',
          title: 'VIP 客戶流失預警',
          description: '8 位高價值客戶超過 60 天未回購',
          priority: 'urgent',
          reason: '這 8 位客戶過去年度貢獻營收約 $180,000，平均購買週期為 45 天。建議發送專屬優惠券或安排客服主動聯繫了解需求。',
          actionLabel: '安排喚醒活動或優惠',
          impact: '潛在流失營收 $45,000'
        },
        {
          id: 'cust-2',
          title: '新客首購轉換率提升',
          description: '本月新客首購率達 12%，較上月提升 3%',
          priority: 'success',
          reason: '新版 Landing Page 上線後，頁面停留時間增加 40%，跳出率降低 25%。建議持續 A/B 測試優化轉換流程。',
          actionLabel: '規劃首購後的回購誘因',
          metric: {
            label: '首購率',
            value: '12%',
            trend: 3
          }
        },
        {
          id: 'cust-3',
          title: '購物車放棄率偏高',
          description: '結帳流程放棄率達 68%',
          priority: 'warning',
          reason: '分析顯示主要斷點在「運費計算」階段（佔 45%），建議提供滿額免運或顯示預估運費。另有 30% 用戶在「會員登入」階段離開，可考慮提供訪客結帳選項。',
          actionLabel: '維持現狀，觀察一週',
          metric: {
            label: '放棄率',
            value: '68%',
            trend: 5
          }
        },
        {
          id: 'cust-4',
          title: '會員升級潛力名單',
          description: '156 位銀卡會員接近金卡門檻',
          priority: 'success',
          reason: '這些會員平均再消費 $800 即可升級，建議發送升級提醒與專屬優惠，刺激回購意願。',
          actionLabel: '發送生日祝福或專屬優惠',
          metric: {
            label: '潛力會員',
            value: 156
          }
        }
      ]
    };
  }

  /**
   * 取得交叉洞察資料
   */
  private getMockCrossInsight(): CrossInsight {
    return {
      items: [
        {
          id: 'cross-1',
          title: '廣告受眾與暢銷品錯位',
          description: '25-34 歲女性為主要購買族群，但廣告投放偏重 18-24 歲',
          sources: ['ads', 'customer'],
          priority: 'warning',
          actionLabel: '調整受眾'
        },
        {
          id: 'cross-2',
          title: '高回購品項可作為引流商品',
          description: '棉質 T-shirt 回購率達 45%，可設為廣告主打品',
          sources: ['product', 'customer', 'ads'],
          priority: 'success',
          actionLabel: '設定引流品'
        },
        {
          id: 'cross-3',
          title: 'VIP 客戶偏好與庫存缺口',
          description: 'VIP 偏好的 3 款商品庫存不足，可能影響回購',
          sources: ['customer', 'product'],
          priority: 'urgent',
          actionLabel: '優先補貨'
        }
      ],
      flowSteps: [
        {
          step: 1,
          label: '廣告觸及',
          description: '精準定向目標受眾'
        },
        {
          step: 2,
          label: '商品吸引',
          description: '展示高轉換潛力商品'
        },
        {
          step: 3,
          label: '顧客轉換',
          description: '優化購買體驗'
        },
        {
          step: 4,
          label: '回購經營',
          description: '建立長期顧客關係'
        }
      ]
    };
  }
}
