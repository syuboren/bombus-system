import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  Course,
  CourseCategory,
  CourseTypeStats,
  TrainingKPI,
  TrainingEffectiveness,
  TrainingRecommendation,
  UpcomingCourse,
  PopularCourse,
  TrainingPendingItem,
  TTQSIndicator,
  FeedbackSession,
  CourseROI,
  ImprovementItem,
  Instructor,
  Enrollment
} from '../models/training.model';

@Injectable({
  providedIn: 'root'
})
export class TrainingService {

  // 取得培訓 KPI
  getTrainingKPI(): Observable<TrainingKPI> {
    const data: TrainingKPI = {
      completionRate: 78,
      budgetUtilization: 65,
      trainingROI: 142,
      avgSatisfaction: 4.3,
      totalTrainees: 156,
      totalCourses: 24,
      plannedBudget: 1200000,
      usedBudget: 780000
    };
    return of(data).pipe(delay(200));
  }

  // 取得課程類型統計
  getCourseTypeStats(): Observable<CourseTypeStats[]> {
    const data: CourseTypeStats[] = [
      {
        category: 'core',
        label: '核心職能',
        count: 6,
        percentage: 21,
        color: '#7D9EA8' // Petrol Blue
      },
      {
        category: 'professional',
        label: '專業職能',
        count: 10,
        percentage: 34,
        color: '#B8A89A' // Warm Taupe
      },
      {
        category: 'management',
        label: '管理職能',
        count: 6,
        percentage: 21,
        color: '#C8A4A1' // Dusty Rose
      },
      {
        category: 'general',
        label: '通識職能',
        count: 7,
        percentage: 24,
        color: '#8DA399' // Sage Green
      }
    ];
    return of(data).pipe(delay(200));
  }

  // 取得培訓成效追蹤
  getTrainingEffectiveness(): Observable<TrainingEffectiveness[]> {
    const data: TrainingEffectiveness[] = [
      {
        level: 1,
        name: '反應評估',
        description: '課程滿意度',
        score: 85,
        status: 'excellent'
      },
      {
        level: 2,
        name: '學習評估',
        description: '前後測進步率',
        score: 72,
        status: 'good'
      },
      {
        level: 3,
        name: '行為評估',
        description: '行為轉化率',
        score: 68,
        status: 'good'
      },
      {
        level: 4,
        name: '成果評估',
        description: '績效提升度',
        score: 45,
        status: 'warning'
      }
    ];
    return of(data).pipe(delay(200));
  }

  // 取得職能落差推薦課程
  getTrainingRecommendations(): Observable<TrainingRecommendation[]> {
    const data: TrainingRecommendation[] = [
      {
        id: '1',
        competency: '專案管理能力',
        department: '技術部',
        gapPercentage: 35,
        priority: 'high',
        recommendedCourse: '敏捷專案管理實務',
        affectedEmployees: 12
      },
      {
        id: '2',
        competency: '數據分析能力',
        department: '業務部',
        gapPercentage: 28,
        priority: 'medium',
        recommendedCourse: 'Power BI 數據視覺化',
        affectedEmployees: 8
      },
      {
        id: '3',
        competency: '領導力發展',
        department: '全公司',
        gapPercentage: 22,
        priority: 'medium',
        recommendedCourse: '中階主管領導力培訓',
        affectedEmployees: 15
      },
      {
        id: '4',
        competency: '溝通表達能力',
        department: '客服部',
        gapPercentage: 8,
        priority: 'low',
        recommendedCourse: '職場溝通技巧',
        affectedEmployees: 6
      }
    ];
    return of(data).pipe(delay(200));
  }

  // 取得近期課程
  getUpcomingCourses(): Observable<UpcomingCourse[]> {
    const today = new Date();
    const data: UpcomingCourse[] = [
      {
        id: '1',
        name: '領導力工作坊',
        date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
        instructor: '張經理',
        participants: 15,
        category: 'management'
      },
      {
        id: '2',
        name: '敏捷專案管理實務',
        date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        instructor: '李顧問',
        participants: 20,
        category: 'professional'
      },
      {
        id: '3',
        name: '資訊安全基礎',
        date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000),
        instructor: '王講師',
        participants: 30,
        category: 'general'
      },
      {
        id: '4',
        name: 'Excel 進階應用',
        date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
        instructor: '陳講師',
        participants: 25,
        category: 'professional'
      }
    ];
    return of(data).pipe(delay(200));
  }

  // 取得熱門課程
  getPopularCourses(): Observable<PopularCourse[]> {
    const data: PopularCourse[] = [
      {
        id: '1',
        name: 'Power BI 數據視覺化',
        enrollmentCount: 45,
        satisfactionScore: 4.8,
        category: 'professional'
      },
      {
        id: '2',
        name: '時間管理與效率提升',
        enrollmentCount: 38,
        satisfactionScore: 4.6,
        category: 'general'
      },
      {
        id: '3',
        name: '團隊溝通技巧',
        enrollmentCount: 32,
        satisfactionScore: 4.5,
        category: 'management'
      }
    ];
    return of(data).pipe(delay(200));
  }

  // 取得待處理事項
  getPendingItems(): Observable<TrainingPendingItem[]> {
    const data: TrainingPendingItem[] = [
      {
        type: 'approval',
        count: 5,
        description: '待審核報名',
        urgency: 'medium'
      },
      {
        type: 'overdue',
        count: 3,
        description: '逾期未完成培訓',
        urgency: 'high'
      },
      {
        type: 'feedback',
        count: 8,
        description: '待填寫課程回饋',
        urgency: 'low'
      }
    ];
    return of(data).pipe(delay(200));
  }

  // 取得所有課程
  getAllCourses(): Observable<Course[]> {
    const today = new Date();
    const data: Course[] = [
      {
        id: '1',
        name: '敏捷專案管理實務',
        category: 'professional',
        type: 'Off-JT',
        status: 'upcoming',
        instructor: '李顧問',
        duration: 16,
        startDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 9 * 24 * 60 * 60 * 1000),
        location: '第一會議室',
        maxParticipants: 25,
        currentParticipants: 20,
        description: '學習敏捷開發方法論與實務應用',
        targetCompetencies: ['專案管理', '敏捷開發', '團隊協作']
      },
      {
        id: '2',
        name: '領導力工作坊',
        category: 'management',
        type: 'Off-JT',
        status: 'upcoming',
        instructor: '張經理',
        duration: 8,
        startDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
        location: '培訓中心',
        maxParticipants: 20,
        currentParticipants: 15,
        description: '中階主管領導力培訓課程',
        targetCompetencies: ['領導力', '團隊管理', '激勵技巧']
      },
      {
        id: '3',
        name: '資訊安全基礎',
        category: 'general',
        type: 'SD',
        status: 'ongoing',
        instructor: '王講師',
        duration: 4,
        startDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
        location: '線上課程',
        maxParticipants: 100,
        currentParticipants: 78,
        satisfactionScore: 4.2,
        description: '企業資訊安全基礎知識與實務',
        targetCompetencies: ['資訊安全', '風險意識', '法規遵循']
      },
      {
        id: '4',
        name: 'Power BI 數據視覺化',
        category: 'professional',
        type: 'Off-JT',
        status: 'completed',
        instructor: '陳講師',
        duration: 12,
        startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000),
        location: '電腦教室',
        maxParticipants: 20,
        currentParticipants: 18,
        satisfactionScore: 4.8,
        description: '學習使用 Power BI 進行數據分析與視覺化',
        targetCompetencies: ['數據分析', '報表製作', '商業智慧']
      },
      {
        id: '5',
        name: '新進人員導引訓練',
        category: 'general',
        type: 'OJT',
        status: 'ongoing',
        instructor: 'HR 團隊',
        duration: 24,
        startDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000),
        location: '各部門',
        maxParticipants: 10,
        currentParticipants: 6,
        description: '新進員工到職訓練與部門輪調',
        targetCompetencies: ['企業文化', '基礎技能', '流程認知']
      },
      {
        id: '6',
        name: '績效面談技巧',
        category: 'management',
        type: 'Off-JT',
        status: 'completed',
        instructor: '外部講師',
        duration: 6,
        startDate: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000),
        location: '第二會議室',
        maxParticipants: 15,
        currentParticipants: 12,
        satisfactionScore: 4.5,
        description: '主管績效面談與回饋技巧訓練',
        targetCompetencies: ['績效管理', '溝通技巧', '回饋技巧']
      },
      {
        id: '7',
        name: '職業安全衛生教育',
        category: 'general',
        type: 'SD',
        status: 'completed',
        instructor: '安全專員',
        duration: 2,
        startDate: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000),
        location: '線上課程',
        maxParticipants: 200,
        currentParticipants: 185,
        satisfactionScore: 4.0,
        description: '年度職業安全衛生法規教育訓練',
        targetCompetencies: ['職業安全', '法規遵循', '風險意識']
      },
      {
        id: '8',
        name: '客戶服務技巧進階',
        category: 'professional',
        type: 'Off-JT',
        status: 'upcoming',
        instructor: '服務專家',
        duration: 8,
        startDate: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000),
        endDate: new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000),
        location: '培訓中心',
        maxParticipants: 20,
        currentParticipants: 12,
        description: '進階客戶服務與抱怨處理技巧',
        targetCompetencies: ['客戶服務', '溝通技巧', '問題解決']
      }
    ];
    return of(data).pipe(delay(300));
  }

  // 取得課程類別標籤
  getCategoryLabel(category: CourseCategory): string {
    const labels: Record<CourseCategory, string> = {
      core: '核心職能',
      general: '通識職能',
      professional: '專業職能',
      management: '管理職能'
    };
    return labels[category];
  }

  // 取得課程類別顏色
  getCategoryColor(category: CourseCategory): string {
    const colors: Record<CourseCategory, string> = {
      core: '#7D9EA8',
      general: '#8DA399',
      professional: '#B8A89A',
      management: '#C8A4A1'
    };
    return colors[category];
  }

  // ===== 3.5 培訓成效追蹤 API =====

  // 取得 TTQS 品質指標
  getTTQSIndicators(): Observable<TTQSIndicator[]> {
    const data: TTQSIndicator[] = [
      {
        phase: 'plan',
        name: '計畫 (Plan)',
        score: 85,
        maxScore: 100,
        status: 'excellent',
        items: ['訓練需求分析', '年度培訓計畫', '預算規劃']
      },
      {
        phase: 'design',
        name: '設計 (Design)',
        score: 78,
        maxScore: 100,
        status: 'good',
        items: ['課程設計', '教材開發', '講師遴選']
      },
      {
        phase: 'do',
        name: '執行 (Do)',
        score: 82,
        maxScore: 100,
        status: 'excellent',
        items: ['課程執行', '出席追蹤', '教室日誌']
      },
      {
        phase: 'review',
        name: '查核 (Review)',
        score: 65,
        maxScore: 100,
        status: 'warning',
        items: ['滿意度調查', '學習評估', '行為追蹤']
      },
      {
        phase: 'outcome',
        name: '成果 (Outcome)',
        score: 58,
        maxScore: 100,
        status: 'warning',
        items: ['績效改善', 'ROI 計算', '持續改善']
      }
    ];
    return of(data).pipe(delay(200));
  }

  // 取得三個月反饋會列表
  getFeedbackSessions(): Observable<FeedbackSession[]> {
    const today = new Date();
    const data: FeedbackSession[] = [
      {
        id: '1',
        courseId: 'c1',
        courseName: 'Power BI 數據視覺化',
        scheduledDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
        status: 'scheduled',
        attendees: 18,
        behaviorConversionRate: undefined,
        performanceImprovement: undefined,
        knowledgeRetention: undefined,
        managerSatisfaction: undefined
      },
      {
        id: '2',
        courseId: 'c2',
        courseName: '敏捷專案管理實務',
        scheduledDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
        status: 'completed',
        attendees: 15,
        behaviorConversionRate: 75,
        performanceImprovement: 12,
        knowledgeRetention: 82,
        managerSatisfaction: 4.2
      },
      {
        id: '3',
        courseId: 'c3',
        courseName: '績效面談技巧',
        scheduledDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
        status: 'overdue',
        attendees: 12,
        behaviorConversionRate: undefined,
        performanceImprovement: undefined,
        knowledgeRetention: undefined,
        managerSatisfaction: undefined
      },
      {
        id: '4',
        courseId: 'c4',
        courseName: '領導力工作坊',
        scheduledDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        status: 'completed',
        attendees: 20,
        behaviorConversionRate: 68,
        performanceImprovement: 8,
        knowledgeRetention: 75,
        managerSatisfaction: 4.5
      }
    ];
    return of(data).pipe(delay(200));
  }

  // 取得課程 ROI 排行
  getCourseROIRanking(): Observable<CourseROI[]> {
    const data: CourseROI[] = [
      {
        id: '1',
        courseName: 'Power BI 數據視覺化',
        category: 'professional',
        investmentCost: 120000,
        benefit: 320000,
        roi: 167,
        behaviorConversionRate: 75,
        recommendation: 'keep'
      },
      {
        id: '2',
        courseName: '敏捷專案管理實務',
        category: 'professional',
        investmentCost: 180000,
        benefit: 380000,
        roi: 111,
        behaviorConversionRate: 72,
        recommendation: 'keep'
      },
      {
        id: '3',
        courseName: '領導力工作坊',
        category: 'management',
        investmentCost: 150000,
        benefit: 250000,
        roi: 67,
        behaviorConversionRate: 68,
        recommendation: 'optimize'
      },
      {
        id: '4',
        courseName: '時間管理與效率提升',
        category: 'general',
        investmentCost: 80000,
        benefit: 120000,
        roi: 50,
        behaviorConversionRate: 55,
        recommendation: 'optimize'
      },
      {
        id: '5',
        courseName: '職業安全衛生教育',
        category: 'general',
        investmentCost: 50000,
        benefit: 45000,
        roi: -10,
        behaviorConversionRate: 42,
        recommendation: 'review'
      }
    ];
    return of(data).pipe(delay(200));
  }

  // 取得持續改善項目
  getImprovementItems(): Observable<ImprovementItem[]> {
    const today = new Date();
    const data: ImprovementItem[] = [
      {
        id: '1',
        courseId: 'c5',
        courseName: '職業安全衛生教育',
        issue: '行為轉化率低於 50%',
        suggestion: '增加實務案例與情境演練',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: '2',
        courseId: 'c3',
        courseName: '績效面談技巧',
        issue: '三個月反饋會未如期舉辦',
        suggestion: '重新排程並發送提醒',
        priority: 'high',
        status: 'in-progress',
        dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      },
      {
        id: '3',
        courseId: 'c4',
        courseName: '領導力工作坊',
        issue: '學員反映實務演練時間不足',
        suggestion: '將課程時數從 8 小時延長至 12 小時',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
      }
    ];
    return of(data).pipe(delay(200));
  }

  // ===== 3.3 課程與報名管理 API =====

  // 取得講師列表
  getInstructors(): Observable<Instructor[]> {
    const data: Instructor[] = [
      {
        id: '1',
        name: '李顧問',
        specialty: ['敏捷開發', '專案管理'],
        rating: 4.8,
        totalCourses: 15
      },
      {
        id: '2',
        name: '張經理',
        specialty: ['領導力', '團隊管理'],
        rating: 4.6,
        totalCourses: 12
      },
      {
        id: '3',
        name: '陳講師',
        specialty: ['數據分析', 'Power BI', 'Excel'],
        rating: 4.9,
        totalCourses: 20
      },
      {
        id: '4',
        name: '王講師',
        specialty: ['資訊安全', '法規遵循'],
        rating: 4.3,
        totalCourses: 8
      }
    ];
    return of(data).pipe(delay(200));
  }

  // 取得報名記錄
  getEnrollments(courseId?: string): Observable<Enrollment[]> {
    const today = new Date();
    const data: Enrollment[] = [
      {
        id: '1',
        courseId: 'c1',
        employeeId: 'e1',
        employeeName: '王小明',
        department: '業務部',
        status: 'pending',
        appliedDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: '2',
        courseId: 'c1',
        employeeId: 'e2',
        employeeName: '李小華',
        department: '技術部',
        status: 'approved',
        appliedDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
        approvedDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: '3',
        courseId: 'c2',
        employeeId: 'e3',
        employeeName: '張大偉',
        department: '財務部',
        status: 'completed',
        appliedDate: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000),
        approvedDate: new Date(today.getTime() - 38 * 24 * 60 * 60 * 1000),
        attendanceStatus: 'present'
      },
      {
        id: '4',
        courseId: 'c1',
        employeeId: 'e4',
        employeeName: '陳美麗',
        department: '人資部',
        status: 'rejected',
        appliedDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    if (courseId) {
      return of(data.filter(e => e.courseId === courseId)).pipe(delay(200));
    }
    return of(data).pipe(delay(200));
  }
}

