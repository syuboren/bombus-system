import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InterviewService } from '../../services/interview.service';

/**
 * 面試表單 QR Code 顯示 Modal
 * 顯示候選人面試表單的 QR Code 與專屬連結
 */
@Component({
  selector: 'app-interview-qrcode-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interview-qrcode-modal.component.html',
  styleUrl: './interview-qrcode-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewQrcodeModalComponent {
  private interviewService = inject(InterviewService);

  // Inputs
  interviewId = input.required<string>();
  candidateName = input<string>('');
  jobTitle = input<string>('');
  interviewAt = input<string>('');
  
  // Existing QR Code data (optional)
  existingFormToken = input<string | null>(null);
  existingQrCodeUrl = input<string | null>(null);
  existingFormUrl = input<string | null>(null);

  // Outputs
  close = output<void>();
  generated = output<{ formToken: string; qrCodeUrl: string; formUrl: string }>();

  // State
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  qrCodeDataUrl = signal<string | null>(null);
  formUrl = signal<string | null>(null);
  formToken = signal<string | null>(null);
  copied = signal<boolean>(false);
  showConfirmDialog = signal<boolean>(false);

  ngOnInit(): void {
    // 如果已有完整的 QR Code 資料，直接使用
    if (this.existingQrCodeUrl() && this.existingFormUrl()) {
      this.qrCodeDataUrl.set(this.existingQrCodeUrl());
      this.formUrl.set(this.existingFormUrl());
      this.formToken.set(this.existingFormToken());
    } else if (this.existingFormToken()) {
      // 如果只有 token，呼叫 API 取得 QR Code 圖片（不會產生新 token）
      this.loadExistingQrCode();
    } else {
      // 沒有現有 token，呼叫 generateFormToken（會返回現有或建立新的）
      this.loadOrCreateQrCode();
    }
  }

  /**
   * 載入現有 Token 的 QR Code 圖片
   */
  private loadExistingQrCode(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.interviewService.regenerateQrCode(this.interviewId()).subscribe({
      next: (response) => {
        this.qrCodeDataUrl.set(response.qrCodeDataUrl);
        this.formUrl.set(response.formUrl);
        this.formToken.set(response.formToken);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Load existing QR code error:', err);
        // 如果載入失敗，嘗試建立新的
        this.loadOrCreateQrCode();
      }
    });
  }

  /**
   * 載入或建立 QR Code（會返回現有 token 或建立新的）
   */
  private loadOrCreateQrCode(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.interviewService.generateFormToken(this.interviewId()).subscribe({
      next: (response) => {
        this.qrCodeDataUrl.set(response.qrCodeDataUrl);
        this.formUrl.set(response.formUrl);
        this.formToken.set(response.formToken);
        this.isLoading.set(false);
        
        this.generated.emit({
          formToken: response.formToken,
          qrCodeUrl: response.qrCodeDataUrl,
          formUrl: response.formUrl
        });
      },
      error: (err) => {
        console.error('Generate QR code error:', err);
        this.error.set(err.error?.error || '產生 QR Code 失敗');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * 強制重新產生 Token（舊連結將失效）
   * 需要使用者確認後才執行
   */
  forceRegenerateToken(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.showConfirmDialog.set(false);

    this.interviewService.generateFormToken(this.interviewId(), 60, true).subscribe({
      next: (response) => {
        this.qrCodeDataUrl.set(response.qrCodeDataUrl);
        this.formUrl.set(response.formUrl);
        this.formToken.set(response.formToken);
        this.isLoading.set(false);
        
        this.generated.emit({
          formToken: response.formToken,
          qrCodeUrl: response.qrCodeDataUrl,
          formUrl: response.formUrl
        });
      },
      error: (err) => {
        console.error('Force regenerate token error:', err);
        this.error.set(err.error?.error || '重新產生 Token 失敗');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * 顯示重新產生確認對話框
   */
  showRegenerateConfirm(): void {
    this.showConfirmDialog.set(true);
  }

  /**
   * 取消重新產生
   */
  cancelRegenerate(): void {
    this.showConfirmDialog.set(false);
  }

  /**
   * 重試載入 QR Code
   */
  retryLoadQrCode(): void {
    this.loadOrCreateQrCode();
  }

  /**
   * 複製連結到剪貼簿
   */
  copyLink(): void {
    const url = this.formUrl();
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      });
    }
  }

  /**
   * 列印 QR Code
   */
  printQrCode(): void {
    const qrCodeUrl = this.qrCodeDataUrl();
    if (!qrCodeUrl) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>面試表單 QR Code</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
              border: 2px solid #e5e7eb;
              border-radius: 16px;
            }
            .title {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .subtitle {
              font-size: 16px;
              color: #6b7280;
              margin-bottom: 24px;
            }
            .qr-code {
              width: 250px;
              height: 250px;
              margin-bottom: 24px;
            }
            .info {
              font-size: 14px;
              color: #374151;
              margin-bottom: 8px;
            }
            .url {
              font-size: 12px;
              color: #9ca3af;
              word-break: break-all;
              max-width: 300px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1 class="title">面試記錄表</h1>
            <p class="subtitle">${this.candidateName()} - ${this.jobTitle()}</p>
            <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
            <p class="info">請掃描 QR Code 進入面試記錄表填寫頁面</p>
            <p class="url">${this.formUrl()}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  /**
   * 關閉 Modal
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * 點擊背景關閉
   */
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }
}
