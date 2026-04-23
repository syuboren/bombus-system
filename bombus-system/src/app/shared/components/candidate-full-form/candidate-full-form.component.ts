import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AttachmentEntry,
  CandidateFormMode,
  CandidateFullForm,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProjectEntry,
  SpecialityEntry,
  emptyCandidateFullForm,
  emptyEducationEntry,
  emptyExperienceEntry,
  emptyLanguageEntry,
  emptyProjectEntry,
  emptySpecialityEntry
} from './candidate-full-form.model';

type TabIndex = 1 | 2 | 3 | 4;

interface AttachmentUploadingRow {
  localId: string;
  fileName: string;
  progress: number;
}

type AvatarEditState =
  | { kind: 'idle' }
  | { kind: 'editing'; dataUrl: string; imgW: number; imgH: number; offsetX: number; offsetY: number; scale: number; minScale: number }
  | { kind: 'uploading' }
  | { kind: 'ready'; url: string };

const AVATAR_VIEWPORT_PX = 240;
const AVATAR_OUTPUT_PX = 320;

const ALLOWED_ATTACHMENT_EXT = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'xls', 'xlsx'];
const MAX_ATTACHMENT_MB = 10;

// 國籍選單（搜尋式 datalist）
const NATIONALITY_OPTIONS = [
  '中華民國', '中國大陸', '香港', '澳門', '日本', '韓國',
  '新加坡', '馬來西亞', '印尼', '菲律賓', '越南', '泰國',
  '美國', '加拿大', '英國', '法國', '德國', '義大利', '西班牙', '荷蘭', '俄羅斯',
  '澳洲', '紐西蘭', '印度', '其他'
];

// 聯絡方式（單選下拉）
const CONTACT_METHOD_OPTIONS = ['Email', '電話', 'LINE', 'Email 或電話', 'Email 或 LINE', '皆可'];

// 駕照（多選）
const DRIVING_LICENSE_OPTIONS = [
  '普通小型車', '普通重型機車', '普通輕型機車', '小型車職業',
  '普通大貨車', '職業大貨車', '職業大客車', '職業聯結車', '其他'
];

// 交通工具（多選）
const TRANSPORT_OPTIONS = ['自用汽車', '機車', '大眾運輸', '單車', '無'];

// 語言（datalist 單選）
const LANGUAGE_OPTIONS = [
  '中文', '台語', '客家話', '英文', '日文', '韓文',
  '法文', '德文', '西班牙文', '葡萄牙文', '俄文', '泰文', '越南文', '印尼文', '其他'
];

@Component({
  selector: 'app-candidate-full-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candidate-full-form.component.html',
  styleUrl: './candidate-full-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CandidateFullFormComponent {
  /** 模式：hr（後台）或 public（公開內推） */
  mode = input.required<CandidateFormMode>();
  /** 公開模式下預填的候選人 email（由 HR 邀請時指定，readonly） */
  initialEmail = input<string>('');
  /** 附件上傳端點（不同模式不同 URL，由父層傳入） */
  uploadEndpoint = input.required<string>();
  /** 送出時的 loading 狀態（由父層控制） */
  submitting = input<boolean>(false);
  /** 外部錯誤訊息（例：後端 409 / 400） */
  externalError = input<string | null>(null);

  /** 送出表單 — 父層收到後呼叫對應 API */
  submitForm = output<CandidateFullForm>();

  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  tab = signal<TabIndex>(1);
  form = signal<CandidateFullForm>(emptyCandidateFullForm(this.initialEmail()));
  uploadingRows = signal<AttachmentUploadingRow[]>([]);
  uploadError = signal<string | null>(null);

  // 頭像編輯狀態
  avatarState = signal<AvatarEditState>({ kind: 'idle' });
  avatarError = signal<string | null>(null);
  readonly avatarViewportPx = AVATAR_VIEWPORT_PX;

  // 給模板的靜態選項清單
  readonly nationalityOptions = NATIONALITY_OPTIONS;
  readonly contactMethodOptions = CONTACT_METHOD_OPTIONS;
  readonly drivingLicenseOptions = DRIVING_LICENSE_OPTIONS;
  readonly transportOptions = TRANSPORT_OPTIONS;
  readonly languageOptions = LANGUAGE_OPTIONS;

  // Tag input 的 DOM value 由 template #ref 直接讀寫，不再用 signal 同步

  constructor() {
    // 公開模式下 initialEmail 由父層 async 載入；用 effect 同步到 form.email
    effect(() => {
      const email = this.initialEmail();
      if (email && email !== this.form().email) {
        this.form.update(f => ({ ...f, email }));
      }
    }, { allowSignalWrites: true });
  }

  // ─── Tab 完成度 ───
  tab1Complete = computed(() => {
    const f = this.form();
    return !!(f.name && f.nameEn && f.gender && f.birthday && f.phone && f.contactInfo && f.nationality && f.militaryStatus);
  });
  tab2Complete = computed(() => {
    const f = this.form();
    return !!(f.jobCharacteristic && f.workInterval && f.shiftWork !== null);
  });
  tab3Complete = computed(() => {
    const f = this.form();
    const eduOK = f.educationList.length > 0
      && f.educationList.every(e => e.schoolName && e.major && e.degreeLevel && e.degreeStatus);
    // 工作經歷為選填：若有輸入必須完整，但可 0 筆
    const expOK = f.experienceList.every(x => x.firmName && x.jobName && x.industryCategory && x.startDate && x.jobDesc);
    return eduOK && expOK;
  });
  tab4Complete = computed(() => {
    const f = this.form();
    const specOK = f.specialityList.length > 0
      && f.specialityList.every(s => !!s.skill);
    const langOK = f.languageList.length > 0
      && f.languageList.every(l => l.langType && l.listenDegree && l.speakDegree);
    const projOK = f.projectList.every(p => !!p.title);
    return specOK && langOK && projOK;
  });

  isFormValid = computed(
    () => this.tab1Complete() && this.tab2Complete() && this.tab3Complete() && this.tab4Complete()
  );

  setTab(t: TabIndex): void {
    this.tab.set(t);
  }

  nextTab(): void {
    const cur = this.tab();
    if (cur < 4) this.tab.set((cur + 1) as TabIndex);
  }

  prevTab(): void {
    const cur = this.tab();
    if (cur > 1) this.tab.set((cur - 1) as TabIndex);
  }

  // ─── 欄位更新 ───
  updateField<K extends keyof CandidateFullForm>(key: K, value: CandidateFullForm[K]): void {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  // ─── 學歷 ───
  addEducation(): void {
    this.form.update(f => ({ ...f, educationList: [...f.educationList, emptyEducationEntry()] }));
  }
  removeEducation(index: number): void {
    this.form.update(f => ({
      ...f,
      educationList: f.educationList.length > 1 ? f.educationList.filter((_, i) => i !== index) : f.educationList
    }));
  }
  updateEducation(index: number, key: keyof EducationEntry, value: string): void {
    this.form.update(f => ({
      ...f,
      educationList: f.educationList.map((e, i) => (i === index ? { ...e, [key]: value } : e))
    }));
  }

  // ─── 工作經歷 ───
  addExperience(): void {
    this.form.update(f => ({ ...f, experienceList: [...f.experienceList, emptyExperienceEntry()] }));
  }
  removeExperience(index: number): void {
    this.form.update(f => ({
      ...f,
      experienceList: f.experienceList.filter((_, i) => i !== index)
    }));
  }
  updateExperience(index: number, key: keyof ExperienceEntry, value: string): void {
    this.form.update(f => ({
      ...f,
      experienceList: f.experienceList.map((x, i) => (i === index ? { ...x, [key]: value } : x))
    }));
  }

  // ─── 技能專長 ───
  addSpeciality(): void {
    this.form.update(f => ({ ...f, specialityList: [...f.specialityList, emptySpecialityEntry()] }));
  }
  removeSpeciality(index: number): void {
    this.form.update(f => ({
      ...f,
      specialityList: f.specialityList.length > 1 ? f.specialityList.filter((_, i) => i !== index) : f.specialityList
    }));
  }
  updateSpeciality(index: number, key: keyof SpecialityEntry, value: string): void {
    this.form.update(f => ({
      ...f,
      specialityList: f.specialityList.map((s, i) => (i === index ? { ...s, [key]: value } : s))
    }));
  }

  // ─── 語言能力 ───
  addLanguage(): void {
    this.form.update(f => ({ ...f, languageList: [...f.languageList, emptyLanguageEntry()] }));
  }
  removeLanguage(index: number): void {
    this.form.update(f => ({
      ...f,
      languageList: f.languageList.length > 1 ? f.languageList.filter((_, i) => i !== index) : f.languageList
    }));
  }
  updateLanguage(index: number, key: keyof LanguageEntry, value: string): void {
    this.form.update(f => ({
      ...f,
      languageList: f.languageList.map((l, i) => (i === index ? { ...l, [key]: value } : l))
    }));
  }

  // ─── 專案作品 ───
  addProject(): void {
    this.form.update(f => ({ ...f, projectList: [...f.projectList, emptyProjectEntry()] }));
  }
  removeProject(index: number): void {
    this.form.update(f => ({
      ...f,
      projectList: f.projectList.filter((_, i) => i !== index)
    }));
  }
  updateProject(index: number, key: keyof ProjectEntry, value: string): void {
    this.form.update(f => ({
      ...f,
      projectList: f.projectList.map((p, i) => (i === index ? { ...p, [key]: value } : p))
    }));
  }

  // ─── 附件 ───
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    for (const file of Array.from(input.files)) {
      this.uploadFile(file);
    }
    // 清掉 input value 讓同一檔可重選
    input.value = '';
  }

  private uploadFile(file: File): void {
    this.uploadError.set(null);

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_ATTACHMENT_EXT.includes(ext)) {
      this.uploadError.set(`不支援的檔案格式：${ext}。允許：${ALLOWED_ATTACHMENT_EXT.join(', ')}`);
      return;
    }
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      this.uploadError.set(`檔案過大（${(file.size / 1024 / 1024).toFixed(1)} MB）。上限 ${MAX_ATTACHMENT_MB} MB`);
      return;
    }

    const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.uploadingRows.update(rows => [...rows, { localId, fileName: file.name, progress: 0 }]);

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ url: string; fileName?: string; mimeType?: string; size?: number }>(
      this.uploadEndpoint(),
      formData
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        const attachment: AttachmentEntry = {
          title: file.name,
          fileName: res.fileName || file.name,
          resourceLink: res.url,
          mimeType: res.mimeType || file.type,
          size: res.size ?? file.size
        };
        this.form.update(f => ({ ...f, attachments: [...f.attachments, attachment] }));
        this.uploadingRows.update(rows => rows.filter(r => r.localId !== localId));
      },
      error: err => {
        this.uploadingRows.update(rows => rows.filter(r => r.localId !== localId));
        this.uploadError.set(err?.error?.message || '檔案上傳失敗');
      }
    });
  }

  removeAttachment(index: number): void {
    this.form.update(f => ({ ...f, attachments: f.attachments.filter((_, i) => i !== index) }));
  }

  updateAttachmentTitle(index: number, title: string): void {
    this.form.update(f => ({
      ...f,
      attachments: f.attachments.map((a, i) => (i === index ? { ...a, title } : a))
    }));
  }

  formatBytes(bytes: number | undefined): string {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  // ─── Multi-select helpers（逗號分隔字串存 DB） ───
  private parseCsv(value: string | undefined | null): string[] {
    return (value || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  isDrivingLicenseSelected(opt: string): boolean {
    return this.parseCsv(this.form().drivingLicenses).includes(opt);
  }
  toggleDrivingLicense(opt: string): void {
    const list = this.parseCsv(this.form().drivingLicenses);
    const idx = list.indexOf(opt);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(opt);
    this.updateField('drivingLicenses', list.join(', '));
  }

  isTransportSelected(opt: string): boolean {
    return this.parseCsv(this.form().transports).includes(opt);
  }
  toggleTransport(opt: string): void {
    const list = this.parseCsv(this.form().transports);
    const idx = list.indexOf(opt);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(opt);
    this.updateField('transports', list.join(', '));
  }

  // ─── Tag input helpers ───
  parseTags(value: string | undefined | null): string[] {
    return this.parseCsv(value);
  }

  /** 把新標籤 push 進 CSV 字串，已存在或空白時回傳 null 代表不變更 */
  private pushTag(current: string | undefined, raw: string): string | null {
    const newTag = raw.trim();
    if (!newTag) return null;
    const existing = this.parseTags(current);
    if (existing.includes(newTag)) return null;
    existing.push(newTag);
    return existing.join(', ');
  }

  private dropTag(current: string | undefined, tag: string): string {
    return this.parseTags(current).filter(t => t !== tag).join(', ');
  }

  // 先清 DOM value 再 update signal，避免 CD re-render 後的時序問題
  addSpecialityTag(index: number, currentValue: string | undefined, inputEl: HTMLInputElement): void {
    const next = this.pushTag(currentValue, inputEl.value);
    inputEl.value = '';
    if (next !== null) this.updateSpeciality(index, 'tags', next);
  }

  removeSpecialityTag(index: number, currentValue: string | undefined, tag: string): void {
    this.updateSpeciality(index, 'tags', this.dropTag(currentValue, tag));
  }

  addExperienceSkill(index: number, currentValue: string | undefined, inputEl: HTMLInputElement): void {
    const next = this.pushTag(currentValue, inputEl.value);
    inputEl.value = '';
    if (next !== null) this.updateExperience(index, 'skills', next);
  }

  removeExperienceSkill(index: number, currentValue: string | undefined, tag: string): void {
    this.updateExperience(index, 'skills', this.dropTag(currentValue, tag));
  }

  addCharacteristicTag(inputEl: HTMLInputElement): void {
    const next = this.pushTag(this.form().characteristic, inputEl.value);
    inputEl.value = '';
    if (next !== null) this.updateField('characteristic', next);
  }

  removeCharacteristicTag(tag: string): void {
    this.updateField('characteristic', this.dropTag(this.form().characteristic, tag));
  }

  // ─── 頭像編輯（拖曳 + 縮放 + 圓形裁切） ───
  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;

    this.avatarError.set(null);
    if (!file.type.startsWith('image/')) {
      this.avatarError.set('請選擇圖片檔（JPG / PNG）');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.avatarError.set('圖片過大（上限 5 MB）');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        // 計算初始 scale：讓較短邊剛好填滿 viewport
        const minScale = AVATAR_VIEWPORT_PX / Math.min(img.width, img.height);
        this.avatarState.set({
          kind: 'editing',
          dataUrl,
          imgW: img.width,
          imgH: img.height,
          offsetX: (AVATAR_VIEWPORT_PX - img.width * minScale) / 2,
          offsetY: (AVATAR_VIEWPORT_PX - img.height * minScale) / 2,
          scale: minScale,
          minScale
        });
      };
      img.onerror = () => this.avatarError.set('圖片讀取失敗');
      img.src = dataUrl;
    };
    reader.onerror = () => this.avatarError.set('檔案讀取失敗');
    reader.readAsDataURL(file);
  }

  private _dragStart: { x: number; y: number; ox: number; oy: number } | null = null;

  onAvatarDragStart(event: PointerEvent): void {
    const state = this.avatarState();
    if (state.kind !== 'editing') return;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this._dragStart = { x: event.clientX, y: event.clientY, ox: state.offsetX, oy: state.offsetY };
    event.preventDefault();
  }

  onAvatarDragMove(event: PointerEvent): void {
    const state = this.avatarState();
    if (state.kind !== 'editing' || !this._dragStart) return;
    const dx = event.clientX - this._dragStart.x;
    const dy = event.clientY - this._dragStart.y;
    this.updateAvatarPosition(state, this._dragStart.ox + dx, this._dragStart.oy + dy);
  }

  onAvatarDragEnd(event: PointerEvent): void {
    this._dragStart = null;
    try { (event.target as HTMLElement).releasePointerCapture(event.pointerId); } catch { /* ignore */ }
  }

  onAvatarScaleInput(value: string): void {
    const state = this.avatarState();
    if (state.kind !== 'editing') return;
    const next = Number(value);
    if (!Number.isFinite(next) || next < state.minScale) return;
    // 以 viewport 中心為縮放錨點，保持視覺中心不跳
    const centerX = AVATAR_VIEWPORT_PX / 2;
    const centerY = AVATAR_VIEWPORT_PX / 2;
    const imgCenterPrev = { x: (centerX - state.offsetX) / state.scale, y: (centerY - state.offsetY) / state.scale };
    const newOffsetX = centerX - imgCenterPrev.x * next;
    const newOffsetY = centerY - imgCenterPrev.y * next;
    const clamped = this.clampAvatarOffset({ ...state, scale: next, offsetX: newOffsetX, offsetY: newOffsetY });
    this.avatarState.set({ ...state, scale: next, offsetX: clamped.offsetX, offsetY: clamped.offsetY });
  }

  private updateAvatarPosition(
    state: Extract<AvatarEditState, { kind: 'editing' }>,
    offsetX: number,
    offsetY: number
  ): void {
    const clamped = this.clampAvatarOffset({ ...state, offsetX, offsetY });
    this.avatarState.set({ ...state, offsetX: clamped.offsetX, offsetY: clamped.offsetY });
  }

  /** 限制偏移量，確保圖片始終覆蓋 viewport */
  private clampAvatarOffset(
    state: Extract<AvatarEditState, { kind: 'editing' }>
  ): { offsetX: number; offsetY: number } {
    const scaledW = state.imgW * state.scale;
    const scaledH = state.imgH * state.scale;
    const minX = AVATAR_VIEWPORT_PX - scaledW;
    const minY = AVATAR_VIEWPORT_PX - scaledH;
    return {
      offsetX: Math.min(0, Math.max(minX, state.offsetX)),
      offsetY: Math.min(0, Math.max(minY, state.offsetY))
    };
  }

  cancelAvatarEdit(): void {
    this.avatarState.set({ kind: 'idle' });
    this.avatarError.set(null);
  }

  removeAvatar(): void {
    this.avatarState.set({ kind: 'idle' });
    this.avatarError.set(null);
    this.updateField('avatar', '');
  }

  confirmAvatarCrop(): void {
    const state = this.avatarState();
    if (state.kind !== 'editing') return;

    // 以當前 offset/scale 把圖片畫到固定尺寸 canvas，輸出為 Blob
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_OUTPUT_PX;
    canvas.height = AVATAR_OUTPUT_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) { this.avatarError.set('瀏覽器不支援 Canvas'); return; }

    const ratio = AVATAR_OUTPUT_PX / AVATAR_VIEWPORT_PX;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(
        img,
        state.offsetX * ratio,
        state.offsetY * ratio,
        state.imgW * state.scale * ratio,
        state.imgH * state.scale * ratio
      );
      canvas.toBlob(blob => {
        if (!blob) { this.avatarError.set('裁切失敗'); return; }
        this.uploadAvatarBlob(blob);
      }, 'image/jpeg', 0.9);
    };
    img.onerror = () => this.avatarError.set('圖片載入失敗');
    img.src = state.dataUrl;
  }

  private uploadAvatarBlob(blob: Blob): void {
    this.avatarState.set({ kind: 'uploading' });
    const formData = new FormData();
    formData.append('file', blob, `avatar-${Date.now()}.jpg`);

    this.http.post<{ url: string }>(this.uploadEndpoint(), formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.avatarState.set({ kind: 'ready', url: res.url });
          this.updateField('avatar', res.url);
        },
        error: err => {
          this.avatarState.set({ kind: 'idle' });
          this.avatarError.set(err?.error?.message || '上傳失敗，請稍後再試');
        }
      });
  }

  // ─── 送出 ───
  submit(): void {
    if (!this.isFormValid() || this.submitting()) return;
    // 跳第一個未完成的 tab
    if (!this.tab1Complete()) { this.setTab(1); return; }
    if (!this.tab2Complete()) { this.setTab(2); return; }
    if (!this.tab3Complete()) { this.setTab(3); return; }
    if (!this.tab4Complete()) { this.setTab(4); return; }

    // 過濾掉完全空白的 optional entries（工作經歷 / 專案作品）
    const cleaned = this.form();
    const payload: CandidateFullForm = {
      ...cleaned,
      experienceList: cleaned.experienceList.filter(e => e.firmName || e.jobName || e.jobDesc),
      projectList: cleaned.projectList.filter(p => p.title)
    };
    this.submitForm.emit(payload);
  }
}
