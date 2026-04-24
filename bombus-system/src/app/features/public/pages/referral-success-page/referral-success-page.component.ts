import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-referral-success-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="card">
        <i class="ri-check-double-line"></i>
        <h1>應徵資料已送出</h1>
        <p>感謝您透過內部推薦應徵本職缺。</p>
        <p>我們的 HR 將於審閱後主動聯繫您，請留意 email 與來電。</p>
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
        padding: 48px 56px;
        text-align: center;
        max-width: 480px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        border-top: 4px solid $color-l1-sage;
      }
      i {
        font-size: 64px;
        color: $color-l1-sage;
        display: block;
        margin-bottom: 16px;
      }
      h1 {
        margin: 0 0 16px;
        font-size: 24px;
        color: $color-text-dark;
      }
      p {
        margin: 0 0 10px;
        color: $color-text-secondary;
        font-size: 15px;
        line-height: 1.7;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReferralSuccessPageComponent {}
