import { Component, ChangeDetectionStrategy, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CultureService } from '../../services/culture.service';
import { CultureDocument, DocumentType } from '../../models/culture.model';

@Component({
  standalone: true,
  selector: 'app-document-repository-page',
  templateUrl: './document-repository-page.component.html',
  styleUrl: './document-repository-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentRepositoryPageComponent implements OnInit {
  private cultureService = inject(CultureService);

  // State
  loading = signal(true);
  documents = signal<CultureDocument[]>([]);

  // Filters
  selectedType = signal<DocumentType | 'all'>('all');
  searchQuery = signal('');
  viewMode = signal<'grid' | 'list'>('grid');

  // Document types
  documentTypes: { value: DocumentType | 'all'; label: string; icon: string }[] = [
    { value: 'all', label: '全部', icon: 'ri-folder-line' },
    { value: 'policy', label: '規章制度', icon: 'ri-file-text-line' },
    { value: 'certificate', label: '證書認證', icon: 'ri-award-line' },
    { value: 'training', label: '培訓文件', icon: 'ri-book-open-line' },
    { value: 'report', label: '報告', icon: 'ri-file-chart-line' },
    { value: 'hr', label: '人事文件', icon: 'ri-user-line' },
    { value: 'other', label: '其他', icon: 'ri-file-line' }
  ];

  // Computed
  filteredDocuments = computed(() => {
    let result = this.documents();
    const type = this.selectedType();
    const query = this.searchQuery().toLowerCase();

    if (type !== 'all') {
      result = result.filter(d => d.type === type);
    }

    if (query) {
      result = result.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.category.toLowerCase().includes(query) ||
        d.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return result;
  });

  expiringDocuments = computed(() => {
    const now = new Date();
    const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return this.documents().filter(d =>
      d.expiryDate &&
      new Date(d.expiryDate) >= now &&
      new Date(d.expiryDate) <= threeMonths
    );
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.cultureService.getDocuments().subscribe(data => {
      this.documents.set(data);
      this.loading.set(false);
    });
  }

  setType(type: DocumentType | 'all'): void {
    this.selectedType.set(type);
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'policy': '規章制度',
      'certificate': '證書認證',
      'training': '培訓文件',
      'report': '報告',
      'hr': '人事文件',
      'award': '獎項文件',
      'other': '其他'
    };
    return labels[type] || type;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'policy': 'ri-file-text-line',
      'certificate': 'ri-award-line',
      'training': 'ri-book-open-line',
      'report': 'ri-file-chart-line',
      'hr': 'ri-user-line',
      'award': 'ri-trophy-line',
      'other': 'ri-file-line'
    };
    return icons[type] || 'ri-file-line';
  }

  getFormatIcon(format: string): string {
    const icons: Record<string, string> = {
      'pdf': 'ri-file-pdf-2-line',
      'xlsx': 'ri-file-excel-2-line',
      'xls': 'ri-file-excel-2-line',
      'docx': 'ri-file-word-2-line',
      'doc': 'ri-file-word-2-line',
      'pptx': 'ri-file-ppt-2-line',
      'ppt': 'ri-file-ppt-2-line'
    };
    return icons[format.toLowerCase()] || 'ri-file-line';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'draft': '草稿',
      'active': '生效中',
      'expired': '已過期',
      'archived': '已封存'
    };
    return labels[status] || status;
  }

  getAccessLabel(access: string): string {
    const labels: Record<string, string> = {
      'public': '公開',
      'internal': '內部',
      'confidential': '機密'
    };
    return labels[access] || access;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDaysUntilExpiry(date: Date): number {
    const now = new Date();
    const expiry = new Date(date);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

