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
   */
  isFeatureEnabled(featureId: string): boolean {
    const features = this.enabledFeatures();
    if (features.size === 0) return true;
    return features.has(featureId);
  }

  /**
   * 檢查模組前綴是否有任何啟用功能。
   * 例：isModuleEnabled('L1') 會檢查是否有任何 L1.* 功能。
   */
  isModuleEnabled(prefix: string): boolean {
    const features = this.enabledFeatures();
    if (features.size === 0) return true;
    for (const f of features) {
      if (f.startsWith(prefix + '.')) return true;
    }
    return false;
  }
}
