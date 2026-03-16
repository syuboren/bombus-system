import { Component, ChangeDetectionStrategy, input, output, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradeTrackEntry, PromotionCriteria } from '../../models/competency.model';
import { CompetencyService } from '../../services/competency.service';
import { NotificationService } from '../../../../core/services/notification.service';

interface DepartmentPosition {
  id: string;
  department: string;
  grade: number;
  title: string;
  track: string;
}

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

  // 職位本地暫存（不立即送 API，按儲存時一起送出）
  private _pendingIdCounter = 0;
  pendingNewPositions = signal<{ id: string; department: string; title: string }[]>([]);
  pendingDeleteIds = signal<string[]>([]);

  // 按部門分組的職位（合併既有 + 本地新增 - 本地刪除）
  positionsByDept = computed(() => {
    const deleteIds = this.pendingDeleteIds();
    const existingFiltered = this.positions().filter(p => !deleteIds.includes(p.id));
    const pending = this.pendingNewPositions().map(p => ({
      id: p.id,
      department: p.department,
      grade: this.gradeNumber(),
      title: p.title,
      track: this.trackCode()
    }));
    const all = [...existingFiltered, ...pending];

    const grouped: Record<string, DepartmentPosition[]> = {};
    for (const pos of all) {
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

    // 清空職位暫存
    this.pendingNewPositions.set([]);
    this.pendingDeleteIds.set([]);
    this.newPositionDept.set('');
    this.newPositionTitle.set('');
  }

  onClose(): void {
    if (this.saving()) return;
    if ((this.isTrackDirty() || this.isPromotionDirty() || this.hasPositionChanges()) && !confirm('您有未儲存的變更，確定要離開嗎？')) return;
    this.error.set(null);
    this.closed.emit();
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

  // --- Dirty check：比對表單值與原始輸入（title 唯讀，不列入比對）---
  private isTrackDirty(): boolean {
    const entry = this.trackEntry();
    const form = this.formTrack();
    return (
      form.educationRequirement !== (entry?.educationRequirement || '') ||
      form.responsibilityDescription !== (entry?.responsibilityDescription || '') ||
      form.requiredSkillsAndTraining !== (entry?.requiredSkillsAndTraining || '')
    );
  }

  private isPromotionDirty(): boolean {
    const promo = this.promotionCriteria();
    const form = this.formPromotion();
    if (!promo) return this.hasPromotionContent();
    return (
      String(form.performanceThreshold) !== String(promo.performanceThreshold || 'A') ||
      form.promotionProcedure !== (promo.promotionProcedure || '') ||
      JSON.stringify(form.requiredSkills) !== JSON.stringify(promo.requiredSkills || []) ||
      JSON.stringify(form.requiredCourses) !== JSON.stringify(promo.requiredCourses || []) ||
      JSON.stringify(form.kpiFocus) !== JSON.stringify(promo.kpiFocus || []) ||
      JSON.stringify(form.additionalCriteria) !== JSON.stringify(promo.additionalCriteria || [])
    );
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

  // --- 合併儲存（軌道條目 + 晉升條件 + 職位 → 單一變更記錄）---
  onSave(): void {
    const trackData = this.formTrack();
    const entry = this.trackEntry();

    const trackDirty = this.isTrackDirty();
    const promoDirty = this.isPromotionDirty();
    const positionDirty = this.hasPositionChanges();

    // 沒有任何變更 → 直接關閉
    if (!trackDirty && !promoDirty && !positionDirty) {
      this.error.set(null);
      this.closed.emit();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const promoData = this.formPromotion();

    // 組合 payload — 後端會建立單一筆變更記錄
    // title 唯讀，直接帶入原始值（由「編輯職等」管理）
    const payload: Record<string, unknown> = {
      grade: this.gradeNumber(),
      track: this.trackCode(),
      orgUnitId: this.orgUnitId() || null,
      trackEntry: {
        id: entry?.id || null,
        title: entry?.title || '',
        educationRequirement: trackData.educationRequirement,
        responsibilityDescription: trackData.responsibilityDescription,
        requiredSkillsAndTraining: trackData.requiredSkillsAndTraining
      },
      promotion: this.isHighestGrade() ? null : {
        id: this.promotionCriteria()?.id || null,
        fromGrade: promoData.fromGrade,
        toGrade: promoData.toGrade,
        track: promoData.track,
        performanceThreshold: promoData.performanceThreshold,
        promotionProcedure: promoData.promotionProcedure,
        requiredSkills: promoData.requiredSkills,
        requiredCourses: promoData.requiredCourses,
        kpiFocus: promoData.kpiFocus,
        additionalCriteria: promoData.additionalCriteria
      },
      positionAdds: this.pendingNewPositions().map(p => ({
        department: p.department,
        title: p.title
      })),
      positionDeletes: this.pendingDeleteIds()
    };

    this.competencyService.saveTrackDetail(payload).subscribe({
      next: (resp) => {
        this.saving.set(false);
        if (resp.status === 'no_change') {
          this.notificationService.info('未偵測到任何變更');
          return;
        }
        this.notificationService.info('變更已送出，等待審核');
        this.saved.emit();
        this.positionSaved.emit();
        // 直接關閉，跳過 dirty check（資料已送出審核）
        this.error.set(null);
        this.closed.emit();
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.error?.message || '儲存失敗，請稍後再試';
        this.error.set(msg);
      }
    });
  }

  // --- 職位管理（本地暫存，儲存時一起送出）---
  addPosition(): void {
    const dept = this.newPositionDept();
    const title = this.newPositionTitle().trim();
    if (!dept || !title) return;

    const id = `pending-${this._pendingIdCounter++}`;
    this.pendingNewPositions.update(prev => [...prev, { id, department: dept, title }]);
    this.newPositionDept.set('');
    this.newPositionTitle.set('');
  }

  deletePosition(id: string): void {
    if (id.startsWith('pending-')) {
      this.pendingNewPositions.update(prev => prev.filter(p => p.id !== id));
    } else {
      this.pendingDeleteIds.update(prev => [...prev, id]);
    }
  }

  private hasPositionChanges(): boolean {
    return this.pendingNewPositions().length > 0 || this.pendingDeleteIds().length > 0;
  }
}
