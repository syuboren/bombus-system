/**
 * 共用候選人完整表單 model — HR「新增候選人」與公開「內推應徵」共用
 * 欄位對齊 candidates + candidate_education + candidate_experiences
 *        + candidate_specialities + candidate_languages + candidate_projects + candidate_attachments
 */

export interface EducationEntry {
  schoolName: string;
  major: string;
  degreeLevel: string;
  degreeStatus: string;
  startDate?: string;
  endDate?: string;
}

export interface ExperienceEntry {
  firmName: string;
  jobName: string;
  industryCategory: string;
  companySize?: string;
  workPlace?: string;
  startDate: string;
  endDate?: string; // empty = 在職中
  jobDesc: string;
  skills?: string;
}

export interface SpecialityEntry {
  skill: string;       // 必填
  description?: string;
  tags?: string;
}

export interface LanguageEntry {
  langType: string;       // 必填
  listenDegree: string;   // 必填
  speakDegree: string;    // 必填
  readDegree?: string;
  writeDegree?: string;
  certificates?: string;
}

export interface ProjectEntry {
  title: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  resourceLink?: string;
}

export interface AttachmentEntry {
  title?: string;
  fileName: string;
  resourceLink: string; // 上傳後的 /uploads/... URL
  mimeType?: string;
  size?: number;
}

export interface CandidateFullForm {
  // Tab 1 基本資料
  /** 大頭照 URL（已裁切並上傳至後端，對應 candidates.avatar） */
  avatar?: string;
  name: string;
  nameEn?: string;
  gender: string;
  birthday: string;
  email: string; // HR 模式可編輯 / 公開模式 readonly
  phone: string;
  tel?: string;
  contactInfo?: string;
  address?: string;
  nationality: string;
  militaryStatus?: string;
  drivingLicenses?: string;
  transports?: string;

  // Tab 2 求職條件
  jobCharacteristic?: string;
  workInterval?: string;
  shiftWork?: boolean | null;
  startDateOpt?: string;
  expectedSalary?: string;
  preferredLocation?: string;
  preferredJobName?: string;
  preferredJobCategory?: string;
  preferredIndustry?: string;
  introduction?: string;
  motto?: string;
  characteristic?: string;
  certificates?: string;

  // Tab 3 學經歷（工作經歷改為選填）
  educationList: EducationEntry[];
  experienceList: ExperienceEntry[];

  // Tab 4 技能與作品
  specialityList: SpecialityEntry[];   // 最少 1 筆
  languageList: LanguageEntry[];       // 最少 1 筆
  projectList: ProjectEntry[];         // 選填，0 筆亦可
  skillsText?: string;                 // 舊欄位保留：自由文字技能標籤

  // Tab 5 附件（可 0 筆）
  attachments: AttachmentEntry[];
}

/**
 * 表單模式：
 *  - 'hr'     : HR 於後台新增候選人（email 可編輯、透過登入 upload endpoint）
 *  - 'public' : 公開內推頁（email readonly、透過 token-based upload endpoint）
 */
export type CandidateFormMode = 'hr' | 'public';

export function emptyCandidateFullForm(email = ''): CandidateFullForm {
  return {
    avatar: '',
    name: '',
    nameEn: '',
    gender: '',
    birthday: '',
    email,
    phone: '',
    tel: '',
    contactInfo: '',
    address: '',
    nationality: '',
    militaryStatus: '',
    drivingLicenses: '',
    transports: '',
    jobCharacteristic: '',
    workInterval: '',
    shiftWork: null,
    startDateOpt: '',
    expectedSalary: '',
    preferredLocation: '',
    preferredJobName: '',
    preferredJobCategory: '',
    preferredIndustry: '',
    introduction: '',
    motto: '',
    characteristic: '',
    certificates: '',
    educationList: [emptyEducationEntry()],
    experienceList: [],
    specialityList: [emptySpecialityEntry()],
    languageList: [emptyLanguageEntry()],
    projectList: [],
    skillsText: '',
    attachments: []
  };
}

export function emptyEducationEntry(): EducationEntry {
  return { schoolName: '', major: '', degreeLevel: '', degreeStatus: '', startDate: '', endDate: '' };
}

export function emptyExperienceEntry(): ExperienceEntry {
  return {
    firmName: '',
    jobName: '',
    industryCategory: '',
    companySize: '',
    workPlace: '',
    startDate: '',
    endDate: '',
    jobDesc: '',
    skills: ''
  };
}

export function emptySpecialityEntry(): SpecialityEntry {
  return { skill: '', description: '', tags: '' };
}

export function emptyLanguageEntry(): LanguageEntry {
  return { langType: '', listenDegree: '', speakDegree: '', readDegree: '', writeDegree: '', certificates: '' };
}

export function emptyProjectEntry(): ProjectEntry {
  return { title: '', startDate: '', endDate: '', description: '', resourceLink: '' };
}
