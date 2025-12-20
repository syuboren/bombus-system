/**
 * 組織管理模組 - 資料模型定義
 */

// ============================================================
// 公司相關
// ============================================================

/** 公司類型 */
export type CompanyType = 'headquarters' | 'subsidiary';

/** 公司狀態 */
export type CompanyStatus = 'active' | 'inactive';

/** 公司 */
export interface Company {
  id: string;
  name: string;
  code: string;
  type: CompanyType;
  parentCompanyId?: string;
  logo?: string;
  address: string;
  phone?: string;
  email?: string;
  taxId?: string;
  employeeCount: number;
  departmentCount: number;
  establishedDate: Date;
  status: CompanyStatus;
  description?: string;
}

/** 公司節點 (畫布模式用) */
export interface CompanyNode {
  id: string;
  companyId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  expanded: boolean;
}

// ============================================================
// 部門相關
// ============================================================

/** 部門層級 */
export type DepartmentLevel = 1 | 2 | 3 | 4 | 5;

/** 協作關係類型 */
export type CollaborationType = 'upstream' | 'downstream' | 'parallel' | 'support';

/** 部門協作關係 */
export interface DepartmentCollaboration {
  id: string;
  sourceDepartmentId: string;
  targetDepartmentId: string;
  relationType: CollaborationType;
  workflowDescription: string;
  communicationChannel: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed';
}

/** 部門 */
export interface Department {
  id: string;
  companyId: string;
  name: string;
  code: string;
  parentDepartmentId?: string;
  managerId?: string;
  managerName?: string;
  responsibilities: string[];
  level: DepartmentLevel;
  employeeCount: number;
  color?: string;
  icon?: string;
}

/** 部門節點 (畫布模式用) */
export interface DepartmentNode {
  id: string;
  departmentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  expanded: boolean;
}

// ============================================================
// 員工相關
// ============================================================

/** 員工狀態 */
export type EmployeeStatus = 'active' | 'on_leave' | 'resigned' | 'probation';

/** 員工職位 (支援跨公司/跨部門任職) */
export interface EmployeePosition {
  id: string;
  companyId: string;
  companyName: string;
  departmentId: string;
  departmentName: string;
  positionTitle: string;
  positionLevel: string;
  isPrimary: boolean;
  startDate: Date;
  endDate?: Date;
  responsibilities?: string[];
}

/** 員工 */
export interface Employee {
  id: string;
  employeeNo: string;
  name: string;
  englishName?: string;
  email: string;
  phone: string;
  mobile?: string;
  avatar?: string;
  gender: 'male' | 'female' | 'other';
  birthDate?: Date;
  hireDate: Date;
  status: EmployeeStatus;
  positions: EmployeePosition[];
  skills?: string[];
  education?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
}

// ============================================================
// 工作流程相關 (畫布模式用)
// ============================================================

/** 工作流程節點類型 */
export type WorkflowNodeType = 'process' | 'decision' | 'communication' | 'start' | 'end';

/** 工作流程連線 */
export interface WorkflowConnection {
  id: string;
  targetNodeId: string;
  label?: string;
  lineType: 'solid' | 'dashed';
  color?: string;
}

/** 工作流程節點 */
export interface WorkflowNode {
  id: string;
  departmentId: string;
  departmentName: string;
  x: number;
  y: number;
  nodeType: WorkflowNodeType;
  label: string;
  description?: string;
  connections: WorkflowConnection[];
  color?: string;
}

/** 工作流程 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  companyId: string;
  nodes: WorkflowNode[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// 統計與彙總
// ============================================================

/** 組織統計 */
export interface OrganizationStats {
  totalCompanies: number;
  totalDepartments: number;
  totalEmployees: number;
  activeEmployees: number;
  crossCompanyEmployees: number;
  departmentCollaborations: number;
}

/** 公司統計 */
export interface CompanyStats {
  companyId: string;
  departmentCount: number;
  employeeCount: number;
  managerCount: number;
  avgTenure: number;
}

