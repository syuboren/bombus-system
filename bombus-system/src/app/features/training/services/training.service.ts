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
  TrainingPendingItem
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
        category: 'general',
        label: '通識職能',
        count: 8,
        percentage: 33,
        color: '#8DA399' // Sage Green
      },
      {
        category: 'professional',
        label: '專業職能',
        count: 10,
        percentage: 42,
        color: '#B8A89A' // Warm Taupe
      },
      {
        category: 'management',
        label: '管理職能',
        count: 6,
        percentage: 25,
        color: '#7D9EA8' // Petrol Blue
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
      general: '通識職能',
      professional: '專業職能',
      management: '管理職能'
    };
    return labels[category];
  }

  // 取得課程類別顏色
  getCategoryColor(category: CourseCategory): string {
    const colors: Record<CourseCategory, string> = {
      general: '#8DA399',
      professional: '#B8A89A',
      management: '#7D9EA8'
    };
    return colors[category];
  }
}

