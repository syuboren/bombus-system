import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from '../../features/auth/services/auth.service';
import { UserFeaturePerm } from '../../features/auth/models/auth.model';

@Injectable({ providedIn: 'root' })
export class FeatureGateService {
  private authService = inject(AuthService);

  readonly enabledFeatures = computed<Set<string>>(() => {
    const user = this.authService.currentUser();
    return new Set(user?.enabled_features ?? []);
  });

  /**
   * 檢查特定功能是否已啟用（subscription plan 模組層級）。
   * 無方案資料時全部開放（優雅降級）。
   * 支援精確比對（'L1.jobs'）及模組級別比對（'L1' 啟用所有 L1.*）。
   */
  isFeatureEnabled(featureId: string): boolean {
    const features = this.enabledFeatures();
    if (features.size === 0) return true;
    if (features.has(featureId)) return true;
    const modulePrefix = featureId.split('.')[0];
    return features.has(modulePrefix);
  }

  /**
   * 檢查模組前綴是否有任何啟用功能。
   * 例：isModuleEnabled('L1') 會檢查是否有任何 L1.* 功能。
   */
  isModuleEnabled(prefix: string): boolean {
    const features = this.enabledFeatures();
    if (features.size === 0) return true;
    if (features.has(prefix)) return true;
    for (const f of features) {
      if (f.startsWith(prefix + '.')) return true;
    }
    return false;
  }

  // ── Decision 2：Feature-level permission checks ──

  /**
   * 取得功能權限（合併後）
   */
  getFeaturePerm(featureId: string): UserFeaturePerm | null {
    return this.authService.featurePerms().get(featureId) ?? null;
  }

  /**
   * 檢查使用者是否可檢視此功能（action_level >= 'view'）
   * 無權限資料時視為可檢視（優雅降級）
   */
  canView(featureId: string): boolean {
    const perms = this.authService.featurePerms();
    if (perms.size === 0) return true; // 優雅降級
    const perm = perms.get(featureId);
    if (!perm) return false;
    return perm.action_level === 'view' || perm.action_level === 'edit';
  }

  /**
   * 檢查使用者是否可編輯此功能（action_level === 'edit'）
   */
  canEdit(featureId: string): boolean {
    const perms = this.authService.featurePerms();
    if (perms.size === 0) return true; // 優雅降級
    const perm = perms.get(featureId);
    if (!perm) return false;
    return perm.action_level === 'edit';
  }

  /**
   * Decision 2：雙層檢查 — subscription plan + feature perm
   * 功能可存取 = 模組已啟用 AND action_level 不為 'none'
   * super_admin 繞過所有 feature gate 檢查
   */
  isFeatureAccessible(featureId: string): boolean {
    const user = this.authService.currentUser();
    if (user?.roles?.includes('super_admin')) return true;
    return this.isFeatureEnabled(featureId) && this.canView(featureId);
  }
}
