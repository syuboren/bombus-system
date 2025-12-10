export type JobStatus = 'published' | 'draft' | 'review';
export type CandidateStatus = 'new' | 'interview' | 'rejected' | 'hired';
export type ScoreLevel = 'high' | 'medium' | 'low';

export interface Job {
  id: string;
  title: string;
  department: string;
  publishDate: string | null;
  newCandidates: number;
  totalCandidates: number;
  status: JobStatus;
  recruiter: string;
}

export interface JobCandidate {
  id: string;
  name: string;
  nameEn: string;
  email: string;
  phone?: string;
  location?: string;
  applyDate: string;
  education: string;
  experience: string;
  experienceYears: number;
  skills: string[];
  matchScore: number;
  scoreLevel: ScoreLevel;
  status: CandidateStatus;
  avatarColor?: string;
}

export interface CandidateDetail extends JobCandidate {
  resumeUrl?: string;
  aiAnalysis: AIAnalysis;
}

export interface AIAnalysis {
  matchScore: number;
  skills: SkillTag[];
  experiences: ExperienceItem[];
  education: EducationItem;
}

export interface SkillTag {
  name: string;
  level: 'high' | 'medium' | 'low';
  matched: boolean;
}

export interface ExperienceItem {
  company: string;
  position: string;
  duration: string;
  highlights: string[];
}

export interface EducationItem {
  school: string;
  degree: string;
  major: string;
  verified: boolean;
}

export interface JobStats {
  activeJobs: number;
  newResumes: number;
  pendingReview: number;
  scheduledInterviews: number;
}

export interface CandidateStats {
  total: number;
  pending: number;
  aiRecommended: number;
  scheduled: number;
}

