import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

const REASON_MESSAGES: Record<string, string> = {
  EXPIRED: '此連結已過期。若仍需應徵，請聯繫 HR 重新發起邀請。',
  ALREADY_SUBMITTED: '此連結已完成應徵，請勿重複送出。',
  CANCELLED: '此邀請已被 HR 取消。',
  INVALID_TOKEN: '連結格式不正確或不存在。',
  DUPLICATE_CANDIDATE: '您已應徵過此職缺，請聯繫 HR 確認。',
  missing: '連結資訊不完整。',
  UNKNOWN: '連結無法使用，請聯繫 HR。'
};

@Component({
  selector: 'app-referral-invalid-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="card">
        <i class="ri-error-warning-line"></i>
        <h1>連結無法使用</h1>
        <p>{{ message() }}</p>
        <p class="hint">如有問題，請與邀請您的 HR 聯繫。</p>
      </div>
    </div>
  `,
  styles: [
    `
      @import '../../../../../assets/styles/variables';

      .page {
        min-height: 100vh;
        background: $color-cloud-gray;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
      }
      .card {
        background: #fff;
        border-radius: 12px;
        padding: 40px 48px;
        text-align: center;
        max-width: 480px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      }
      i {
        font-size: 56px;
        color: $color-l5-brick;
        display: block;
        margin-bottom: 16px;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 22px;
        color: $color-text-dark;
      }
      p {
        margin: 0 0 8px;
        color: $color-text-secondary;
        font-size: 15px;
        line-height: 1.6;
      }
      .hint {
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid $color-soft-gray;
        font-size: 13px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReferralInvalidPageComponent {
  private route = inject(ActivatedRoute);

  message = computed(() => {
    const reason = this.route.snapshot.queryParamMap.get('reason') || 'UNKNOWN';
    return REASON_MESSAGES[reason] || REASON_MESSAGES['UNKNOWN'];
  });
}
