import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from '../../features/auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class FeatureGateService {
  private authService = inject(AuthService);

  readonly enabledFeatures = computed<Set<string>>(() => {
    const user = this.authService.currentUser();
    return new Set(user?.enabled_features ?? []);
  });

  /**
   * 檢查特定功能是否已啟用。
   * 無方案資料時全部開放（優雅降級）。
   * 支援精確比對（'L1.jobs'）及模組級別比對（'L1' 啟用所有 L1.*）。
   */
  isFeatureEnabled(featureId: string): boolean {
    const features = this.enabledFeatures();
    if (features.size === 0) return true;
    // 精確比對
    if (features.has(featureId)) return true;
    // 模組級別比對：若 features 含 'L1' 則所有 'L1.*' 皆啟用
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
}
