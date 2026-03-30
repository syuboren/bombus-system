/**
 * 統一員工資料模型
 *
 * 合併 talent-pool.model.ts 和 organization.model.ts 的 Employee 定義，
 * 提供單一真理來源供所有模組使用。
 */

// ============================================================
// 共用類型
// ============================================================

export type EmployeeStatus = 'active' | 'probation' | 'leave' | 'on_leave' | 'resigned' | 'terminated';

export type ContractType = 'full-time' | 'part-time' | 'contract' | 'intern';

export type Gender = 'male' | 'female' | 'other';

// ============================================================
// 職位（跨公司/跨部門支援）
// ============================================================

export interface EmployeePosition {
  companyId: string;
  companyName: string;
  departmentId: string;
  departmentName: string;
  positionTitle: string;
  positionLevel: string;
  isPrimary: boolean;
  startDate?: Date;
  endDate?: Date;
}

// ============================================================
// 統一員工列表模型
// ============================================================

export interface UnifiedEmployee {
  id: string;
  employeeNo: string;
  name: string;
  englishName?: string;
  email: string;
  phone: string;
  mobile?: string;
  avatar?: string;
  gender: Gender;
  department: string;
  position: string;
  level: string;
  grade: string;
  manager: string;
  managerId: string;
  hireDate?: Date;
  status: EmployeeStatus;
  contractType: ContractType;
  workLocation: string;

  // 跨公司職位
  positions: EmployeePosition[];

  // 使用者帳號關聯
  userId: string | null;
  userStatus: string | null;

  // 組織歸屬
  orgUnitId?: string;

  // 技能與證照
  skills: string[];
  certifications: string[];
}

// ============================================================
// 統一員工詳情模型
// ============================================================

export interface UnifiedEmployeeDetail extends UnifiedEmployee {
  birthDate?: Date;
  address?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  education: EmployeeEducation[];
  workHistory: JobChange[];
  documents: EmployeeDocument[];
  training: EmployeeTraining[];
  performance: EmployeePerformance[];
  roi: EmployeeROI;

  // 使用者角色
  userRoles: UserRole[];

  // 候選人追溯
  candidateSource?: CandidateSource;

  // 入職進度（試用期員工）
  onboardingProgress?: OnboardingProgress;
}

// ============================================================
// 子介面
// ============================================================

export interface EmployeeEducation {
  degree: string;
  school: string;
  major: string;
  graduationYear: number;
}

export interface JobChange {
  id: string;
  effectiveDate?: Date;
  changeType: 'hire' | 'promotion' | 'transfer' | 'demotion' | 'title-change' | 'salary-adjustment';
  fromPosition: string;
  toPosition: string;
  fromDepartment: string;
  toDepartment: string;
  fromLevel?: string;
  toLevel?: string;
  salaryChange?: number;
  reason: string;
  approvedBy: string;
}

export type DocumentStatus = 'valid' | 'expiring' | 'expired' | 'pending';

export interface EmployeeDocument {
  id: string;
  name: string;
  type: 'contract' | 'certificate' | 'id' | 'insurance' | 'tax' | 'other';
  uploadDate: Date;
  expiryDate?: Date;
  status: DocumentStatus;
  version: string;
  filePath: string;
  uploadedBy: string;
}

export interface EmployeeTraining {
  id: string;
  courseName: string;
  courseType: 'internal' | 'external' | 'online';
  completionDate?: Date;
  score?: number;
  certificate?: string;
  hours: number;
  cost: number;
  status: 'enrolled' | 'in-progress' | 'completed' | 'cancelled';
  instructor?: string;
  notes?: string;
}

export interface EmployeePerformance {
  id: string;
  period: string;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  goals: { name: string; achievement: number }[];
  strengths: string[];
  improvements: string[];
  reviewedBy: string;
  reviewDate: Date;
}

export interface EmployeeROI {
  employeeId: string;
  period: string;
  salaryCost: number;
  trainingCost: number;
  benefitsCost: number;
  totalCost: number;
  revenue: number;
  projectValue: number;
  productivity: number;
  roi: number;
  trend: 'up' | 'stable' | 'down';
  comparison: {
    departmentAvg: number;
    companyAvg: number;
  };
}

export interface EmployeeStats {
  totalEmployees: number;
  activeCount: number;
  probationCount: number;
  avgTenure: number;
  departmentBreakdown: { department: string; count: number; percentage: number }[];
  levelBreakdown: { level: string; count: number }[];
  expiringDocuments: number;
  upcomingAnniversaries: { employeeId: string; name: string; date: Date; years: number }[];
}

export interface UserRole {
  roleId: string;
  roleName: string;
  orgUnitId?: string;
  orgUnitName?: string;
}

export interface CandidateSource {
  candidate_id: string;
  name: string;
  email: string;
  position: string;
  status: string;
  stage: string;
}

export interface OnboardingProgress {
  overall: number;
  templates: {
    total: number;
    signed: number;
    approved: number;
  };
  documents: {
    total: number;
    uploaded: number;
  };
  probation_end_date: string;
  probation_months: number;
}

export interface AuditLog {
  id: string;
  employeeId: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export';
  field?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  performedAt: Date;
  ipAddress?: string;
}

// ============================================================
// 批次匯入
// ============================================================

export interface BatchImportRow {
  name: string;
  email: string;
  employee_no: string;
  subsidiary: string;
  department: string;
  hire_date: string;
  level: string;
  grade: string;
  position: string;
  english_name?: string;
  phone?: string;
  mobile?: string;
  gender?: string;
  birth_date?: string;
  contract_type?: string;
  work_location?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  manager_no?: string;
}

export interface BatchValidationResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  rows: {
    row: number;
    status: 'valid' | 'error';
    data: BatchImportRow;
    errors?: string[];
    warnings?: string[];
  }[];
}

export interface BatchImportJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  completedAt?: string;
}

export interface BatchImportResult {
  rowNumber: number;
  status: 'success' | 'error';
  employeeId?: string;
  employeeName?: string;
  email?: string;
  employeeNo?: string;
  initialPassword?: string;
  errorMessage?: string;
}

// ============================================================
// API 請求/回應
// ============================================================

export interface CreateEmployeeRequest {
  name: string;
  email: string;
  employee_no: string;
  department: string;
  position: string;
  level: string;
  grade: string;
  hire_date: string;
  org_unit_id?: string;
  english_name?: string;
  mobile?: string;
  gender?: Gender;
  birth_date?: string;
  contract_type?: ContractType;
  work_location?: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
}

export interface CreateEmployeeResponse {
  employee: any;
  user: { id: string; email: string; name: string; status: string } | null;
  initialPassword: string | null;
}
