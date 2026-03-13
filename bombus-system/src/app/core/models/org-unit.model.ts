/**
 * 組織單位共用模型
 * 用於全系統子公司→部門級聯篩選
 */
export interface OrgUnit {
  id: string;
  name: string;
  type: 'group' | 'subsidiary' | 'department';
  parent_id?: string;
  level: number;
}
