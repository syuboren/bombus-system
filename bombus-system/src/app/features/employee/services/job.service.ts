import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  Job,
  JobCandidate,
  CandidateDetail,
  JobStats,
  CandidateStats,
  JobStatus
} from '../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private readonly mockJobs: Job[] = [
    // 對應 JD: 人員招募專員 (jd-recruiter-001)
    {
      id: 'JOB-2025001',
      title: '人員招募專員',
      department: '人資部',
      publishDate: '2025-11-20',
      newCandidates: 3,
      totalCandidates: 15,
      status: 'published',
      recruiter: 'HR Admin'
    },
    // 對應 JD: 主辦會計 (jd-acc-001)
    {
      id: 'JOB-2025002',
      title: '主辦會計',
      department: '財務部',
      publishDate: '2025-11-18',
      newCandidates: 2,
      totalCandidates: 8,
      status: 'published',
      recruiter: 'HR Admin'
    },
    // 對應 JD: 人資專員 (jd-hr-sp-001)
    {
      id: 'JOB-2025003',
      title: '人資專員',
      department: '人資部',
      publishDate: '2025-11-15',
      newCandidates: 1,
      totalCandidates: 12,
      status: 'published',
      recruiter: 'HR Admin'
    },
    // 對應 JD: 專案部副理 (jd-pm-001)
    {
      id: 'JOB-2025004',
      title: '專案部副理',
      department: '專案部',
      publishDate: null,
      newCandidates: 0,
      totalCandidates: 0,
      status: 'review',
      recruiter: 'HR Admin'
    },
    // 對應 JD: 薪酬與福利專員 (jd-comp-001)
    {
      id: 'JOB-2025005',
      title: '薪酬與福利專員',
      department: '人資部',
      publishDate: null,
      newCandidates: 0,
      totalCandidates: 0,
      status: 'draft',
      recruiter: 'HR Admin'
    },
    // 對應 JD: 出納會計 (jd-cashier-001)
    {
      id: 'JOB-2025006',
      title: '出納會計',
      department: '財務部',
      publishDate: '2025-11-10',
      newCandidates: 0,
      totalCandidates: 5,
      status: 'published',
      recruiter: 'HR Admin'
    }
  ];

  private readonly mockCandidates: JobCandidate[] = [
    {
      id: 'C001',
      name: '林小美',
      nameEn: 'Amy Lin',
      email: 'amy.lin@example.com',
      phone: '0912-345-678',
      location: '台北市',
      applyDate: '2025-11-23',
      education: '國立臺灣大學 心理學系',
      experience: '人力資源專員',
      experienceYears: 3,
      skills: ['招募面試', '勞動法規', 'Excel', '人才評估'],
      matchScore: 92,
      scoreLevel: 'high',
      status: 'new',
      avatarColor: '#8DA399'
    },
    {
      id: 'C002',
      name: '陳大華',
      nameEn: 'David Chen',
      email: 'david.chen@example.com',
      applyDate: '2025-11-22',
      education: '國立政治大學 企業管理學系',
      experience: '人資行政專員',
      experienceYears: 2,
      skills: ['薪資計算', '勞健保', 'HRIS系統'],
      matchScore: 78,
      scoreLevel: 'medium',
      status: 'interview',
      avatarColor: '#a88643'
    },
    {
      id: 'C003',
      name: '王小明',
      nameEn: 'Mike Wang',
      email: 'mike.wang@example.com',
      applyDate: '2025-11-20',
      education: '私立淡江大學 企業管理學系',
      experience: '行政助理',
      experienceYears: 1,
      skills: ['文書處理', 'Excel基礎'],
      matchScore: 65,
      scoreLevel: 'low',
      status: 'rejected',
      avatarColor: '#7F9CA0'
    },
    {
      id: 'C004',
      name: '李美玲',
      nameEn: 'Mei Li',
      email: 'mei.li@example.com',
      applyDate: '2025-11-24',
      education: '國立中央大學 人力資源管理研究所',
      experience: '招募專員',
      experienceYears: 4,
      skills: ['結構化面試', '104人力銀行', '雇主品牌', '人才庫管理'],
      matchScore: 88,
      scoreLevel: 'high',
      status: 'new',
      avatarColor: '#8DA399'
    },
    {
      id: 'C005',
      name: '張志偉',
      nameEn: 'Jason Chang',
      email: 'jason.chang@example.com',
      applyDate: '2025-11-25',
      education: '國立臺北大學 企業管理學系',
      experience: '人資主管',
      experienceYears: 6,
      skills: ['團隊管理', '績效管理', '組織發展', '員工關係'],
      matchScore: 95,
      scoreLevel: 'high',
      status: 'new',
      avatarColor: '#6B8E8D'
    },
    {
      id: 'C006',
      name: '黃雅琳',
      nameEn: 'Linda Huang',
      email: 'linda.huang@example.com',
      applyDate: '2025-11-19',
      education: '國立成功大學 企業管理學系',
      experience: '人資專員',
      experienceYears: 2,
      skills: ['招募流程', '面試安排', 'Excel', '人事行政'],
      matchScore: 76,
      scoreLevel: 'medium',
      status: 'new',
      avatarColor: '#9B7653'
    },
    {
      id: 'C007',
      name: '吳建宏',
      nameEn: 'Ken Wu',
      email: 'ken.wu@example.com',
      applyDate: '2025-11-18',
      education: '私立輔仁大學 心理學系',
      experience: '招募助理',
      experienceYears: 1,
      skills: ['履歷篩選', '電話邀約', '行政作業'],
      matchScore: 62,
      scoreLevel: 'low',
      status: 'new',
      avatarColor: '#7E6B5C'
    },
    {
      id: 'C008',
      name: '許芳瑜',
      nameEn: 'Fiona Hsu',
      email: 'fiona.hsu@example.com',
      applyDate: '2025-11-17',
      education: '國立中正大學 勞工關係學系',
      experience: '人資專員',
      experienceYears: 3,
      skills: ['勞動法規', '員工關係', '薪資管理', '福利規劃'],
      matchScore: 84,
      scoreLevel: 'high',
      status: 'interview',
      avatarColor: '#8DA399'
    },
    {
      id: 'C009',
      name: '蔡明翰',
      nameEn: 'Michael Tsai',
      email: 'michael.tsai@example.com',
      applyDate: '2025-11-16',
      education: '國立臺灣師範大學 教育心理學系',
      experience: '培訓專員',
      experienceYears: 4,
      skills: ['教育訓練', '課程設計', '講師培訓', '成效評估'],
      matchScore: 71,
      scoreLevel: 'medium',
      status: 'new',
      avatarColor: '#6B8E8D'
    },
    {
      id: 'C010',
      name: '鄭雨萱',
      nameEn: 'Rachel Cheng',
      email: 'rachel.cheng@example.com',
      applyDate: '2025-11-15',
      education: '國立交通大學 管理科學系',
      experience: '人資分析師',
      experienceYears: 2,
      skills: ['數據分析', 'Power BI', 'Excel進階', '人力報表'],
      matchScore: 79,
      scoreLevel: 'medium',
      status: 'new',
      avatarColor: '#A08D76'
    },
    {
      id: 'C011',
      name: '周冠廷',
      nameEn: 'Kevin Chou',
      email: 'kevin.chou@example.com',
      applyDate: '2025-11-14',
      education: '私立東吳大學 企業管理學系',
      experience: '行政專員',
      experienceYears: 1,
      skills: ['文書處理', '會議安排', '檔案管理'],
      matchScore: 55,
      scoreLevel: 'low',
      status: 'rejected',
      avatarColor: '#7F9CA0'
    },
    {
      id: 'C012',
      name: '林佳慧',
      nameEn: 'Grace Lin',
      email: 'grace.lin@example.com',
      applyDate: '2025-11-13',
      education: '國立政治大學 勞工研究所',
      experience: '勞資關係專員',
      experienceYears: 5,
      skills: ['勞資協商', '法規遵循', '爭議處理', '工會關係'],
      matchScore: 82,
      scoreLevel: 'high',
      status: 'new',
      avatarColor: '#8DA399'
    },
    {
      id: 'C013',
      name: '楊承翰',
      nameEn: 'Hans Yang',
      email: 'hans.yang@example.com',
      applyDate: '2025-11-12',
      education: '私立中原大學 企業管理學系',
      experience: '招募顧問',
      experienceYears: 3,
      skills: ['獵才服務', '產業分析', '薪資談判', '人才mapping'],
      matchScore: 87,
      scoreLevel: 'high',
      status: 'interview',
      avatarColor: '#6B8E8D'
    },
    {
      id: 'C014',
      name: '陳怡君',
      nameEn: 'Irene Chen',
      email: 'irene.chen@example.com',
      applyDate: '2025-11-11',
      education: '國立臺北商業大學 企業管理系',
      experience: '人事助理',
      experienceYears: 1,
      skills: ['考勤管理', '保險作業', '人事資料維護'],
      matchScore: 58,
      scoreLevel: 'low',
      status: 'rejected',
      avatarColor: '#9B7653'
    },
    {
      id: 'C015',
      name: '劉宗翰',
      nameEn: 'Leo Liu',
      email: 'leo.liu@example.com',
      applyDate: '2025-11-10',
      education: '國立清華大學 科技管理研究所',
      experience: '人資經理',
      experienceYears: 8,
      skills: ['人資策略', '組織變革', '人才發展', '績效制度設計'],
      matchScore: 94,
      scoreLevel: 'high',
      status: 'new',
      avatarColor: '#8DA399'
    }
  ];

  private readonly mockCandidateDetail: CandidateDetail = {
    ...this.mockCandidates[0],
    resumeUrl: 'resume_amy_lin.pdf',
    aiAnalysis: {
      matchScore: 92,
      overallCompetencyScore: 88,
      skills: [
        { name: '招募面試', level: 'high', matched: true },
        { name: '勞動法規', level: 'high', matched: true },
        { name: 'Excel', level: 'high', matched: true },
        { name: '人才評估', level: 'medium', matched: true },
        { name: '104人力銀行', level: 'medium', matched: false },
        { name: 'HRIS系統', level: 'medium', matched: false }
      ],
      experiences: [
        {
          company: '科技公司人資部',
          position: '人力資源專員',
          duration: '2 年 6 個月',
          highlights: ['年度招募超過 50 人', '建立新人訓練流程']
        },
        {
          company: '獵頭公司',
          position: '招募顧問',
          duration: '1 年',
          highlights: ['科技產業獵才', '人才庫建置']
        }
      ],
      education: {
        school: '國立臺灣大學',
        degree: '學士',
        major: '心理學系',
        verified: true
      },
      // 職能需求匹配分析 (對應 JD: 人員招募專員 jd-recruiter-001)
      competencyMatches: [
        {
          competencyId: 'c-hr-s-recruit',
          competencyName: '招募甄選',
          type: 'skill' as const,
          requiredLevel: 3,
          assessedLevel: 4,
          score: 95,
          weight: 30,
          evidence: '履歷顯示具備 3 年招募經驗，年度招募超過 50 人，熟悉多元招募管道'
        },
        {
          competencyId: 'c-core-3',
          competencyName: '溝通表達',
          type: 'skill' as const,
          requiredLevel: 4,
          assessedLevel: 4,
          score: 90,
          weight: 25,
          evidence: '過往獵頭經驗需要大量溝通協調，推薦信顯示良好人際互動能力'
        },
        {
          competencyId: 'c-hr-s-interview',
          competencyName: '面試技巧',
          type: 'skill' as const,
          requiredLevel: 3,
          assessedLevel: 3,
          score: 85,
          weight: 20,
          evidence: '有結構化面試經驗，心理學背景有助於行為面試評估'
        },
        {
          competencyId: 'c-hr-a-proact',
          competencyName: '積極主動',
          type: 'attitude' as const,
          requiredLevel: 4,
          assessedLevel: 4,
          score: 88,
          weight: 15,
          evidence: '自主建立新人訓練流程，展現主動改善的工作態度'
        },
        {
          competencyId: 'c-hr-k-labor',
          competencyName: '勞動法規知識',
          type: 'knowledge' as const,
          requiredLevel: 2,
          assessedLevel: 3,
          score: 92,
          weight: 10,
          evidence: '履歷提及熟悉勞基法相關規定，超過職位要求等級'
        }
      ]
    }
  };

  getJobs(): Observable<Job[]> {
    return of(this.mockJobs).pipe(delay(300));
  }

  getJobStats(): Observable<JobStats> {
    return of({
      activeJobs: 12,
      newResumes: 45,
      pendingReview: 28,
      scheduledInterviews: 8
    }).pipe(delay(200));
  }

  getCandidates(jobId?: string): Observable<JobCandidate[]> {
    return of(this.mockCandidates).pipe(delay(300));
  }

  getCandidateStats(): Observable<CandidateStats> {
    return of({
      total: 15,
      pending: 3,
      aiRecommended: 5,
      scheduled: 2
    }).pipe(delay(200));
  }

  getCandidateDetail(candidateId: string): Observable<CandidateDetail | null> {
    // 模擬返回第一個候選人的詳情
    return of(this.mockCandidateDetail).pipe(delay(300));
  }

  createJob(job: Partial<Job>): Observable<Job> {
    const newJob: Job = {
      id: `JOB-${Date.now()}`,
      title: job.title || '',
      department: job.department || '',
      publishDate: null,
      newCandidates: 0,
      totalCandidates: 0,
      status: 'draft',
      recruiter: job.recruiter || 'Admin'
    };
    return of(newJob).pipe(delay(500));
  }

  getStatusLabel(status: JobStatus): string {
    const labels: Record<JobStatus, string> = {
      published: '刊登中',
      draft: '草稿',
      review: '審核中'
    };
    return labels[status];
  }

  getStatusIcon(status: JobStatus): string {
    const icons: Record<JobStatus, string> = {
      published: 'ri-checkbox-circle-line',
      draft: 'ri-file-edit-line',
      review: 'ri-time-line'
    };
    return icons[status];
  }
}

