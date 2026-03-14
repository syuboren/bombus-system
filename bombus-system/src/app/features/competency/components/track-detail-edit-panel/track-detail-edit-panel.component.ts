import { Component, ChangeDetectionStrategy, input, output, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { switchMap, of } from 'rxjs';
import { GradeTrackEntry, PromotionCriteria } from '../../models/competency.model';

interface DepartmentPosition {
  id: string;
  department: string;
  grade: number;
  title: string;
  track: string;
  gradeTitleManagement: string;
  gradeTitleProfessional: string;
  supervisedDepartments: string[] | null;
}
import { CompetencyService } from '../../services/competency.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-track-detail-edit-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './track-detail-edit-panel.component.html',
  styleUrls: ['./track-detail-edit-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrackDetailEditPanelComponent {
  private competencyService = inject(CompetencyService);
  private notificationService = inject(NotificationService);

  // --- Input / Output ---
  visible = input<boolean>(false);
  gradeNumber = input<number>(0);
  trackCode = input<string>('');
  trackName = input<string>('');
  trackEntry = input<GradeTrackEntry | null>(null);
  promotionCriteria = input<PromotionCriteria | null>(null);
  editMode = input<boolean>(false);
  orgUnitId = input<string>('');
  maxGrade = input<number>(7);
  positions = input<DepartmentPosition[]>([]);
  departments = input<{ id: string; name: string; code: string }[]>([]);
  closed = output<void>();
  saved = output<void>();
  positionSaved = output<void>();

  // --- 表單狀態 ---
  saving = signal(false);
  error = signal<string | null>(null);

  // 軌道條目表單
  formTrack = signal<{
    title: string;
    educationRequirement: string;
    responsibilityDescription: string;
    requiredSkillsAndTraining: string;
  }>({
    title: '',
    educationRequirement: '',
    responsibilityDescription: '',
    requiredSkillsAndTraining: ''
  });

  // 晉升條件表單
  formPromotion = signal<{
    fromGrade: number;
    toGrade: number;
    track: string;
    performanceThreshold: string;
    promotionProcedure: string;
    requiredSkills: string[];
    requiredCourses: string[];
    kpiFocus: string[];
    additionalCriteria: string[];
  }>({
    fromGrade: 1,
    toGrade: 2,
    track: '',
    performanceThreshold: 'A',
    promotionProcedure: '',
    requiredSkills: [],
    requiredCourses: [],
    kpiFocus: [],
    additionalCriteria: []
  });

  // Chip 輸入暫存
  chipInput = signal<{ skills: string; courses: string; kpi: string; criteria: string }>({
    skills: '', courses: '', kpi: '', criteria: ''
  });

  // 職位新增表單
  newPositionDept = signal('');
  newPositionTitle = signal('');
  savingPosition = signal(false);

  // 按部門分組的職位
  positionsByDept = computed(() => {
    const grouped: Record<string, DepartmentPosition[]> = {};
    for (const pos of this.positions()) {
      if (!grouped[pos.department]) grouped[pos.department] = [];
      grouped[pos.department].push(pos);
    }
    return grouped;
  });

  // 是否為最高職等（隱藏晉升條件）
  isHighestGrade = computed(() => this.gradeNumber() >= this.maxGrade());

  // 是否有既有的 trackEntry（決定 create vs update）
  hasExistingEntry = computed(() => !!this.trackEntry()?.id);

  // 是否有既有的 promotionCriteria
  hasExistingPromotion = computed(() => !!this.promotionCriteria()?.id);

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const grade = this.gradeNumber();
      const track = this.trackCode();

      if (isVisible && grade > 0) {
        this.initFormFromInputs();
      }

      this.error.set(null);
    }, { allowSignalWrites: true });
  }

  private initFormFromInputs(): void {
    const entry = this.trackEntry();
    const promo = this.promotionCriteria();
    const grade = this.gradeNumber();
    const track = this.trackCode();

    // 初始化軌道資訊
    this.formTrack.set({
      title: entry?.title || '',
      educationRequirement: entry?.educationRequirement || '',
      responsibilityDescription: entry?.responsibilityDescription || '',
      requiredSkillsAndTraining: entry?.requiredSkillsAndTraining || ''
    });

    // 初始化晉升條件（fromGrade / toGrade 自動綁定）
    this.formPromotion.set({
      fromGrade: grade,
      toGrade: promo?.toGrade || grade + 1,
      track: track,
      performanceThreshold: promo ? String(promo.performanceThreshold) : 'A',
      promotionProcedure: promo?.promotionProcedure || '',
      requiredSkills: [...(promo?.requiredSkills || [])],
      requiredCourses: [...(promo?.requiredCourses || [])],
      kpiFocus: [...(promo?.kpiFocus || [])],
      additionalCriteria: [...(promo?.additionalCriteria || [])]
    });

    // 清空 chip 輸入
    this.chipInput.set({ skills: '', courses: '', kpi: '', criteria: '' });
  }

  onClose(): void {
    if (!this.saving()) {
      this.error.set(null);
      this.closed.emit();
    }
  }

  // --- 軌道欄位更新 ---
  updateTrackField(field: string, value: string): void {
    this.formTrack.update(prev => ({ ...prev, [field]: value }));
  }

  // --- 晉升欄位更新 ---
  updatePromotionField(field: string, value: string | number): void {
    this.formPromotion.update(prev => ({ ...prev, [field]: value }));
  }

  // --- Chip 操作 ---
  addChip(category: 'requiredSkills' | 'requiredCourses' | 'kpiFocus' | 'additionalCriteria', value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;

    this.formPromotion.update(prev => ({
      ...prev,
      [category]: [...prev[category], trimmed]
    }));

    const chipKeyMap: Record<string, string> = {
      requiredSkills: 'skills',
      requiredCourses: 'courses',
      kpiFocus: 'kpi',
      additionalCriteria: 'criteria'
    };
    this.chipInput.update(prev => ({ ...prev, [chipKeyMap[category]]: '' }));
  }

  removeChip(category: 'requiredSkills' | 'requiredCourses' | 'kpiFocus' | 'additionalCriteria', index: number): void {
    this.formPromotion.update(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  }

  onChipKeyDown(event: KeyboardEvent, category: 'requiredSkills' | 'requiredCourses' | 'kpiFocus' | 'additionalCriteria', value: string): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addChip(category, value);
    }
  }

  updateChipInput(field: string, value: string): void {
    this.chipInput.update(prev => ({ ...prev, [field]: value }));
  }

  // --- 檢查晉升條件是否有任何內容 ---
  private hasPromotionContent(): boolean {
    const promo = this.formPromotion();
    return !!(
      promo.promotionProcedure.trim() ||
      promo.requiredSkills.length > 0 ||
      promo.requiredCourses.length > 0 ||
      promo.kpiFocus.length > 0 ||
      promo.additionalCriteria.length > 0
    );
  }

  // --- 合併儲存 ---
  onSave(): void {
    const trackData = this.formTrack();

    // 驗證職務級別必填
    if (!trackData.title.trim()) {
      this.error.set('職務級別為必填欄位');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const entry = this.trackEntry();
    const grade = this.gradeNumber();
    const orgUnit = this.orgUnitId() || null;

    // 步驟 1: 儲存軌道條目
    const trackPayload: Record<string, unknown> = {
      title: trackData.title,
      educationRequirement: trackData.educationRequirement,
      responsibilityDescription: trackData.responsibilityDescription,
      requiredSkillsAndTraining: trackData.requiredSkillsAndTraining,
      org_unit_id: orgUnit
    };

    const trackSave$ = entry?.id
      ? this.competencyService.updateTrackEntry(entry.id, trackPayload as Partial<GradeTrackEntry>)
      : this.competencyService.createTrackEntry(grade, {
          ...trackPayload,
          track: this.trackCode()
        } as Partial<GradeTrackEntry>);

    // 步驟 2: 串聯儲存晉升條件（switchMap）
    trackSave$.pipe(
      switchMap(() => {
        // 最高職等或無晉升內容 → 跳過
        if (this.isHighestGrade()) return of(null);
        if (!this.hasExistingPromotion() && !this.hasPromotionContent()) return of(null);

        const promoData = this.formPromotion();
        const promoPayload: Record<string, unknown> = {
          fromGrade: promoData.fromGrade,
          toGrade: promoData.toGrade,
          track: promoData.track,
          performanceThreshold: promoData.performanceThreshold,
          promotionProcedure: promoData.promotionProcedure,
          requiredSkills: promoData.requiredSkills,
          requiredCourses: promoData.requiredCourses,
          kpiFocus: promoData.kpiFocus,
          additionalCriteria: promoData.additionalCriteria,
          org_unit_id: orgUnit
        };

        const existingPromo = this.promotionCriteria();
        return existingPromo?.id
          ? this.competencyService.updatePromotionCriteria(existingPromo.id, promoPayload as Partial<PromotionCriteria>)
          : this.competencyService.createPromotionCriteria(promoPayload as Partial<PromotionCriteria>);
      })
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.notificationService.info('變更已送出，等待審核');
        this.saved.emit();
        this.onClose();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.error?.message || '儲存失敗，請稍後再試';
        // 區分軌道條目 vs 晉升條件失敗
        this.error.set(msg);
      }
    });
  }

  // --- 職位管理 ---
  addPosition(): void {
    const dept = this.newPositionDept();
    const title = this.newPositionTitle().trim();
    if (!dept || !title) return;

    this.savingPosition.set(true);
    const payload = {
      department: dept,
      grade: this.gradeNumber(),
      track: this.trackCode(),
      title,
      org_unit_id: this.orgUnitId() || null
    };

    this.competencyService.createPosition(payload).subscribe({
      next: () => {
        this.savingPosition.set(false);
        this.newPositionDept.set('');
        this.newPositionTitle.set('');
        this.notificationService.info('變更已送出，等待審核');
        this.positionSaved.emit();
      },
      error: (err) => {
        this.savingPosition.set(false);
        this.error.set(err?.error?.error?.message || '新增職位失敗');
      }
    });
  }

  deletePosition(id: string): void {
    this.savingPosition.set(true);
    this.competencyService.deletePosition(id).subscribe({
      next: () => {
        this.savingPosition.set(false);
        this.notificationService.info('變更已送出，等待審核');
        this.positionSaved.emit();
      },
      error: (err) => {
        this.savingPosition.set(false);
        this.error.set(err?.error?.error?.message || '刪除職位失敗');
      }
    });
  }
}
