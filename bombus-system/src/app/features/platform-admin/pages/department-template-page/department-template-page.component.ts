import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformAdminService } from '../../services/platform-admin.service';
import {
  Industry,
  DepartmentTemplate,
  IndustryDeptAssignment,
  CompanySize
} from '../../models/platform.model';

const SIZE_OPTIONS: Array<{ code: CompanySize; label: string; hint: string }> = [
  { code: 'micro', label: '微型', hint: '1-10 人 / 扁平化' },
  { code: 'small', label: '小型', hint: '10-50 人 / 功能型' },
  { code: 'medium', label: '中型', hint: '50-200 人 / 事業部' },
  { code: 'large', label: '大型', hint: '200+ 人 / 矩陣型' }
];

interface AssignmentRow {
  id: string;
  industry_code: string;
  dept_template_id: string;
  template_name: string;
  template_value: string[];
  is_common: boolean;
  sizes: CompanySize[];
  display_order: number;
}

interface NewTemplateForm {
  name: string;
  value: string[];
  is_common: boolean;
  sizes: CompanySize[];
}

const EMPTY_NEW_TEMPLATE: NewTemplateForm = {
  name: '',
  value: [''],
  is_common: false,
  sizes: ['small', 'medium', 'large']
};

@Component({
  selector: 'app-department-template-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './department-template-page.component.html',
  styleUrls: ['./department-template-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentTemplatePageComponent implements OnInit {
  private platformService = inject(PlatformAdminService);

  readonly SIZE_OPTIONS = SIZE_OPTIONS;
  readonly COMMON_POOL_KEY = '__common_pool__';

  industries = signal<Industry[]>([]);
  selectedIndustryCode = signal<string>(''); // '' 表示尚未選；COMMON_POOL_KEY 表示共通池

  // 該產業的所有 assignment（含共通池透過 industry_dept_assignments 加入的）
  assignments = signal<AssignmentRow[]>([]);

  // 共通池所有範本（不分產業）
  commonTemplates = signal<DepartmentTemplate[]>([]);
  // 已存在於資料庫的所有範本（用於從共通池納入時的選單）
  allTemplates = signal<DepartmentTemplate[]>([]);

  loading = signal(false);
  error = signal<string | null>(null);

  // 新增專屬範本表單
  showNewSpecificForm = signal(false);
  newSpecificForm = signal<NewTemplateForm>({ ...EMPTY_NEW_TEMPLATE });

  // 從共通池納入表單
  showAddCommonForm = signal(false);
  selectedCommonTemplateId = signal<string>('');
  addCommonSizes = signal<CompanySize[]>(['medium', 'large']);

  // 編輯指派（產業詳細視圖統一編輯：名稱 + Value + 適用規模）
  editingAssignmentRow = signal<AssignmentRow | null>(null);
  editingAssignmentName = signal<string>('');
  editingAssignmentValue = signal<string[]>([]);
  editingAssignmentSizesFull = signal<CompanySize[]>([]);

  // 編輯共通池範本
  editingTemplate = signal<DepartmentTemplate | null>(null);
  editingTemplateForm = signal<NewTemplateForm>({ ...EMPTY_NEW_TEMPLATE });

  // computed：當前選中的產業（不是共通池）
  currentIndustry = computed<Industry | null>(() => {
    const code = this.selectedIndustryCode();
    if (code === '' || code === this.COMMON_POOL_KEY) return null;
    return this.industries().find(i => i.code === code) || null;
  });

  isCommonPoolView = computed(() => this.selectedIndustryCode() === this.COMMON_POOL_KEY);

  ngOnInit(): void {
    this.loadIndustries();
  }

  loadIndustries(): void {
    this.loading.set(true);
    this.platformService.getIndustries(true).subscribe({
      next: (rows) => {
        this.industries.set(rows);
        this.loading.set(false);
        if (rows.length && !this.selectedIndustryCode()) {
          this.selectIndustry(rows[0].code);
        }
      },
      error: (err) => {
        this.error.set(err.error?.message || '載入產業失敗');
        this.loading.set(false);
      }
    });
  }

  selectIndustry(code: string): void {
    this.selectedIndustryCode.set(code);
    this.cancelEditAssignmentFull();
    if (code === this.COMMON_POOL_KEY) {
      this.loadCommonPool();
    } else {
      this.loadAssignments(code);
    }
  }

  /** 重新讀取產業列表以更新 sidebar 上的 assignment_count（不顯示 loading 避免閃爍） */
  refreshIndustryCounts(): void {
    this.platformService.getIndustries(true).subscribe({
      next: (rows) => this.industries.set(rows)
    });
  }

  loadAssignments(industryCode: string): void {
    this.loading.set(true);
    this.platformService.getIndustryDeptAssignments(industryCode).subscribe({
      next: (rows) => {
        this.assignments.set(rows.map(r => ({
          id: r.id,
          industry_code: r.industry_code,
          dept_template_id: r.dept_template_id,
          template_name: r.template_name || '',
          template_value: Array.isArray(r.template_value) ? r.template_value : [],
          is_common: !!r.is_common,
          sizes: Array.isArray(r.sizes_json) ? r.sizes_json as CompanySize[] : [],
          display_order: r.display_order
        })));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || '載入指派失敗');
        this.loading.set(false);
      }
    });
  }

  loadCommonPool(): void {
    this.loading.set(true);
    this.platformService.getDepartmentTemplates({ is_common: true }).subscribe({
      next: (rows) => {
        this.commonTemplates.set(rows.map(t => ({
          ...t,
          value: Array.isArray(t.value) ? t.value : []
        })));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || '載入共通池失敗');
        this.loading.set(false);
      }
    });
  }

  loadAllCommonTemplates(): void {
    this.platformService.getDepartmentTemplates({ is_common: true }).subscribe({
      next: (rows) => this.allTemplates.set(rows.map(t => ({
        ...t,
        value: Array.isArray(t.value) ? t.value : []
      })))
    });
  }

  // ============================================================
  // 新增專屬範本
  // ============================================================

  openNewSpecific(): void {
    this.newSpecificForm.set({ ...EMPTY_NEW_TEMPLATE, is_common: false });
    this.showNewSpecificForm.set(true);
  }

  openNewCommon(): void {
    this.newSpecificForm.set({ ...EMPTY_NEW_TEMPLATE, is_common: true });
    this.showNewSpecificForm.set(true);
  }

  closeNewForm(): void {
    this.showNewSpecificForm.set(false);
    this.newSpecificForm.set({ ...EMPTY_NEW_TEMPLATE });
  }

  submitNewTemplate(): void {
    const form = this.newSpecificForm();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      this.error.set('部門名稱必填');
      return;
    }
    const cleanValue = form.value.map(v => v.trim()).filter(v => v);

    this.platformService.createDepartmentTemplate({
      name: trimmedName,
      value: cleanValue,
      is_common: form.is_common
    }).subscribe({
      next: (tpl) => {
        if (form.is_common) {
          // 共通池新增：完成
          this.closeNewForm();
          if (this.isCommonPoolView()) this.loadCommonPool();
        } else {
          // 專屬：自動建立 assignment 至當前產業
          const industryCode = this.selectedIndustryCode();
          if (!industryCode || industryCode === this.COMMON_POOL_KEY) {
            this.closeNewForm();
            return;
          }
          this.platformService.createAssignment({
            industry_code: industryCode,
            dept_template_id: tpl.id,
            sizes_json: form.sizes,
            display_order: 0
          }).subscribe({
            next: () => {
              this.closeNewForm();
              this.loadAssignments(industryCode);
              this.refreshIndustryCounts();
            },
            error: (err) => this.error.set(err.error?.message || '建立指派失敗')
          });
        }
      },
      error: (err) => this.error.set(err.error?.message || '建立範本失敗')
    });
  }

  addValueItem(): void {
    this.newSpecificForm.update(f => ({ ...f, value: [...f.value, ''] }));
  }

  removeValueItem(idx: number): void {
    this.newSpecificForm.update(f => ({ ...f, value: f.value.filter((_, i) => i !== idx) }));
  }

  updateValueItem(idx: number, val: string): void {
    this.newSpecificForm.update(f => {
      const next = [...f.value];
      next[idx] = val;
      return { ...f, value: next };
    });
  }

  toggleNewSize(size: CompanySize): void {
    this.newSpecificForm.update(f => {
      const has = f.sizes.includes(size);
      return { ...f, sizes: has ? f.sizes.filter(s => s !== size) : [...f.sizes, size] };
    });
  }

  updateNewName(value: string): void {
    this.newSpecificForm.update(f => ({ ...f, name: value }));
  }

  // ============================================================
  // 從共通池納入
  // ============================================================

  openAddFromCommon(): void {
    this.loadAllCommonTemplates();
    this.selectedCommonTemplateId.set('');
    this.addCommonSizes.set(['medium', 'large']);
    this.showAddCommonForm.set(true);
  }

  closeAddCommonForm(): void {
    this.showAddCommonForm.set(false);
    this.selectedCommonTemplateId.set('');
  }

  /** 共通池中已被當前產業納入的 template ids（用來 disabled） */
  alreadyAssignedTemplateIds = computed(() =>
    new Set(this.assignments().filter(a => a.is_common).map(a => a.dept_template_id))
  );

  toggleAddCommonSize(size: CompanySize): void {
    this.addCommonSizes.update(arr =>
      arr.includes(size) ? arr.filter(s => s !== size) : [...arr, size]
    );
  }

  submitAddFromCommon(): void {
    const tplId = this.selectedCommonTemplateId();
    const industryCode = this.selectedIndustryCode();
    if (!tplId || !industryCode || industryCode === this.COMMON_POOL_KEY) {
      this.error.set('請選擇要納入的範本');
      return;
    }
    this.platformService.createAssignment({
      industry_code: industryCode,
      dept_template_id: tplId,
      sizes_json: this.addCommonSizes(),
      display_order: 0
    }).subscribe({
      next: () => {
        this.closeAddCommonForm();
        this.loadAssignments(industryCode);
        this.refreshIndustryCounts();
      },
      error: (err) => this.error.set(err.error?.message || '納入失敗')
    });
  }

  // ============================================================
  // 編輯指派（統一編輯：名稱 + Value + 適用規模）
  // ============================================================

  openEditAssignmentModal(row: AssignmentRow): void {
    this.editingAssignmentRow.set(row);
    this.editingAssignmentName.set(row.template_name);
    this.editingAssignmentValue.set(row.template_value.length ? [...row.template_value] : ['']);
    this.editingAssignmentSizesFull.set([...row.sizes]);
  }

  cancelEditAssignmentFull(): void {
    this.editingAssignmentRow.set(null);
    this.editingAssignmentName.set('');
    this.editingAssignmentValue.set([]);
    this.editingAssignmentSizesFull.set([]);
  }

  toggleEditFullSize(size: CompanySize): void {
    this.editingAssignmentSizesFull.update(arr =>
      arr.includes(size) ? arr.filter(s => s !== size) : [...arr, size]
    );
  }

  addAssignValueItem(): void {
    this.editingAssignmentValue.update(arr => [...arr, '']);
  }

  removeAssignValueItem(idx: number): void {
    this.editingAssignmentValue.update(arr => arr.filter((_, i) => i !== idx));
  }

  updateAssignValueItem(idx: number, val: string): void {
    this.editingAssignmentValue.update(arr => {
      const next = [...arr];
      next[idx] = val;
      return next;
    });
  }

  saveEditAssignmentFull(): void {
    const row = this.editingAssignmentRow();
    if (!row) return;
    const name = this.editingAssignmentName().trim();
    if (!name) {
      this.error.set('部門名稱必填');
      return;
    }
    const cleanValue = this.editingAssignmentValue().map(v => v.trim()).filter(v => v);
    const sizes = this.editingAssignmentSizesFull();
    const code = this.selectedIndustryCode();

    // 先更新範本（name + value），再更新指派（sizes）。任一失敗即報錯。
    this.platformService.updateDepartmentTemplate(row.dept_template_id, {
      name,
      value: cleanValue
    }).subscribe({
      next: () => {
        this.platformService.updateAssignment(row.id, { sizes_json: sizes }).subscribe({
          next: () => {
            this.cancelEditAssignmentFull();
            if (code && code !== this.COMMON_POOL_KEY) {
              this.loadAssignments(code);
              this.refreshIndustryCounts();
            }
          },
          error: (err) => this.error.set(err.error?.message || '更新適用規模失敗')
        });
      },
      error: (err) => this.error.set(err.error?.message || '更新範本失敗')
    });
  }

  removeAssignment(row: AssignmentRow): void {
    if (!confirm(`確定從「${this.currentIndustry()?.name}」移除「${row.template_name}」？\n\n移除後不影響範本字典本身（${row.is_common ? '共通池' : '專屬'}）。`)) return;
    this.platformService.deleteAssignment(row.id).subscribe({
      next: () => {
        const code = this.selectedIndustryCode();
        if (code && code !== this.COMMON_POOL_KEY) {
          this.loadAssignments(code);
          this.refreshIndustryCounts();
        }
      },
      error: (err) => this.error.set(err.error?.message || '移除失敗')
    });
  }

  // ============================================================
  // 編輯共通池範本本身
  // ============================================================

  startEditTemplate(tpl: DepartmentTemplate): void {
    this.editingTemplate.set(tpl);
    this.editingTemplateForm.set({
      name: tpl.name,
      value: tpl.value.length ? [...tpl.value] : [''],
      is_common: !!tpl.is_common,
      sizes: []
    });
  }

  cancelEditTemplate(): void {
    this.editingTemplate.set(null);
  }

  saveTemplateEdit(): void {
    const tpl = this.editingTemplate();
    if (!tpl) return;
    const form = this.editingTemplateForm();
    const cleanValue = form.value.map(v => v.trim()).filter(v => v);

    this.platformService.updateDepartmentTemplate(tpl.id, {
      name: form.name.trim(),
      value: cleanValue
    }).subscribe({
      next: () => {
        this.cancelEditTemplate();
        if (this.isCommonPoolView()) this.loadCommonPool();
      },
      error: (err) => this.error.set(err.error?.message || '更新失敗')
    });
  }

  deleteTemplate(tpl: DepartmentTemplate): void {
    if (!confirm(`確定刪除範本「${tpl.name}」？\n所有產業的指派將連帶刪除（CASCADE）。`)) return;
    this.platformService.deleteDepartmentTemplate(tpl.id).subscribe({
      next: () => {
        this.loadCommonPool();
        this.refreshIndustryCounts();
      },
      error: (err) => this.error.set(err.error?.message || '刪除失敗')
    });
  }

  updateEditingTemplateField<K extends keyof NewTemplateForm>(field: K, value: NewTemplateForm[K]): void {
    this.editingTemplateForm.update(f => ({ ...f, [field]: value }));
  }

  addEditValueItem(): void {
    this.editingTemplateForm.update(f => ({ ...f, value: [...f.value, ''] }));
  }

  removeEditValueItem(idx: number): void {
    this.editingTemplateForm.update(f => ({ ...f, value: f.value.filter((_, i) => i !== idx) }));
  }

  updateEditValueItem(idx: number, val: string): void {
    this.editingTemplateForm.update(f => {
      const next = [...f.value];
      next[idx] = val;
      return { ...f, value: next };
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  sizeLabel(code: CompanySize): string {
    return SIZE_OPTIONS.find(s => s.code === code)?.label || code;
  }
}
