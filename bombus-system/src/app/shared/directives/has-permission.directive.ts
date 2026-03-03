import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
  OnDestroy
} from '@angular/core';
import { PermissionService } from '../../core/services/permission.service';

/**
 * HasPermissionDirective — 根據使用者權限控制 DOM 元素顯示
 *
 * 使用方式：
 *   <button *hasPermission="'employees:create'">新增員工</button>
 *   <div *hasPermission="'organization:manage'">管理面板</div>
 */
@Directive({
  standalone: true,
  selector: '[hasPermission]'
})
export class HasPermissionDirective implements OnDestroy {
  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private permissionService = inject(PermissionService);

  private isVisible = false;
  private permission = '';
  private effectRef: ReturnType<typeof effect> | null = null;

  @Input()
  set hasPermission(permission: string) {
    this.permission = permission;
    this.setupEffect();
  }

  private setupEffect(): void {
    // 清除先前的 effect
    this.effectRef?.destroy();

    this.effectRef = effect(() => {
      // 讀取 Signal 以建立 reactive 依賴
      const permissions = this.permissionService.permissions();
      const roles = this.permissionService.roles();

      this.updateView();
    });
  }

  private updateView(): void {
    if (!this.permission) return;

    const [resource, action] = this.permission.split(':');
    const hasAccess = this.permissionService.hasPermission(resource, action);

    if (hasAccess && !this.isVisible) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.isVisible = true;
    } else if (!hasAccess && this.isVisible) {
      this.viewContainer.clear();
      this.isVisible = false;
    }
  }

  ngOnDestroy(): void {
    this.effectRef?.destroy();
  }
}
