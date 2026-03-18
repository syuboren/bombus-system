import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { AssessmentService } from '../../services/assessment.service';
import { MonthlyCheckTemplate } from '../../models/assessment.model';
import { OrgUnitService } from '../../../../core/services/org-unit.service';

@Component({
  selector: 'app-template-manage-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './template-manage-page.component.html',
  styleUrl: './template-manage-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplateManagePageComponent implements OnInit {
  private assessmentService = inject(AssessmentService);
  private orgUnitService = inject(OrgUnitService);

  // Page Info
  readonly pageTitle = '指標模板管理';
  readonly breadcrumbs = ['首頁', '職能管理', '模板管理'];

  // Data
  templates = signal<MonthlyCheckTemplate[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  // Filters
  selectedDepartment = signal('');
  selectedPosition = signal('');

  // Modal
  showModal = signal(false);
  editingTemplate = signal<Partial<MonthlyCheckTemplate> | null>(null);
  isNewTemplate = signal(false);

  // Copy Modal
  showCopyModal = signal(false);
  copySource = signal({ department: '', position: '' });
  copyTarget = signal({ department: '', position: '' });

  // 組織單位（子公司→部門級聯篩選）
  subsidiaries = this.orgUnitService.visibleSubsidiaries;
  isSubsidiaryLocked = this.orgUnitService.isSubsidiaryLocked;

  // 篩選列 & 編輯 Modal 用
  selectedSubsidiaryId = signal<string>(this.orgUnitService.lockedSubsidiaryId() || '');
  filteredDepartments = computed(() =>
    this.orgUnitService.filterDepartments(this.selectedSubsidiaryId())
  );

  // 複製 Modal 用（來源/目標獨立）
  copySourceSubId = signal<string>('');
  copyTargetSubId = signal<string>('');
  copySourceDepts = computed(() =>
    this.orgUnitService.filterDepartments(this.copySourceSubId())
  );
  copyTargetDepts = computed(() =>
    this.orgUnitService.filterDepartments(this.copyTargetSubId())
  );

  // Options
  readonly positionOptions = [
    { value: '', label: '全部職位' },
    { value: '工程師', label: '工程師' },
    { value: '資深工程師', label: '資深工程師' },
    { value: '技術主管', label: '技術主管' },
    { value: '業務專員', label: '業務專員' },
    { value: '業務主管', label: '業務主管' },
    { value: '行銷專員', label: '行銷專員' },
    { value: '人資專員', label: '人資專員' },
    { value: '財務專員', label: '財務專員' },
    { value: '行政人員', label: '行政人員' }
  ];

  // Computed
  filteredTemplates = computed(() => {
    let result = this.templates();
    const dept = this.selectedDepartment();
    const pos = this.selectedPosition();
    
    if (dept) {
      result = result.filter(t => t.department === dept);
    }
    if (pos) {
      result = result.filter(t => t.position === pos);
    }
    
    return result;
  });

  groupedTemplates = computed(() => {
    const templates = this.filteredTemplates();
    const groups: Record<string, MonthlyCheckTemplate[]> = {};
    
    templates.forEach(t => {
      const key = `${t.department} - ${t.position}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(t);
    });
    
    // 按 orderNum 排序
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (a.orderNum || 0) - (b.orderNum || 0));
    });
    
    return groups;
  });

  templateStats = computed(() => {
    const templates = this.templates();
    const departments = new Set(templates.map(t => t.department));
    const positions = new Set(templates.map(t => `${t.department}-${t.position}`));
    const active = templates.filter(t => t.isActive).length;
    
    return {
      total: templates.length,
      departments: departments.size,
      positions: positions.size,
      active
    };
  });

  ngOnInit(): void {
    this.orgUnitService.loadOrgUnits().subscribe();
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.assessmentService.getMonthlyCheckTemplates().subscribe({
      next: (data) => {
        this.templates.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('載入失敗');
        this.loading.set(false);
      }
    });
  }

  // Filter handlers
  onSubsidiaryChange(subId: string): void {
    this.selectedSubsidiaryId.set(subId);
    // 切換子公司時重置部門篩選
    this.selectedDepartment.set('');
  }

  onEditSubsidiaryChange(subId: string): void {
    this.selectedSubsidiaryId.set(subId);
    // 切換子公司時重置編輯 Modal 中的部門
    this.updateEditingField('department', '');
  }

  onDepartmentChange(dept: string): void {
    this.selectedDepartment.set(dept);
  }

  onPositionChange(pos: string): void {
    this.selectedPosition.set(pos);
  }

  // Modal handlers
  openCreateModal(): void {
    this.editingTemplate.set({
      department: this.selectedDepartment() || '',
      position: this.selectedPosition() || '',
      name: '',
      points: 1,
      description: '',
      measurement: '',
      orderNum: 0,
      isActive: true
    });
    this.isNewTemplate.set(true);
    this.showModal.set(true);
  }

  openEditModal(template: MonthlyCheckTemplate): void {
    this.editingTemplate.set({ ...template });
    this.isNewTemplate.set(false);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingTemplate.set(null);
  }

  updateEditingField(field: keyof MonthlyCheckTemplate, value: any): void {
    this.editingTemplate.update(t => t ? { ...t, [field]: value } : null);
  }

  saveTemplate(): void {
    const template = this.editingTemplate();
    if (!template || !template.name || !template.department || !template.position) {
      this.error.set('請填寫必要欄位');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    if (this.isNewTemplate()) {
      this.assessmentService.createTemplate(template).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadTemplates();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('建立失敗');
        }
      });
    } else {
      this.assessmentService.updateTemplate(template.id!, template).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.loadTemplates();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('更新失敗');
        }
      });
    }
  }

  deleteTemplate(template: MonthlyCheckTemplate): void {
    if (!confirm(`確定要刪除「${template.name}」嗎？`)) return;

    this.assessmentService.deleteTemplate(template.id).subscribe({
      next: () => {
        this.loadTemplates();
      },
      error: () => {
        this.error.set('刪除失敗');
      }
    });
  }

  toggleActive(template: MonthlyCheckTemplate): void {
    this.assessmentService.updateTemplate(template.id, { isActive: !template.isActive }).subscribe({
      next: () => {
        this.loadTemplates();
      }
    });
  }

  // Copy Modal handlers
  openCopyModal(): void {
    this.copySource.set({ department: '', position: '' });
    this.copyTarget.set({ department: '', position: '' });
    this.copySourceSubId.set('');
    this.copyTargetSubId.set('');
    this.showCopyModal.set(true);
  }

  closeCopyModal(): void {
    this.showCopyModal.set(false);
  }

  onCopySourceSubChange(subId: string): void {
    this.copySourceSubId.set(subId);
    this.copySource.update(s => ({ ...s, department: '' }));
  }

  onCopyTargetSubChange(subId: string): void {
    this.copyTargetSubId.set(subId);
    this.copyTarget.update(t => ({ ...t, department: '' }));
  }

  updateCopySource(field: 'department' | 'position', value: string): void {
    this.copySource.update(s => ({ ...s, [field]: value }));
  }

  updateCopyTarget(field: 'department' | 'position', value: string): void {
    this.copyTarget.update(t => ({ ...t, [field]: value }));
  }

  executeCopy(): void {
    const source = this.copySource();
    const target = this.copyTarget();
    
    if (!source.department || !source.position || !target.department || !target.position) {
      this.error.set('請選擇來源與目標職位');
      return;
    }

    this.saving.set(true);
    this.assessmentService.copyTemplates({
      sourceDepartment: source.department,
      sourcePosition: source.position,
      targetDepartment: target.department,
      targetPosition: target.position
    }).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.closeCopyModal();
        this.loadTemplates();
        alert(`成功複製 ${result?.count || 0} 個指標模板`);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('複製失敗');
      }
    });
  }

  // Utility
  trackByTemplate(index: number, template: MonthlyCheckTemplate): string {
    return template.id;
  }

  trackByGroup(index: number, group: { key: string; value: MonthlyCheckTemplate[] }): string {
    return group.key;
  }

  getGroupKeys(): string[] {
    return Object.keys(this.groupedTemplates());
  }
}
