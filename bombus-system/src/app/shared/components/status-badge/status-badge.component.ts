import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/** 狀態顏色設定 */
const STATUS_CONFIG: Record<string, { color: string; bgColor: string; label?: string }> = {
  // 月度檢核
  self_assessment: { color: '#7F9CA0', bgColor: 'rgba(127, 156, 160, 0.1)', label: '自評中' },
  manager_review: { color: '#D6A28C', bgColor: 'rgba(214, 162, 140, 0.1)', label: '主管審核中' },
  hr_review: { color: '#9A8C98', bgColor: 'rgba(154, 140, 152, 0.1)', label: 'HR 審核中' },
  completed: { color: '#8DA399', bgColor: 'rgba(141, 163, 153, 0.1)', label: '已完成' },
  overdue: { color: '#C75B5B', bgColor: 'rgba(199, 91, 91, 0.1)', label: '逾期' },
  // 季度面談
  employee_submitted: { color: '#7F9CA0', bgColor: 'rgba(127, 156, 160, 0.1)', label: '員工已提交' },
  manager_reviewed: { color: '#D6A28C', bgColor: 'rgba(214, 162, 140, 0.1)', label: '主管已評核' },
  interview_scheduled: { color: '#9A8C98', bgColor: 'rgba(154, 140, 152, 0.1)', label: '已預約面談' },
  post_interview_edit: { color: '#D6A28C', bgColor: 'rgba(214, 162, 140, 0.1)', label: '面談後編輯' },
  interview_completed: { color: '#8DA399', bgColor: 'rgba(141, 163, 153, 0.1)', label: '面談完成' },
  // 週報
  not_started: { color: '#B8C4CE', bgColor: 'rgba(184, 196, 206, 0.15)', label: '尚未填寫' },
  draft: { color: '#858E96', bgColor: 'rgba(133, 142, 150, 0.1)', label: '草稿' },
  submitted: { color: '#7F9CA0', bgColor: 'rgba(127, 156, 160, 0.1)', label: '已提交' },
  approved: { color: '#8DA399', bgColor: 'rgba(141, 163, 153, 0.1)', label: '已通過' },
  rejected: { color: '#C75B5B', bgColor: 'rgba(199, 91, 91, 0.1)', label: '已退回' },
  // 通用
  in_progress: { color: '#7F9CA0', bgColor: 'rgba(127, 156, 160, 0.1)', label: '進行中' },
  pending: { color: '#D6A28C', bgColor: 'rgba(214, 162, 140, 0.1)', label: '待處理' },
  active: { color: '#8DA399', bgColor: 'rgba(141, 163, 153, 0.1)', label: '啟用' },
  inactive: { color: '#858E96', bgColor: 'rgba(133, 142, 150, 0.1)', label: '停用' }
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponent {
  /** 狀態代碼 */
  status = input<string>('');
  
  /** 自訂標籤文字 (覆蓋預設) */
  label = input<string>('');
  
  /** 尺寸 */
  size = input<'sm' | 'md' | 'lg'>('md');
  
  /** 是否顯示圓點 */
  showDot = input<boolean>(true);
  
  /** 計算顯示文字 */
  displayLabel = computed(() => {
    if (this.label()) return this.label();
    const config = STATUS_CONFIG[this.status()];
    return config?.label || this.status();
  });
  
  /** 計算樣式 */
  badgeStyle = computed(() => {
    const config = STATUS_CONFIG[this.status()] || {
      color: '#858E96',
      bgColor: 'rgba(133, 142, 150, 0.1)'
    };
    return {
      'color': config.color,
      'background-color': config.bgColor,
      'border-color': `rgba(${this.hexToRgb(config.color)}, 0.2)`
    };
  });
  
  /** 計算圓點樣式 */
  dotStyle = computed(() => {
    const config = STATUS_CONFIG[this.status()] || { color: '#858E96' };
    return { 'background-color': config.color };
  });
  
  /** Hex 轉 RGB */
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '133, 142, 150';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
}
