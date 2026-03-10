import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { OrgUnit } from '../models/org-unit.model';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * 共用組織單位服務
 * 一次載入全部 org_units，提供子公司/部門篩選 computed signals
 */
@Injectable({ providedIn: 'root' })
export class OrgUnitService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  /** 全部組織單位（快取） */
  orgUnits = signal<OrgUnit[]>([]);
  private loaded = signal(false);

  /** 子公司列表（type = group 或 subsidiary） */
  subsidiaries = computed(() =>
    this.orgUnits().filter(u => u.type === 'group' || u.type === 'subsidiary')
  );

  /** 全部部門（type = department） */
  allDepartments = computed(() =>
    this.orgUnits().filter(u => u.type === 'department')
  );

  /** 根據使用者 RBAC scope 自動鎖定的子公司 ID（null 表示不鎖定） */
  lockedSubsidiaryId = computed(() => {
    const user = this.authService.currentUser();
    return user?.scope?.type === 'subsidiary' ? (user.scope.id || null) : null;
  });

  /** 載入全部 org_units（帶快取，僅呼叫一次 API） */
  loadOrgUnits(): Observable<OrgUnit[]> {
    if (this.loaded()) {
      return of(this.orgUnits());
    }
    return this.http.get<OrgUnit[]>('/api/organization/org-units').pipe(
      tap(units => {
        this.orgUnits.set(units);
        this.loaded.set(true);
      }),
      catchError(error => {
        console.error('Failed to load org units:', error);
        return of([]);
      })
    );
  }

  /** 依子公司 ID 篩選部門（空字串表示全部） */
  filterDepartments(subsidiaryId: string): OrgUnit[] {
    const depts = this.allDepartments();
    if (!subsidiaryId) return depts;
    return depts.filter(d => d.parent_id === subsidiaryId);
  }
}
