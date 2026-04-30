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

/** @deprecated 使用 SimpleCollaborationType */
export type CollaborationType = 'upstream' | 'downstream' | 'parallel' | 'support';

/** @deprecated 使用 SimpleCollaboration */
export interface DepartmentCollaboration {
  id: string;
  sourceDepartmentId: string;
  targetDepartmentId: string;
  relationType: CollaborationType;
  workflowDescription: string;
  communicationChannel: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed';
}

/** 簡化協作關係類型 */
export type SimpleCollaborationType = 'parallel' | 'downstream';

/** 部門 */
export interface Department {
  id: string;
  companyId: string;
  name: string;
  code: string;
  parentDepartmentId?: string;
  managerId?: string;
  managerName?: string;
  /** 最終產出價值清單（D-16：DB 欄位為 departments.value） */
  value: string[];
  /** @deprecated 改用 `value`；過渡期向後相容別名 */
  responsibilities?: string[];
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

/**
 * 員工職位 (支援跨公司/跨部門任職)
 * @deprecated 請改用 shared/models/employee.model.ts 的 EmployeePosition
 */
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

/**
 * 員工
 * @deprecated 請改用 shared/models/employee.model.ts 的 UnifiedEmployee
 */
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

// ============================================================
// 統一組織架構（Unified Org Tree）
// ============================================================

/** 組織樹節點類型 */
export type OrgNodeType = 'group' | 'subsidiary' | 'department';

/** 統一組織樹節點 */
export interface OrgTreeNode {
  id: string;
  name: string;
  type: OrgNodeType;
  parentId: string | null;
  level: number;
  managerId: string | null;
  managerName: string | null;
  employeeCount: number;
  /** 最終產出價值（D-16：取代 responsibilities） */
  value: string[];
  /** @deprecated 改用 `value`；後端仍同時提供以利過渡 */
  responsibilities: string[];
  kpiItems: string[];
  competencyFocus: string[];
  // 公司詳情欄位（group/subsidiary）
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  taxId?: string;
  status?: 'active' | 'inactive';
  establishedDate?: string;
  departmentCount?: number;
}

/** 部門員工（輕量版） */
export interface DepartmentEmployee {
  id: string;
  name: string;
  employeeNo: string;
  position: string;
  avatar: string | null;
  status: string;
}

/** 部門職務配置 */
export interface DepartmentPositionInfo {
  id: string;
  title: string;
  track: string;
  grade: number;
  gradeTitle: string | null;
}

/** 錨點方向 */
export type AnchorSide = 'top' | 'bottom' | 'left' | 'right';

/** 簡化協作關係 */
export interface SimpleCollaboration {
  id: string;
  sourceDeptId: string;
  targetDeptId: string;
  sourceName?: string;
  targetName?: string;
  relationType: SimpleCollaborationType;
  description: string | null;
  sourceAnchor?: AnchorSide | null;
  targetAnchor?: AnchorSide | null;
  createdAt?: string;
}

