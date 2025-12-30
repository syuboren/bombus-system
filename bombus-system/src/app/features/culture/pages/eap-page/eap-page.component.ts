import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CultureService } from '../../services/culture.service';
import { EAPService, EAPUsageStats, HealthProgram } from '../../models/culture.model';

@Component({
  standalone: true,
  selector: 'app-eap-page',
  templateUrl: './eap-page.component.html',
  styleUrl: './eap-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EapPageComponent implements OnInit {
  private cultureService = inject(CultureService);

  // State
  loading = signal(true);
  services = signal<EAPService[]>([]);
  usageStats = signal<EAPUsageStats | null>(null);
  healthPrograms = signal<HealthProgram[]>([]);

  // UI State
  showBookingModal = signal(false);
  selectedService = signal<EAPService | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.cultureService.getEAPServices().subscribe(data => {
      this.services.set(data);
    });

    this.cultureService.getEAPUsageStats().subscribe(data => {
      this.usageStats.set(data);
    });

    this.cultureService.getHealthPrograms().subscribe(data => {
      this.healthPrograms.set(data);
      this.loading.set(false);
    });
  }

  getServiceIcon(type: string): string {
    const icons: Record<string, string> = {
      'counseling': 'ri-mental-health-line',
      'health': 'ri-heart-pulse-line',
      'legal': 'ri-scales-3-line',
      'financial': 'ri-money-dollar-circle-line',
      'family': 'ri-home-heart-line'
    };
    return icons[type] || 'ri-service-line';
  }

  getServiceLabel(type: string): string {
    const labels: Record<string, string> = {
      'counseling': '心理諮商',
      'health': '健康諮詢',
      'legal': '法律諮詢',
      'financial': '財務規劃',
      'family': '家庭諮詢'
    };
    return labels[type] || type;
  }

  getProgramTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'workshop': '工作坊',
      'checkup': '健康檢查',
      'fitness': '健身課程',
      'nutrition': '營養講座'
    };
    return labels[type] || type;
  }

  getProgramTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'workshop': 'ri-brain-line',
      'checkup': 'ri-stethoscope-line',
      'fitness': 'ri-run-line',
      'nutrition': 'ri-restaurant-line'
    };
    return icons[type] || 'ri-calendar-event-line';
  }

  getRemainingQuota(service: EAPService): number {
    return service.annualQuota - service.usedQuota;
  }

  getQuotaPercentage(service: EAPService): number {
    return (service.usedQuota / service.annualQuota) * 100;
  }

  openBooking(service: EAPService): void {
    this.selectedService.set(service);
    this.showBookingModal.set(true);
  }

  closeBookingModal(): void {
    this.showBookingModal.set(false);
    this.selectedService.set(null);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW', {
      month: 'long',
      day: 'numeric'
    });
  }

  getEnrollmentPercentage(program: HealthProgram): number {
    return (program.enrolled / program.capacity) * 100;
  }
}

