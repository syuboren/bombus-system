import { Component, ChangeDetectionStrategy, input, output, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradeLevelNew, GradeTrackEntity, SalaryLevel } from '../../models/competency.model';
import { CompetencyService } from '../../services/competency.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-grade-edit-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grade-edit-panel.component.html',
  styleUrls: ['./grade-edit-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GradeEditPanelComponent {
  private competencyService = inject(CompetencyService);
  private notificationService = inject(NotificationService);

  // --- Input / Output ---
  visible = input<boolean>(false);
  gradeData = input<GradeLevelNew | null>(null);
  context = input<'overview' | 'track-detail'>('overview');
  existingGrades = input<number[]>([]);
  orgUnitId = input<string>('');
  tracks = input<GradeTrackEntity[]>([]);
  closed = output<void>();
  saved = output<void>();

  // --- 表單狀態 ---
  saving = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  activeTrackTab = signal<'management' | 'professional'>('management');

  // 判斷軌道是否超出該職等範圍（應鎖定不可編輯）
  isTrackDisabled = (trackCode: string): boolean => {
    const track = this.tracks().find(t => t.code === trackCode);
    if (!track) return false;
    return this.formGrade() > track.maxGrade;
  };

  // 自動計算下一個可用職等
  nextGrade = computed(() => {
    const grades = this.existingGrades();
    return grades.length > 0 ? Math.max(...grades) + 1 : 1;
  });

  // 基本資訊
  formGrade = signal(1);
  formCode = signal('');

  // 薪資列表
  formSalaryLevels = signal<SalaryLevel[]>([]);

  // 管理職 track entry
  formManagement = signal<{ title: string; educationRequirement: string; responsibilityDescription: string }>({
    title: '', educationRequirement: '', responsibilityDescription: ''
  });

  // 專業職 track entry
  formProfessional = signal<{ title: string; educationRequirement: string; responsibilityDescription: string }>({
    title: '', educationRequirement: '', responsibilityDescription: ''
  });

  // 目前 Tab 對應的表單資料
  activeTrackForm = computed(() => {
    return this.activeTrackTab() === 'management'
      ? this.formManagement()
      : this.formProfessional();
  });

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const data = this.gradeData();
      if (isVisible && data) {
        this.isEditMode.set(true);
        this.formGrade.set(data.grade);
        // 從薪資代碼提取基礎前綴（如 BS01 → BS），而非使用 codeRange（BS01-BS03）
        const firstCode = data.salaryLevels?.[0]?.code || '';
        const prefix = firstCode.replace(/\d+$/, '');
        this.formCode.set(prefix || data.codeRange || '');
        this.formSalaryLevels.set(data.salaryLevels ? data.salaryLevels.map(s => ({ ...s })) : []);

        // 從 trackEntries 載入軌道資料
        const mgmt = data.trackEntries?.find(e => e.track === 'management');
        const prof = data.trackEntries?.find(e => e.track === 'professional');
        this.formManagement.set({
          title: mgmt?.title || '',
          educationRequirement: mgmt?.educationRequirement || '',
          responsibilityDescription: mgmt?.responsibilityDescription || ''
        });
        this.formProfessional.set({
          title: prof?.title || '',
          educationRequirement: prof?.educationRequirement || '',
          responsibilityDescription: prof?.responsibilityDescription || ''
        });
      } else if (isVisible && !data) {
        this.isEditMode.set(false);
        this.resetForm();
      }
      this.error.set(null);
    }, { allowSignalWrites: true });
  }

  resetForm(): void {
    this.formGrade.set(this.nextGrade());
    this.formCode.set('');
    this.formSalaryLevels.set([]);
    this.formManagement.set({ title: '', educationRequirement: '', responsibilityDescription: '' });
    this.formProfessional.set({ title: '', educationRequirement: '', responsibilityDescription: '' });
    this.activeTrackTab.set('management');
  }

  onClose(): void {
    if (!this.saving()) {
      this.resetForm();
      this.error.set(null);
      this.closed.emit();
    }
  }

  setTrackTab(tab: 'management' | 'professional'): void {
    this.activeTrackTab.set(tab);
  }

  // --- 基本欄位更新 ---
  updateGrade(value: number): void { this.formGrade.set(value); }
  updateCode(value: string): void {
    this.formCode.set(value);
    this.regenerateSalaryCodes();
  }

  // --- 軌道職稱更新（overview 模式用） ---
  updateTrackTitle(track: 'management' | 'professional', value: string): void {
    if (track === 'management') {
      this.formManagement.update(prev => ({ ...prev, title: value }));
    } else {
      this.formProfessional.update(prev => ({ ...prev, title: value }));
    }
  }

  // --- 軌道欄位更新 ---
  updateTrackField(field: 'title' | 'educationRequirement' | 'responsibilityDescription', value: string): void {
    if (this.activeTrackTab() === 'management') {
      this.formManagement.update(prev => ({ ...prev, [field]: value }));
    } else {
      this.formProfessional.update(prev => ({ ...prev, [field]: value }));
    }
  }

  // --- 薪資列表操作 ---
  addSalaryLevel(): void {
    const code = this.formCode().trim();
    const maxNum = this.getMaxSalaryNum();
    const nextNum = maxNum + 1;
    const autoCode = code ? `${code}${String(nextNum).padStart(2, '0')}` : '';
    this.formSalaryLevels.update(prev => [
      ...prev,
      { code: autoCode, salary: 0, order: prev.length + 1 }
    ]);
  }

  updateSalaryLevel(index: number, field: keyof SalaryLevel, value: string | number): void {
    this.formSalaryLevels.update(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  removeSalaryLevel(index: number): void {
    this.formSalaryLevels.update(prev => prev.filter((_, i) => i !== index));
    this.regenerateSalaryCodes();
  }

  private getMaxSalaryNum(): number {
    return this.formSalaryLevels().reduce((max, sal) => {
      const match = sal.code?.match(/(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
  }

  // 重新產生所有薪資級別的代碼（保留既有編號，僅更新前綴）
  private regenerateSalaryCodes(): void {
    const code = this.formCode().trim();
    if (!code) return;
    this.formSalaryLevels.update(prev =>
      prev.map((level, i) => {
        // 保留既有的數字後綴，僅替換前綴
        const match = level.code?.match(/(\d+)$/);
        const num = match ? match[1] : String(i + 1).padStart(2, '0');
        return {
          ...level,
          code: `${code}${num}`,
          order: i + 1
        };
      })
    );
  }

  // --- 驗證 ---
  validateForm(): boolean {
    if (!this.formGrade() || this.formGrade() < 1) {
      this.error.set('職等為必填且必須大於 0');
      return false;
    }
    // 新增模式檢查職等是否已存在
    if (!this.isEditMode() && this.existingGrades().includes(this.formGrade())) {
      this.error.set(`職等 ${this.formGrade()} 已存在，請勿重複新增`);
      return false;
    }
    if (!this.formCode().trim()) {
      this.error.set('職級代碼為必填');
      return false;
    }
    // overview 模式下不驗證軌道職稱（軌道資訊由各軌道 tab 管理）
    if (this.context() !== 'overview') {
      if (!this.isTrackDisabled('management') && !this.formManagement().title.trim()) {
        this.error.set('管理職稱謂為必填');
        return false;
      }
      if (!this.isTrackDisabled('professional') && !this.formProfessional().title.trim()) {
        this.error.set('專業職稱謂為必填');
        return false;
      }
    }
    return true;
  }

  // --- 儲存 ---
  onSave(): void {
    if (!this.validateForm()) return;
    this.saving.set(true);
    this.error.set(null);

    // 自動計算 codeRange：若有多筆薪資級別則組合為範圍字串
    const levels = this.formSalaryLevels();
    const code = this.formCode().trim();
    let codeRange = code;
    if (levels.length > 0) {
      const first = levels[0].code || `${code}01`;
      const last = levels[levels.length - 1].code || `${code}${String(levels.length).padStart(2, '0')}`;
      codeRange = levels.length === 1 ? first : `${first}-${last}`;
    }

    const mgmt = this.formManagement();
    const prof = this.formProfessional();

    const payload: Record<string, unknown> = {
      grade: this.formGrade(),
      codeRange,
      salaryLevels: levels,
      orgUnitId: this.orgUnitId() || null,
      managementTitle: mgmt.title,
      professionalTitle: prof.title
    };

    // track-detail 模式送完整軌道資訊
    if (this.context() !== 'overview') {
      payload['managementEducation'] = mgmt.educationRequirement;
      payload['managementResponsibility'] = mgmt.responsibilityDescription;
      payload['professionalEducation'] = prof.educationRequirement;
      payload['professionalResponsibility'] = prof.responsibilityDescription;
    }

    const observable = this.isEditMode()
      ? this.competencyService.updateGradeLevel(this.formGrade(), payload)
      : this.competencyService.createGradeLevel(payload);

    observable.subscribe({
      next: () => {
        this.saving.set(false);
        this.notificationService.info('變更已送出，等待審核');
        this.saved.emit();
        this.onClose();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error?.message || '儲存失敗，請稍後再試');
      }
    });
  }
}
