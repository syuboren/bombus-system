import { Component, ChangeDetectionStrategy, input, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignaturePadComponent } from '../signature-pad/signature-pad.component';

/**
 * 簽章對話框元件
 * 用於週報等需要簽章確認的場景
 */
@Component({
  selector: 'app-signature-dialog',
  standalone: true,
  imports: [CommonModule, SignaturePadComponent],
  templateUrl: './signature-dialog.component.html',
  styleUrl: './signature-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignatureDialogComponent {
  @ViewChild('signaturePad') signaturePad!: SignaturePadComponent;

  // Inputs
  title = input<string>('電子簽章');
  visible = input<boolean>(true);

  // Outputs
  confirm = output<string>();
  cancel = output<void>();

  // 內部狀態
  currentSignature = signal<string | null>(null);
  error = signal<string | null>(null);

  onSignatureChange(signature: string | null): void {
    this.currentSignature.set(signature);
    this.error.set(null);
  }

  onConfirm(): void {
    const signature = this.currentSignature();
    if (!signature) {
      this.error.set('請先完成簽名');
      return;
    }
    this.confirm.emit(signature);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  // 防呆：點擊背景不關閉 dialog，避免誤觸導致簽章遺失
  onBackdropClick(event: MouseEvent): void {
    // 不做任何事，防止誤觸關閉
  }

  clearSignature(): void {
    this.signaturePad?.clear();
    this.currentSignature.set(null);
  }
}
