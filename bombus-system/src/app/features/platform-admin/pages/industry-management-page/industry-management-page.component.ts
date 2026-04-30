import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformAdminService } from '../../services/platform-admin.service';
import { Industry } from '../../models/platform.model';

interface IndustryFormState {
  code: string;
  name: string;
  is_active: boolean;
}

const EMPTY_FORM: IndustryFormState = {
  code: '',
  name: '',
  is_active: true
};

@Component({
  selector: 'app-industry-management-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './industry-management-page.component.html',
  styleUrls: ['./industry-management-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndustryManagementPageComponent implements OnInit {
  private platformService = inject(PlatformAdminService);

  industries = signal<Industry[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  showForm = signal(false);
  editingCode = signal<string | null>(null);
  formData = signal<IndustryFormState>({ ...EMPTY_FORM });

  // 阻擋刪除提示
  blockedDelete = signal<{ tenants: { id: string; name: string }[]; assignment_count: number } | null>(null);

  ngOnInit(): void {
    this.loadIndustries();
  }

  loadIndustries(): void {
    this.loading.set(true);
    this.error.set(null);
    this.platformService.getIndustries(false).subscribe({
      next: (rows) => {
        this.industries.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || '載入產業類別失敗');
        this.loading.set(false);
      }
    });
  }

  openCreateForm(): void {
    this.editingCode.set(null);
    this.formData.set({ ...EMPTY_FORM });
    this.showForm.set(true);
  }

  openEditForm(ind: Industry): void {
    this.editingCode.set(ind.code);
    this.formData.set({
      code: ind.code,
      name: ind.name,
      is_active: !!ind.is_active
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingCode.set(null);
    this.formData.set({ ...EMPTY_FORM });
  }

  submit(): void {
    const data = this.formData();
    const editing = this.editingCode();

    if (!data.name.trim()) {
      this.error.set('產業名稱必填');
      return;
    }

    if (editing) {
      this.platformService.updateIndustry(editing, {
        name: data.name.trim(),
        is_active: data.is_active
      }).subscribe({
        next: () => { this.closeForm(); this.loadIndustries(); },
        error: (err) => this.error.set(err.error?.message || '更新失敗')
      });
    } else {
      if (!data.code.trim() || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(data.code)) {
        this.error.set('代碼格式不正確（kebab-case，僅小寫英數字與短橫線）');
        return;
      }
      this.platformService.createIndustry({
        code: data.code.trim(),
        name: data.name.trim(),
        display_order: this.suggestNextOrder()
      }).subscribe({
        next: () => { this.closeForm(); this.loadIndustries(); },
        error: (err) => this.error.set(err.error?.message || '建立失敗')
      });
    }
  }

  moveUp(ind: Industry): void {
    if (!this.canMoveUp(ind)) return;
    this.platformService.moveIndustry(ind.code, 'up').subscribe({
      next: () => this.loadIndustries(),
      error: (err) => this.error.set(err.error?.message || '移動失敗')
    });
  }

  moveDown(ind: Industry): void {
    if (!this.canMoveDown(ind)) return;
    this.platformService.moveIndustry(ind.code, 'down').subscribe({
      next: () => this.loadIndustries(),
      error: (err) => this.error.set(err.error?.message || '移動失敗')
    });
  }

  canMoveUp(ind: Industry): boolean {
    if (ind.code === 'other') return false;
    const list = this.industries().filter(i => i.code !== 'other');
    return list.length > 0 && list[0].code !== ind.code;
  }

  canMoveDown(ind: Industry): boolean {
    if (ind.code === 'other') return false;
    const list = this.industries().filter(i => i.code !== 'other');
    return list.length > 0 && list[list.length - 1].code !== ind.code;
  }

  toggleActive(ind: Industry): void {
    this.platformService.updateIndustry(ind.code, { is_active: !ind.is_active }).subscribe({
      next: () => this.loadIndustries(),
      error: (err) => this.error.set(err.error?.message || '更新失敗')
    });
  }

  attemptDelete(ind: Industry): void {
    if (!confirm(`確定刪除產業「${ind.name}」？`)) return;

    this.platformService.deleteIndustry(ind.code).subscribe({
      next: () => this.loadIndustries(),
      error: (err) => {
        if (err.status === 409) {
          this.blockedDelete.set({
            tenants: err.error?.tenants || [],
            assignment_count: err.error?.assignment_count || 0
          });
        } else {
          this.error.set(err.error?.message || '刪除失敗');
        }
      }
    });
  }

  closeBlockedDeleteDialog(): void {
    this.blockedDelete.set(null);
  }

  updateField<K extends keyof IndustryFormState>(field: K, value: IndustryFormState[K]): void {
    this.formData.update(f => ({ ...f, [field]: value }));
  }

  private suggestNextOrder(): number {
    const inds = this.industries();
    if (!inds.length) return 10;
    const maxNonOther = inds
      .filter(i => i.code !== 'other')
      .reduce((max, i) => Math.max(max, i.display_order), 0);
    return maxNonOther + 10;
  }
}
