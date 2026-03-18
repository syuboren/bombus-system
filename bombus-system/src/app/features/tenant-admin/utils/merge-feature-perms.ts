import {
  RoleFeaturePerm,
  ActionLevel,
  PermScope
} from '../models/tenant-admin.model';

/**
 * Action level 優先級排序（數值越高權限越大）
 */
export const ACTION_RANK: Record<string, number> = {
  none: 0,
  view: 1,
  edit: 2
};

/**
 * Scope 範圍排序（數值越高範圍越廣）
 */
export const SCOPE_RANK: Record<string, number> = {
  self: 1,
  department: 2,
  company: 3
};

/**
 * 功能模組顯示名稱
 */
export const MODULE_LABELS: Record<string, string> = {
  L1: 'L1 員工管理',
  L2: 'L2 職能管理',
  L3: 'L3 教育訓練',
  L4: 'L4 專案管理',
  L5: 'L5 績效管理',
  L6: 'L6 文化管理',
  SYS: '系統管理'
};

/**
 * 功能模組排序順序
 */
export const MODULE_ORDER: string[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'SYS'];

/**
 * 合併多個角色的 feature permissions。
 * 同一 feature_id 取最高 action_level、最寬 edit_scope、最寬 view_scope。
 * 結果按 sort_order 排序。
 *
 * @param permsByRole - 每個角色各自的 RoleFeaturePerm 陣列
 * @returns 合併後的 RoleFeaturePerm[]，按 sort_order 升序排序
 */
export function mergeFeaturePerms(permsByRole: RoleFeaturePerm[][]): RoleFeaturePerm[] {
  const merged = new Map<string, {
    action_level: ActionLevel;
    edit_scope: PermScope | null;
    view_scope: PermScope | null;
    feature_name: string;
    module: RoleFeaturePerm['module'];
    sort_order: number;
  }>();

  // 扁平化所有角色的 perms 並逐筆合併
  for (const rolePerms of permsByRole) {
    for (const p of rolePerms) {
      const existing = merged.get(p.feature_id);

      if (!existing) {
        merged.set(p.feature_id, {
          action_level: p.action_level,
          edit_scope: p.edit_scope,
          view_scope: p.view_scope,
          feature_name: p.feature_name,
          module: p.module,
          sort_order: p.sort_order
        });
      } else {
        // 取最高 action_level
        if (ACTION_RANK[p.action_level] > ACTION_RANK[existing.action_level]) {
          existing.action_level = p.action_level;
        }
        // 取最寬 edit_scope
        if (p.edit_scope && (!existing.edit_scope || SCOPE_RANK[p.edit_scope] > SCOPE_RANK[existing.edit_scope])) {
          existing.edit_scope = p.edit_scope;
        }
        // 取最寬 view_scope
        if (p.view_scope && (!existing.view_scope || SCOPE_RANK[p.view_scope] > SCOPE_RANK[existing.view_scope])) {
          existing.view_scope = p.view_scope;
        }
      }
    }
  }

  // 轉換為陣列並按 sort_order 排序
  return Array.from(merged.entries())
    .map(([featureId, v]) => ({
      feature_id: featureId,
      feature_name: v.feature_name,
      module: v.module,
      sort_order: v.sort_order,
      action_level: v.action_level,
      edit_scope: v.edit_scope,
      view_scope: v.view_scope
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * 將 feature permissions 按 module 分組。
 *
 * @param perms - RoleFeaturePerm 陣列
 * @returns Map，key 為 module 字串，value 為該模組的 RoleFeaturePerm[]
 */
export function groupByModule(perms: RoleFeaturePerm[]): Map<string, RoleFeaturePerm[]> {
  const grouped = new Map<string, RoleFeaturePerm[]>();

  for (const p of perms) {
    if (!grouped.has(p.module)) {
      grouped.set(p.module, []);
    }
    grouped.get(p.module)!.push(p);
  }

  return grouped;
}
