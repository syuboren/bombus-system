import { Injectable, signal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Candidate, CandidateDetail } from '../models/candidate.model';

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private readonly mockCandidates: Candidate[] = [
    {
      id: '1',
      name: '王小明',
      position: '前端工程師',
      interviewDate: '2025-11-20',
      status: 'completed',
      duration: '25:30'
    },
    {
      id: '2',
      name: '李小華',
      position: '後端工程師',
      interviewDate: '2025-11-21',
      status: 'completed',
      duration: '32:15'
    },
    {
      id: '3',
      name: '張大同',
      position: 'UI/UX 設計師',
      interviewDate: '2025-11-22',
      status: 'completed',
      duration: '28:45'
    },
    {
      id: '4',
      name: '陳美玲',
      position: '專案經理',
      interviewDate: '2025-11-25',
      status: 'pending'
    },
    {
      id: '5',
      name: '林志明',
      position: '資料分析師',
      interviewDate: '2025-11-19',
      status: 'completed',
      duration: '30:00'
    }
  ];

  private readonly mockCandidateDetails: Record<string, CandidateDetail> = {
    '1': {
      ...this.mockCandidates[0],
      transcript: [
        { time: '00:30', text: '您好，請先做個簡單的自我介紹。', speaker: 'interviewer' },
        { time: '00:45', text: '您好！我是王小明，畢業於台灣大學資訊工程系，有三年的前端開發經驗。我擅長 React 和 Vue 框架，對於使用者體驗有很大的熱情。在前公司，我主導了多個電商平台的前端重構專案，成功提升了 40% 的頁面載入速度。', speaker: 'candidate' },
        { time: '02:15', text: '可以分享一下您在團隊協作方面的經驗嗎？', speaker: 'interviewer' },
        { time: '02:30', text: '當然！我非常重視團隊協作。在之前的專案中，我經常與後端工程師和設計師緊密合作，使用 Git Flow 進行版本控制，並且定期進行 Code Review。我相信良好的溝通能力是團隊成功的關鍵。', speaker: 'candidate' },
        { time: '04:00', text: '面對工作壓力時，您通常如何處理？', speaker: 'interviewer' },
        { time: '04:15', text: '老實說，剛開始工作時確實會感到一些壓力，但我學會了將大任務分解成小目標，這樣能讓我保持專注。我也很注重學習能力的提升，會主動研究新技術來解決問題。', speaker: 'candidate' }
      ],
      emotions: [
        { time: '1', confidence: 75, anxiety: 25, enthusiasm: 80 },
        { time: '2', confidence: 80, anxiety: 20, enthusiasm: 85 },
        { time: '3', confidence: 85, anxiety: 15, enthusiasm: 88 },
        { time: '4', confidence: 82, anxiety: 22, enthusiasm: 85 },
        { time: '5', confidence: 78, anxiety: 28, enthusiasm: 82 },
        { time: '6', confidence: 80, anxiety: 25, enthusiasm: 84 },
        { time: '7', confidence: 85, anxiety: 18, enthusiasm: 88 },
        { time: '8', confidence: 88, anxiety: 15, enthusiasm: 90 },
        { time: '9', confidence: 86, anxiety: 17, enthusiasm: 88 },
        { time: '10', confidence: 90, anxiety: 12, enthusiasm: 92 }
      ],
      skills: [
        { name: '邏輯思考', score: 85 },
        { name: '溝通能力', score: 88 },
        { name: '技術能力', score: 82 },
        { name: '團隊合作', score: 90 },
        { name: '抗壓性', score: 75 },
        { name: '學習能力', score: 85 }
      ],
      aiScores: {
        keywordMatch: 85,
        semanticAnalysis: 80,
        jdMatch: 82,
        overall: 82
      }
    },
    '2': {
      ...this.mockCandidates[1],
      transcript: [
        { time: '00:30', text: '請介紹一下您的技術背景。', speaker: 'interviewer' },
        { time: '00:45', text: '我是李小華，擁有五年後端開發經驗，精通 Java、Python 和 Node.js。我曾在大型金融科技公司負責核心交易系統的開發，對於高併發和系統架構設計有深入的理解。', speaker: 'candidate' },
        { time: '02:00', text: '能分享一個您解決技術難題的經驗嗎？', speaker: 'interviewer' },
        { time: '02:15', text: '在上一份工作中，我們的系統在促銷活動時經常出現效能瓶頸。我主導了一次系統重構，引入了 Redis 快取和消息隊列，將系統的 QPS 從 1000 提升到 10000，學習能力和問題解決能力是我的強項。', speaker: 'candidate' },
        { time: '04:30', text: '您如何看待團隊協作？', speaker: 'interviewer' },
        { time: '04:45', text: '我認為團隊協作非常重要，好的團隊溝通能讓專案事半功倍。我習慣在開發前先與團隊成員討論技術方案，確保大家對目標有一致的理解。', speaker: 'candidate' }
      ],
      emotions: [
        { time: '1', confidence: 88, anxiety: 12, enthusiasm: 85 },
        { time: '2', confidence: 90, anxiety: 10, enthusiasm: 88 },
        { time: '3', confidence: 92, anxiety: 8, enthusiasm: 90 },
        { time: '4', confidence: 90, anxiety: 10, enthusiasm: 88 },
        { time: '5', confidence: 88, anxiety: 12, enthusiasm: 86 },
        { time: '6', confidence: 90, anxiety: 10, enthusiasm: 88 },
        { time: '7', confidence: 92, anxiety: 8, enthusiasm: 90 },
        { time: '8', confidence: 94, anxiety: 6, enthusiasm: 92 },
        { time: '9', confidence: 92, anxiety: 8, enthusiasm: 90 },
        { time: '10', confidence: 95, anxiety: 5, enthusiasm: 94 }
      ],
      skills: [
        { name: '邏輯思考', score: 92 },
        { name: '溝通能力', score: 85 },
        { name: '技術能力', score: 95 },
        { name: '團隊合作', score: 88 },
        { name: '抗壓性', score: 85 },
        { name: '學習能力', score: 90 }
      ],
      aiScores: {
        keywordMatch: 90,
        semanticAnalysis: 88,
        jdMatch: 86,
        overall: 88
      }
    },
    '3': {
      ...this.mockCandidates[2],
      transcript: [
        { time: '00:30', text: '請介紹您的設計背景和專長。', speaker: 'interviewer' },
        { time: '00:45', text: '我是張大同，有四年的 UI/UX 設計經驗。我專注於用戶研究和互動設計，擅長使用 Figma 和 Adobe 系列工具。我相信好的設計應該以用戶為中心。', speaker: 'candidate' },
        { time: '02:30', text: '能分享您最自豪的設計專案嗎？', speaker: 'interviewer' },
        { time: '02:45', text: '去年我負責重新設計公司的行動應用程式，通過用戶訪談和 A/B 測試，我們將用戶留存率提升了 35%。這個過程中團隊協作非常重要，我與工程師密切配合確保設計的可實現性。', speaker: 'candidate' },
        { time: '05:00', text: '您如何處理設計與開發之間的衝突？', speaker: 'interviewer' },
        { time: '05:15', text: '這確實是常見的挑戰。我通常會先理解技術限制，然後尋找平衡點。良好的溝通能力可以幫助我與開發團隊達成共識，在保持設計品質的同時考慮實現成本。', speaker: 'candidate' }
      ],
      emotions: [
        { time: '1', confidence: 78, anxiety: 22, enthusiasm: 82 },
        { time: '2', confidence: 82, anxiety: 18, enthusiasm: 85 },
        { time: '3', confidence: 80, anxiety: 20, enthusiasm: 83 },
        { time: '4', confidence: 85, anxiety: 15, enthusiasm: 88 },
        { time: '5', confidence: 82, anxiety: 18, enthusiasm: 85 },
        { time: '6', confidence: 80, anxiety: 20, enthusiasm: 82 },
        { time: '7', confidence: 78, anxiety: 22, enthusiasm: 80 },
        { time: '8', confidence: 82, anxiety: 18, enthusiasm: 84 },
        { time: '9', confidence: 85, anxiety: 15, enthusiasm: 86 },
        { time: '10', confidence: 83, anxiety: 17, enthusiasm: 85 }
      ],
      skills: [
        { name: '邏輯思考', score: 80 },
        { name: '溝通能力', score: 85 },
        { name: '技術能力', score: 78 },
        { name: '團隊合作', score: 82 },
        { name: '抗壓性', score: 72 },
        { name: '學習能力', score: 80 }
      ],
      aiScores: {
        keywordMatch: 78,
        semanticAnalysis: 80,
        jdMatch: 76,
        overall: 78
      }
    },
    '5': {
      ...this.mockCandidates[4],
      transcript: [
        { time: '00:30', text: '請介紹您在資料分析方面的經驗。', speaker: 'interviewer' },
        { time: '00:45', text: '我是林志明，擁有六年資料分析經驗，精通 Python、SQL 和各種機器學習框架。我曾在電商公司建立用戶行為預測模型，幫助業務團隊做出數據驅動的決策。', speaker: 'candidate' },
        { time: '02:30', text: '能舉例說明您如何運用數據解決業務問題？', speaker: 'interviewer' },
        { time: '02:45', text: '有一次，我們發現用戶流失率異常升高。我通過分析用戶行為數據，識別出主要的流失原因是結帳流程太複雜。團隊協作改善流程後，流失率降低了 25%。這展現了我的學習能力和問題解決能力。', speaker: 'candidate' },
        { time: '05:00', text: '您如何向非技術人員解釋複雜的數據分析結果？', speaker: 'interviewer' },
        { time: '05:15', text: '良好的溝通能力對資料分析師來說非常重要。我會使用視覺化圖表和簡單的比喻來解釋複雜的概念，確保利益相關者能夠理解並做出正確的決策。', speaker: 'candidate' }
      ],
      emotions: [
        { time: '1', confidence: 85, anxiety: 15, enthusiasm: 88 },
        { time: '2', confidence: 88, anxiety: 12, enthusiasm: 90 },
        { time: '3', confidence: 90, anxiety: 10, enthusiasm: 92 },
        { time: '4', confidence: 92, anxiety: 8, enthusiasm: 94 },
        { time: '5', confidence: 90, anxiety: 10, enthusiasm: 92 },
        { time: '6', confidence: 88, anxiety: 12, enthusiasm: 90 },
        { time: '7', confidence: 90, anxiety: 10, enthusiasm: 92 },
        { time: '8', confidence: 92, anxiety: 8, enthusiasm: 94 },
        { time: '9', confidence: 94, anxiety: 6, enthusiasm: 95 },
        { time: '10', confidence: 92, anxiety: 8, enthusiasm: 93 }
      ],
      skills: [
        { name: '邏輯思考', score: 95 },
        { name: '溝通能力', score: 88 },
        { name: '技術能力', score: 92 },
        { name: '團隊合作', score: 85 },
        { name: '抗壓性', score: 82 },
        { name: '學習能力', score: 90 }
      ],
      aiScores: {
        keywordMatch: 88,
        semanticAnalysis: 90,
        jdMatch: 86,
        overall: 88
      }
    }
  };

  getCandidates(): Observable<Candidate[]> {
    return of(this.mockCandidates).pipe(delay(300));
  }

  getCandidateDetail(id: string): Observable<CandidateDetail | null> {
    const detail = this.mockCandidateDetails[id] || null;
    return of(detail).pipe(delay(200));
  }

  getHireRecommendation(score: number): { level: string; text: string; icon: string } {
    if (score >= 85) {
      return {
        level: 'excellent',
        text: '強烈推薦錄用',
        icon: 'ri-checkbox-circle-fill'
      };
    } else if (score >= 75) {
      return {
        level: 'good',
        text: '建議錄用',
        icon: 'ri-thumb-up-fill'
      };
    } else if (score >= 65) {
      return {
        level: 'neutral',
        text: '可考慮錄用',
        icon: 'ri-question-fill'
      };
    } else {
      return {
        level: 'poor',
        text: '不建議錄用',
        icon: 'ri-close-circle-fill'
      };
    }
  }
}

