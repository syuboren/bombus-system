import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  CompetencyItem,
  CompetencyFramework,
  CompetencyType,
  CompetencyCategory,
  CompetencyLevel,
  CompetencyStats,
  CompetencyFilter,
  GradeLevel,
  GradeMatrix,
  CareerPath,
  CompetencyAssessment,
  AssessmentSchedule,
  GapAnalysisReport,
  CompetencyGap,
  RadarDataPoint,
  JobDescription,
  KSAContent,
  CoreManagementCompetency,
  KSACompetencyItem,
  CompetencyLevelIndicator
} from '../models/competency.model';

@Injectable({ providedIn: 'root' })
export class CompetencyService {

  // =====================================================
  // 職能框架相關 API
  // =====================================================

  getCompetencyStats(): Observable<CompetencyStats> {
    // 統計數據依據職能基準管理辦法
    // 核心職能 5 項 + 管理職能 3 項 + KSA職能 (依據 9 份 JD)
    return of({
      totalCompetencies: 60, // 核心5 + 管理3 + KSA約52項
      byType: {
        knowledge: 25,  // KSA 知識類
        skill: 27,      // KSA 技能類
        attitude: 8     // KSA 態度類
      },
      byCategory: {
        core: 5,         // 核心職能: 溝通表達、問題解決、專案思維、客戶導向、成長思維
        management: 3,   // 管理職能: 人才發展、決策能力、團隊領導
        ksa: 52          // KSA職能: 知識/技能/態度
      },
      recentlyUpdated: 9 // 9份JD更新
    }).pipe(delay(300));
  }

  // =====================================================
  // 核心職能 API (L1-L6 等級)
  // =====================================================
  getCoreCompetenciesWithLevels(): Observable<CoreManagementCompetency[]> {
    return of(this.buildCoreCompetencies()).pipe(delay(300));
  }

  // =====================================================
  // 管理職能 API (L1-L6 等級)
  // =====================================================
  getManagementCompetenciesWithLevels(): Observable<CoreManagementCompetency[]> {
    return of(this.buildManagementCompetencies()).pipe(delay(300));
  }

  // =====================================================
  // KSA 職能 API (無等級)
  // =====================================================
  getKSACompetencies(ksaType?: CompetencyType): Observable<KSACompetencyItem[]> {
    let items = this.buildKSACompetencies();
    if (ksaType) {
      items = items.filter(item => item.ksaType === ksaType);
    }
    return of(items).pipe(delay(300));
  }

  // =====================================================
  // 建立核心職能資料 (來源: 核心職能與管理職能清單.json)
  // =====================================================
  private buildCoreCompetencies(): CoreManagementCompetency[] {
    return [
      {
        id: 'core-communication',
        code: 'CORE-01',
        name: '溝通表達',
        type: 'core',
        definition: '能夠清晰、準確地傳達資訊，在不同情境下靈活運用溝通技巧，促進團隊合作與組織目標的達成，並有效解決衝突和誤解。',
        levels: [
          {
            level: 'L1',
            indicators: [
              '能主動聆聽主管指示，清楚了解並確認工作要求。',
              '能以口頭或書面方式匯報自己的工作進度，必要時主動詢問以釐清資訊。',
              '在團隊中能表達自己觀點，與同事保持基本合作與互動。'
            ]
          },
          {
            level: 'L2',
            indicators: [
              '能準確傳達工作相關資訊與政策，確保訊息完整性。',
              '能與不同背景的同事有效溝通，促進基本的團隊合作。',
              '在團隊討論時，能以結構化方式表達觀點，回應問題與意見。',
              '面對員工或客戶的問題時保持耐心，尋求雙向溝通解決方案。'
            ]
          },
          {
            level: 'L3',
            indicators: [
              '能在跨部門或跨組織情境下進行流暢且無誤解的溝通。',
              '能主持小型會議，適當引導討論，確保結論清晰且可執行。',
              '能依據不同溝通對象靈活調整表達方式與策略。',
              '能透過有效溝通解決團隊內部衝突，維持工作氣氛與合作和諧。'
            ]
          },
          {
            level: 'L4',
            indicators: [
              '能主動建立團隊內透明、開放且積極的溝通環境。',
              '能在組織變革或重大決策時，清楚且有說服力地解釋變動的緣由及影響。',
              '具備專業演說能力，可代表公司參與內部或外部活動，有效提升公司專業形象。',
              '善用數據與故事化技巧，成功激勵團隊、說服利害關係人。'
            ]
          },
          {
            level: 'L5',
            indicators: [
              '熟練運用溝通技巧解決複雜情境與敏感議題，能精確掌握情境變化，展現高敏感度與靈活應對能力。',
              '能夠深入理解利益相關方需求，並運用精確的溝通策略有效達成共識。',
              '能帶領較大規模跨部門溝通，迅速整合不同觀點達成團隊目標。',
              '在處理高壓或衝突情境時，能維持高水準的專業溝通，妥善解決問題並維護公司利益。'
            ]
          },
          {
            level: 'L6',
            indicators: [
              '具備卓越的策略性溝通能力，能協助高層制定公司內外的溝通策略，影響企業文化與品牌發展。',
              '能以權威與信服力對外傳達公司策略與願景，並有效凝聚內外部共識與支持。',
              '擅於跨文化與高階人士溝通，具備深厚的溝通智慧及應變能力，有效協調各方利害關係人。',
              '透過優秀的溝通策略與技巧，引領組織成功度過重大變革與挑戰，維護與提升組織聲譽。'
            ]
          }
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'core-problem-solving',
        code: 'CORE-02',
        name: '問題解決',
        type: 'core',
        definition: '能夠在面對問題時，迅速分析情況，找出問題根源，制定有效的解決方案，並在實施過程中靈活調整，最終成功解決問題，達成預期目標。',
        levels: [
          {
            level: 'L1',
            indicators: [
              '能夠辨識工作中的一般性問題，並及時向上級反應。',
              '在上級指導下，參與解決問題的過程，並確保完成指定任務。',
              '採取主動學習的態度，了解基礎的問題分析和解決工具（5W1H、魚骨圖等）。',
              '在日常工作中，不斷提升自己處理問題的速度與效率。'
            ]
          },
          {
            level: 'L2',
            indicators: [
              '主動發現部門運作中的問題，制定簡單的解決方案，並能主導基層員工參與。',
              '能夠運用問題分析工具（IDEAS等）系統化解決工作中的問題。',
              '在面對突發情況時，能迅速調整計畫，避免問題擴大影響團隊工作。',
              '善於從錯誤中學習，總結經驗教訓，避免同樣問題重複發生。'
            ]
          },
          {
            level: 'L3',
            indicators: [
              '能以系統性觀點分析並處理複雜問題，快速辨識問題核心原因，提出有效且可行的解決方案。',
              '組織並引導團隊討論問題解決方案，促使不同意見交流，選擇最佳解決路徑。',
              '推動團隊善用高效的分析工具，提升問題解決的專業性與有效性。',
              '在專案中，能提前預測可能出現的問題，並提前規劃應變方案。'
            ]
          },
          {
            level: 'L4',
            indicators: [
              '能建立與推動組織內積極的問題解決文化，鼓勵全體員工主動提出問題並貢獻創新解決方案。',
              '促進公司內部形成安全且鼓勵試錯的環境，推動團隊勇於挑戰現況、嘗試創新方案。',
              '領導全公司層級的改善與創新專案，提升組織整體的效率與成果。',
              '能協調跨部門團隊共同處理複雜、具挑戰性問題，推動有效合作並達成解決目標。'
            ]
          },
          {
            level: 'L5',
            indicators: [
              '在高壓或複雜情境中能迅速分析問題關鍵，展現極高的問題解決技巧，並迅速做出有效的決策與應對方案。',
              '善於處理敏感議題，能靈活且精準地掌握不同利害關係人的立場，推動問題妥善解決。',
              '引導團隊能夠迅速適應變化環境，並能在解決問題過程中創新方法或工作模式。',
              '能培養與強化團隊的問題解決能力，協助團隊建立有效的危機應變與問題預防機制。'
            ]
          },
          {
            level: 'L6',
            indicators: [
              '具備卓越的策略性問題解決能力，能協助高層制定公司層級的問題解決策略與政策，影響組織整體問題處理文化。',
              '善於透過跨部門與跨領域資源整合，處理高度複雜且重大影響的策略性問題，確保公司順利度過危機或挑戰。',
              '在面對重大內外部問題時，能有效對外溝通並取得利害關係人的理解、共識與支持。',
              '透過創新性策略與問題解決技術，引領公司應對內外部重大挑戰，維護企業的市場競爭力與聲譽。'
            ]
          }
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'core-project-thinking',
        code: 'CORE-03',
        name: '專案思維',
        type: 'core',
        definition: '能夠運用專案管理的方法與工具，有效規劃、執行和管理專案，確保資源運用得當、進度按時推進，並達成專案目標。',
        levels: [
          {
            level: 'L1',
            indicators: [
              '能夠清楚理解專案目標和自身角色，準確地執行被指派的任務。',
              '主動回報自身任務的進度和遇到的問題，協助專案順利推展。',
              '在遇到工作挑戰時，能主動尋求協助或提出建議解決方案。',
              '主動學習基本的專案管理工具和方法（如任務追蹤表、基本時間管理技巧）。'
            ]
          },
          {
            level: 'L2',
            indicators: [
              '能夠規劃並制定簡單的專案計畫，清楚訂定目標、時間表與資源分配。',
              '在專案執行過程中能靈活因應變動，及時調整計畫以維持進度。',
              '熟悉並能運用基本的專案管理工具，有效提升個人與團隊效率。',
              '協助團隊成員明確工作角色與職責，適時提供支援並協調分工。'
            ]
          },
          {
            level: 'L3',
            indicators: [
              '能夠主導中型或跨團隊專案管理全流程，包括需求分析、規劃、執行、監控及收尾。',
              '運用專業的專案管理方法論（如PMP、專案看板），提高專案整體效率。',
              '善於預測並及早應對專案風險，制訂應急方案，有效管理資源並維持專案進度。',
              '建立有效的專案成效評估機制，透過數據與回饋持續優化管理流程。'
            ]
          },
          {
            level: 'L4',
            indicators: [
              '能夠從公司戰略高度規劃與設計專案，確保專案目標與公司長期發展方向一致。',
              '在專案資源整合與分配上，能跨部門溝通協調，促成公司整體效益最大化。',
              '主動推動建立公司內部的專案管理標準與流程，提升整體專案運作效能。',
              '能夠將專案管理的成功經驗制度化，透過內部培訓或分享，推動公司專案文化的建立。'
            ]
          },
          {
            level: 'L5',
            indicators: [
              '擅於處理公司內外複雜專案與挑戰，迅速分析並制定具有創新性的解決方案與行動計畫。',
              '在專案推進過程中能靈活調整策略，精準應對變動的環境與不確定性，並且維持團隊士氣與執行力。',
              '能夠有效整合不同專業領域的資源與意見，解決跨領域複雜問題，推動創新解決方案落地實施。',
              '具備高度的敏感度與危機處理能力，在突發或特殊狀況下，能妥善安排並快速做出決策。'
            ]
          },
          {
            level: 'L6',
            indicators: [
              '具備卓越的策略專案規劃與執行能力，能夠協助高層領導規劃公司長期的專案管理策略與目標。',
              '能夠以專案管理的視角提出前瞻性建議，引導公司戰略發展，並推動整體組織能力的提升。',
              '擅長處理具有公司整體性影響的重大專案，協調內外部各利害關係人，確保專案成果達成並提升公司聲譽。',
              '透過建立與推廣高度成熟的專案管理文化，培育公司內部的專案管理人才，持續增進公司整體競爭力。'
            ]
          }
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'core-customer-orientation',
        code: 'CORE-04',
        name: '客戶導向',
        type: 'core',
        definition: '能夠站在客戶角度思考，主動理解其需求，提供具體協助與解決方案，建立信任關係，持續提升客戶滿意度與合作意願。',
        levels: [
          {
            level: 'L1',
            indicators: [
              '接到客戶需求能迅速回應，並正確轉達相關單位，避免流程延誤。',
              '面對客戶時態度親切、有耐心，展現良好的第一線服務形象。',
              '在主管或資深同事指導下，能協助處理簡單的客戶服務或查詢任務。',
              '願意主動學習並熟悉公司基本產品與服務資訊，以備客戶諮詢時使用。'
            ]
          },
          {
            level: 'L2',
            indicators: [
              '主動與客戶保持良好的互動，定期追蹤服務進度與取得反饋，確保服務品質。',
              '能從客戶溝通中發現潛在需求，並提出相應的建議或解決方案。',
              '在客訴或突發狀況下，能及時協調內部資源迅速回應並解決問題。',
              '定期檢視客戶回饋數據與紀錄，歸納問題趨勢，主動提出改善方案。'
            ]
          },
          {
            level: 'L3',
            indicators: [
              '能以策略性思維規劃完整的客戶服務流程，提升整體客戶體驗。',
              '協調跨部門資源，主導解決複雜或高階客戶需求，滿足客戶期待。',
              '建立並落實客戶滿意度指標，執行追蹤與績效改進方案，持續提升滿意度。',
              '能根據市場與客戶回饋，提出服務創新或產品優化具體建議，提升市場競爭力。'
            ]
          },
          {
            level: 'L4',
            indicators: [
              '制定關鍵客戶管理與經營策略，有效拓展高價值客戶合作機會與長期合作關係。',
              '規劃並推動公司內外的品牌價值與溝通策略，增強客戶對公司的信任與忠誠度。',
              '建立以客戶為中心的組織文化，推動此理念融入各項內部政策、制度與流程。',
              '能透過關鍵客戶經驗作為企業決策參考，協助公司規劃長期發展策略與方向。'
            ]
          },
          {
            level: 'L5',
            indicators: [
              '具備深度客戶洞察能力，能迅速因應市場變動與客戶需求變化，及時調整策略。',
              '能主導高度敏感或複雜的客戶情境，妥善處理關鍵問題，維護公司形象與利益。',
              '善於跨文化或跨市場的客戶溝通與管理，能快速建立信任並達成業務目標。',
              '持續推動並實施創新的客戶服務方案與產品升級，主動提升客戶體驗與品牌價值。'
            ]
          },
          {
            level: 'L6',
            indicators: [
              '具備卓越的客戶戰略規劃能力，協助高層制定並落實整體客戶經營策略，確保公司長期市場競爭力。',
              '能以客戶需求與市場趨勢為基礎，引領企業創新與變革，並有效影響組織的策略與營運方針。',
              '以高水準的溝通與談判技巧，處理高層級且複雜的客戶關係，成功達成策略性夥伴合作。',
              '能協助公司建立並推廣高度成熟的客戶導向文化與制度，培養具備高效客戶服務能力的專業團隊，全面提升組織整體競爭優勢。'
            ]
          }
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'core-growth-mindset',
        code: 'CORE-05',
        name: '成長思維',
        type: 'core',
        definition: '展現持續學習與自我成長的意願，勇於挑戰與突破現狀，善於從經驗中反思與優化行動，並將所學應用於工作實務中，不斷提升專業能力與組織貢獻。',
        levels: [
          {
            level: 'L1',
            indicators: [
              '主動學習工作相關的新技能或工具，並嘗試在工作中實作應用。',
              '能接受主管或同事的建議與回饋，反思自身行為並作出改進。',
              '願意嘗試陌生任務，不懼怕犯錯，持續調整行動與方法。',
              '每月至少參加一次部門內部培訓或分享會，保持學習與知識更新。'
            ]
          },
          {
            level: 'L2',
            indicators: [
              '主動為自己和團隊設定具體的學習目標，落實執行並定期追蹤進度。',
              '鼓勵團隊內分享學習成果與經驗，促進知識交流與共同成長。',
              '善用多元管道（如線上課程、實體培訓、論壇）來增進自己和團隊的專業能力。',
              '能將新學到的知識與技能實際運用於工作流程改進，提升工作效能與產出品質。'
            ]
          },
          {
            level: 'L3',
            indicators: [
              '能規劃並建立部門內部的年度學習計畫、學習地圖或能力培養框架。',
              '發展並推動部門輪調及跨部門交流計畫，擴展團隊視野並開發潛能。',
              '能將團隊內成功或失敗的經驗轉化成教材，帶領團隊進行反思與共學，形成持續改善的循環。',
              '能將學習與團隊績效評估系統結合，釐清學習行動對實際工作成果的影響。'
            ]
          },
          {
            level: 'L4',
            indicators: [
              '建立並推動公司層級的學習文化，發展內部講師制度與學習社群，持續提升全體員工的學習風氣。',
              '將學習活動與組織發展需求緊密結合，如人才梯隊計畫及關鍵人才培養方案。',
              '帶領高階主管團隊主動預測未來趨勢與挑戰，積極學習並做出策略應對。',
              '以自身行動成為組織內的學習典範，主動參與學習，並支持資源投入員工發展。'
            ]
          },
          {
            level: 'L5',
            indicators: [
              '擁有高度敏銳度，能快速察覺市場趨勢與內外部環境變化，調整學習策略，適應挑戰與變化。',
              '具備快速整合跨領域新知與技術的能力，提出創新的解決方案，帶領團隊應對新興挑戰。',
              '建立高度靈活且彈性的學習系統與文化，能快速調整資源及學習內容，協助團隊迅速適應外部變化。',
              '主導並推動組織內創新的知識管理與學習系統，確保知識能有效流通與運用，提升整體組織績效。'
            ]
          },
          {
            level: 'L6',
            indicators: [
              '具備卓越的策略性思考與創新能力，能從組織策略高度規劃全面性的成長與學習策略，推動企業創新與發展。',
              '能有效引導組織面對未來趨勢的挑戰，主動提出前瞻性策略並推動高階團隊實踐。',
              '發展並推動全公司的系統化學習文化與創新管理，建立跨部門與跨國的學習機制與交流平台，提升組織競爭優勢。',
              '透過專業影響力，持續推動學習與成長文化，培養未來企業領袖與專業人才，維護並提升組織長期競爭力。'
            ]
          }
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      }
    ];
  }

  // =====================================================
  // 建立管理職能資料 (來源: 核心職能與管理職能清單.json)
  // =====================================================
  private buildManagementCompetencies(): CoreManagementCompetency[] {
    return [
      {
        id: 'mgmt-talent-development',
        code: 'MGMT-01',
        name: '人才發展',
        type: 'management',
        definition: '能透過系統化的培訓、指導與成長機會，培養員工的專業技能和潛力，建立持續學習與發展的企業文化，最終促進組織的長期成功。',
        levels: [
          {
            level: 'L1',
            indicators: [
              '主動參加公司提供的培訓和學習活動，並保持對持續成長的熱忱。',
              '能接受主管與同事的建議與指導，並積極調整自身工作表現。',
              '採取自主學習的態度，主動累積與工作相關的專業技能。',
              '與團隊成員分享自身學習心得與經驗，促進團隊共同成長。'
            ]
          },
          {
            level: 'L2',
            indicators: [
              '能夠主動識別團隊成員的發展需求，依據個人特質提供適合的學習建議與機會。',
              '在工作場域中擔任員工的導師角色，透過日常工作指導提升團隊成員的專業能力與工作效率。',
              '鼓勵團隊成員積極參與公司內部或外部培訓課程，並協助其將新知識應用到實務工作中。',
              '能主動追蹤員工的學習進度與回饋，確保學習目標與工作需求保持一致。'
            ]
          },
          {
            level: 'L3',
            indicators: [
              '制定並推動部門層級的人才發展策略，協助團隊成員制定並落實個人發展計畫（IDP），確保人力資源策略與公司長期目標密切配合。',
              '推動部門內部的學習地圖（LearningMap）與培訓體系，滿足不同層級人員的專業學習與成長需求。',
              '建立並管理部門內部的人才庫，積極培養高潛力員工，做好未來管理及專業人才的接班規劃。',
              '定期評估人才發展專案的成效，持續進行人才發展計畫的優化與調整，提升組織的整體效益。'
            ]
          },
          {
            level: 'L4',
            indicators: [
              '能從公司整體戰略出發設計完整的人才發展架構與策略，確保企業內部人才供應與未來成長戰略密切連結。',
              '主導建立與推廣支持持續學習與創新的組織文化，推動企業發展為學習型組織。',
              '投入資源規劃與建置專業且完整的領導力發展課程，積極培養公司未來的高階管理團隊。',
              '透過數據分析與人才管理系統，精確評估與預測人才需求，進行有效的人才梯隊建設及接班規劃。'
            ]
          },
          {
            level: 'L5',
            indicators: [
              '擅於洞察市場趨勢與企業發展方向，迅速調整人才培養策略，以適應環境變化並維持公司競爭力。',
              '能有效整合跨部門與跨領域資源，培養多元化的人才，滿足企業快速成長與轉型的需求。',
              '推動高度創新的培訓及發展模式，引進國內外先進的學習與發展方法，持續提升員工的專業素質與能力。',
              '具備深厚的人才發展經驗，協助高階管理團隊制定並實踐前瞻性的人才策略，提升整體組織競爭優勢。'
            ]
          },
          {
            level: 'L6',
            indicators: [
              '擁有高度專業的策略性人才發展能力，協助高層制定全公司的長期人才發展戰略，支撐企業的永續成長與創新發展。',
              '能有效連結人才發展策略與企業經營目標，引領公司進行跨國或跨區域人才佈局與培養。',
              '建立完善的企業內部及外部人才合作網絡，主動吸引並整合外部高端人才，提升公司整體的人力資本質量。',
              '以專業知識與領導力帶動組織內的人才培育與發展體系，並持續推動文化變革，確保人才戰略高度契合公司願景及策略目標。'
            ]
          }
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'mgmt-decision-making',
        code: 'MGMT-02',
        name: '決策能力',
        type: 'management',
        definition: '能夠在複雜或不確定的情境下，通過全面分析資訊、評估風險與機會，制定有效的決策，並推動決策落實以達成組織目標。',
        levels: [
          {
            level: 'L1',
            indicators: [
              '在日常工作中能迅速做出明確、簡單的決定，例如流程中的常規選擇。',
              '遇到問題時，能迅速辨識是否需要尋求主管協助，並及時回報。',
              '能主動提供建議與想法，協助團隊做出更有效的決策。',
              '具備基礎分析與判斷能力，選擇方案時有合理依據並可清楚表達其理由。'
            ]
          },
          {
            level: 'L2',
            indicators: [
              '能夠進行部門內的戰術性決策，如資源分配、任務調整與內部協調處理。',
              '在決策前能積極蒐集所需資訊，進行基礎的風險評估，確保決策品質。',
              '能根據團隊回饋與新資訊調整決策，以維持決策的靈活性與有效性。',
              '主動推動決策落實與執行，追蹤進度並及時修正行動計畫。'
            ]
          },
          {
            level: 'L3',
            indicators: [
              '能有效處理跨部門或中大型專案的決策，平衡各方資源需求，確保決策符合整體公司利益。',
              '熟練運用專業的決策工具與分析方法（如SWOT、決策矩陣）輔助決策過程。',
              '善於權衡多方意見與利益，找出具體可行的最優決策方案，避免衝突與資源浪費。',
              '積極識別決策過程中的潛在風險，事先擬定應變計畫與備選方案，降低決策失誤的影響。'
            ]
          },
          {
            level: 'L4',
            indicators: [
              '能站在公司整體策略高度，制定與推動公司層級的重要決策，確保組織長期發展方向清晰且落實。',
              '在市場快速變化的環境中，具備快速決斷與敏捷應變能力，做出具備策略性價值的高回報決策。',
              '建立完善的決策評估與回饋系統，持續透過數據與結果反饋，優化決策過程與提升決策效率。',
              '推動公司內建立良好的決策文化，鼓勵各層級員工提出建設性意見，增進組織整體的決策能力。'
            ]
          },
          {
            level: 'L5',
            indicators: [
              '擁有深厚的市場敏銳度與趨勢洞察力，能快速掌握外部市場變動，制定具有前瞻性與創新性的決策。',
              '在面臨高度不確定與複雜情境時，能夠快速進行綜合分析並果斷做出決策，有效引領團隊快速適應環境變化。',
              '能夠有效整合多元專業與跨部門資源，做出跨領域與創新的決策，協助公司解決重大問題或挑戰。',
              '建立並推動創新的決策模型與系統，提升公司內部的決策質量與速度，維持市場競爭優勢。'
            ]
          },
          {
            level: 'L6',
            indicators: [
              '具備卓越的策略決策能力，能協助高層建立公司長期決策架構與策略方向，確保組織持續競爭力與成長性。',
              '以全局與長遠的觀點，分析公司內外部關鍵挑戰，提出具體的策略性決策建議，並有效引導組織實施。',
              '能夠有效協調跨產業、跨市場的資源與關係網絡，主導高度複雜與關鍵的決策過程，確保企業長期發展策略的成功。',
              '積極推動公司內部的決策管理與文化建設，培養並建立公司內各階層主管之策略性決策能力，增強整體決策水準。'
            ]
          }
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'mgmt-team-leadership',
        code: 'MGMT-03',
        name: '團隊領導',
        type: 'management',
        definition: '能建立信任、凝聚共識，明確傳達願景與目標，善用團隊成員特長進行任務分工與協作，促進開放溝通與持續成長，帶領團隊高效達成任務並實現組織價值。',
        levels: [
          {
            level: 'L1',
            indicators: [
              '理解並支持團隊的目標，積極配合團隊任務的安排與要求。',
              '在團隊合作中願意主動分享個人經驗和資訊，促進良好的團隊互動與合作氛圍。',
              '面對團隊內的意見分歧與衝突時，能保持理性並嘗試溝通協調。',
              '遇到問題時主動尋求團隊成員或主管的協助，展現基本的團隊責任感。'
            ]
          },
          {
            level: 'L2',
            indicators: [
              '能明確且清晰地傳達團隊任務目標與角色分工，確保團隊理解並達成共識。',
              '善於觀察並發揮團隊成員的個人特長，合理分配工作任務，提升團隊效能。',
              '積極推動團隊內的開放溝通，傾聽並尊重多元觀點，適時給予具體建議與回饋。',
              '主動處理團隊中的衝突或誤解，迅速恢復和諧與合作氛圍，增進團隊內的信任。'
            ]
          },
          {
            level: 'L3',
            indicators: [
              '能夠制定並清楚呈現團隊的目標及未來發展藍圖，引導團隊成員清晰理解並落實公司願景與戰略。',
              '建立與落實團隊內制度化的溝通機制（例如定期會議、共識工作坊），有效提升團隊內的資訊共享與決策效率。',
              '積極培養團隊內部的核心技能與專業能力，透過職務輪調或專案任務提升團隊成員的綜合實力。',
              '善於激勵與肯定團隊成員的努力，透過授權與鼓勵，提升團隊士氣、投入度與責任感。'
            ]
          },
          {
            level: 'L4',
            indicators: [
              '能在公司層面建立團隊領導的共同期待與標準（如團隊領導力模型），明確界定領導職責與標準，推動領導力一致化。',
              '規劃並推動團隊內部的接班與人才傳承計畫，確保關鍵職位有人才梯隊，達成組織人才培育的長期策略目標。',
              '發展與推動跨部門、跨世代合作的策略，建立組織內部整合力與高效的協作文化。',
              '擔任組織變革過程中的領導角色，引導團隊積極面對轉型與變革挑戰，確保團隊能夠快速適應並保持穩定動能。'
            ]
          },
          {
            level: 'L5',
            indicators: [
              '具備高度敏感性與策略性思考，能快速識別與預測市場及內外部環境變化，調整團隊領導策略，引領團隊穩健前行。',
              '擅於整合組織內外的資源，協調跨部門與跨區域團隊，發展創新的合作模式與策略，達成重大策略性任務。',
              '建立組織內系統性的領導力發展體系，規劃並推動領導力發展的專業培訓與人才培養計畫。',
              '積極推動團隊創新與學習文化，持續提升團隊的競爭力與創新能力，確保團隊能有效應對各種挑戰。'
            ]
          },
          {
            level: 'L6',
            indicators: [
              '擁有卓越的團隊策略領導能力，協助高層制定公司層級的團隊領導與人才管理策略，推動公司長期願景的實現。',
              '具備高度影響力，能有效引導組織內部團隊的變革與轉型，帶動公司整體策略與營運效能的持續提升。',
              '建立並推動高效能團隊發展的企業文化與制度，確保公司各層級管理者具備卓越的團隊領導能力，培養未來的企業領袖。',
              '能以全球化視野與跨文化管理能力，帶領團隊有效進行跨國或跨區域的協作與整合，增進組織長期的競爭優勢。'
            ]
          }
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      }
    ];
  }

  // =====================================================
  // 建立 KSA 職能資料 (無等級區分)
  // =====================================================
  private buildKSACompetencies(): KSACompetencyItem[] {
    return [
      // =============== 知識類 (Knowledge) ===============
      // 財務會計類
      { id: 'ksa-k-fin-01', code: 'FIN-K01', name: '財務相關法規', ksaType: 'knowledge', description: 'TIFRS(國際會計準則)、商業會計法、商業會計處理準則、稅法、洗錢防制法、公司法、證券交易法與其他相關稅法。', behaviorIndicators: ['了解並正確應用國際會計準則', '熟悉商業會計法規', '掌握稅法更新動態'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-fin-02', code: 'FIN-K02', name: '財務報表相關知識', ksaType: 'knowledge', description: '資產負債表、綜合損益表、權益變動表與現金流量表等財務報表知識。', behaviorIndicators: ['能正確編製四大財務報表', '了解報表間勾稽關係', '能進行報表分析'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-fin-03', code: 'FIN-K03', name: '成本概論', ksaType: 'knowledge', description: '成本分類、成本計算、成本分析與成本控制方法。', behaviorIndicators: ['了解成本分類與計算', '能進行成本差異分析', '掌握成本控制技巧'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-fin-04', code: 'FIN-K04', name: '財務分析規劃知識', ksaType: 'knowledge', description: '財務分析方法、預算規劃、投資評估、資金調度與財務規劃技巧。', behaviorIndicators: ['能進行財務比率分析', '掌握預算管理方法', '了解投資評估方法'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-fin-05', code: 'FIN-K05', name: '風險管理知識', ksaType: 'knowledge', description: '了解風險評估、風險識別、風險控制與風險管理框架。', behaviorIndicators: ['能識別並評估財務風險', '建立風險管理機制', '提出風險因應策略'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      // 人力資源類
      { id: 'ksa-k-hr-01', code: 'HR-K01', name: '產業與公司概況知識', ksaType: 'knowledge', description: '了解產業趨勢、公司概況與人事規章制度。', behaviorIndicators: ['了解產業發展趨勢', '熟悉公司組織與文化', '掌握人事規章制度'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-hr-02', code: 'HR-K02', name: '招募甄選作業流程知識', ksaType: 'knowledge', description: '熟悉招募甄選、僱用與引導作業流程概念。', behaviorIndicators: ['了解完整招募作業流程', '熟悉甄選工具與方法', '掌握僱用作業規範'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-hr-03', code: 'HR-K03', name: '人力規劃及需求分析知識', ksaType: 'knowledge', description: '能分析人力需求並規劃招募計畫。', behaviorIndicators: ['分析組織人力需求', '預測人力供需缺口', '規劃招募策略'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-hr-04', code: 'HR-K04', name: '工作分析與職位說明書知識', ksaType: 'knowledge', description: '能撰寫與維護職位說明書，進行工作分析。', behaviorIndicators: ['進行工作分析', '撰寫職位說明書', '定義職位職責與要求'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-hr-05', code: 'HR-K05', name: '勞動相關法令知識', ksaType: 'knowledge', description: '就業服務法、勞動基準法、性別工作平等法、個人資料保護法等勞動相關法令。', behaviorIndicators: ['了解勞動法規核心條文', '正確應用法規於人事作業', '追蹤法規修訂動態'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-hr-06', code: 'HR-K06', name: '雇主品牌概念', ksaType: 'knowledge', description: '了解雇主品牌經營與人才吸引策略。', behaviorIndicators: ['了解雇主品牌概念', '規劃雇主品牌策略', '執行雇主品牌活動'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-hr-07', code: 'HR-K07', name: '徵才管道知識', ksaType: 'knowledge', description: '熟悉內外部徵才管道的運用，如人力銀行、校園徵才、獵才公司等。', behaviorIndicators: ['了解各類徵才管道特性', '選擇適合的徵才管道', '評估管道效益'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-hr-08', code: 'HR-K08', name: '甄選流程與工具知識', ksaType: 'knowledge', description: '熟悉公司甄選流程與各類評估工具。', behaviorIndicators: ['了解甄選流程設計', '熟悉各類測評工具', '正確使用甄選工具'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      // 專案管理類
      { id: 'ksa-k-pm-01', code: 'PM-K01', name: '專案管理知識', ksaType: 'knowledge', description: '熟悉專案管理工具和方法（如PMP、Agile、Scrum等）。', behaviorIndicators: ['了解專案管理框架', '掌握專案管理方法論', '熟悉敏捷開發方法'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-pm-02', code: 'PM-K02', name: '採購流程知識', ksaType: 'knowledge', description: '熟悉採購流程、合約管理與供應商管理的工具與方法。', behaviorIndicators: ['了解採購作業流程', '掌握合約管理要點', '熟悉供應商管理方法'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-pm-03', code: 'PM-K03', name: '庫存管理知識', ksaType: 'knowledge', description: '熟悉庫存管理流程、庫存控制與倉儲管理的工具與方法。', behaviorIndicators: ['了解庫存管理原則', '掌握庫存控制方法', '熟悉倉儲管理作業'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      // 技術類
      { id: 'ksa-k-tech-01', code: 'TECH-K01', name: '網路協定知識', ksaType: 'knowledge', description: '了解路由協定、TCP/IP、MPLS等網路協定。', behaviorIndicators: ['了解TCP/IP協定', '掌握路由協定原理', '熟悉網路層級架構'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-tech-02', code: 'TECH-K02', name: '網路架構知識', ksaType: 'knowledge', description: '了解企業網路架構設計與規劃。', behaviorIndicators: ['了解網路架構設計', '掌握網路拓樸概念', '熟悉設備配置原則'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-tech-03', code: 'TECH-K03', name: '資訊安全知識', ksaType: 'knowledge', description: '了解網路安全風險與防護措施。', behaviorIndicators: ['了解資安威脅類型', '掌握防護措施', '熟悉安全政策'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      // 通用類
      { id: 'ksa-k-gen-01', code: 'GEN-K01', name: '電腦資訊知識', ksaType: 'knowledge', description: '具備基本電腦操作與資訊系統知識。', behaviorIndicators: ['了解電腦基本操作', '熟悉常用作業系統', '能使用常用軟體工具'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-k-gen-02', code: 'GEN-K02', name: '產業趨勢知識', ksaType: 'knowledge', description: '了解產業現況與未來發展趨勢。', behaviorIndicators: ['關注產業發展動態', '了解市場競爭態勢', '掌握產業技術趨勢'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },

      // =============== 技能類 (Skill) ===============
      // 財務會計類
      { id: 'ksa-s-fin-01', code: 'FIN-S01', name: '電腦資訊應用能力', ksaType: 'skill', description: '熟練操作會計系統、ERP系統與辦公軟體。', behaviorIndicators: ['熟練操作財務管理ERP系統', '精通Excel進行財務分析', '能使用專業會計軟體'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-fin-02', code: 'FIN-S02', name: '資料蒐集彙整能力', ksaType: 'skill', description: '能有效蒐集、整理與彙整財務資料。', behaviorIndicators: ['系統性蒐集所需財務資料', '有效整理與分類資料', '確保資料正確性與完整性'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-fin-03', code: 'FIN-S03', name: '文書處理能力', ksaType: 'skill', description: '能撰寫專業財務報告與文件。', behaviorIndicators: ['撰寫清晰專業的財務報告', '製作規範的財務文件', '有效傳達財務資訊'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-fin-04', code: 'FIN-S04', name: '分析規劃能力', ksaType: 'skill', description: '能進行財務分析與規劃，提供決策支持資訊。', behaviorIndicators: ['能進行財務比率分析', '製作分析報表支持決策', '規劃財務策略與預算'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-fin-05', code: 'FIN-S05', name: '計算能力', ksaType: 'skill', description: '準確計算各項財務數據。', behaviorIndicators: ['準確計算財務數據', '正確執行數學運算', '驗證計算結果正確性'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-fin-06', code: 'FIN-S06', name: '檢核能力', ksaType: 'skill', description: '能仔細檢核財務資料的正確性。', behaviorIndicators: ['仔細核對財務資料', '發現並追查異常項目', '確保帳務正確性'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-fin-07', code: 'FIN-S07', name: '專案報表管理能力', ksaType: 'skill', description: '能編製與管理專案財務報表。', behaviorIndicators: ['編製專案財務報表', '追蹤專案預算執行', '分析專案成本與效益'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      // 人力資源類
      { id: 'ksa-s-hr-01', code: 'HR-S01', name: '招募甄選能力', ksaType: 'skill', description: '能有效執行人才招募與甄選作業。', behaviorIndicators: ['準確分析職位需求', '善用多元管道招募', '運用適當甄選方法'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-hr-02', code: 'HR-S02', name: '面談設計與面談技巧', ksaType: 'skill', description: '能設計結構化面試並有效評估應徵者。', behaviorIndicators: ['設計結構化面試問題', '運用STAR法進行提問', '準確判斷應徵者職能'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-hr-03', code: 'HR-S03', name: '履歷篩選能力', ksaType: 'skill', description: '能有效篩選符合條件的履歷。', behaviorIndicators: ['快速掌握履歷重點', '對照職位需求篩選', '識別關鍵經歷與能力'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-hr-04', code: 'HR-S04', name: '招募系統應用能力', ksaType: 'skill', description: '熟練操作招募管理系統。', behaviorIndicators: ['熟練操作招募系統', '管理應徵者資料', '追蹤招募進度'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-hr-05', code: 'HR-S05', name: '人力資源報告撰寫能力', ksaType: 'skill', description: '能撰寫招募成效報告與人力資源分析報告。', behaviorIndicators: ['撰寫招募成效報告', '分析招募數據指標', '提出改善建議'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      // 專案管理類
      { id: 'ksa-s-pm-01', code: 'PM-S01', name: '專案規劃能力', ksaType: 'skill', description: '能制定專案計劃，確定專案目標、範疇和資源需求。', behaviorIndicators: ['制定專案計劃', '定義專案範疇', '規劃資源需求'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-pm-02', code: 'PM-S02', name: '談判協商能力', ksaType: 'skill', description: '優秀的談判與協商技能，能夠確保最佳的採購條件。', behaviorIndicators: ['準備談判策略', '有效進行商業談判', '達成雙贏協議'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-pm-03', code: 'PM-S03', name: '供應商管理能力', ksaType: 'skill', description: '能有效管理供應商關係與採購作業。', behaviorIndicators: ['評估選擇供應商', '建立供應商關係', '監控供應商績效'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-pm-04', code: 'PM-S04', name: '數據分析能力', ksaType: 'skill', description: '優秀的數據分析與報告能力，能準確解讀與呈現數據。', behaviorIndicators: ['蒐集分析相關數據', '製作數據報表', '提出數據驅動建議'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      // 技術類
      { id: 'ksa-s-tech-01', code: 'TECH-S01', name: '路由協定應用能力', ksaType: 'skill', description: '能應用路由協定，確認安全性危害，實施風險控管措施。', behaviorIndicators: ['設定路由協定', '測試路由功能', '識別安全風險'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-tech-02', code: 'TECH-S02', name: '網路專案規劃能力', ksaType: 'skill', description: '能分析不同型態的網路技術，製作網路部署設計或計畫文件。', behaviorIndicators: ['分析網路需求', '設計網路架構', '製作規劃文件'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-tech-03', code: 'TECH-S03', name: '網路建置能力', ksaType: 'skill', description: '能規劃並安裝企業整合通訊網路基礎架構。', behaviorIndicators: ['規劃網路建置順序', '安裝設定網路設備', '測試網路效能'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-tech-04', code: 'TECH-S04', name: '網路監控能力', ksaType: 'skill', description: '能監控、分析及處理網路警報。', behaviorIndicators: ['監控網路狀態', '分析網路警報', '處理網路問題'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-tech-05', code: 'TECH-S05', name: '技術文件撰寫能力', ksaType: 'skill', description: '能撰寫技術文件與規劃報告。', behaviorIndicators: ['撰寫技術文件', '製作規劃報告', '更新維護文件'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      // 通用類
      { id: 'ksa-s-gen-01', code: 'GEN-S01', name: '時間管理能力', ksaType: 'skill', description: '能有效管理時間，合理安排工作優先順序。', behaviorIndicators: ['規劃工作優先順序', '有效分配時間資源', '按時完成任務'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-gen-02', code: 'GEN-S02', name: '溝通協調能力', ksaType: 'skill', description: '能夠有效處理內部和外部的關係。', behaviorIndicators: ['有效傳達訊息', '協調各方利益', '化解衝突問題'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-s-gen-03', code: 'GEN-S03', name: '辦公軟體應用能力', ksaType: 'skill', description: '精通MS Office套件(Word, Excel, PowerPoint)。', behaviorIndicators: ['熟練操作文書處理軟體', '能製作專業簡報', '善用試算表分析'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },

      // =============== 態度類 (Attitude) ===============
      { id: 'ksa-a-01', code: 'ATT-A01', name: '主動積極', ksaType: 'attitude', description: '不需他人指示或要求能自動自發做事，面臨問題立即採取行動加以解決，且為達目標願意主動承擔額外責任。', behaviorIndicators: ['主動發現並處理工作中的問題', '不等待指示即自發性完成任務', '願意承擔額外責任'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-a-02', code: 'ATT-A02', name: '正直誠實', ksaType: 'attitude', description: '展現高道德標準及值得信賴的行為，且能以維持組織誠信為行事原則。', behaviorIndicators: ['遵守公司規章制度', '誠實面對錯誤並改正', '保護公司機密資訊'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-a-03', code: 'ATT-A03', name: '持續學習', ksaType: 'attitude', description: '能夠展現自我提升的企圖心，學習任務所需的新知識與技能，並能有效應用在特定任務。', behaviorIndicators: ['主動參加培訓課程', '關注產業趨勢與新技術', '將學習成果應用於工作'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-a-04', code: 'ATT-A04', name: '謹慎細心', ksaType: 'attitude', description: '對於任務的執行過程，能謹慎考量及處理所有細節，精確地檢視每個程序。', behaviorIndicators: ['仔細核對資料確保正確', '建立檢核機制避免錯誤', '注重工作細節與品質'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-a-05', code: 'ATT-A05', name: '壓力容忍', ksaType: 'attitude', description: '冷靜且有效地應對及處理高度緊張的情況或壓力，如緊迫的時間、各類突發事件及危急狀況。', behaviorIndicators: ['在壓力下保持冷靜與專注', '有效處理緊急狀況', '能在時間壓力下完成工作'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-a-06', code: 'ATT-A06', name: '自我管理', ksaType: 'attitude', description: '設立定義明確且實際可行的個人目標；對於及時完成任務展現高度進取、努力、承諾及負責任的行為。', behaviorIndicators: ['設定明確可衡量的工作目標', '有效管理個人時間與進度', '對工作成果負責到底'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-a-07', code: 'ATT-A07', name: '親和力', ksaType: 'attitude', description: '對他人表現理解、友善、同理心、關心和禮貌，並能與不同背景的人發展及維持良好關係。', behaviorIndicators: ['展現友善親切的態度', '能與不同背景的人建立良好關係', '給予適當的支持與協助'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') },
      { id: 'ksa-a-08', code: 'ATT-A08', name: '服務導向', ksaType: 'attitude', description: '以服務心態對待內外部客戶，主動了解並回應服務對象需求。', behaviorIndicators: ['主動了解服務對象需求', '提供親切有禮的服務', '持續改善服務品質'], linkedCourses: [], createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-11-20') }
    ];
  }

  getCompetencyFrameworks(): Observable<CompetencyFramework[]> {
    // 職能框架分為三大類：核心職能、管理職能、KSA職能
    // 依據職能基準管理辦法建立
    return of([
      {
        id: 'core',
        name: '核心職能',
        description: '適用全員，涵蓋溝通表達、問題解決、專案思維、客戶導向、成長思維（L1-L6等級）',
        category: 'core' as CompetencyCategory,
        coreCompetencies: this.buildCoreCompetencies(),
        totalCount: 5
      },
      {
        id: 'management',
        name: '管理職能',
        description: '適用於管理職，涵蓋人才發展、決策能力、團隊領導（L1-L6等級）',
        category: 'management' as CompetencyCategory,
        managementCompetencies: this.buildManagementCompetencies(),
        totalCount: 3
      },
      {
        id: 'ksa',
        name: 'KSA職能',
        description: '包括知識（Knowledge）、技能（Skill）、態度（Attitude），無等級區分，僅需勾選',
        category: 'ksa' as CompetencyCategory,
        ksaCompetencies: this.buildKSACompetencies(),
        totalCount: this.buildKSACompetencies().length
      }
    ]).pipe(delay(400));
  }

  // =====================================================
  // 舊版 API - 僅供向後相容（已棄用）
  // 請使用新的獨立 API:
  // - getCoreCompetenciesWithLevels() 核心職能
  // - getManagementCompetenciesWithLevels() 管理職能
  // - getKSACompetencies() KSA職能
  // =====================================================
  getCompetencies(filter?: CompetencyFilter): Observable<CompetencyItem[]> {
    // 此方法現在僅返回 KSA 職能（舊格式，供向後相容）
    // 核心職能和管理職能請使用獨立的 API
    let competencies = this.getLegacyKSACompetencies();

    if (filter) {
      if (filter.type) {
        competencies = competencies.filter(c => c.type === filter.type);
      }
      if (filter.category) {
        competencies = competencies.filter(c => c.category === filter.category);
      }
      if (filter.level) {
        competencies = competencies.filter(c => c.level === filter.level);
      }
      if (filter.searchKeyword) {
        const keyword = filter.searchKeyword.toLowerCase();
        competencies = competencies.filter(c =>
          c.name.toLowerCase().includes(keyword) ||
          c.description.toLowerCase().includes(keyword)
        );
      }
    }

    return of(competencies).pipe(delay(300));
  }

  getCompetencyById(id: string): Observable<CompetencyItem | undefined> {
    // 此方法僅搜索 KSA 職能
    const all = this.getLegacyKSACompetencies();
    return of(all.find(c => c.id === id)).pipe(delay(200));
  }

  // 舊版 KSA 職能資料 (CompetencyItem 格式)
  private getLegacyKSACompetencies(): CompetencyItem[] {
    return [
      ...this.getProfessionalCompetencies(),
      ...this.getGeneralCompetencies()
    ];
  }

  // =====================================================
  // 職等職級相關 API
  // =====================================================

  getGradeMatrix(): Observable<GradeMatrix> {
    return of({
      rows: this.getGradeLevels(),
      columns: ['研發部', '業務部', '行銷部', '人資部', '財務部']
    }).pipe(delay(400));
  }

  getGradeLevels(): GradeLevel[] {
    return [
      {
        id: 'p1',
        code: 'P1',
        name: '初級工程師',
        type: 'professional',
        level: 1,
        minSalary: 35000,
        maxSalary: 45000,
        requirements: ['大學以上學歷', '相關科系畢業'],
        competencies: ['c-prof-1', 'c-prof-2']
      },
      {
        id: 'p2',
        code: 'P2',
        name: '工程師',
        type: 'professional',
        level: 2,
        minSalary: 45000,
        maxSalary: 60000,
        requirements: ['1-3年相關經驗', '獨立作業能力'],
        competencies: ['c-prof-1', 'c-prof-2', 'c-prof-3']
      },
      {
        id: 'p3',
        code: 'P3',
        name: '資深工程師',
        type: 'professional',
        level: 3,
        minSalary: 60000,
        maxSalary: 80000,
        requirements: ['3-5年相關經驗', '專案經驗'],
        competencies: ['c-prof-1', 'c-prof-2', 'c-prof-3', 'c-prof-4']
      },
      {
        id: 'p4',
        code: 'P4',
        name: '主任工程師',
        type: 'professional',
        level: 4,
        minSalary: 80000,
        maxSalary: 100000,
        requirements: ['5年以上經驗', '技術領導能力'],
        competencies: ['c-prof-1', 'c-prof-2', 'c-prof-3', 'c-prof-4', 'c-prof-5']
      },
      {
        id: 'm1',
        code: 'M1',
        name: '副理',
        type: 'management',
        level: 1,
        minSalary: 70000,
        maxSalary: 90000,
        requirements: ['3年以上經驗', '團隊管理經驗'],
        competencies: ['c-mgmt-1', 'c-mgmt-2']
      },
      {
        id: 'm2',
        code: 'M2',
        name: '經理',
        type: 'management',
        level: 2,
        minSalary: 90000,
        maxSalary: 120000,
        requirements: ['5年以上經驗', '部門管理經驗'],
        competencies: ['c-mgmt-1', 'c-mgmt-2', 'c-mgmt-3']
      },
      {
        id: 'm3',
        code: 'M3',
        name: '協理',
        type: 'management',
        level: 3,
        minSalary: 120000,
        maxSalary: 150000,
        requirements: ['8年以上經驗', '跨部門協調能力'],
        competencies: ['c-mgmt-1', 'c-mgmt-2', 'c-mgmt-3', 'c-mgmt-4']
      },
      {
        id: 's1',
        code: 'S1',
        name: '技術專家',
        type: 'specialist',
        level: 1,
        minSalary: 100000,
        maxSalary: 140000,
        requirements: ['10年以上經驗', '領域專家'],
        competencies: ['c-prof-5', 'c-prof-6']
      }
    ];
  }

  getCareerPaths(): Observable<CareerPath[]> {
    const paths: CareerPath[] = [
      {
        id: 'path-vertical-tech',
        type: 'vertical' as const,
        name: '技術職垂直晉升',
        description: '從初級工程師一路晉升至主任工程師',
        currentPosition: 'P1 初級工程師',
        targetPosition: 'P4 主任工程師',
        estimatedTime: '5-8年',
        steps: [
          { order: 1, title: 'P1 初級工程師', description: '打好基礎', duration: '1-2年', requiredCompetencies: [], status: 'completed' as const },
          { order: 2, title: 'P2 工程師', description: '獨立作業', duration: '2-3年', requiredCompetencies: [], status: 'current' as const },
          { order: 3, title: 'P3 資深工程師', description: '技術領導', duration: '2-3年', requiredCompetencies: [], status: 'pending' as const },
          { order: 4, title: 'P4 主任工程師', description: '架構設計', duration: '持續', requiredCompetencies: [], status: 'pending' as const }
        ],
        requiredCompetencies: []
      },
      {
        id: 'path-vertical-mgmt',
        type: 'vertical' as const,
        name: '管理職垂直晉升',
        description: '從副理晉升至協理',
        currentPosition: 'M1 副理',
        targetPosition: 'M3 協理',
        estimatedTime: '4-6年',
        steps: [
          { order: 1, title: 'M1 副理', description: '團隊管理', duration: '2年', requiredCompetencies: [], status: 'completed' as const },
          { order: 2, title: 'M2 經理', description: '部門管理', duration: '2-3年', requiredCompetencies: [], status: 'current' as const },
          { order: 3, title: 'M3 協理', description: '策略規劃', duration: '持續', requiredCompetencies: [], status: 'pending' as const }
        ],
        requiredCompetencies: []
      },
      {
        id: 'path-horizontal',
        type: 'horizontal' as const,
        name: '橫向專業深化',
        description: '持續精進專業職能深度，成為領域專家',
        currentPosition: 'P3 資深工程師',
        targetPosition: 'S1 技術專家',
        estimatedTime: '3-5年',
        steps: [
          { order: 1, title: '專業認證', description: '取得專業證照', duration: '1年', requiredCompetencies: [], status: 'completed' as const },
          { order: 2, title: '技術導師', description: '指導團隊成員', duration: '1-2年', requiredCompetencies: [], status: 'current' as const },
          { order: 3, title: '技術專家', description: '領域權威', duration: '持續', requiredCompetencies: [], status: 'pending' as const }
        ],
        requiredCompetencies: []
      },
      {
        id: 'path-cross',
        type: 'cross-department' as const,
        name: '跨部門發展',
        description: '從業務轉型至產品管理',
        currentPosition: '業務專員',
        targetPosition: '產品經理',
        estimatedTime: '2-3年',
        steps: [
          { order: 1, title: '輪調學習', description: '了解產品開發流程', duration: '6個月', requiredCompetencies: [], status: 'completed' as const },
          { order: 2, title: '產品助理', description: '參與產品規劃', duration: '1年', requiredCompetencies: [], status: 'current' as const },
          { order: 3, title: '產品經理', description: '主導產品發展', duration: '持續', requiredCompetencies: [], status: 'pending' as const }
        ],
        requiredCompetencies: []
      }
    ];
    return of(paths).pipe(delay(400));
  }

  // =====================================================
  // 職能評估相關 API
  // =====================================================

  getAssessmentSchedules(): Observable<AssessmentSchedule[]> {
    const schedules: AssessmentSchedule[] = [
      {
        id: 'as-2024-q4',
        name: '2024 Q4 職能評估',
        startDate: new Date('2024-10-01'),
        endDate: new Date('2024-12-31'),
        status: 'in_progress' as const,
        targetDepartments: ['研發部', '業務部', '行銷部'],
        completionRate: 65
      },
      {
        id: 'as-2024-q3',
        name: '2024 Q3 職能評估',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-09-30'),
        status: 'completed' as const,
        targetDepartments: ['全部門'],
        completionRate: 100
      }
    ];
    return of(schedules).pipe(delay(300));
  }

  getAssessments(departmentId?: string): Observable<CompetencyAssessment[]> {
    const assessments: CompetencyAssessment[] = [
      {
        id: 'ca-001',
        employeeId: 'emp-001',
        employeeName: '王小明',
        department: '研發部',
        position: '資深工程師',
        assessmentPeriod: '2024 Q4',
        competencyScores: [],
        selfAssessmentDate: new Date('2024-11-15'),
        status: 'manager_review' as const,
        overallScore: 4.2
      },
      {
        id: 'ca-002',
        employeeId: 'emp-002',
        employeeName: '李小華',
        department: '研發部',
        position: '工程師',
        assessmentPeriod: '2024 Q4',
        competencyScores: [],
        selfAssessmentDate: new Date('2024-11-10'),
        managerReviewDate: new Date('2024-11-20'),
        status: 'completed' as const,
        overallScore: 3.8,
        managerComments: '整體表現良好，建議加強專案管理能力'
      },
      {
        id: 'ca-003',
        employeeId: 'emp-003',
        employeeName: '陳大文',
        department: '業務部',
        position: '業務專員',
        assessmentPeriod: '2024 Q4',
        competencyScores: [],
        status: 'self_assessment' as const,
        overallScore: 0
      }
    ];
    return of(assessments).pipe(delay(400));
  }

  // =====================================================
  // 職能落差分析相關 API
  // =====================================================

  getGapAnalysisReport(employeeId: string): Observable<GapAnalysisReport> {
    // 根據不同員工 ID 回傳不同的報告資料
    const employeeReports: Record<string, GapAnalysisReport> = {
      'emp-001': {
        employeeId: 'emp-001',
        employeeName: '王小明',
        department: '研發部',
        position: '資深工程師',
        analysisDate: new Date(),
        overallGapScore: 15,
        gaps: this.getMockGapsForEmployee('emp-001'),
        radarData: this.getMockRadarDataForEmployee('emp-001'),
        recommendations: [
          '建議參加「進階專案管理」課程以補強專案管理能力',
          '可安排主管進行「簡報技巧」輔導',
          '整體職能表現良好，持續保持核心技術優勢'
        ]
      },
      'emp-002': {
        employeeId: 'emp-002',
        employeeName: '李小華',
        department: '研發部',
        position: '工程師',
        analysisDate: new Date(),
        overallGapScore: 22,
        gaps: this.getMockGapsForEmployee('emp-002'),
        radarData: this.getMockRadarDataForEmployee('emp-002'),
        recommendations: [
          '建議優先加強「系統分析」與「專案管理」能力',
          '參加進階技術培訓課程提升專業技能',
          '可透過 mentor 制度加速成長'
        ]
      },
      'emp-003': {
        employeeId: 'emp-003',
        employeeName: '陳大文',
        department: '業務部',
        position: '業務專員',
        analysisDate: new Date(),
        overallGapScore: 18,
        gaps: this.getMockGapsForEmployee('emp-003'),
        radarData: this.getMockRadarDataForEmployee('emp-003'),
        recommendations: [
          '建議加強「客戶關係管理」技巧',
          '參加銷售技巧進階培訓',
          '提升簡報與溝通表達能力'
        ]
      }
    };

    const report = employeeReports[employeeId] || employeeReports['emp-001'];
    return of(report).pipe(delay(500));
  }

  private getMockGapsForEmployee(employeeId: string): CompetencyGap[] {
    const gapsMap: Record<string, CompetencyGap[]> = {
      'emp-001': [
        {
          competencyId: 'c-prof-3',
          competencyName: '專案管理',
          type: 'skill',
          required: 4,
          actual: 3,
          gap: 1,
          severity: 'moderate',
          recommendedCourses: [
            { id: 'course-104', name: '進階專案管理', duration: '16小時', provider: '內訓', type: 'classroom' },
            { id: 'course-105', name: 'PMP 認證培訓', duration: '40小時', provider: '外訓', type: 'classroom' }
          ]
        },
        {
          competencyId: 'c-core-3',
          competencyName: '溝通表達',
          type: 'skill',
          required: 4,
          actual: 3.5,
          gap: 0.5,
          severity: 'minor',
          recommendedCourses: [
            { id: 'course-004', name: '簡報技巧培訓', duration: '8小時', provider: '內訓', type: 'classroom' }
          ]
        },
        {
          competencyId: 'c-prof-1',
          competencyName: '程式設計',
          type: 'skill',
          required: 4,
          actual: 4.5,
          gap: -0.5,
          severity: 'none',
          recommendedCourses: []
        },
        {
          competencyId: 'c-prof-2',
          competencyName: '系統分析',
          type: 'skill',
          required: 4,
          actual: 4,
          gap: 0,
          severity: 'none',
          recommendedCourses: []
        },
        {
          competencyId: 'c-core-1',
          competencyName: '團隊合作',
          type: 'attitude',
          required: 4,
          actual: 4.2,
          gap: -0.2,
          severity: 'none',
          recommendedCourses: []
        },
        {
          competencyId: 'c-core-2',
          competencyName: '問題解決',
          type: 'skill',
          required: 4,
          actual: 4,
          gap: 0,
          severity: 'none',
          recommendedCourses: []
        }
      ],
      'emp-002': [
        {
          competencyId: 'c-prof-2',
          competencyName: '系統分析',
          type: 'skill',
          required: 3.5,
          actual: 2.5,
          gap: 1,
          severity: 'moderate',
          recommendedCourses: [
            { id: 'course-103', name: '系統分析與設計', duration: '24小時', provider: '內訓', type: 'classroom' }
          ]
        },
        {
          competencyId: 'c-prof-3',
          competencyName: '專案管理',
          type: 'skill',
          required: 3,
          actual: 2,
          gap: 1,
          severity: 'moderate',
          recommendedCourses: [
            { id: 'course-104', name: '專案管理基礎', duration: '16小時', provider: '內訓', type: 'classroom' }
          ]
        },
        {
          competencyId: 'c-prof-1',
          competencyName: '程式設計',
          type: 'skill',
          required: 3.5,
          actual: 3.5,
          gap: 0,
          severity: 'none',
          recommendedCourses: []
        },
        {
          competencyId: 'c-core-1',
          competencyName: '團隊合作',
          type: 'attitude',
          required: 4,
          actual: 4,
          gap: 0,
          severity: 'none',
          recommendedCourses: []
        },
        {
          competencyId: 'c-core-2',
          competencyName: '問題解決',
          type: 'skill',
          required: 3.5,
          actual: 3,
          gap: 0.5,
          severity: 'minor',
          recommendedCourses: [
            { id: 'course-003', name: '問題分析與解決', duration: '8小時', provider: '內訓', type: 'classroom' }
          ]
        },
        {
          competencyId: 'c-core-3',
          competencyName: '溝通表達',
          type: 'skill',
          required: 3.5,
          actual: 3.5,
          gap: 0,
          severity: 'none',
          recommendedCourses: []
        }
      ],
      'emp-003': [
        {
          competencyId: 'c-prof-10',
          competencyName: '銷售技巧',
          type: 'skill',
          required: 4,
          actual: 3.5,
          gap: 0.5,
          severity: 'minor',
          recommendedCourses: [
            { id: 'course-201', name: '進階銷售技巧', duration: '16小時', provider: '外訓', type: 'classroom' }
          ]
        },
        {
          competencyId: 'c-prof-11',
          competencyName: '客戶關係管理',
          type: 'skill',
          required: 4,
          actual: 3,
          gap: 1,
          severity: 'moderate',
          recommendedCourses: [
            { id: 'course-202', name: 'CRM 實務應用', duration: '8小時', provider: '內訓', type: 'classroom' }
          ]
        },
        {
          competencyId: 'c-core-3',
          competencyName: '溝通表達',
          type: 'skill',
          required: 4,
          actual: 4,
          gap: 0,
          severity: 'none',
          recommendedCourses: []
        },
        {
          competencyId: 'c-core-4',
          competencyName: '目標達成',
          type: 'attitude',
          required: 4,
          actual: 3.8,
          gap: 0.2,
          severity: 'minor',
          recommendedCourses: []
        },
        {
          competencyId: 'c-core-1',
          competencyName: '團隊合作',
          type: 'attitude',
          required: 3.5,
          actual: 4,
          gap: -0.5,
          severity: 'none',
          recommendedCourses: []
        },
        {
          competencyId: 'c-prof-12',
          competencyName: '市場分析',
          type: 'knowledge',
          required: 3,
          actual: 2.5,
          gap: 0.5,
          severity: 'minor',
          recommendedCourses: [
            { id: 'course-203', name: '市場調查與分析', duration: '12小時', provider: '外訓', type: 'online' }
          ]
        }
      ]
    };

    return gapsMap[employeeId] || gapsMap['emp-001'];
  }

  private getMockRadarDataForEmployee(employeeId: string): RadarDataPoint[] {
    const radarMap: Record<string, RadarDataPoint[]> = {
      'emp-001': [
        { competencyName: '程式設計', required: 4, actual: 4.5 },
        { competencyName: '系統分析', required: 4, actual: 4 },
        { competencyName: '專案管理', required: 4, actual: 3 },
        { competencyName: '團隊合作', required: 4, actual: 4.2 },
        { competencyName: '問題解決', required: 4, actual: 4 },
        { competencyName: '溝通表達', required: 4, actual: 3.5 }
      ],
      'emp-002': [
        { competencyName: '程式設計', required: 3.5, actual: 3.5 },
        { competencyName: '系統分析', required: 3.5, actual: 2.5 },
        { competencyName: '專案管理', required: 3, actual: 2 },
        { competencyName: '團隊合作', required: 4, actual: 4 },
        { competencyName: '問題解決', required: 3.5, actual: 3 },
        { competencyName: '溝通表達', required: 3.5, actual: 3.5 }
      ],
      'emp-003': [
        { competencyName: '銷售技巧', required: 4, actual: 3.5 },
        { competencyName: '客戶關係管理', required: 4, actual: 3 },
        { competencyName: '溝通表達', required: 4, actual: 4 },
        { competencyName: '目標達成', required: 4, actual: 3.8 },
        { competencyName: '團隊合作', required: 3.5, actual: 4 },
        { competencyName: '市場分析', required: 3, actual: 2.5 }
      ]
    };

    return radarMap[employeeId] || radarMap['emp-001'];
  }

  getDepartmentGapSummary(): Observable<{ department: string; avgGap: number; criticalCount: number }[]> {
    return of([
      { department: '研發部', avgGap: 12, criticalCount: 2 },
      { department: '業務部', avgGap: 18, criticalCount: 4 },
      { department: '行銷部', avgGap: 15, criticalCount: 3 },
      { department: '人資部', avgGap: 8, criticalCount: 1 },
      { department: '財務部', avgGap: 10, criticalCount: 1 }
    ]).pipe(delay(300));
  }

  // =====================================================
  // 職務說明書相關 API
  // =====================================================

  getJobDescriptions(): Observable<JobDescription[]> {
    const jds: JobDescription[] = [
      // =====================================================
      // JD-001: 財務長 (CFO)
      // 來源: Bombus-ISMS-HR-4-094-財務長工作職務說明書-V1.0-1130229.pdf
      // =====================================================
      {
        id: 'jd-cfo-001',
        positionCode: 'HR-4-094',
        positionName: '財務長',
        department: '財務部',
        gradeLevel: 'C-Level',

        // 1. 主要職責
        responsibilities: [
          '經營目標設定、經營決策團隊養成、規劃公司的結構業績、企業願景規劃',
          '負責全面管理公司財務部，確保部門的高效運營和協作',
          '針對公司整體營運與執行面進行協作，以求提升各部門管理職之領導力',
          '制定和執行公司的策略和政策，以支持公司的業務目標和發展需求',
          '財務部管理：制定和執行公司的財務策略，確保財務活動的合規性和有效性',
          '管理專案財務，確保專案財務計劃、預算管理、成本控制、財務報告準確性和及時性',
          '審核公司的財務報表，定期提供執行長準確的財務數據和分析',
          '評估和管理財務風險，確保公司財務的穩定性和安全性',
          '設定毛利與毛利率、營業費用、管銷與對應費用率、淨利與EPS、成長率與市占率',
          '編列年度公司整體與部門預算會議'
        ],

        // 2. 職務目的
        jobPurpose: [
          '管理工作團隊效能工作品質，以達成組織之績效目標，並依營運目標進行行政團隊與財務管理',
          '確保公司的財務、人力資源和專案管理方面的有效運作',
          '於行政管理部提供領導和管理，確保公司在財務、人力資源和專案管理方面的目標得以實現',
          '確保公司的財務狀況健康，支持公司的營運和發展',
          '確保公司有足夠的優秀人才，並且能夠有效地應對人力資源挑戰',
          '確保公司有效的專案管理流程，以提高生產力和客戶滿意度'
        ],

        // 3. 職務要求
        qualifications: [
          '商業管理、財務管理相關領域的學士學位(碩士學位優先)',
          '至少8年管理經驗，具有營運管理和財務管理經驗者優先',
          '熟悉財務管理和會計原則，具備財務分析和預算管理能力',
          '熟悉法律法規，具備招聘、培訓和員工發展經驗',
          '優秀的領導能力和團隊管理技能',
          '優秀的溝通和協調能力，能夠有效處理內部和外部的關係',
          '良好的數字分析能力和問題解決與決策能力',
          '熟練使用進銷存系統和辦公軟體',
          '精通MS Office套件(Word, Excel, PowerPoint)'
        ],

        // 4. 最終有價值產品 VFP
        vfp: [
          '提高公司整體的財務性能和長期價值，建立健康、高效且成功的企業營運模式',
          '提升公司的財務效率和可持續性，以支持公司的整體策略目標',
          '財務透明度與合規性：強化內部控制與合規，確保財務報告的準確性和透明度',
          '風險管理：建立全面的風險管理框架，定期評估財務風險',
          '確保財務健康：預算控制、資金管理和風險管理',
          '資本結構與資金管理：最佳資本結構決策，現金流管理',
          '成本控制與效率：實施成本削減策略，價值驅動的預算制定',
          '投資與增長策略：戰略投資決策，監控投資表現'
        ],

        // 5. 職能基準 (包含 KSA)
        competencyStandards: [
          {
            mainDuty: '提升團隊效能',
            tasks: [
              { taskName: '擬定達成團隊目標的計畫', outputs: ['團隊工作計畫書'], indicators: ['與團隊成員溝通後，確定並擬定團隊工作目標', '協助團隊成員達成團隊合作計畫所列之預期成果'] },
              { taskName: '帶領工作團隊增進凝聚力', outputs: ['團隊績效報告'], indicators: ['促使團隊成員規劃、決策及實務操作', '適時獎勵個人和團隊的努力成果與貢獻', '確保自己是團隊成員楷模'] },
              { taskName: '溝通與建立績效指標', outputs: ['團隊績效指標文件', '團隊成員回饋意見報告'], indicators: ['和管理階層隨時保持溝通順暢', '設定與確認團隊績效指標符合組織營運目標'] }
            ]
          },
          {
            mainDuty: '規劃營運計畫',
            tasks: [
              { taskName: '發展營運計畫', outputs: ['中小型企業營運計畫書'], indicators: ['確認營運模式並訂定短、中、長期目標', '依據營運計畫執行衡量營運績效', '尋求專業資源與建議，有效運用資源'] }
            ]
          },
          {
            mainDuty: '執行營運計畫',
            tasks: [
              { taskName: '執行營運計畫', outputs: ['營運計畫執行進度管控文件'], indicators: ['蒐集與分析執行營運計畫所需資源', '帶領工作團隊執行營運計畫', '定期確認團隊執行營運計畫的進度'] },
              { taskName: '評估績效', outputs: ['績效考核表', '營運績效評估報告'], indicators: ['依據團隊績效指標，評估及分析團隊與成員個人績效', '提出營運績效評估報告'] }
            ]
          },
          {
            mainDuty: '營運管理',
            tasks: [
              { taskName: '營運分析', outputs: ['營運報表分析', '改善方案'], indicators: ['理解營運報表，發覺異常數字或狀況', '提出改善方案或目標達成對策', '落實改善對策，達成業績目標'] },
              { taskName: '管理財務', outputs: ['成本/收支分析文件'], indicators: ['根據各項經營需求進行成本分析與收支管理'] },
              { taskName: '預算規劃', outputs: ['預算分配表'], indicators: ['根據銷售預算，規劃部門業績與預算分配'] }
            ]
          }
        ],
        requiredCompetencies: [
          { competencyId: 'c-hr-k-fin', competencyName: '經營管理知識', type: 'knowledge' as const, requiredLevel: 5, weight: 15 },
          { competencyId: 'c-mgmt-1', competencyName: '團隊領導', type: 'skill' as const, requiredLevel: 5, weight: 20 },
          { competencyId: 'c-core-3', competencyName: '溝通協調', type: 'skill' as const, requiredLevel: 4, weight: 15 },
          { competencyId: 'c-hr-s-plan', competencyName: '營運規劃', type: 'skill' as const, requiredLevel: 5, weight: 20 },
          { competencyId: 'c-mgmt-3', competencyName: '策略規劃', type: 'skill' as const, requiredLevel: 5, weight: 15 },
          { competencyId: 'c-core-2', competencyName: '問題解決', type: 'skill' as const, requiredLevel: 4, weight: 15 }
        ],

        // 5.1 職能需求 (分類含權重)
        coreCompetencyRequirements: [
          { competencyId: 'core-001', competencyName: '溝通表達', type: 'core' as const, requiredLevel: 'L5' as const, weight: 10 },
          { competencyId: 'core-002', competencyName: '問題解決', type: 'core' as const, requiredLevel: 'L5' as const, weight: 10 },
          { competencyId: 'core-003', competencyName: '專案思維', type: 'core' as const, requiredLevel: 'L4' as const, weight: 5 },
          { competencyId: 'core-004', competencyName: '客戶導向', type: 'core' as const, requiredLevel: 'L4' as const, weight: 5 },
          { competencyId: 'core-005', competencyName: '成長思維', type: 'core' as const, requiredLevel: 'L5' as const, weight: 5 }
        ],
        managementCompetencyRequirements: [
          { competencyId: 'mgmt-001', competencyName: '人才發展', type: 'management' as const, requiredLevel: 'L5' as const, weight: 10 },
          { competencyId: 'mgmt-002', competencyName: '決策能力', type: 'management' as const, requiredLevel: 'L6' as const, weight: 15 },
          { competencyId: 'mgmt-003', competencyName: '團隊領導', type: 'management' as const, requiredLevel: 'L6' as const, weight: 15 }
        ],
        ksaCompetencyRequirements: [
          { competencyId: 'ksa-k-001', competencyName: '經營管理知識', ksaType: 'knowledge' as const, weight: 5 },
          { competencyId: 'ksa-k-002', competencyName: '財務管理知識', ksaType: 'knowledge' as const, weight: 5 },
          { competencyId: 'ksa-s-001', competencyName: '策略規劃能力', ksaType: 'skill' as const, weight: 5 },
          { competencyId: 'ksa-s-002', competencyName: '財務分析能力', ksaType: 'skill' as const, weight: 5 },
          { competencyId: 'ksa-a-001', competencyName: '主動積極', ksaType: 'attitude' as const, weight: 5 }
        ],

        // 5.2 職能內涵 (K/S/A)
        ksaContent: {
          knowledge: [
            { code: 'K01', name: '經營管理知識', description: '了解企業經營管理的原理與方法' },
            { code: 'K02', name: '財務管理知識', description: '熟悉財務規劃、預算管理、資金調度' },
            { code: 'K03', name: '會計準則知識', description: '了解會計原則與財務報表編製' },
            { code: 'K04', name: '稅法相關知識', description: '熟悉稅務法規與申報作業' },
            { code: 'K05', name: '投資分析知識', description: '了解投資評估與風險分析方法' }
          ],
          skills: [
            { code: 'S01', name: '策略規劃能力', description: '能制定並執行公司策略' },
            { code: 'S02', name: '團隊領導能力', description: '能有效帶領團隊達成目標' },
            { code: 'S03', name: '溝通協調能力', description: '能與各部門有效溝通協調' },
            { code: 'S04', name: '財務分析能力', description: '能進行財務分析與決策支持' },
            { code: 'S05', name: '營運規劃能力', description: '能制定營運計畫與預算' }
          ],
          attitudes: [
            { code: 'A01', name: '主動積極', description: '不需他人指示或要求能自動自發做事，面臨問題立即採取行動加以解決' },
            { code: 'A02', name: '正直誠實', description: '展現高道德標準及值得信賴的行為，以維持組織誠信為行事原則' },
            { code: 'A03', name: '持續學習', description: '能夠展現自我提升的企圖心，學習任務所需的新知識與技能' },
            { code: 'A04', name: '謹慎細心', description: '對於任務的執行過程，能謹慎考量及處理所有細節' },
            { code: 'A05', name: '壓力容忍', description: '冷靜且有效地應對及處理高度緊張的情況或壓力' },
            { code: 'A06', name: '自我管理', description: '設立定義明確且實際可行的個人目標，展現高度進取與負責任的行為' }
          ]
        },

        // 6. 工作描述
        workDescription: [
          '根據主管制定的目標與職責，規劃職務的目標',
          '發展出改進公司營運的方案，並呈交主管核准',
          '從事分析企業各項量化資料，提出與財務、投資、融資等相關之專業報告',
          '執行各項與資金有關之收、支、存等財務作業',
          '發展中小型企業之營運計畫，並依營運目標進行產品行銷與財務管理'
        ],

        // 7. 檢查清單
        checklist: [
          { item: '審核財務報表準確性', points: 5 },
          { item: '確認預算執行進度', points: 3 },
          { item: '評估財務風險', points: 4 },
          { item: '檢視資金調度狀況', points: 3 },
          { item: '確認法規遵循情形', points: 4 },
          { item: '審核投資決策文件', points: 5 }
        ],

        // 8. 職務責任
        jobDuties: [
          '確保財務報表的準確性和及時性',
          '維護公司財務的穩定性和安全性',
          '達成年度財務目標和預算控制',
          '建立和維護有效的內部控制制度',
          '確保所有財務活動符合法規要求'
        ],

        // 9. 每日工作
        dailyTasks: [
          '審核重要財務文件和報表',
          '參與經營決策會議',
          '監控資金流動狀況',
          '處理緊急財務事務',
          '與各部門主管溝通協調'
        ],

        // 10. 每週工作
        weeklyTasks: [
          '召開財務部門週會',
          '審核週報和關鍵績效指標',
          '與執行長匯報財務狀況',
          '評估投資項目進度',
          '檢視成本控制執行情形'
        ],

        // 11. 每月工作
        monthlyTasks: [
          '審核月度財務報表',
          '召開預算檢討會議',
          '進行月度績效評估',
          '更新財務風險評估報告',
          '提交月度營運分析報告給董事會',
          '檢視銀行融資額度使用情形'
        ],

        // 元資料
        summary: '管理工作團隊效能工作品質，以達成組織之績效目標，並依營運目標進行行政團隊與財務管理；確保公司的財務、人力資源和專案管理方面的有效運作。',
        version: '1.0',
        status: 'published' as const,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-11-20'),
        createdBy: 'HR Admin'
      },
      // =====================================================
      // JD-002: 主辦會計
      // 來源: Bombus-ISMS-HR-4-095-主辦會計工作職務說明書-V1.0-1130119.pdf
      // =====================================================
      {
        id: 'jd-acc-001',
        positionCode: 'HR-4-095',
        positionName: '主辦會計',
        department: '財務部',
        gradeLevel: 'P3',

        // 1. 主要職責
        responsibilities: [
          '蒐集及分析資金資訊',
          '蒐集及分析產業現況',
          '即時更新影響重大之經濟活動',
          '分析組織價值並預估未來獲利',
          '編製預算管理報表與檢核組織內部之經營績效',
          '覆核及檢討財務報表異常項目',
          '提供國內稅務資訊與財務規劃',
          '提供營運之財務分析',
          '分析專案與營業成本',
          '分析公司管理人銷成本',
          '發展營運計畫'
        ],

        // 2. 職務目的
        jobPurpose: [
          '確實審核所有應收的收入、及時支付的支出與有形資產，以增加資產的價值',
          '讓公司主管隨時都能獲得精準、及時的財務資料',
          '規劃管理財務與稅務會計，並維護會計系統，確保它符合管理階層與政府機關的要求'
        ],

        // 3. 職務要求
        qualifications: [
          '會計、財務相關科系大學以上學歷',
          '3年以上會計相關經驗',
          '熟悉財務報表分析與預算管理',
          '具備稅務相關知識',
          '良好的數字分析能力',
          '熟練使用會計軟體與MS Office'
        ],

        // 4. 最終有價值產品 VFP
        vfp: [
          '正確、及時的覆核財務報表',
          '專業的提供營運規劃'
        ],

        // 5. 職能基準 (包含 KSA)
        competencyStandards: [
          {
            mainDuty: '蒐集、分析組織資金狀況、分析產業現況與重大經濟活動',
            tasks: [
              { taskName: '蒐集及分析資金資訊', outputs: ['資金資訊分析報告'], indicators: ['蒐集組織資金流動現況', '蒐集之資金流動狀況進行分析，並就分析預測之結果加以規劃未來之業務與相關投資規劃'] },
              { taskName: '蒐集及分析產業現況', outputs: ['產業趨勢分析報告', '投資規劃書'], indicators: ['蒐集相關之產業現況及未來趨勢', '就蒐集之產業資訊加以分析，預測未來市場需求及發展方向', '擬定組織財務投資規劃，了解市場動向，規避投資風險'] },
              { taskName: '即時更新影響重大之經濟活動', outputs: ['重大經濟活動分析報告'], indicators: ['即時更新重大經濟活動對相關產業之影響', '將蒐集之資金資訊依據短期、中期及長期影響加以分析'] }
            ]
          },
          {
            mainDuty: '檢核組織經營績效',
            tasks: [
              { taskName: '分析組織價值並預估未來獲利', outputs: ['營運計劃書'], indicators: ['就組織價值檢核獲利狀況，以收益法、成本/資產法與市場法進行分析評估組織價值'] },
              { taskName: '編製預算管理報表與檢核組織內部之經營績效', outputs: ['預算管理報表', '績效報告'], indicators: ['蒐集合理有用之資訊，檢視產業變動趨勢及內部經營條件', '就各單位提供之預算報表，考量未來經營計畫、目標與策略後，評估預算金額之適當性', '年度終了就實際執行成果與預算目標進行差異分析'] }
            ]
          },
          {
            mainDuty: '覆核財務報表',
            tasks: [
              { taskName: '覆核及檢討財務報表異常項目', outputs: ['財務報表分析報告'], indicators: ['定期覆核組織內部之財務報表，並針對異常項目執行差異分析', '與會計人員確認上列項目異常之原因，判斷正確性及確保符合會計準則與稅法之規定'] }
            ]
          },
          {
            mainDuty: '提供國內稅務資訊與財務規劃',
            tasks: [
              { taskName: '擬訂與檢討財務投資規劃', outputs: ['預算規劃書', '財務報告書'], indicators: ['提供國內稅務最新資訊，並應適時徵詢稅務專家', '就國內之稅務、財務、成本規劃進行成效追蹤'] },
              { taskName: '提供營運之財務分析', outputs: ['營運分析報告'], indicators: ['提供定價與訂單之相關資訊', '提供管理決策所需之產銷相關財務分析'] }
            ]
          },
          {
            mainDuty: '分析營運成本',
            tasks: [
              { taskName: '分析專案與營業成本', outputs: ['公司營收成本預算管理'], indicators: ['專案成本預估與分析'] },
              { taskName: '分析公司管理人銷成本', outputs: ['銀行額度的開發與管理'], indicators: ['銀行貸款窗口維護', '銀行文件與報表維護'] }
            ]
          }
        ],
        requiredCompetencies: [
          { competencyId: 'c-hr-k-acc', competencyName: '會計專業知識', type: 'knowledge' as const, requiredLevel: 4, weight: 25 },
          { competencyId: 'c-hr-k-tax', competencyName: '稅務法規知識', type: 'knowledge' as const, requiredLevel: 4, weight: 20 },
          { competencyId: 'c-prof-4', competencyName: '資料分析', type: 'skill' as const, requiredLevel: 4, weight: 20 },
          { competencyId: 'c-core-2', competencyName: '問題解決', type: 'skill' as const, requiredLevel: 3, weight: 15 },
          { competencyId: 'c-hr-a-care', competencyName: '細心謹慎', type: 'attitude' as const, requiredLevel: 4, weight: 20 }
        ],

        // 5.1 職能需求 (分類含權重)
        coreCompetencyRequirements: [
          { competencyId: 'core-001', competencyName: '溝通表達', type: 'core' as const, requiredLevel: 'L3' as const, weight: 10 },
          { competencyId: 'core-002', competencyName: '問題解決', type: 'core' as const, requiredLevel: 'L3' as const, weight: 15 },
          { competencyId: 'core-005', competencyName: '成長思維', type: 'core' as const, requiredLevel: 'L3' as const, weight: 10 }
        ],
        managementCompetencyRequirements: [],
        ksaCompetencyRequirements: [
          { competencyId: 'ksa-k-001', competencyName: '財務相關法規', ksaType: 'knowledge' as const, weight: 15 },
          { competencyId: 'ksa-k-002', competencyName: '財務報表相關知識', ksaType: 'knowledge' as const, weight: 15 },
          { competencyId: 'ksa-s-001', competencyName: '分析規劃能力', ksaType: 'skill' as const, weight: 15 },
          { competencyId: 'ksa-s-002', competencyName: '檢核能力', ksaType: 'skill' as const, weight: 10 },
          { competencyId: 'ksa-a-001', competencyName: '謹慎細心', ksaType: 'attitude' as const, weight: 10 }
        ],

        // 5.2 職能內涵 (K/S/A) - 依據 HR-4-095 MD 文件
        ksaContent: {
          knowledge: [
            { code: 'K01', name: '財務相關法規', description: 'TIFRS(國際會計準則)、商業會計法、商業會計處理準則、稅法、洗錢防制法、公司法、證券交易法' },
            { code: 'K02', name: '財務報表相關知識', description: '資產負債表、綜合損益表、權益變動表與現金流量表、財務資訊、各類政府規定之申報表' },
            { code: 'K03', name: '成本概論', description: '成本分析與成本控制方法' },
            { code: 'K04', name: '電腦資訊相關知識', description: '會計軟體與辦公軟體操作' },
            { code: 'K05', name: '財務分析規劃相關知識', description: '財務分析方法與規劃技巧' },
            { code: 'K06', name: '產業趨勢', description: '了解產業現況與未來發展趨勢' }
          ],
          skills: [
            { code: 'S01', name: '電腦資訊應用能力', description: '熟練操作會計系統與辦公軟體' },
            { code: 'S02', name: '資料蒐集彙整能力', description: '能有效蒐集並彙整財務資料' },
            { code: 'S03', name: '文書處理能力', description: '能撰寫專業財務報告與文件' },
            { code: 'S04', name: '分析規劃能力', description: '能進行財務分析與規劃' },
            { code: 'S05', name: '計算能力', description: '準確計算各項財務數據' },
            { code: 'S06', name: '檢核能力', description: '能仔細檢核財務資料的正確性' },
            { code: 'S07', name: '專案報表管理能力', description: '能編製與管理專案財務報表' }
          ],
          attitudes: [
            { code: 'A01', name: '主動積極', description: '不需他人指示或要求能自動自發做事，面臨問題立即採取行動加以解決，且為達目標願意主動承擔額外責任' },
            { code: 'A02', name: '正直誠實', description: '展現高道德標準及值得信賴的行為，且能以維持組織誠信為行事原則，瞭解違反組織、自己及他人的道德標準之影響' },
            { code: 'A03', name: '持續學習', description: '能夠展現自我提升的企圖心，利用且積極參與各種機會，學習任務所需的新知識與技能，並能有效應用在特定任務' },
            { code: 'A04', name: '謹慎細心', description: '對於任務的執行過程，能謹慎考量及處理所有細節，精確地檢視每個程序，並持續對其保持高度關注' },
            { code: 'A05', name: '壓力容忍', description: '冷靜且有效地應對及處理高度緊張的情況或壓力，如緊迫的時間、不友善的人、各類突發事件及危急狀況' },
            { code: 'A06', name: '自我管理', description: '設立定義明確且實際可行的個人目標；對於及時完成任務展現高度進取、努力、承諾及負責任的行為' }
          ]
        },

        // 6. 工作描述
        workDescription: [
          '蒐集組織資金流動現況並進行分析',
          '編製預算管理報表與績效報告',
          '覆核財務報表並執行差異分析',
          '提供稅務資訊與財務規劃建議',
          '進行專案成本預估與分析'
        ],

        // 7. 檢查清單
        checklist: [
          { item: '核對所有收入憑證正確性', points: 1 },
          { item: '核對所有應付憑證正確性', points: 1 },
          { item: '將每一筆收入登入會計系統', points: 1 },
          { item: '針對收入資料異常進行處理', points: 2 },
          { item: '會計系統貨款銷帳與傳票製作', points: 2 },
          { item: '覆核財務報表異常項目', points: 3 }
        ],

        // 8. 職務責任
        jobDuties: [
          '確保財務報表的準確性',
          '維護會計系統的正常運作',
          '提供正確的財務資訊給管理階層',
          '確保所有會計作業符合法規要求',
          '管理預算編製與執行追蹤'
        ],

        // 9. 每日工作
        dailyTasks: [
          '審核日常收支憑證',
          '登錄會計傳票',
          '處理資金調度事宜',
          '回覆財務相關詢問'
        ],

        // 10. 每週工作
        weeklyTasks: [
          '編製週報表',
          '檢視預算執行進度',
          '核對銀行往來明細',
          '更新資金預測報表'
        ],

        // 11. 每月工作
        monthlyTasks: [
          '編製月結財務報表',
          '進行預算差異分析',
          '申報營業稅',
          '編製管理報表',
          '進行月度績效檢討'
        ],

        // 元資料
        summary: '確實審核所有應收的收入、及時支付的支出與有形資產，以增加資產的價值；讓公司主管隨時都能獲得精準、及時的財務資料。規劃管理財務與稅務會計，並維護會計系統。',
        version: '1.0',
        status: 'published' as const,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-11-20'),
        createdBy: 'HR Admin'
      },
      // =====================================================
      // JD-003: 專案部副理
      // 來源: Bombus-ISMS-HR-4-098-專案部副理工作職務說明書-V1.0-1130229.pdf
      // =====================================================
      {
        id: 'jd-pm-001',
        positionCode: 'HR-4-098',
        positionName: '專案部副理',
        department: '專案部',
        gradeLevel: 'M1',

        // 1. 主要職責
        responsibilities: [
          '負責領導專案部團隊，管理和協調多個專案的執行',
          '監控專案進度，確保專案按時、在預算內完成，並達到預期質量標準',
          '參與公司策略制定，並將其轉化為具體的專案計劃和行動',
          '提供團隊培訓和指導，提升團隊的專業能力',
          '直接管理公司整體專案的具體實施',
          '制定專案計劃，確定專案目標、範疇和資源需求',
          '識別和解決專案中的問題和風險，提供適當的解決方案',
          '辦理專案文件和報告，進行專案後評估，總結經驗教訓，並提出改進建議',
          '協調內部資源和外部供應商關係，確保所有專案參與者在既定時間內完成任務',
          '評估和選擇供應商，建立和維護與供應商的良好關係',
          '管理和監督專案採購任務，確保物料和服務的供應及時、成本效益高且符合質量標準',
          '制定和執行採購策略與庫存管理策略，確保運營效率和合規性',
          '分析市場趨勢和價格變動，為採購決策提供數據支持',
          '負責監督和管理公司的庫存活動，確保物料的準確性、有效性和適時性',
          '優化庫存流程，確保物料的高效利用和成本控制',
          '監控庫存管理系統進行盤點、庫存記錄和分析追踪'
        ],

        // 2. 職務目的
        jobPurpose: [
          '通過有效的規劃、協調和監控，確保專案部能夠高效運作',
          '如期如質完成的專案目標，為公司和客戶創造價值',
          '監控和評估供應商的表現，確保其符合公司的要求和標準',
          '監控採購預算，控制成本並確保符合財務預算要求',
          '監控庫存管理系統，降低成本與空間的浪費'
        ],

        // 3. 職務要求
        qualifications: [
          '相關領域的大專以上畢業學歷',
          '至少具3年以上專案管理相關經驗，尤其在領導與管理專案團隊方面',
          '具有2年以上採購與庫存管理經驗，具備相關行業經驗者優先',
          '熟悉專案管理工具和方法（如PMP、Agile、Scrum等）',
          '熟悉採購流程、合約管理與供應商管理的工具與方法',
          '熟悉庫存管理流程、庫存控制與倉儲管理的工具與方法',
          '優秀的數據分析與報告能力，能準確解讀與呈現庫存數據',
          '優秀的談判與協商技能，能夠確保最佳的採購條件',
          '優秀的領導能力和團隊管理技能，確保專案執行達到優質標準',
          '優秀的溝通和協調能力，能夠有效處理內部和外部（供應商、客戶等）的關係',
          '精通MS Office套件（Word, Excel, PowerPoint）和專案管理軟件（如Microsoft Project、JIRA）'
        ],

        // 4. 最終有價值產品 VFP
        vfp: [
          '成功完成的專案及其相關產出',
          '符合客戶需求，創造有價值的專案成果'
        ],

        // 5. 職能基準 (包含 KSA)
        competencyStandards: [
          {
            mainDuty: '專案規劃與執行',
            tasks: [
              { taskName: '制定專案計劃', outputs: ['專案計劃書', '工作分解結構(WBS)'], indicators: ['確定專案目標、範疇和資源需求', '建立專案時程和里程碑'] },
              { taskName: '專案執行與監控', outputs: ['專案進度報告', '風險管理報告'], indicators: ['監控專案進度與預算執行', '識別和解決專案問題與風險'] },
              { taskName: '專案結案與評估', outputs: ['專案結案報告', '經驗學習文件'], indicators: ['進行專案後評估', '總結經驗教訓並提出改進建議'] }
            ]
          },
          {
            mainDuty: '團隊領導與管理',
            tasks: [
              { taskName: '團隊培訓與指導', outputs: ['培訓計劃', '績效評估報告'], indicators: ['提供團隊培訓和指導', '提升團隊的專業能力'] },
              { taskName: '資源協調', outputs: ['資源分配表'], indicators: ['協調內部資源', '確保專案參與者在既定時間內完成任務'] }
            ]
          },
          {
            mainDuty: '採購與供應商管理',
            tasks: [
              { taskName: '供應商評估與選擇', outputs: ['供應商評估報告', '採購合約'], indicators: ['評估和選擇供應商', '確保最佳的採購條件'] },
              { taskName: '採購執行與監控', outputs: ['採購訂單', '供應商績效報告'], indicators: ['管理和監督專案採購任務', '確保物料和服務的供應及時'] }
            ]
          },
          {
            mainDuty: '庫存管理',
            tasks: [
              { taskName: '庫存控制與優化', outputs: ['庫存報表', '盤點報告'], indicators: ['監控庫存管理系統', '優化庫存流程，確保成本控制'] }
            ]
          }
        ],
        requiredCompetencies: [
          { competencyId: 'c-prof-3', competencyName: '專案管理', type: 'skill' as const, requiredLevel: 4, weight: 25 },
          { competencyId: 'c-mgmt-1', competencyName: '團隊領導', type: 'skill' as const, requiredLevel: 4, weight: 20 },
          { competencyId: 'c-core-3', competencyName: '溝通表達', type: 'skill' as const, requiredLevel: 4, weight: 15 },
          { competencyId: 'c-core-2', competencyName: '問題解決', type: 'skill' as const, requiredLevel: 4, weight: 15 },
          { competencyId: 'c-hr-s-vendor', competencyName: '供應商管理', type: 'skill' as const, requiredLevel: 3, weight: 15 },
          { competencyId: 'c-hr-a-resp', competencyName: '責任感', type: 'attitude' as const, requiredLevel: 4, weight: 10 }
        ],

        // 5.1 職能需求 (分類含權重)
        coreCompetencyRequirements: [
          { competencyId: 'core-001', competencyName: '溝通表達', type: 'core' as const, requiredLevel: 'L4' as const, weight: 10 },
          { competencyId: 'core-002', competencyName: '問題解決', type: 'core' as const, requiredLevel: 'L4' as const, weight: 10 },
          { competencyId: 'core-003', competencyName: '專案思維', type: 'core' as const, requiredLevel: 'L4' as const, weight: 10 },
          { competencyId: 'core-004', competencyName: '客戶導向', type: 'core' as const, requiredLevel: 'L3' as const, weight: 5 }
        ],
        managementCompetencyRequirements: [
          { competencyId: 'mgmt-003', competencyName: '團隊領導', type: 'management' as const, requiredLevel: 'L4' as const, weight: 15 },
          { competencyId: 'mgmt-001', competencyName: '人才發展', type: 'management' as const, requiredLevel: 'L3' as const, weight: 10 }
        ],
        ksaCompetencyRequirements: [
          { competencyId: 'ksa-k-001', competencyName: '專案管理知識', ksaType: 'knowledge' as const, weight: 10 },
          { competencyId: 'ksa-s-001', competencyName: '專案規劃能力', ksaType: 'skill' as const, weight: 15 },
          { competencyId: 'ksa-s-002', competencyName: '供應商管理能力', ksaType: 'skill' as const, weight: 10 },
          { competencyId: 'ksa-a-001', competencyName: '責任感', ksaType: 'attitude' as const, weight: 5 }
        ],

        // 5.2 職能內涵 (K/S/A) - 依據 HR-4-098 PDF 文件
        ksaContent: {
          knowledge: [
            { code: 'K01', name: '專案管理知識', description: '熟悉專案管理工具和方法（如PMP、Agile、Scrum等）' },
            { code: 'K02', name: '採購流程知識', description: '熟悉採購流程、合約管理與供應商管理的工具與方法' },
            { code: 'K03', name: '庫存管理知識', description: '熟悉庫存管理流程、庫存控制與倉儲管理的工具與方法' },
            { code: 'K04', name: '財務相關法規', description: '了解財務報表與成本控制相關知識' },
            { code: 'K05', name: '風險管理', description: '了解專案風險識別與管控方法' }
          ],
          skills: [
            { code: 'S01', name: '專案規劃能力', description: '能制定專案計劃，確定專案目標、範疇和資源需求' },
            { code: 'S02', name: '團隊領導能力', description: '優秀的領導能力和團隊管理技能，確保專案執行達到優質標準' },
            { code: 'S03', name: '溝通協調能力', description: '能夠有效處理內部和外部（供應商、客戶等）的關係' },
            { code: 'S04', name: '數據分析能力', description: '優秀的數據分析與報告能力，能準確解讀與呈現庫存數據' },
            { code: 'S05', name: '談判協商能力', description: '優秀的談判與協商技能，能夠確保最佳的採購條件' },
            { code: 'S06', name: '問題解決能力', description: '識別和解決專案中的問題和風險，提供適當的解決方案' },
            { code: 'S07', name: '專案報表管理能力', description: '辦理專案文件和報告，進行專案後評估' }
          ],
          attitudes: [
            { code: 'A01', name: '主動積極', description: '不需他人指示或要求能自動自發做事，面臨問題立即採取行動加以解決' },
            { code: 'A02', name: '正直誠實', description: '展現高道德標準及值得信賴的行為，以維持組織誠信為行事原則' },
            { code: 'A03', name: '持續學習', description: '能夠展現自我提升的企圖心，學習任務所需的新知識與技能' },
            { code: 'A04', name: '謹慎細心', description: '對於任務的執行過程，能謹慎考量及處理所有細節' },
            { code: 'A05', name: '壓力容忍', description: '冷靜且有效地應對及處理高度緊張的情況或壓力' },
            { code: 'A06', name: '自我管理', description: '設立定義明確且實際可行的個人目標，展現高度進取與負責任的行為' }
          ]
        },

        // 6. 工作描述
        workDescription: [
          '領導專案部團隊，管理和協調多個專案的執行',
          '制定專案計劃，確定專案目標、範疇和資源需求',
          '識別和解決專案中的問題和風險',
          '管理採購與供應商關係',
          '監督庫存活動，確保物料的準確性'
        ],

        // 7. 檢查清單
        checklist: [
          { item: '確認專案進度符合計劃', points: 3 },
          { item: '檢視專案預算執行情況', points: 3 },
          { item: '確認供應商交付品質', points: 2 },
          { item: '更新庫存紀錄', points: 2 },
          { item: '完成專案風險評估', points: 3 },
          { item: '團隊成員績效追蹤', points: 2 }
        ],

        // 8. 職務責任
        jobDuties: [
          '確保專案按時、在預算內完成',
          '達成專案預期質量標準',
          '維護良好的供應商關係',
          '控制採購成本',
          '確保庫存數據準確性'
        ],

        // 9. 每日工作
        dailyTasks: [
          '追蹤專案進度',
          '處理專案相關問題',
          '與團隊成員溝通協調',
          '審核採購申請',
          '監控庫存異動'
        ],

        // 10. 每週工作
        weeklyTasks: [
          '召開專案週會',
          '更新專案進度報告',
          '審核供應商績效',
          '檢視庫存水位',
          '團隊成員一對一面談'
        ],

        // 11. 每月工作
        monthlyTasks: [
          '編製專案月報',
          '進行月度預算檢討',
          '供應商績效評估',
          '庫存盤點',
          '提交管理層報告',
          '團隊培訓活動'
        ],

        // 元資料
        summary: '通過有效的規劃、協調和監控，確保專案部能夠高效運作，如期如質完成的專案目標，為公司和客戶創造價值。',
        version: '1.0',
        status: 'published' as const,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-11-20'),
        createdBy: 'HR Admin'
      },
      // =====================================================
      // JD-004: 出納會計
      // 來源: Bombus-ISMS-AD-4-125-出納會計工作職務說明書-20250326.pdf
      // =====================================================
      {
        id: 'jd-cashier-001',
        positionCode: 'AD-4-125',
        positionName: '出納會計',
        department: '財務部',
        gradeLevel: 'P1',

        // 1. 主要職責
        responsibilities: [
          '資金管理與支付作業：每日資金進出應妥善、細心作業',
          '應付款應取得主管簽章核准後，始得付款，並確保支付對象及金額的正確性',
          '按規定每日登記現金日記帳與銀行存款日記帳，確保帳務準確',
          '票據管理與銀行往來：保管好各種空白支票、票據，確保票據安全與妥善管理',
          '準備銀行額度申請所需之必要資料，確保融資需求順利進行',
          '資金對帳與帳務核對：每日資金、現金及零用金進出登錄，確保系統對帳表、現金簿與銀行對帳單、庫存現金/零用金相符',
          '每日產出銀行餘額明細表，確保公司資金管理透明',
          '每月製作銀行融資明細表，提供管理階層參考',
          '票據作業與資金調度：確保公司資金充足並合理調度，避免資金閒置或短缺',
          '應付票據開立與兌現，確保支付準確及時',
          '應收票據託收與兌現，確保應收帳款順利回收',
          '現金及零用金管理，確保日常運營資金充足且記錄清楚',
          '有價證券等進出作業，依公司政策執行，並確保合規'
        ],

        // 2. 職務目的
        jobPurpose: [
          '管帳不管錢、管錢不管帳，應分由專人管理',
          '降低舞弊與盜用風險',
          '符合內部內控流程管理'
        ],

        // 3. 職務要求
        qualifications: [
          '具財稅(經)、會計科系大學學歷以上',
          '具至少2年以上會計與財務相關專業經歷',
          '具備銀行存款轉帳、收付、開/收票等資金操作實務經驗',
          '具備資金規劃之作業經驗',
          '具備銀行借/還款實務經驗，熟悉相關操作流程',
          '熟悉現金與零用金管理，具備良好的風險管控意識',
          '具備製作銀行貸款明細表的實務經驗，能清楚記錄資金流向',
          '具備良好溝通與協調能力，能夠有效與銀行、內部財務團隊及其他部門協作',
          '具備團隊合作精神，能夠主動配合業務需求並確保資金管理順暢'
        ],

        // 4. 最終有價值產品 VFP
        vfp: [
          '確保資金流動順暢，準確執行每日收付款，確保資金安全與即時處理',
          '維護會計記錄，確保帳務透明與準確性',
          '定期核對對帳表，確保與銀行對帳單相符，維護財務數據的一致性與準確性',
          '確保帳、物相符，嚴格控管現金與票據，維護出納作業的標準化與完整性'
        ],

        // 5. 職能基準 (包含 KSA)
        competencyStandards: [
          {
            mainDuty: '資金管理與支付',
            tasks: [
              { taskName: '資金收付作業', outputs: ['現金日記帳', '銀行存款日記帳'], indicators: ['每日資金進出妥善作業', '確保支付對象及金額的正確性'] },
              { taskName: '票據管理', outputs: ['票據登記簿', '銀行額度申請資料'], indicators: ['保管空白支票、票據', '準備銀行額度申請所需資料'] }
            ]
          },
          {
            mainDuty: '帳務核對',
            tasks: [
              { taskName: '資金對帳', outputs: ['銀行餘額明細表', '銀行調節表'], indicators: ['每日資金、現金及零用金進出登錄', '確保系統對帳表與銀行對帳單相符'] },
              { taskName: '月結作業', outputs: ['銀行融資明細表'], indicators: ['每月製作銀行融資明細表'] }
            ]
          },
          {
            mainDuty: '資金調度',
            tasks: [
              { taskName: '資金調度', outputs: ['資金調度報表'], indicators: ['確保公司資金充足並合理調度', '避免資金閒置或短缺'] },
              { taskName: '票據兌現', outputs: ['票據兌現紀錄'], indicators: ['應付票據開立與兌現', '應收票據託收與兌現'] }
            ]
          }
        ],
        requiredCompetencies: [
          { competencyId: 'c-hr-k-acc', competencyName: '會計專業知識', type: 'knowledge' as const, requiredLevel: 3, weight: 25 },
          { competencyId: 'c-hr-s-fund', competencyName: '資金管理', type: 'skill' as const, requiredLevel: 3, weight: 25 },
          { competencyId: 'c-hr-a-care', competencyName: '細心謹慎', type: 'attitude' as const, requiredLevel: 4, weight: 20 },
          { competencyId: 'c-core-3', competencyName: '溝通表達', type: 'skill' as const, requiredLevel: 2, weight: 15 },
          { competencyId: 'c-hr-a-integ', competencyName: '誠信正直', type: 'attitude' as const, requiredLevel: 4, weight: 15 }
        ],

        // 5.1 職能需求 (分類含權重)
        coreCompetencyRequirements: [
          { competencyId: 'core-001', competencyName: '溝通表達', type: 'core' as const, requiredLevel: 'L2' as const, weight: 10 },
          { competencyId: 'core-002', competencyName: '問題解決', type: 'core' as const, requiredLevel: 'L2' as const, weight: 10 },
          { competencyId: 'core-005', competencyName: '成長思維', type: 'core' as const, requiredLevel: 'L2' as const, weight: 5 }
        ],
        managementCompetencyRequirements: [],
        ksaCompetencyRequirements: [
          { competencyId: 'ksa-k-001', competencyName: '會計專業知識', ksaType: 'knowledge' as const, weight: 20 },
          { competencyId: 'ksa-k-002', competencyName: '銀行作業知識', ksaType: 'knowledge' as const, weight: 15 },
          { competencyId: 'ksa-s-001', competencyName: '資金管理能力', ksaType: 'skill' as const, weight: 15 },
          { competencyId: 'ksa-s-002', competencyName: '帳務處理能力', ksaType: 'skill' as const, weight: 10 },
          { competencyId: 'ksa-a-001', competencyName: '謹慎細心', ksaType: 'attitude' as const, weight: 10 },
          { competencyId: 'ksa-a-002', competencyName: '正直誠實', ksaType: 'attitude' as const, weight: 5 }
        ],

        // 5.2 職能內涵 (K/S/A) - 依據 AD-4-125 MD 文件
        ksaContent: {
          knowledge: [
            { code: 'K01', name: '財務相關法規', description: 'TIFRS(國際會計準則)、商業會計法、商業會計處理準則、稅法' },
            { code: 'K02', name: '財務報表相關知識', description: '現金日記帳、銀行存款日記帳、銀行調節表等' },
            { code: 'K03', name: '成本概論', description: '了解成本控制與資金管理' },
            { code: 'K04', name: '電腦資訊相關知識', description: '會計系統與銀行系統操作' },
            { code: 'K05', name: '財務分析規劃相關知識', description: '資金規劃與調度' },
            { code: 'K06', name: '產業趨勢', description: '了解金融市場與銀行往來實務' }
          ],
          skills: [
            { code: 'S01', name: '電腦資訊應用能力', description: '熟練操作會計系統與銀行系統' },
            { code: 'S02', name: '資料蒐集彙整能力', description: '能準確蒐集並彙整資金資料' },
            { code: 'S03', name: '文書處理能力', description: '能製作財務報表與相關文件' },
            { code: 'S04', name: '分析規劃能力', description: '能進行資金規劃與調度' },
            { code: 'S05', name: '計算能力', description: '準確計算資金收付金額' },
            { code: 'S06', name: '檢核能力', description: '能仔細核對帳務資料的正確性' },
            { code: 'S07', name: '專案報表管理能力', description: '能編製資金報表與銀行融資明細表' }
          ],
          attitudes: [
            { code: 'A01', name: '主動積極', description: '不需他人指示或要求能自動自發做事，面臨問題立即採取行動加以解決' },
            { code: 'A02', name: '正直誠實', description: '展現高道德標準及值得信賴的行為，嚴守資金管理紀律' },
            { code: 'A03', name: '持續學習', description: '能夠展現自我提升的企圖心，學習新知識與技能' },
            { code: 'A04', name: '謹慎細心', description: '對於資金收付作業，能謹慎考量及處理所有細節，確保帳物相符' },
            { code: 'A05', name: '壓力容忍', description: '冷靜且有效地應對資金調度壓力與緊急狀況' },
            { code: 'A06', name: '自我管理', description: '設立明確目標，展現高度進取與負責任的行為' }
          ]
        },

        // 6. 工作描述
        workDescription: [
          '執行每日資金收付作業',
          '登記現金日記帳與銀行存款日記帳',
          '保管票據並執行票據作業',
          '進行資金對帳與核對',
          '執行資金調度作業'
        ],

        // 7. 檢查清單
        checklist: [
          { item: '現金日記帳登錄完成', points: 1 },
          { item: '銀行存款日記帳登錄完成', points: 1 },
          { item: '銀行餘額明細表產出', points: 1 },
          { item: '零用金核對', points: 1 },
          { item: '票據保管確認', points: 2 },
          { item: '資金對帳完成', points: 2 }
        ],

        // 8. 職務責任
        jobDuties: [
          '確保每日資金收付的正確性',
          '維護票據的安全與完整',
          '確保帳務與實際資金一致',
          '降低資金操作風險',
          '配合內部稽核要求'
        ],

        // 9. 每日工作
        dailyTasks: [
          '登記現金日記帳',
          '登記銀行存款日記帳',
          '產出銀行餘額明細表',
          '執行資金收付作業',
          '核對零用金餘額'
        ],

        // 10. 每週工作
        weeklyTasks: [
          '核對銀行對帳單',
          '整理待兌現票據',
          '更新資金調度計畫',
          '整理銀行往來文件'
        ],

        // 11. 每月工作
        monthlyTasks: [
          '製作銀行融資明細表',
          '進行月度資金對帳',
          '編製銀行調節表',
          '提交月度出納報表',
          '配合月結作業'
        ],

        // 元資料
        summary: '確保資金流動順暢，準確執行每日收付款，確保資金安全與即時處理。維護會計記錄，確保帳務透明與準確性。',
        version: '2.0',
        status: 'published' as const,
        createdAt: new Date('2024-03-01'),
        updatedAt: new Date('2024-11-20'),
        createdBy: 'HR Admin'
      },
      // =====================================================
      // JD-005: 招募與績效管理
      // 來源: Bombus-ISMS-HR-4-084-招募與績效管理工作職務說明書-V1.0-1130229.pdf
      // =====================================================
      {
        id: 'jd-hr-recruit-001',
        positionCode: 'HR-4-084',
        positionName: '招募與績效管理',
        department: '人資部',
        gradeLevel: 'P3',

        // 1. 主要職責
        responsibilities: [
          '依據產業或組織發展的用人規劃需求，執行人員招募甄選之任務',
          '協助組織尋找合適人才、適時檢視招募甄選成效與提出改善建議',
          '依法令規範與組織政策，規劃發展員工關係策略',
          '作為企業與內部成員間的溝通橋樑，維護勞資關係和諧達到企業組織發展',
          '了解與確認人力需求',
          '了解與確認職位說明書與工作規範',
          '運用徵才管道與搜尋履歷',
          '運用甄選工具決定錄取人選'
        ],

        // 2. 職務目的
        jobPurpose: [
          '確保組織人力需求獲得滿足',
          '維護勞資關係和諧',
          '支持企業組織發展'
        ],

        // 3. 職務要求
        qualifications: [
          '人力資源或相關科系大學以上學歷',
          '3年以上人力資源管理經驗',
          '熟悉招募甄選流程與工具',
          '熟悉勞動法規與人資作業流程',
          '具備良好的溝通協調能力'
        ],

        // 4. 最終有價值產品 VFP
        vfp: [
          '招募到符合組織需求的合適人才',
          '維護良好的勞資關係',
          '提升招募甄選成效'
        ],

        // 5. 職能基準 (包含 KSA)
        competencyStandards: [
          {
            mainDuty: '協助了解與確認人力需求與工作規範',
            tasks: [
              { taskName: '了解與確認人力需求', outputs: ['人力需求單'], indicators: ['當單位提出人力招募需求時，依據組織既定的人力需求計畫，確認並申請核准人力需求職類人數與進用時程', '彙整臨時性或跨部門的人力招募需求'] },
              { taskName: '了解與確認職位說明書與工作規範', outputs: ['職缺與徵才條件表'], indicators: ['人力招募需求經核准後，確認並依據職缺職位說明書與工作規範，撰寫或更新公司介紹／職缺訊息／徵才條件'] }
            ]
          },
          {
            mainDuty: '運用徵才管道與搜尋履歷',
            tasks: [
              { taskName: '確認與使用徵才管道', outputs: ['徵才管道效益分析表'], indicators: ['依據職務需求與求才時間，選擇內部或外部合適的徵才管道', '運用內部管道，如離職人才回任、內部員工推薦、轉調機制', '運用外部管道，如人力銀行、校園徵才、獵才公司'] },
              { taskName: '搜尋與篩選履歷', outputs: ['適合履歷'], indicators: ['運用科技／工具搜尋符合資格條件之履歷', '依照職位說明書／工作規範與用人主管討論，確認初選合格名單'] }
            ]
          },
          {
            mainDuty: '運用甄選工具決定錄取人選',
            tasks: [
              { taskName: '使用合適甄選工具與執行甄選', outputs: ['甄選面談紀錄表', '背景調查結果報告', '甄選工具效益分析表'], indicators: ['依照職務類別選擇合適的甄選工具', '規劃／安排面談時間場次與場地', '視職務性質與需求，安排合適之專業測驗', '進行背景調查，收集或驗證應徵人選先前工作表現'] }
            ]
          }
        ],
        requiredCompetencies: [
          { competencyId: 'c-hr-s-recruit', competencyName: '招募甄選', type: 'skill' as const, requiredLevel: 4, weight: 25 },
          { competencyId: 'c-hr-s-interview', competencyName: '面試技巧', type: 'skill' as const, requiredLevel: 4, weight: 20 },
          { competencyId: 'c-hr-k-labor', competencyName: '勞動法規知識', type: 'knowledge' as const, requiredLevel: 3, weight: 20 },
          { competencyId: 'c-core-3', competencyName: '溝通表達', type: 'skill' as const, requiredLevel: 4, weight: 20 },
          { competencyId: 'c-hr-a-proact', competencyName: '積極主動', type: 'attitude' as const, requiredLevel: 4, weight: 15 }
        ],

        // 5.1 職能需求 (分類含權重)
        coreCompetencyRequirements: [
          { competencyId: 'core-001', competencyName: '溝通表達', type: 'core' as const, requiredLevel: 'L4' as const, weight: 15 },
          { competencyId: 'core-002', competencyName: '問題解決', type: 'core' as const, requiredLevel: 'L3' as const, weight: 10 },
          { competencyId: 'core-004', competencyName: '客戶導向', type: 'core' as const, requiredLevel: 'L3' as const, weight: 10 }
        ],
        managementCompetencyRequirements: [],
        ksaCompetencyRequirements: [
          { competencyId: 'ksa-k-001', competencyName: '勞動法規知識', ksaType: 'knowledge' as const, weight: 15 },
          { competencyId: 'ksa-k-002', competencyName: '績效管理知識', ksaType: 'knowledge' as const, weight: 10 },
          { competencyId: 'ksa-s-001', competencyName: '招募甄選能力', ksaType: 'skill' as const, weight: 15 },
          { competencyId: 'ksa-s-002', competencyName: '面試技巧', ksaType: 'skill' as const, weight: 10 },
          { competencyId: 'ksa-a-001', competencyName: '主動積極', ksaType: 'attitude' as const, weight: 10 },
          { competencyId: 'ksa-a-002', competencyName: '正直誠實', ksaType: 'attitude' as const, weight: 5 }
        ],

        // 5.2 職能內涵 (K/S/A) - 依據 HR-4-084 MD 文件
        ksaContent: {
          knowledge: [
            { code: 'K01', name: '產業、公司概況與人事規章制度', description: '了解產業趨勢與公司人事規定' },
            { code: 'K02', name: '招募甄選、僱用與引導作業流程概念', description: '熟悉完整招募作業流程' },
            { code: 'K03', name: '人力規劃及需求分析', description: '能分析人力需求並規劃招募計畫' },
            { code: 'K04', name: '工作分析與職位說明書', description: '能撰寫與維護職位說明書' },
            { code: 'K05', name: '勞動相關法令', description: '就業服務法、勞動基準法、稅法、職工福利金條例、身心障礙權益保障法、性別工作平等法、性騷擾防治法、個人資料保護法、勞動事件法等' },
            { code: 'K06', name: '雇主品牌的概念', description: '了解雇主品牌經營與人才吸引策略' },
            { code: 'K07', name: '內外部徵才管道', description: '熟悉各種徵才管道的運用' },
            { code: 'K08', name: '公司甄選流程與工具', description: '熟悉公司甄選流程與評估工具' },
            { code: 'K09', name: '職業適性測驗工具', description: '了解職業適性測驗的應用' },
            { code: 'K10', name: '職能測評工具', description: '熟悉職能測評工具的使用' },
            { code: 'K11', name: '性格測驗工具', description: '了解性格測驗的應用與解讀' },
            { code: 'K12', name: '人才資料庫資料更新與管理', description: '能維護與管理人才資料庫' },
            { code: 'K13', name: '公司訓練政策', description: '了解公司訓練政策與新人訓練流程' },
            { code: 'K14', name: '產業勞動力供需資訊', description: '掌握產業人才市場動態' }
          ],
          skills: [
            { code: 'S01', name: '基礎專案管理能力', description: '能有效管理招募專案' },
            { code: 'S02', name: '時間管理能力', description: '能有效管理招募時程' },
            { code: 'S03', name: '正確傾聽與溝通協調技巧', description: '能與用人主管及應徵者有效溝通' },
            { code: 'S04', name: '基礎統計分析與解讀能力', description: '能分析招募數據與成效' },
            { code: 'S05', name: '公文文書撰寫能力', description: '能撰寫招募相關文件' },
            { code: 'S06', name: '電腦文書軟體操作能力', description: '熟練操作辦公軟體' },
            { code: 'S07', name: '資料蒐集能力', description: '能蒐集產業與人才市場資訊' },
            { code: 'S08', name: '文案撰寫能力', description: '能撰寫吸引人才的職缺說明' },
            { code: 'S09', name: '人脈拓展能力', description: '能建立與維護人才網絡' },
            { code: 'S10', name: '招募系統應用能力', description: '熟練操作招募管理系統' },
            { code: 'S11', name: '履歷篩選能力', description: '能有效篩選符合條件的履歷' },
            { code: 'S12', name: '面談設計與面談技巧', description: '能設計結構化面試並有效評估應徵者' },
            { code: 'S13', name: '問題解決能力', description: '能解決招募過程中的問題' },
            { code: 'S14', name: '視訊工具應用能力', description: '能運用視訊工具進行遠距面試' },
            { code: 'S15', name: '人際互動與表達能力', description: '能與各層級人員有效互動' },
            { code: 'S23', name: '人力資源需求規劃能力', description: '能規劃人力資源需求' },
            { code: 'S24', name: '人力資源報告撰寫能力', description: '能撰寫招募成效報告' }
          ],
          attitudes: [
            { code: 'A01', name: '主動積極', description: '不需他人指示或要求能自動自發做事，面臨問題立即採取行動加以解決' },
            { code: 'A02', name: '正直誠實', description: '展現高道德標準及值得信賴的行為，以維持組織誠信為行事原則' },
            { code: 'A03', name: '持續學習', description: '能夠展現自我提升的企圖心，學習任務所需的新知識與技能' },
            { code: 'A04', name: '謹慎細心', description: '對於任務的執行過程，能謹慎考量及處理所有細節' },
            { code: 'A05', name: '壓力容忍', description: '冷靜且有效地應對及處理高度緊張的情況或壓力' },
            { code: 'A06', name: '自我管理', description: '設立定義明確且實際可行的個人目標，展現高度進取與負責任的行為' },
            { code: 'A07', name: '親和力', description: '對他人表現理解、友善、同理心、關心和禮貌，並能與不同背景的人發展及維持良好關係' },
            { code: 'A08', name: '應對不確定性', description: '當狀況不明或問題不夠具體的情況下，能在必要時採取行動，以有效釐清模糊不清的態勢' }
          ]
        },

        // 6. 工作描述
        workDescription: [
          '確認人力需求並規劃招募作業',
          '運用多元徵才管道尋找人才',
          '執行面試與甄選作業',
          '進行背景調查與錄用決策',
          '維護雇主品牌與招募成效分析'
        ],

        // 7. 檢查清單
        checklist: [
          { item: '確認人力需求單', points: 1 },
          { item: '更新職缺說明', points: 1 },
          { item: '發布職缺', points: 1 },
          { item: '篩選履歷', points: 2 },
          { item: '安排面試', points: 2 },
          { item: '進行背景調查', points: 2 },
          { item: '完成錄用通知', points: 2 }
        ],

        // 8. 職務責任
        jobDuties: [
          '確保招募作業符合組織需求',
          '維護良好的應徵者體驗',
          '達成招募目標與時程',
          '確保甄選過程公正公平',
          '維護招募資料保密性'
        ],

        // 9. 每日工作
        dailyTasks: [
          '查看履歷與安排面試',
          '與用人主管溝通招募進度',
          '回覆應徵者詢問',
          '更新招募系統資料'
        ],

        // 10. 每週工作
        weeklyTasks: [
          '彙整招募進度報告',
          '檢視各職缺招募狀態',
          '優化招募管道效益',
          '參與面試與甄選會議'
        ],

        // 11. 每月工作
        monthlyTasks: [
          '編製招募月報',
          '分析招募成效指標',
          '優化招募流程',
          '更新職缺說明書',
          '維護雇主品牌活動'
        ],

        // 元資料
        summary: '依據產業或組織發展的用人規劃需求，執行人員招募甄選之任務，協助組織尋找合適人才、適時檢視招募甄選成效與提出改善建議。',
        version: '1.0',
        status: 'published' as const,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-11-20'),
        createdBy: 'HR Admin'
      },
      // =====================================================
      // JD-006: 財務會計
      // 來源: Bombus-ISMS-HR-4-096-財務會計工作職務說明書-V1.0-1130229.pdf
      // =====================================================
      {
        id: 'jd-fin-acc-001',
        positionCode: 'HR-4-096',
        positionName: '財務會計',
        department: '財務部',
        gradeLevel: 'P2',

        // 1. 主要職責
        responsibilities: [
          '負責監督和管理公司專案的財務活動，確保專案的財務規劃、預算管理、成本控制和財務報告的準確性和及時性',
          '與專案團隊和其他部門密切合作，確保專案的財務健康和合規性',
          '制定和管理專案的財務計劃和預算，確保專案資金的有效分配和使用',
          '監控專案的財務狀況，包括收入、成本和支出，及時報告財務狀況和異常情況',
          '協助專案部進行財務分析和決策，提供準確的財務數據和建議',
          '與專案團隊合作，確保專案的財務活動符合公司的財務政策和程序',
          '編制和審核專案的財務報告，確保數據的準確性和完整性',
          '識別和評估專案的財務風險，並提出風險管理方案',
          '參與專案的成本控制和優化活動，確保專案的財務效益最大化',
          '與內部和外部審計機構合作，確保專案的財務活動符合相關法律和規範',
          '提供財務培訓和指導，提升專案團隊的財務管理能力'
        ],

        // 2. 職務目的
        jobPurpose: [
          '收齊所有應收的收入、及時支付的支出與有形資產，以增加資產的價值',
          '讓公司主管隨時都能獲得精準、及時的財務資料',
          '規畫管理財務與稅務會計，並維護會計系統，確保它符合管理階層與政府機關的要求',
          '確保企業的財務狀況良好，並提供準確的財務資訊來支持管理層的決策'
        ],

        // 3. 職務要求
        qualifications: [
          '具會計或財務相關專業學經歷，至少5年以上財務管理經驗，專案財務管理經驗者優先',
          '熟悉財務分析、預算管理和成本控制的工具和方法',
          '從事會計及簿記之記錄與計算、付款、收款及開立扣繳或免扣繳憑單等工作',
          '從事分析企業各項量化資料，提出與財務、投資、融資等相關之專業報告',
          '優秀的數據分析和報告能力，能夠準確地解讀和呈現財務數據',
          '優秀的溝通和協調能力，能夠與多個部門和團隊合作',
          '良好的問題解決和決策能力，能夠在壓力下工作',
          '熟練使用財務管理ERP系統和MS Office套件（特別是Excel）',
          '熟悉會計準則和稅法法規'
        ],

        // 4. 最終有價值產品 VFP
        vfp: [
          '正確、及時紀錄並保存完整的財務資料'
        ],

        // 5. 職能基準 (包含 KSA)
        competencyStandards: [
          {
            mainDuty: '製作組織財務原始憑證',
            tasks: [
              { taskName: '審查財務收款文件及憑證', outputs: ['付款傳票', '沖帳傳票'], indicators: ['依據一般記帳與會計準則，辦理組織專案或協力廠商之支出請款事宜', '確認經辦人員依權責辦理各類原始憑證', '確認原始記帳憑證與會計科目正確無誤'] },
              { taskName: '辦理日常應付帳款作業', outputs: ['應付帳款報表'], indicators: ['核對ERP與紙本憑證一致，入ERP作業'] }
            ]
          }
        ],
        requiredCompetencies: [
          { competencyId: 'c-hr-k-acc', competencyName: '會計專業知識', type: 'knowledge' as const, requiredLevel: 4, weight: 25 },
          { competencyId: 'c-prof-4', competencyName: '資料分析', type: 'skill' as const, requiredLevel: 4, weight: 20 },
          { competencyId: 'c-hr-k-tax', competencyName: '稅務法規知識', type: 'knowledge' as const, requiredLevel: 3, weight: 20 },
          { competencyId: 'c-core-3', competencyName: '溝通表達', type: 'skill' as const, requiredLevel: 3, weight: 15 },
          { competencyId: 'c-hr-a-care', competencyName: '細心謹慎', type: 'attitude' as const, requiredLevel: 4, weight: 20 }
        ],

        // 5.1 職能需求 (分類含權重)
        coreCompetencyRequirements: [
          { competencyId: 'core-001', competencyName: '溝通表達', type: 'core' as const, requiredLevel: 'L3' as const, weight: 10 },
          { competencyId: 'core-002', competencyName: '問題解決', type: 'core' as const, requiredLevel: 'L3' as const, weight: 10 },
          { competencyId: 'core-005', competencyName: '成長思維', type: 'core' as const, requiredLevel: 'L3' as const, weight: 5 }
        ],
        managementCompetencyRequirements: [],
        ksaCompetencyRequirements: [
          { competencyId: 'ksa-k-001', competencyName: '會計專業知識', ksaType: 'knowledge' as const, weight: 20 },
          { competencyId: 'ksa-k-002', competencyName: '稅務法規知識', ksaType: 'knowledge' as const, weight: 15 },
          { competencyId: 'ksa-s-001', competencyName: '資料分析能力', ksaType: 'skill' as const, weight: 15 },
          { competencyId: 'ksa-s-002', competencyName: '財務報表編製能力', ksaType: 'skill' as const, weight: 10 },
          { competencyId: 'ksa-a-001', competencyName: '謹慎細心', ksaType: 'attitude' as const, weight: 10 },
          { competencyId: 'ksa-a-002', competencyName: '持續學習', ksaType: 'attitude' as const, weight: 5 }
        ],

        // 5.2 職能內涵 (K/S/A) - 依據 HR-4-096 MD 文件
        ksaContent: {
          knowledge: [
            { code: 'K01', name: '財務相關法規', description: 'TIFRS(國際會計準則)、商業會計法、商業會計處理準則、稅法、洗錢防制法、公司法、證券交易法' },
            { code: 'K02', name: '財務報表相關知識', description: '資產負債表、綜合損益表、權益變動表與現金流量表、財務資訊、各類政府規定之申報表' },
            { code: 'K03', name: '成本概論', description: '成本分析與成本控制方法' },
            { code: 'K04', name: '電腦資訊相關知識', description: '財務管理ERP系統和MS Office套件操作' },
            { code: 'K05', name: '財務分析規劃相關知識', description: '財務分析、預算管理和成本控制的工具和方法' },
            { code: 'K06', name: '產業趨勢', description: '了解產業現況與專案財務管理趨勢' }
          ],
          skills: [
            { code: 'S01', name: '電腦資訊應用能力', description: '熟練操作財務管理ERP系統' },
            { code: 'S02', name: '資料蒐集彙整能力', description: '能有效蒐集並彙整專案財務資料' },
            { code: 'S03', name: '文書處理能力', description: '能撰寫專業財務報告與文件' },
            { code: 'S04', name: '分析規劃能力', description: '能進行專案財務分析與規劃' },
            { code: 'S05', name: '計算能力', description: '準確計算專案財務數據' },
            { code: 'S06', name: '檢核能力', description: '能仔細檢核專案財務資料的正確性' },
            { code: 'S07', name: '專案報表管理能力', description: '能編製與管理專案財務報表' }
          ],
          attitudes: [
            { code: 'A01', name: '主動積極', description: '不需他人指示或要求能自動自發做事，面臨問題立即採取行動加以解決' },
            { code: 'A02', name: '正直誠實', description: '展現高道德標準及值得信賴的行為，以維持組織誠信為行事原則' },
            { code: 'A03', name: '持續學習', description: '能夠展現自我提升的企圖心，學習任務所需的新知識與技能' },
            { code: 'A04', name: '謹慎細心', description: '對於任務的執行過程，能謹慎考量及處理所有細節' },
            { code: 'A05', name: '壓力容忍', description: '冷靜且有效地應對及處理高度緊張的情況或壓力' },
            { code: 'A06', name: '自我管理', description: '設立定義明確且實際可行的個人目標，展現高度進取與負責任的行為' }
          ]
        },

        // 6. 工作描述
        workDescription: [
          '監督和管理專案的財務活動',
          '制定和管理專案的財務計劃和預算',
          '編制和審核專案的財務報告',
          '識別和評估專案的財務風險',
          '提供財務培訓和指導'
        ],

        // 7. 檢查清單
        checklist: [
          { item: '審查財務收款文件', points: 2 },
          { item: '製作付款傳票', points: 2 },
          { item: '核對ERP與紙本憑證', points: 2 },
          { item: '編制財務報告', points: 3 },
          { item: '評估財務風險', points: 3 }
        ],

        // 8. 職務責任
        jobDuties: [
          '確保專案財務報告的準確性',
          '維護專案的財務健康',
          '支持專案部的財務決策',
          '確保財務活動符合法規要求'
        ],

        // 9. 每日工作
        dailyTasks: [
          '審核財務憑證',
          '登錄會計傳票',
          '處理專案收支',
          '回覆財務詢問'
        ],

        // 10. 每週工作
        weeklyTasks: [
          '編製週報表',
          '檢視專案預算執行',
          '核對帳務資料',
          '與專案團隊溝通'
        ],

        // 11. 每月工作
        monthlyTasks: [
          '編製專案財務報表',
          '進行預算差異分析',
          '提交管理報表',
          '進行月度結帳'
        ],

        // 元資料
        summary: '負責監督和管理公司專案的財務活動，確保專案的財務規劃、預算管理、成本控制和財務報告的準確性和及時性。',
        version: '1.0',
        status: 'published' as const,
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date('2024-11-20'),
        createdBy: 'HR Admin'
      },
      // =====================================================
      // JD-007: 業務部業務
      // 來源: Bombus-ISMS-HR-4-093-業務部業務工作職務說明書-V1.0-1130229.pdf
      // =====================================================
      {
        id: 'jd-sales-001',
        positionCode: 'HR-4-093',
        positionName: '業務部業務',
        department: '業務部',
        gradeLevel: 'P2',

        // 1. 主要職責
        responsibilities: [
          '進行專案提案企畫',
          '掌握客戶需求',
          '協助開發潛在客戶',
          '經營與維繫客戶關係',
          '處理客戶抱怨及問題',
          '維護良好的客戶互動'
        ],

        // 2. 職務目的
        jobPurpose: [
          '收齊所有應收的收入、及時支付的支出與有形資產，以增加資產的價值',
          '讓公司主管隨時都能獲得精準、及時的財務資料',
          '規畫管理財務與稅務會計，並維護會計系統，確保它符合管理階層與政府機關的要求',
          '確保企業的財務狀況良好，並提供準確的財務資訊來支持管理層的決策'
        ],

        // 3. 職務要求
        qualifications: [
          '業務或相關科系大學以上學歷',
          '2年以上業務相關經驗',
          '具備良好的溝通與談判能力',
          '熟悉客戶關係管理',
          '具備問題解決能力'
        ],

        // 4. 最終有價值產品 VFP
        vfp: [
          '正確、及時紀錄並保存完整的財務資料',
          '達成業務目標',
          '維護良好客戶關係'
        ],

        // 5. 職能基準 (包含 KSA)
        competencyStandards: [
          {
            mainDuty: '管理客戶關係',
            tasks: [
              { taskName: '掌握客戶需求', outputs: ['客戶需求紀錄'], indicators: ['依據客戶資料，詢問並釐清客戶對服務或產品的需求及偏好', '針對客戶需求及偏好，提供適合的服務或產品採購建議'] },
              { taskName: '協助開發潛在客戶', outputs: ['客戶開發紀錄'], indicators: ['依據組織營運目標，訂定年度的客戶開發策略及方式', '運用組織社群網絡關係與科技工具，協助開發潛在客戶'] },
              { taskName: '經營與維繫客戶關係', outputs: ['客戶聯繫紀錄', '客訴處理紀錄'], indicators: ['根據組織規範與營運策略，協助發展客戶忠誠度', '確認客戶的抱怨及問題，並能及時處理', '與客戶建立及維持良好的互動'] }
            ]
          }
        ],
        requiredCompetencies: [
          { competencyId: 'c-core-3', competencyName: '溝通表達', type: 'skill' as const, requiredLevel: 4, weight: 25 },
          { competencyId: 'c-hr-s-nego', competencyName: '談判協商', type: 'skill' as const, requiredLevel: 4, weight: 25 },
          { competencyId: 'c-hr-a-service', competencyName: '服務導向', type: 'attitude' as const, requiredLevel: 4, weight: 20 },
          { competencyId: 'c-core-2', competencyName: '問題解決', type: 'skill' as const, requiredLevel: 3, weight: 15 },
          { competencyId: 'c-hr-a-proact', competencyName: '積極主動', type: 'attitude' as const, requiredLevel: 4, weight: 15 }
        ],

        // 5.1 職能需求 (分類含權重)
        coreCompetencyRequirements: [
          { competencyId: 'core-001', competencyName: '溝通表達', type: 'core' as const, requiredLevel: 'L4' as const, weight: 15 },
          { competencyId: 'core-002', competencyName: '問題解決', type: 'core' as const, requiredLevel: 'L3' as const, weight: 10 },
          { competencyId: 'core-004', competencyName: '客戶導向', type: 'core' as const, requiredLevel: 'L4' as const, weight: 15 }
        ],
        managementCompetencyRequirements: [],
        ksaCompetencyRequirements: [
          { competencyId: 'ksa-k-001', competencyName: '產品知識', ksaType: 'knowledge' as const, weight: 15 },
          { competencyId: 'ksa-k-002', competencyName: '市場知識', ksaType: 'knowledge' as const, weight: 10 },
          { competencyId: 'ksa-s-001', competencyName: '談判協商能力', ksaType: 'skill' as const, weight: 15 },
          { competencyId: 'ksa-s-002', competencyName: '客戶關係管理能力', ksaType: 'skill' as const, weight: 10 },
          { competencyId: 'ksa-a-001', competencyName: '服務導向', ksaType: 'attitude' as const, weight: 5 },
          { competencyId: 'ksa-a-002', competencyName: '積極主動', ksaType: 'attitude' as const, weight: 5 }
        ],

        // 5.2 職能內涵 (K/S/A) - 依據 HR-4-093 PDF 文件
        ksaContent: {
          knowledge: [
            { code: 'K01', name: '產業與公司概況知識', description: '了解產業趨勢與公司產品服務' },
            { code: 'K02', name: '客戶關係管理知識', description: '了解客戶關係管理的原理與方法' },
            { code: 'K03', name: '銷售流程知識', description: '熟悉銷售流程與技巧' },
            { code: 'K04', name: '市場分析知識', description: '了解市場分析與競爭分析方法' }
          ],
          skills: [
            { code: 'S01', name: '客戶需求分析能力', description: '能詢問並釐清客戶對服務或產品的需求及偏好' },
            { code: 'S02', name: '客戶開發能力', description: '運用組織社群網絡關係與科技工具，協助開發潛在客戶' },
            { code: 'S03', name: '客戶關係維護能力', description: '與客戶建立及維持良好的互動' },
            { code: 'S04', name: '客訴處理能力', description: '確認客戶的抱怨及問題，並能及時處理' },
            { code: 'S05', name: '溝通表達能力', description: '能有效與客戶溝通並提供專業建議' },
            { code: 'S06', name: '談判協商能力', description: '能進行有效的商業談判' }
          ],
          attitudes: [
            { code: 'A01', name: '主動積極', description: '不需他人指示或要求能自動自發做事，面臨問題立即採取行動加以解決' },
            { code: 'A02', name: '服務導向', description: '以客戶需求為中心，提供優質服務' },
            { code: 'A03', name: '正直誠實', description: '展現高道德標準及值得信賴的行為' },
            { code: 'A04', name: '持續學習', description: '能夠展現自我提升的企圖心，學習任務所需的新知識與技能' },
            { code: 'A05', name: '壓力容忍', description: '冷靜且有效地應對及處理高度緊張的情況或壓力' }
          ]
        },

        // 6. 工作描述
        workDescription: [
          '掌握客戶需求並提供解決方案',
          '開發潛在客戶',
          '維護現有客戶關係',
          '處理客訴並提升客戶滿意度',
          '達成業務目標'
        ],

        // 7. 檢查清單
        checklist: [
          { item: '客戶需求記錄', points: 2 },
          { item: '客戶聯繫記錄', points: 1 },
          { item: '客訴處理', points: 3 },
          { item: '業務報表', points: 2 }
        ],

        // 8. 職務責任
        jobDuties: [
          '達成業務目標',
          '維護客戶滿意度',
          '開發新客戶',
          '維護良好客戶關係'
        ],

        // 9. 每日工作
        dailyTasks: [
          '聯繫客戶',
          '處理客戶詢問',
          '更新客戶資料',
          '跟進業務機會'
        ],

        // 10. 每週工作
        weeklyTasks: [
          '業務週報',
          '客戶拜訪',
          '業務會議',
          '檢視業績進度'
        ],

        // 11. 每月工作
        monthlyTasks: [
          '業務月報',
          '客戶滿意度調查',
          '業績檢討會議',
          '市場分析'
        ],

        // 元資料
        summary: '負責客戶關係管理、業務開發與維護，確保達成業務目標並維護良好客戶關係。',
        version: '1.0',
        status: 'published' as const,
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date('2024-11-20'),
        createdBy: 'HR Admin'
      },
      // =====================================================
      // JD-008: 技術部工程師
      // 來源: Bombus-ISMS-HR-4-088-技術部工程師工作職務說明書-V1.0-1130119.pdf
      // =====================================================
      {
        id: 'jd-engineer-001',
        positionCode: 'HR-4-088',
        positionName: '技術部工程師',
        department: '技術部',
        gradeLevel: 'P2',

        // 1. 主要職責
        responsibilities: [
          '負責資通網路設備建置、安裝與維護等事宜',
          '資通網路系統規劃、建置與維護管理',
          '規劃符合客戶需求之產品，創造業務營收',
          '路由協定應用',
          '規劃網路專案執行',
          '執行企業整合通訊網路',
          '規劃並組態虛擬私有網路通道協定',
          '管理資通網路',
          '監控、分析及處理網路警報'
        ],

        // 2. 職務目的
        jobPurpose: [
          '負責資通網路設備建置、安裝與維護等事宜',
          '資通網路系統規劃、建置與維護管理',
          '規劃符合客戶需求之產品，創造業務營收'
        ],

        // 3. 職務要求
        qualifications: [
          '資訊工程、電機或相關科系大學以上學歷',
          '2年以上網路工程相關經驗',
          '熟悉網路協定與設備',
          '具備問題分析與解決能力',
          '具備團隊合作精神'
        ],

        // 4. 最終有價值產品 VFP
        vfp: [
          '穩定運作的網路系統',
          '符合客戶需求的技術解決方案',
          '高品質的技術服務'
        ],

        // 5. 職能基準 (包含 KSA)
        competencyStandards: [
          {
            mainDuty: '建置資通網路',
            tasks: [
              { taskName: '路由協定應用', outputs: ['安裝紀錄'], indicators: ['應用路由協定，確認安全性危害，實施風險控管措施', '設定路由介面，測試進階路由實作定址'] },
              { taskName: '規劃網路專案執行', outputs: ['執行計畫書'], indicators: ['分析不同型態的網路技術', '檢視法規、規範標準，製作網路部署設計或計畫文件'] },
              { taskName: '執行企業整合通訊網路', outputs: ['規劃報告', '設定紀錄', '完工報告'], indicators: ['規劃企業整合通訊網路基礎架構建置順序', '安裝並設定企業整合通訊網路基礎架構', '測試與評估網路效能'] },
              { taskName: '規劃並組態虛擬私有網路通道協定', outputs: ['網路拓樸圖', '設定紀錄', 'VPLS拓樸圖', '定版計畫'], indicators: ['建立多協定標籤交換(MPLS)服務', '組態MPLS網路並驗證訊務工程(TE)', '製作最終設計定版計畫'] }
            ]
          },
          {
            mainDuty: '管理資通網路',
            tasks: [
              { taskName: '監控、分析及處理網路警報', outputs: ['警報處理報告'], indicators: ['規劃網路警報的應變', '根據服務等級協議(SLA)，安排警報的動作及順序', '安排網路問題矯正', '清除警報'] }
            ]
          }
        ],
        requiredCompetencies: [
          { competencyId: 'c-tech-network', competencyName: '網路技術', type: 'skill' as const, requiredLevel: 4, weight: 30 },
          { competencyId: 'c-core-2', competencyName: '問題解決', type: 'skill' as const, requiredLevel: 4, weight: 25 },
          { competencyId: 'c-tech-security', competencyName: '資訊安全', type: 'knowledge' as const, requiredLevel: 3, weight: 20 },
          { competencyId: 'c-core-1', competencyName: '團隊合作', type: 'attitude' as const, requiredLevel: 3, weight: 15 },
          { competencyId: 'c-hr-a-proact', competencyName: '積極主動', type: 'attitude' as const, requiredLevel: 4, weight: 10 }
        ],

        // 5.1 職能需求 (分類含權重)
        coreCompetencyRequirements: [
          { competencyId: 'core-001', competencyName: '溝通表達', type: 'core' as const, requiredLevel: 'L3' as const, weight: 10 },
          { competencyId: 'core-002', competencyName: '問題解決', type: 'core' as const, requiredLevel: 'L4' as const, weight: 15 },
          { competencyId: 'core-003', competencyName: '專案思維', type: 'core' as const, requiredLevel: 'L3' as const, weight: 10 },
          { competencyId: 'core-005', competencyName: '成長思維', type: 'core' as const, requiredLevel: 'L3' as const, weight: 5 }
        ],
        managementCompetencyRequirements: [],
        ksaCompetencyRequirements: [
          { competencyId: 'ksa-k-001', competencyName: '網路技術知識', ksaType: 'knowledge' as const, weight: 20 },
          { competencyId: 'ksa-k-002', competencyName: '資訊安全知識', ksaType: 'knowledge' as const, weight: 15 },
          { competencyId: 'ksa-s-001', competencyName: '系統維運能力', ksaType: 'skill' as const, weight: 10 },
          { competencyId: 'ksa-s-002', competencyName: '故障排除能力', ksaType: 'skill' as const, weight: 10 },
          { competencyId: 'ksa-a-001', competencyName: '主動積極', ksaType: 'attitude' as const, weight: 5 }
        ],

        // 5.2 職能內涵 (K/S/A) - 依據 HR-4-088 PDF 文件
        ksaContent: {
          knowledge: [
            { code: 'K01', name: '網路協定知識', description: '了解路由協定、TCP/IP、MPLS等網路協定' },
            { code: 'K02', name: '網路架構知識', description: '了解企業網路架構設計與規劃' },
            { code: 'K03', name: '資訊安全知識', description: '了解網路安全風險與防護措施' },
            { code: 'K04', name: '虛擬網路技術', description: '了解VPN、VPLS等虛擬網路技術' },
            { code: 'K05', name: '網路設備知識', description: '熟悉各類網路設備的功能與操作' }
          ],
          skills: [
            { code: 'S01', name: '路由協定應用能力', description: '能應用路由協定，確認安全性危害，實施風險控管措施' },
            { code: 'S02', name: '網路專案規劃能力', description: '能分析不同型態的網路技術，製作網路部署設計或計畫文件' },
            { code: 'S03', name: '網路建置能力', description: '能規劃並安裝企業整合通訊網路基礎架構' },
            { code: 'S04', name: 'VPN設定能力', description: '能規劃並組態虛擬私有網路通道協定' },
            { code: 'S05', name: '網路監控能力', description: '能監控、分析及處理網路警報' },
            { code: 'S06', name: '問題解決能力', description: '能診斷並解決網路問題' },
            { code: 'S07', name: '技術文件撰寫能力', description: '能撰寫技術文件與規劃報告' }
          ],
          attitudes: [
            { code: 'A01', name: '主動積極', description: '不需他人指示或要求能自動自發做事，面臨問題立即採取行動加以解決' },
            { code: 'A02', name: '正直誠實', description: '展現高道德標準及值得信賴的行為' },
            { code: 'A03', name: '持續學習', description: '能夠展現自我提升的企圖心，學習新技術與知識' },
            { code: 'A04', name: '謹慎細心', description: '對於網路設定與操作，能謹慎考量及處理所有細節' },
            { code: 'A05', name: '壓力容忍', description: '冷靜且有效地應對網路故障與緊急狀況' },
            { code: 'A06', name: '團隊合作', description: '能與他人有效協作，達成共同目標' }
          ]
        },

        // 6. 工作描述
        workDescription: [
          '建置與維護網路設備',
          '規劃與執行網路專案',
          '監控與處理網路警報',
          '提供技術支援服務',
          '撰寫技術文件'
        ],

        // 7. 檢查清單
        checklist: [
          { item: '網路設備運作正常', points: 3 },
          { item: '網路效能符合標準', points: 2 },
          { item: '安全性檢查', points: 3 },
          { item: '文件更新', points: 1 }
        ],

        // 8. 職務責任
        jobDuties: [
          '確保網路系統穩定運作',
          '及時處理網路問題',
          '維護網路安全',
          '提升網路效能'
        ],

        // 9. 每日工作
        dailyTasks: [
          '監控網路狀態',
          '處理網路警報',
          '回覆技術詢問',
          '執行例行維護'
        ],

        // 10. 每週工作
        weeklyTasks: [
          '網路效能分析',
          '安全性檢查',
          '設備狀態檢視',
          '技術會議'
        ],

        // 11. 每月工作
        monthlyTasks: [
          '網路月報',
          '容量規劃',
          '安全性評估',
          '設備盤點',
          '技術培訓'
        ],

        // 元資料
        summary: '負責資通網路設備建置、安裝與維護等事宜，資通網路系統規劃、建置與維護管理。',
        version: '1.0',
        status: 'published' as const,
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-11-20'),
        createdBy: 'HR Admin'
      },
      // =====================================================
      // JD-009: 專業經理人
      // 來源: Bombus-ISMS-HR-4-082-專業經理人工作職務說明書-V1.0-1130119.pdf
      // =====================================================
      {
        id: 'jd-pro-mgr-001',
        positionCode: 'HR-4-082',
        positionName: '專業經理人',
        department: '管理部',
        gradeLevel: 'M2',

        // 1. 主要職責
        responsibilities: [
          '根據主管制定的目標與職責，規劃職務的目標',
          '發展出改進公司營運的方案，並呈交主管核准',
          '從事分析企業各項量化資料，提出與財務、投資、融資等相關之專業報告',
          '執行各項與資金有關之收、支、存等財務作業',
          '發展中小型企業之營運計畫，並依營運目標進行產品行銷與財務管理'
        ],

        // 2. 職務目的
        jobPurpose: [
          '規劃與執行公司營運策略',
          '提升公司營運效能',
          '達成組織績效目標'
        ],

        // 3. 職務要求
        qualifications: [
          '企業管理或相關科系大學以上學歷',
          '5年以上管理經驗',
          '熟悉財務管理與會計原則',
          '具備領導能力與團隊管理技能',
          '具備策略思維與分析能力'
        ],

        // 4. 最終有價值產品 VFP
        vfp: [
          '改進公司營運的有效方案',
          '準確的財務與投資專業報告',
          '成功執行的營運計畫'
        ],

        // 5. 職能基準 (包含 KSA)
        competencyStandards: [
          {
            mainDuty: '營運規劃',
            tasks: [
              { taskName: '規劃職務目標', outputs: ['目標計畫書'], indicators: ['根據主管制定的目標與職責，規劃職務的目標'] },
              { taskName: '發展改進方案', outputs: ['營運改善方案'], indicators: ['發展出改進公司營運的方案，並呈交主管核准'] }
            ]
          },
          {
            mainDuty: '財務分析',
            tasks: [
              { taskName: '企業資料分析', outputs: ['財務分析報告', '投資報告', '融資報告'], indicators: ['從事分析企業各項量化資料', '提出與財務、投資、融資等相關之專業報告'] },
              { taskName: '資金作業執行', outputs: ['財務作業紀錄'], indicators: ['執行各項與資金有關之收、支、存等財務作業'] }
            ]
          },
          {
            mainDuty: '營運管理',
            tasks: [
              { taskName: '營運計畫發展', outputs: ['營運計畫書'], indicators: ['發展中小型企業之營運計畫', '依營運目標進行產品行銷與財務管理'] }
            ]
          }
        ],
        requiredCompetencies: [
          { competencyId: 'c-mgmt-3', competencyName: '策略規劃', type: 'skill' as const, requiredLevel: 4, weight: 25 },
          { competencyId: 'c-mgmt-1', competencyName: '團隊領導', type: 'skill' as const, requiredLevel: 4, weight: 20 },
          { competencyId: 'c-hr-k-fin', competencyName: '經營管理知識', type: 'knowledge' as const, requiredLevel: 4, weight: 20 },
          { competencyId: 'c-core-2', competencyName: '問題解決', type: 'skill' as const, requiredLevel: 4, weight: 15 },
          { competencyId: 'c-core-3', competencyName: '溝通表達', type: 'skill' as const, requiredLevel: 4, weight: 20 }
        ],

        // 5.1 職能需求 (分類含權重)
        coreCompetencyRequirements: [
          { competencyId: 'core-001', competencyName: '溝通表達', type: 'core' as const, requiredLevel: 'L4' as const, weight: 10 },
          { competencyId: 'core-002', competencyName: '問題解決', type: 'core' as const, requiredLevel: 'L4' as const, weight: 10 },
          { competencyId: 'core-003', competencyName: '專案思維', type: 'core' as const, requiredLevel: 'L4' as const, weight: 10 },
          { competencyId: 'core-004', competencyName: '客戶導向', type: 'core' as const, requiredLevel: 'L4' as const, weight: 5 },
          { competencyId: 'core-005', competencyName: '成長思維', type: 'core' as const, requiredLevel: 'L4' as const, weight: 5 }
        ],
        managementCompetencyRequirements: [
          { competencyId: 'mgmt-001', competencyName: '人才發展', type: 'management' as const, requiredLevel: 'L4' as const, weight: 10 },
          { competencyId: 'mgmt-002', competencyName: '決策能力', type: 'management' as const, requiredLevel: 'L4' as const, weight: 10 },
          { competencyId: 'mgmt-003', competencyName: '團隊領導', type: 'management' as const, requiredLevel: 'L4' as const, weight: 10 }
        ],
        ksaCompetencyRequirements: [
          { competencyId: 'ksa-k-001', competencyName: '經營管理知識', ksaType: 'knowledge' as const, weight: 10 },
          { competencyId: 'ksa-s-001', competencyName: '策略規劃能力', ksaType: 'skill' as const, weight: 10 },
          { competencyId: 'ksa-s-002', competencyName: '營運管理能力', ksaType: 'skill' as const, weight: 5 },
          { competencyId: 'ksa-a-001', competencyName: '主動積極', ksaType: 'attitude' as const, weight: 5 }
        ],

        // 5.2 職能內涵 (K/S/A) - 依據 HR-4-082 MD 文件
        ksaContent: {
          knowledge: [
            { code: 'K01', name: '財務相關法規', description: 'TIFRS(國際會計準則)、商業會計法、稅法等財務法規' },
            { code: 'K02', name: '財務報表相關知識', description: '資產負債表、綜合損益表、權益變動表與現金流量表等' },
            { code: 'K03', name: '成本概論', description: '成本分析與成本控制方法' },
            { code: 'K04', name: '電腦資訊相關知識', description: '進銷存系統與辦公軟體操作' },
            { code: 'K05', name: '財務分析規劃相關知識', description: '財務分析方法與營運規劃技巧' },
            { code: 'K06', name: '產業趨勢', description: '了解產業現況與未來發展趨勢' },
            { code: 'K07', name: '風險管理', description: '了解風險評估與管控方法' }
          ],
          skills: [
            { code: 'S01', name: '電腦資訊應用能力', description: '熟練操作進銷存系統與辦公軟體' },
            { code: 'S02', name: '資料蒐集彙整能力', description: '能有效蒐集並彙整營運資料' },
            { code: 'S03', name: '文書處理能力', description: '能撰寫專業營運報告與文件' },
            { code: 'S04', name: '分析規劃能力', description: '能進行營運分析與策略規劃' },
            { code: 'S05', name: '計算能力', description: '準確計算各項營運數據' },
            { code: 'S06', name: '檢核能力', description: '能仔細檢核營運資料的正確性' },
            { code: 'S07', name: '專案報表管理能力', description: '能編製與管理營運報表' }
          ],
          attitudes: [
            { code: 'A01', name: '主動積極', description: '不需他人指示或要求能自動自發做事，面臨問題立即採取行動加以解決' },
            { code: 'A02', name: '正直誠實', description: '展現高道德標準及值得信賴的行為，以維持組織誠信為行事原則' },
            { code: 'A03', name: '持續學習', description: '能夠展現自我提升的企圖心，學習任務所需的新知識與技能' },
            { code: 'A04', name: '謹慎細心', description: '對於任務的執行過程，能謹慎考量及處理所有細節' },
            { code: 'A05', name: '壓力容忍', description: '冷靜且有效地應對及處理高度緊張的情況或壓力' },
            { code: 'A06', name: '自我管理', description: '設立定義明確且實際可行的個人目標，展現高度進取與負責任的行為' }
          ]
        },

        // 6. 工作描述
        workDescription: [
          '根據主管制定的目標與職責，規劃職務的目標',
          '發展出改進公司營運的方案',
          '從事分析企業各項量化資料',
          '執行各項與資金有關之財務作業',
          '發展中小型企業之營運計畫'
        ],

        // 7. 檢查清單
        checklist: [
          { item: '目標計畫書完成', points: 3 },
          { item: '財務報告審核', points: 3 },
          { item: '營運方案提交', points: 4 },
          { item: '預算執行檢視', points: 2 }
        ],

        // 8. 職務責任
        jobDuties: [
          '達成營運目標',
          '提升公司效能',
          '確保財務健康',
          '培育團隊成員'
        ],

        // 9. 每日工作
        dailyTasks: [
          '審核重要文件',
          '參與決策會議',
          '監控營運狀況',
          '處理緊急事務'
        ],

        // 10. 每週工作
        weeklyTasks: [
          '召開部門週會',
          '審核週報',
          '與主管匯報進度',
          '檢視績效指標'
        ],

        // 11. 每月工作
        monthlyTasks: [
          '編製月度報表',
          '召開月度檢討會議',
          '進行績效評估',
          '更新營運計畫',
          '提交管理報告'
        ],

        // 元資料
        summary: '負責規劃與執行公司營運策略，分析企業資料並提出專業報告，達成組織績效目標。',
        version: '1.0',
        status: 'published' as const,
        createdAt: new Date('2024-03-15'),
        updatedAt: new Date('2024-11-20'),
        createdBy: 'HR Admin'
      }
    ];
    return of(jds).pipe(delay(400));
  }

  // =====================================================
  // Private Mock Data Methods
  // =====================================================

  private getCoreCompetencies(): CompetencyItem[] {
    // =====================================================
    // 核心職能 - 組織全員必備的核心價值觀與行為準則
    // 來源：9 份 JD 文件中的共通態度職能
    // =====================================================
    return [
      // ------------------- 態度類 (A) -------------------
      {
        id: 'c-core-a01',
        code: 'CORE-A01',
        name: '主動積極',
        type: 'attitude',
        category: 'core',
        level: 'intermediate',
        description: '不需他人指示或要求能自動自發做事，面臨問題立即採取行動加以解決，且為達目標願意主動承擔額外責任。',
        behaviorIndicators: [
          '主動發現並處理工作中的問題',
          '不等待指示即自發性完成任務',
          '願意承擔額外責任以達成目標',
          '積極尋求改善機會與解決方案'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-core-a02',
        code: 'CORE-A02',
        name: '正直誠實',
        type: 'attitude',
        category: 'core',
        level: 'basic',
        description: '展現高道德標準及值得信賴的行為，且能以維持組織誠信為行事原則，瞭解違反組織、自己及他人的道德標準之影響。',
        behaviorIndicators: [
          '遵守公司規章制度與職業道德',
          '誠實面對錯誤並積極改正',
          '保護公司及客戶機密資訊',
          '言行一致，信守承諾'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-core-a03',
        code: 'CORE-A03',
        name: '持續學習',
        type: 'attitude',
        category: 'core',
        level: 'basic',
        description: '能夠展現自我提升的企圖心，利用且積極參與各種機會，學習任務所需的新知識與技能，並能有效應用在特定任務。',
        behaviorIndicators: [
          '主動參加培訓課程與研討會',
          '關注產業趨勢與新技術發展',
          '樂於接受回饋並改進',
          '將學習成果應用於工作實務'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-core-a04',
        code: 'CORE-A04',
        name: '謹慎細心',
        type: 'attitude',
        category: 'core',
        level: 'intermediate',
        description: '對於任務的執行過程，能謹慎考量及處理所有細節，精確地檢視每個程序，並持續對其保持高度關注。',
        behaviorIndicators: [
          '仔細核對資料確保正確無誤',
          '建立檢核機制避免錯誤發生',
          '注重工作細節與品質',
          '主動發現並修正潛在問題'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-core-a05',
        code: 'CORE-A05',
        name: '壓力容忍',
        type: 'attitude',
        category: 'core',
        level: 'intermediate',
        description: '冷靜且有效地應對及處理高度緊張的情況或壓力，如緊迫的時間、不友善的人、各類突發事件及危急狀況，並能以適當的方式紓解自身壓力。',
        behaviorIndicators: [
          '在壓力下保持冷靜與專注',
          '有效處理緊急狀況與突發事件',
          '能在時間壓力下完成工作',
          '適當紓解壓力維持工作效能'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-core-a06',
        code: 'CORE-A06',
        name: '自我管理',
        type: 'attitude',
        category: 'core',
        level: 'intermediate',
        description: '設立定義明確且實際可行的個人目標；對於及時完成任務展現高度進取、努力、承諾及負責任的行為。',
        behaviorIndicators: [
          '設定明確且可衡量的工作目標',
          '有效管理個人時間與工作進度',
          '對工作成果負責到底',
          '持續追蹤進度並適時調整'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-core-a07',
        code: 'CORE-A07',
        name: '親和力',
        type: 'attitude',
        category: 'core',
        level: 'intermediate',
        description: '對他人表現理解、友善、同理心、關心和禮貌，並能與不同背景的人發展及維持良好關係。',
        behaviorIndicators: [
          '展現友善親切的態度',
          '能與不同背景的人建立良好關係',
          '傾聽並理解他人的想法與感受',
          '給予適當的支持與協助'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-core-a08',
        code: 'CORE-A08',
        name: '應對不確定性',
        type: 'attitude',
        category: 'core',
        level: 'advanced',
        description: '當狀況不明或問題不夠具體的情況下，能在必要時採取行動，以有效釐清模糊不清的態勢。',
        behaviorIndicators: [
          '在資訊不完整時仍能做出合理判斷',
          '主動釐清模糊不清的狀況',
          '靈活應對變化與不確定性',
          '從錯誤中快速學習調整'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      // ------------------- 技能類 (S) -------------------
      {
        id: 'c-core-s01',
        code: 'CORE-S01',
        name: '團隊合作',
        type: 'skill',
        category: 'core',
        level: 'intermediate',
        description: '能與他人有效協作，達成共同目標，展現合作精神與團隊意識。',
        behaviorIndicators: [
          '主動協助團隊成員解決問題',
          '積極參與團隊討論並提出建設性意見',
          '尊重他人意見並能妥協達成共識',
          '分享知識與經驗促進團隊成長'
        ],
        linkedCourses: ['course-001', 'course-002'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-core-s02',
        code: 'CORE-S02',
        name: '問題解決',
        type: 'skill',
        category: 'core',
        level: 'intermediate',
        description: '能分析問題根因並提出有效解決方案，識別和解決工作中的問題和風險。',
        behaviorIndicators: [
          '能系統性分析問題的根本原因',
          '提出多種可行的解決方案',
          '評估方案利弊並選擇最佳解決途徑',
          '追蹤解決成效並持續改善'
        ],
        linkedCourses: ['course-003'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-core-s03',
        code: 'CORE-S03',
        name: '溝通表達',
        type: 'skill',
        category: 'core',
        level: 'intermediate',
        description: '能清晰表達想法並有效傳遞訊息，具備優秀的口語與書面溝通能力。',
        behaviorIndicators: [
          '口語表達清晰、條理分明',
          '書面報告結構完整、重點突出',
          '能根據對象調整溝通方式',
          '有效傾聽並正確理解他人意見'
        ],
        linkedCourses: ['course-004'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-core-s04',
        code: 'CORE-S04',
        name: '創新思維',
        type: 'skill',
        category: 'core',
        level: 'advanced',
        description: '能跳脫框架思考，提出創新解決方案，推動工作流程與方法的改善。',
        behaviorIndicators: [
          '主動提出改善現有流程的建議',
          '嘗試新方法解決既有問題',
          '鼓勵團隊成員提出創新想法',
          '善用新技術提升工作效能'
        ],
        linkedCourses: ['course-006'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-core-s05',
        code: 'CORE-S05',
        name: '客戶導向',
        type: 'skill',
        category: 'core',
        level: 'intermediate',
        description: '以客戶需求為中心，提供優質服務，持續提升客戶滿意度。',
        behaviorIndicators: [
          '主動了解並預測客戶需求',
          '及時回應客戶問題與要求',
          '持續改善以提升客戶滿意度',
          '建立並維護良好的客戶關係'
        ],
        linkedCourses: ['course-007'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      }
    ];
  }

  private getProfessionalCompetencies(): CompetencyItem[] {
    // =====================================================
    // 專業職能 - 各職務所需的專業知識與技能
    // 來源：9 份 JD 文件中的 K/S/A 職能內涵
    // =====================================================
    return [
      // =====================================================
      // 財務會計類 - 知識 (K)
      // =====================================================
      {
        id: 'c-fin-k01',
        code: 'FIN-K01',
        name: '財務相關法規',
        type: 'knowledge',
        category: 'ksa',
        level: 'advanced',
        description: 'TIFRS(國際會計準則)、商業會計法、商業會計處理準則、稅法、洗錢防制法、公司法、證券交易法與其他相關稅法。',
        behaviorIndicators: [
          '了解並正確應用國際會計準則(TIFRS)',
          '熟悉商業會計法與處理準則',
          '掌握稅法與相關法規更新動態',
          '確保財務作業符合法規要求'
        ],
        linkedCourses: ['course-fin-001'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-fin-k02',
        code: 'FIN-K02',
        name: '財務報表相關知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '資產負債表、綜合損益表、權益變動表與現金流量表、財務資訊、各類政府規定之申報表及特殊需求報表等。',
        behaviorIndicators: [
          '能正確編製四大財務報表',
          '了解報表間的勾稽關係',
          '能進行財務報表分析與解讀',
          '正確編製政府規定之申報表'
        ],
        linkedCourses: ['course-fin-002'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-fin-k03',
        code: 'FIN-K03',
        name: '成本概論',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '成本分類、成本計算、成本分析與成本控制方法，了解成本與管理會計的應用。',
        behaviorIndicators: [
          '了解成本分類與計算方法',
          '能進行成本差異分析',
          '掌握成本控制技巧',
          '應用成本資訊支持決策'
        ],
        linkedCourses: ['course-fin-003'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-fin-k04',
        code: 'FIN-K04',
        name: '財務分析規劃知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'advanced',
        description: '財務分析方法、預算規劃、投資評估、資金調度與財務規劃技巧。',
        behaviorIndicators: [
          '能進行財務比率分析',
          '掌握預算編製與管理方法',
          '了解投資評估與決策分析',
          '進行資金預測與規劃'
        ],
        linkedCourses: ['course-fin-004'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-fin-k05',
        code: 'FIN-K05',
        name: '風險管理知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'advanced',
        description: '了解風險評估、風險識別、風險控制與風險管理框架。',
        behaviorIndicators: [
          '能識別並評估財務風險',
          '建立風險管理機制',
          '執行風險監控與報告',
          '提出風險因應策略'
        ],
        linkedCourses: ['course-fin-005'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      // =====================================================
      // 財務會計類 - 技能 (S)
      // =====================================================
      {
        id: 'c-fin-s01',
        code: 'FIN-S01',
        name: '電腦資訊應用能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '熟練操作會計系統、ERP系統與辦公軟體，能有效運用資訊工具提升工作效率。',
        behaviorIndicators: [
          '熟練操作財務管理ERP系統',
          '精通Excel進行財務分析',
          '能使用專業會計軟體',
          '善用資訊工具提升效率'
        ],
        linkedCourses: ['course-it-001'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-fin-s02',
        code: 'FIN-S02',
        name: '資料蒐集彙整能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能有效蒐集、整理與彙整財務資料，確保資料的完整性與正確性。',
        behaviorIndicators: [
          '系統性蒐集所需財務資料',
          '有效整理與分類資料',
          '確保資料正確性與完整性',
          '建立資料管理機制'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-fin-s03',
        code: 'FIN-S03',
        name: '文書處理能力',
        type: 'skill',
        category: 'ksa',
        level: 'basic',
        description: '能撰寫專業財務報告與文件，具備良好的文書表達能力。',
        behaviorIndicators: [
          '撰寫清晰專業的財務報告',
          '製作規範的財務文件',
          '文件格式符合公司規範',
          '有效傳達財務資訊'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-fin-s04',
        code: 'FIN-S04',
        name: '分析規劃能力',
        type: 'skill',
        category: 'ksa',
        level: 'advanced',
        description: '能進行財務分析與規劃，提供決策支持資訊。',
        behaviorIndicators: [
          '能進行財務比率分析',
          '製作分析報表支持決策',
          '規劃財務策略與預算',
          '提出改善建議方案'
        ],
        linkedCourses: ['course-fin-010'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-fin-s05',
        code: 'FIN-S05',
        name: '計算能力',
        type: 'skill',
        category: 'ksa',
        level: 'basic',
        description: '準確計算各項財務數據，確保計算結果的正確性。',
        behaviorIndicators: [
          '準確計算財務數據',
          '正確執行數學運算',
          '使用工具輔助複雜計算',
          '驗證計算結果正確性'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-fin-s06',
        code: 'FIN-S06',
        name: '檢核能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能仔細檢核財務資料的正確性，發現異常並及時處理。',
        behaviorIndicators: [
          '仔細核對財務資料',
          '發現並追查異常項目',
          '建立檢核標準流程',
          '確保帳務正確性'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-fin-s07',
        code: 'FIN-S07',
        name: '專案報表管理能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能編製與管理專案財務報表，追蹤專案財務狀況。',
        behaviorIndicators: [
          '編製專案財務報表',
          '追蹤專案預算執行',
          '分析專案成本與效益',
          '提供專案財務建議'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-fin-s08',
        code: 'FIN-S08',
        name: '資金管理能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能有效管理企業資金與現金流，確保資金調度順暢。',
        behaviorIndicators: [
          '準確執行每日收付款作業',
          '妥善管理票據與銀行往來',
          '進行資金調度與流動性管理',
          '編製資金預測報表'
        ],
        linkedCourses: ['course-fin-020'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      // =====================================================
      // 人力資源類 - 知識 (K)
      // =====================================================
      {
        id: 'c-hr-k01',
        code: 'HR-K01',
        name: '產業與公司概況知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'basic',
        description: '了解產業趨勢、公司概況與人事規章制度。',
        behaviorIndicators: [
          '了解產業發展趨勢',
          '熟悉公司組織與文化',
          '掌握人事規章制度',
          '了解公司業務與產品'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-hr-k02',
        code: 'HR-K02',
        name: '招募甄選作業流程知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '熟悉招募甄選、僱用與引導作業流程概念，了解完整招募作業流程。',
        behaviorIndicators: [
          '了解完整招募作業流程',
          '熟悉甄選工具與方法',
          '掌握僱用作業規範',
          '了解新人引導流程'
        ],
        linkedCourses: ['course-hr-001'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-hr-k03',
        code: 'HR-K03',
        name: '人力規劃及需求分析知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '能分析人力需求並規劃招募計畫。',
        behaviorIndicators: [
          '分析組織人力需求',
          '預測人力供需缺口',
          '規劃招募策略',
          '評估人力成本效益'
        ],
        linkedCourses: ['course-hr-002'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-hr-k04',
        code: 'HR-K04',
        name: '工作分析與職位說明書知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '能撰寫與維護職位說明書，進行工作分析。',
        behaviorIndicators: [
          '進行工作分析',
          '撰寫職位說明書',
          '定義職位職責與要求',
          '維護更新職位資料'
        ],
        linkedCourses: ['course-hr-003'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-hr-k05',
        code: 'HR-K05',
        name: '勞動相關法令知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '就業服務法、勞動基準法、稅法、職工福利金條例、身心障礙權益保障法、性別工作平等法、性騷擾防治法、個人資料保護法、勞動事件法等。',
        behaviorIndicators: [
          '了解勞動法規核心條文',
          '正確應用法規於人事作業',
          '追蹤法規修訂動態',
          '確保人事作業合法合規'
        ],
        linkedCourses: ['course-hr-004'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-hr-k06',
        code: 'HR-K06',
        name: '雇主品牌概念',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '了解雇主品牌經營與人才吸引策略。',
        behaviorIndicators: [
          '了解雇主品牌概念',
          '規劃雇主品牌策略',
          '執行雇主品牌活動',
          '評估雇主品牌效益'
        ],
        linkedCourses: ['course-hr-005'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-hr-k07',
        code: 'HR-K07',
        name: '徵才管道知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '熟悉內外部徵才管道的運用，如人力銀行、校園徵才、獵才公司等。',
        behaviorIndicators: [
          '了解各類徵才管道特性',
          '選擇適合的徵才管道',
          '評估管道效益',
          '開發新徵才管道'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-hr-k08',
        code: 'HR-K08',
        name: '甄選流程與工具知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '熟悉公司甄選流程與各類評估工具，包含職業適性測驗、職能測評、性格測驗等。',
        behaviorIndicators: [
          '了解甄選流程設計',
          '熟悉各類測評工具',
          '正確使用甄選工具',
          '解讀測評結果'
        ],
        linkedCourses: ['course-hr-006'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      // =====================================================
      // 人力資源類 - 技能 (S)
      // =====================================================
      {
        id: 'c-hr-s01',
        code: 'HR-S01',
        name: '招募甄選能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能有效執行人才招募與甄選作業，找到符合組織需求的人才。',
        behaviorIndicators: [
          '準確分析職位需求',
          '善用多元管道招募',
          '運用適當甄選方法',
          '建立維護人才資料庫'
        ],
        linkedCourses: ['course-hr-010'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-hr-s02',
        code: 'HR-S02',
        name: '面談設計與面談技巧',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能設計結構化面試並有效評估應徵者，運用行為事例法進行深度提問。',
        behaviorIndicators: [
          '設計結構化面試問題',
          '運用STAR法進行提問',
          '準確判斷應徵者職能',
          '提供客觀面試評估'
        ],
        linkedCourses: ['course-hr-011'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-hr-s03',
        code: 'HR-S03',
        name: '履歷篩選能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能有效篩選符合條件的履歷，快速識別適合人選。',
        behaviorIndicators: [
          '快速掌握履歷重點',
          '對照職位需求篩選',
          '識別關鍵經歷與能力',
          '建立篩選標準'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-hr-s04',
        code: 'HR-S04',
        name: '招募系統應用能力',
        type: 'skill',
        category: 'ksa',
        level: 'basic',
        description: '熟練操作招募管理系統，有效管理招募流程。',
        behaviorIndicators: [
          '熟練操作招募系統',
          '管理應徵者資料',
          '追蹤招募進度',
          '產出招募報表'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-hr-s05',
        code: 'HR-S05',
        name: '人力資源報告撰寫能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能撰寫招募成效報告與人力資源分析報告。',
        behaviorIndicators: [
          '撰寫招募成效報告',
          '分析招募數據指標',
          '提出改善建議',
          '製作管理報表'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      // =====================================================
      // 專案管理類 - 知識 (K)
      // =====================================================
      {
        id: 'c-pm-k01',
        code: 'PM-K01',
        name: '專案管理知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '熟悉專案管理工具和方法（如PMP、Agile、Scrum等）。',
        behaviorIndicators: [
          '了解專案管理框架',
          '掌握專案管理方法論',
          '熟悉敏捷開發方法',
          '應用專案管理工具'
        ],
        linkedCourses: ['course-pm-001'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-pm-k02',
        code: 'PM-K02',
        name: '採購流程知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '熟悉採購流程、合約管理與供應商管理的工具與方法。',
        behaviorIndicators: [
          '了解採購作業流程',
          '掌握合約管理要點',
          '熟悉供應商管理方法',
          '了解採購法規'
        ],
        linkedCourses: ['course-pm-002'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-pm-k03',
        code: 'PM-K03',
        name: '庫存管理知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '熟悉庫存管理流程、庫存控制與倉儲管理的工具與方法。',
        behaviorIndicators: [
          '了解庫存管理原則',
          '掌握庫存控制方法',
          '熟悉倉儲管理作業',
          '應用庫存管理系統'
        ],
        linkedCourses: ['course-pm-003'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      // =====================================================
      // 專案管理類 - 技能 (S)
      // =====================================================
      {
        id: 'c-pm-s01',
        code: 'PM-S01',
        name: '專案規劃能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能制定專案計劃，確定專案目標、範疇和資源需求。',
        behaviorIndicators: [
          '制定專案計劃',
          '定義專案範疇',
          '規劃資源需求',
          '建立專案時程'
        ],
        linkedCourses: ['course-pm-010'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-pm-s02',
        code: 'PM-S02',
        name: '談判協商能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '優秀的談判與協商技能，能夠確保最佳的採購條件。',
        behaviorIndicators: [
          '準備談判策略',
          '有效進行商業談判',
          '達成雙贏協議',
          '維護公司利益'
        ],
        linkedCourses: ['course-pm-011'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-pm-s03',
        code: 'PM-S03',
        name: '供應商管理能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能有效管理供應商關係與採購作業，確保供應品質與交期。',
        behaviorIndicators: [
          '評估選擇供應商',
          '建立供應商關係',
          '監控供應商績效',
          '處理供應商問題'
        ],
        linkedCourses: ['course-pm-012'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-pm-s04',
        code: 'PM-S04',
        name: '數據分析能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '優秀的數據分析與報告能力，能準確解讀與呈現數據。',
        behaviorIndicators: [
          '蒐集分析相關數據',
          '製作數據報表',
          '解讀數據意涵',
          '提出數據驅動建議'
        ],
        linkedCourses: ['course-pm-013'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      // =====================================================
      // 業務銷售類 - 知識 (K)
      // =====================================================
      {
        id: 'c-sales-k01',
        code: 'SALES-K01',
        name: '產業與公司概況知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'basic',
        description: '了解產業趨勢與公司產品服務。',
        behaviorIndicators: [
          '了解產業發展趨勢',
          '熟悉公司產品與服務',
          '掌握競爭對手資訊',
          '了解市場動態'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-sales-k02',
        code: 'SALES-K02',
        name: '客戶關係管理知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '了解客戶關係管理的原理與方法。',
        behaviorIndicators: [
          '了解CRM系統應用',
          '掌握客戶分級方法',
          '了解客戶經營策略',
          '熟悉客戶服務流程'
        ],
        linkedCourses: ['course-sales-001'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-sales-k03',
        code: 'SALES-K03',
        name: '銷售流程知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '熟悉銷售流程與技巧，了解銷售方法論。',
        behaviorIndicators: [
          '了解銷售流程',
          '掌握銷售技巧',
          '熟悉報價流程',
          '了解合約簽訂程序'
        ],
        linkedCourses: ['course-sales-002'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      // =====================================================
      // 業務銷售類 - 技能 (S)
      // =====================================================
      {
        id: 'c-sales-s01',
        code: 'SALES-S01',
        name: '客戶需求分析能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能詢問並釐清客戶對服務或產品的需求及偏好，提供適合的解決方案。',
        behaviorIndicators: [
          '有效挖掘客戶需求',
          '分析客戶痛點',
          '提供客製化方案',
          '滿足客戶期望'
        ],
        linkedCourses: ['course-sales-010'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-sales-s02',
        code: 'SALES-S02',
        name: '客戶開發能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '運用組織社群網絡關係與科技工具，協助開發潛在客戶。',
        behaviorIndicators: [
          '開發潛在客戶',
          '建立客戶名單',
          '執行開發策略',
          '達成開發目標'
        ],
        linkedCourses: ['course-sales-011'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-sales-s03',
        code: 'SALES-S03',
        name: '客戶關係維護能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '與客戶建立及維持良好的互動，提升客戶忠誠度。',
        behaviorIndicators: [
          '定期拜訪客戶',
          '維繫客戶關係',
          '提供加值服務',
          '提升客戶滿意度'
        ],
        linkedCourses: ['course-sales-012'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-sales-s04',
        code: 'SALES-S04',
        name: '客訴處理能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '確認客戶的抱怨及問題，並能及時處理解決。',
        behaviorIndicators: [
          '傾聽客戶抱怨',
          '分析問題原因',
          '提出解決方案',
          '追蹤處理結果'
        ],
        linkedCourses: ['course-sales-013'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      // =====================================================
      // 技術類 - 知識 (K)
      // =====================================================
      {
        id: 'c-tech-k01',
        code: 'TECH-K01',
        name: '網路協定知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '了解路由協定、TCP/IP、MPLS等網路協定。',
        behaviorIndicators: [
          '了解TCP/IP協定',
          '掌握路由協定原理',
          '熟悉網路層級架構',
          '了解網路通訊原理'
        ],
        linkedCourses: ['course-tech-001'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-tech-k02',
        code: 'TECH-K02',
        name: '網路架構知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '了解企業網路架構設計與規劃。',
        behaviorIndicators: [
          '了解網路架構設計',
          '掌握網路拓樸概念',
          '熟悉設備配置原則',
          '了解擴展性規劃'
        ],
        linkedCourses: ['course-tech-002'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-tech-k03',
        code: 'TECH-K03',
        name: '資訊安全知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '了解網路安全風險與防護措施。',
        behaviorIndicators: [
          '了解資安威脅類型',
          '掌握防護措施',
          '熟悉安全政策',
          '了解事件處理程序'
        ],
        linkedCourses: ['course-tech-003'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-tech-k04',
        code: 'TECH-K04',
        name: '虛擬網路技術知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'advanced',
        description: '了解VPN、VPLS等虛擬網路技術。',
        behaviorIndicators: [
          '了解VPN技術原理',
          '掌握VPLS應用',
          '熟悉隧道協定',
          '了解虛擬化網路'
        ],
        linkedCourses: ['course-tech-004'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      // =====================================================
      // 技術類 - 技能 (S)
      // =====================================================
      {
        id: 'c-tech-s01',
        code: 'TECH-S01',
        name: '路由協定應用能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能應用路由協定，確認安全性危害，實施風險控管措施。',
        behaviorIndicators: [
          '設定路由協定',
          '測試路由功能',
          '識別安全風險',
          '實施控管措施'
        ],
        linkedCourses: ['course-tech-010'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-tech-s02',
        code: 'TECH-S02',
        name: '網路專案規劃能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能分析不同型態的網路技術，製作網路部署設計或計畫文件。',
        behaviorIndicators: [
          '分析網路需求',
          '設計網路架構',
          '製作規劃文件',
          '評估技術方案'
        ],
        linkedCourses: ['course-tech-011'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-tech-s03',
        code: 'TECH-S03',
        name: '網路建置能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能規劃並安裝企業整合通訊網路基礎架構。',
        behaviorIndicators: [
          '規劃網路建置順序',
          '安裝設定網路設備',
          '測試網路效能',
          '驗證建置結果'
        ],
        linkedCourses: ['course-tech-012'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-tech-s04',
        code: 'TECH-S04',
        name: '網路監控能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能監控、分析及處理網路警報。',
        behaviorIndicators: [
          '監控網路狀態',
          '分析網路警報',
          '處理網路問題',
          '維護網路穩定'
        ],
        linkedCourses: ['course-tech-013'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-tech-s05',
        code: 'TECH-S05',
        name: '技術文件撰寫能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能撰寫技術文件與規劃報告。',
        behaviorIndicators: [
          '撰寫技術文件',
          '製作規劃報告',
          '更新維護文件',
          '建立文件標準'
        ],
        linkedCourses: ['course-tech-014'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      // =====================================================
      // 通用技能
      // =====================================================
      {
        id: 'c-gen-s01',
        code: 'GEN-S01',
        name: '時間管理能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能有效管理時間，合理安排工作優先順序。',
        behaviorIndicators: [
          '規劃工作優先順序',
          '有效分配時間資源',
          '按時完成任務',
          '處理多任務並行'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-gen-s02',
        code: 'GEN-S02',
        name: '溝通協調能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能夠有效處理內部和外部（供應商、客戶等）的關係。',
        behaviorIndicators: [
          '有效傳達訊息',
          '協調各方利益',
          '化解衝突問題',
          '建立良好關係'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-gen-s03',
        code: 'GEN-S03',
        name: '人際互動能力',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '能與各層級人員有效互動。',
        behaviorIndicators: [
          '建立人際網絡',
          '有效與人互動',
          '維護良好關係',
          '展現專業形象'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-11-20')
      }
    ];
  }

  private getManagementCompetencies(): CompetencyItem[] {
    // =====================================================
    // 管理職能 - 主管與管理人員所需的領導能力
    // 來源：9 份 JD 文件中的管理相關職能
    // =====================================================
    return [
      {
        id: 'c-mgmt-s01',
        code: 'MGMT-S01',
        name: '團隊領導',
        type: 'skill',
        category: 'management',
        level: 'advanced',
        description: '優秀的領導能力和團隊管理技能，確保團隊執行達到優質標準，能有效帶領團隊達成目標。',
        behaviorIndicators: [
          '設定清晰的團隊目標與方向',
          '有效分配任務並授權賦能',
          '激勵團隊成員發揮潛能',
          '建立高效能團隊文化'
        ],
        linkedCourses: ['course-301', 'course-302'],
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-mgmt-s02',
        code: 'MGMT-S02',
        name: '績效管理',
        type: 'skill',
        category: 'management',
        level: 'intermediate',
        description: '能進行有效的績效評估與回饋，依據團隊績效指標評估分析團隊與成員個人績效。',
        behaviorIndicators: [
          '設定合理的績效目標與指標',
          '定期進行績效面談與回饋',
          '協助部屬制定改善計畫',
          '提出營運績效評估報告'
        ],
        linkedCourses: ['course-303'],
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-mgmt-s03',
        code: 'MGMT-S03',
        name: '策略規劃',
        type: 'skill',
        category: 'management',
        level: 'expert',
        description: '能制定與執行部門策略，確認營運模式並訂定短、中、長期目標。',
        behaviorIndicators: [
          '分析內外部環境制定策略',
          '將策略轉化為可執行計畫',
          '追蹤策略執行成效並調整',
          '確認營運模式與目標達成'
        ],
        linkedCourses: ['course-304'],
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-mgmt-s04',
        code: 'MGMT-S04',
        name: '營運分析',
        type: 'skill',
        category: 'management',
        level: 'advanced',
        description: '能理解營運報表，發覺異常數字或狀況，提出改善方案或目標達成對策。',
        behaviorIndicators: [
          '分析營運報表數據',
          '發現異常並追查原因',
          '提出改善方案',
          '落實改善達成目標'
        ],
        linkedCourses: ['course-305'],
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-mgmt-s05',
        code: 'MGMT-S05',
        name: '人才培育',
        type: 'skill',
        category: 'management',
        level: 'advanced',
        description: '提供團隊培訓和指導，提升團隊的專業能力，能培養與發展團隊人才。',
        behaviorIndicators: [
          '識別團隊成員的優勢與發展需求',
          '提供適當的指導與培訓機會',
          '建立人才接班梯隊',
          '創造學習成長環境'
        ],
        linkedCourses: ['course-306'],
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-mgmt-s06',
        code: 'MGMT-S06',
        name: '預算規劃',
        type: 'skill',
        category: 'management',
        level: 'intermediate',
        description: '根據銷售預算，規劃部門業績與預算分配，進行成本分析與收支管理。',
        behaviorIndicators: [
          '編製部門預算',
          '規劃預算分配',
          '監控預算執行',
          '進行成本分析'
        ],
        linkedCourses: ['course-307'],
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-mgmt-s07',
        code: 'MGMT-S07',
        name: '變革管理',
        type: 'skill',
        category: 'management',
        level: 'expert',
        description: '能帶領團隊適應並推動組織變革，有效溝通變革願景與必要性。',
        behaviorIndicators: [
          '預見變革需求並提前規劃',
          '有效溝通變革願景與必要性',
          '協助團隊克服變革阻力',
          '推動變革並追蹤成效'
        ],
        linkedCourses: ['course-308'],
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-mgmt-k01',
        code: 'MGMT-K01',
        name: '經營管理知識',
        type: 'knowledge',
        category: 'management',
        level: 'advanced',
        description: '了解企業經營管理的原理與方法，具備企業經營與財務管理知識。',
        behaviorIndicators: [
          '了解企業營運模式',
          '掌握經營管理原則',
          '了解組織管理理論',
          '能進行經營決策分析'
        ],
        linkedCourses: ['course-309'],
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-11-20')
      }
    ];
  }

  private getGeneralCompetencies(): CompetencyItem[] {
    // =====================================================
    // 通識職能 - 法規遵循、資訊安全等共同知識
    // 來源：9 份 JD 文件中的通用知識與技能
    // =====================================================
    return [
      {
        id: 'c-gen-k01',
        code: 'GEN-K01',
        name: '資訊安全知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'basic',
        description: '了解並遵守資訊安全規範，保護公司與客戶資料安全。',
        behaviorIndicators: [
          '遵守公司資訊安全政策',
          '正確處理敏感資料與密碼',
          '能辨識並回報資安威脅',
          '保護個人與公司資料安全'
        ],
        linkedCourses: ['course-401'],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-gen-k02',
        code: 'GEN-K02',
        name: '法規遵循知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'basic',
        description: '了解並遵守相關法規，確保工作符合法律規範。',
        behaviorIndicators: [
          '了解與工作相關的法規要求',
          '確保工作流程符合法規規定',
          '及時更新法規知識',
          '能識別法規風險'
        ],
        linkedCourses: ['course-402'],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-gen-k03',
        code: 'GEN-K03',
        name: '職業安全衛生知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'basic',
        description: '了解職業安全衛生知識與規範，維護工作場所安全。',
        behaviorIndicators: [
          '遵守工作場所安全規定',
          '正確使用防護設備',
          '能辨識並回報安全隱患',
          '參與安全訓練活動'
        ],
        linkedCourses: ['course-403'],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-gen-k04',
        code: 'GEN-K04',
        name: '電腦資訊知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'basic',
        description: '具備基本電腦操作與資訊系統知識。',
        behaviorIndicators: [
          '了解電腦基本操作',
          '熟悉常用作業系統',
          '了解基本網路概念',
          '能使用常用軟體工具'
        ],
        linkedCourses: ['course-404'],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-gen-k05',
        code: 'GEN-K05',
        name: '產業趨勢知識',
        type: 'knowledge',
        category: 'ksa',
        level: 'intermediate',
        description: '了解產業現況與未來發展趨勢。',
        behaviorIndicators: [
          '關注產業發展動態',
          '了解市場競爭態勢',
          '掌握產業技術趨勢',
          '分析產業變化影響'
        ],
        linkedCourses: ['course-405'],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-gen-s01',
        code: 'GEN-S01',
        name: '辦公軟體應用',
        type: 'skill',
        category: 'ksa',
        level: 'intermediate',
        description: '精通MS Office套件(Word, Excel, PowerPoint)，熟練使用辦公軟體提升工作效率。',
        behaviorIndicators: [
          '熟練操作文書處理軟體',
          '能製作專業的簡報資料',
          '善用試算表進行數據分析',
          '能使用進階功能提升效率'
        ],
        linkedCourses: ['course-406'],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-gen-s02',
        code: 'GEN-S02',
        name: '公文文書撰寫能力',
        type: 'skill',
        category: 'ksa',
        level: 'basic',
        description: '能撰寫正式公文與商業文書。',
        behaviorIndicators: [
          '撰寫規範的公文格式',
          '撰寫專業商業文書',
          '文字表達清晰準確',
          '符合公司文書規範'
        ],
        linkedCourses: ['course-407'],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-11-20')
      },
      {
        id: 'c-gen-s03',
        code: 'GEN-S03',
        name: '視訊工具應用能力',
        type: 'skill',
        category: 'ksa',
        level: 'basic',
        description: '能運用視訊工具進行遠距會議與面試。',
        behaviorIndicators: [
          '熟練操作視訊會議軟體',
          '維持良好視訊會議禮儀',
          '處理視訊技術問題',
          '有效進行遠距溝通'
        ],
        linkedCourses: [],
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-11-20')
      }
    ];
  }

  private getMockGaps(): CompetencyGap[] {
    return [
      {
        competencyId: 'c-prof-3',
        competencyName: '專案管理',
        type: 'skill',
        required: 4,
        actual: 3,
        gap: 1,
        severity: 'moderate',
        recommendedCourses: [
          { id: 'course-104', name: '進階專案管理', duration: '16小時', provider: '內訓', type: 'classroom' },
          { id: 'course-105', name: 'PMP 認證培訓', duration: '40小時', provider: '外訓', type: 'classroom' }
        ]
      },
      {
        competencyId: 'c-core-3',
        competencyName: '溝通表達',
        type: 'skill',
        required: 4,
        actual: 3.5,
        gap: 0.5,
        severity: 'minor',
        recommendedCourses: [
          { id: 'course-004', name: '簡報技巧培訓', duration: '8小時', provider: '內訓', type: 'classroom' }
        ]
      },
      {
        competencyId: 'c-prof-1',
        competencyName: '程式設計',
        type: 'skill',
        required: 4,
        actual: 4.5,
        gap: -0.5,
        severity: 'none',
        recommendedCourses: []
      },
      {
        competencyId: 'c-prof-2',
        competencyName: '系統分析',
        type: 'skill',
        required: 4,
        actual: 4,
        gap: 0,
        severity: 'none',
        recommendedCourses: []
      },
      {
        competencyId: 'c-core-1',
        competencyName: '團隊合作',
        type: 'attitude',
        required: 4,
        actual: 4.2,
        gap: -0.2,
        severity: 'none',
        recommendedCourses: []
      },
      {
        competencyId: 'c-core-2',
        competencyName: '問題解決',
        type: 'skill',
        required: 4,
        actual: 4,
        gap: 0,
        severity: 'none',
        recommendedCourses: []
      }
    ];
  }

  private getMockRadarData(): RadarDataPoint[] {
    return [
      { competencyName: '程式設計', required: 4, actual: 4.5 },
      { competencyName: '系統分析', required: 4, actual: 4 },
      { competencyName: '專案管理', required: 4, actual: 3 },
      { competencyName: '團隊合作', required: 4, actual: 4.2 },
      { competencyName: '問題解決', required: 4, actual: 4 },
      { competencyName: '溝通表達', required: 4, actual: 3.5 }
    ];
  }
}

