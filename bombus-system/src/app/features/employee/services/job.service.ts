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
    {
      id: 'JOB-2025001',
      title: '資深前端工程師 (Senior Frontend Engineer)',
      department: '資訊部',
      publishDate: '2025-11-20',
      newCandidates: 3,
      totalCandidates: 15,
      status: 'published',
      recruiter: 'Alex Chen'
    },
    {
      id: 'JOB-2025002',
      title: '產品經理 (Product Manager)',
      department: '產品部',
      publishDate: '2025-11-18',
      newCandidates: 1,
      totalCandidates: 8,
      status: 'published',
      recruiter: 'Sarah Lin'
    },
    {
      id: 'JOB-2025003',
      title: 'UI/UX 設計師',
      department: '設計部',
      publishDate: null,
      newCandidates: 0,
      totalCandidates: 0,
      status: 'review',
      recruiter: 'Mike Wang'
    },
    {
      id: 'JOB-2025004',
      title: '行銷企劃專員',
      department: '行銷部',
      publishDate: null,
      newCandidates: 0,
      totalCandidates: 0,
      status: 'draft',
      recruiter: 'Jessica Wu'
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
      education: '國立臺灣大學 資訊工程學系',
      experience: '前端工程師',
      experienceYears: 5,
      skills: ['Vue.js', 'React', 'Node.js', 'TypeScript'],
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
      education: '國立清華大學 資訊工程碩士',
      experience: '後端工程師',
      experienceYears: 3,
      skills: ['Java', 'Spring Boot', 'MySQL'],
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
      education: '私立大學 資訊管理學系',
      experience: '網頁助理',
      experienceYears: 1,
      skills: ['HTML', 'CSS', 'jQuery'],
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
      education: '國立交通大學 資訊科學碩士',
      experience: '全端工程師',
      experienceYears: 4,
      skills: ['Angular', 'C#', 'Azure'],
      matchScore: 88,
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
      skills: [
        { name: 'Vue.js', level: 'high', matched: true },
        { name: 'React', level: 'high', matched: true },
        { name: 'JavaScript', level: 'high', matched: true },
        { name: 'TypeScript', level: 'medium', matched: false },
        { name: 'Webpack', level: 'medium', matched: false },
        { name: 'Node.js', level: 'medium', matched: false }
      ],
      experiences: [
        {
          company: 'Tech Solutions Inc.',
          position: 'Senior Frontend Developer',
          duration: '3 年 5 個月',
          highlights: ['領導 4 人團隊', '效能優化 40%']
        },
        {
          company: 'Creative Web Agency',
          position: 'Web Developer',
          duration: '2 年',
          highlights: []
        }
      ],
      education: {
        school: '國立臺灣大學',
        degree: '學士',
        major: '資訊工程學系',
        verified: true
      }
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

