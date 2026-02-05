import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationComponent {
  /** 目前頁碼 */
  currentPage = input<number>(1);
  
  /** 總頁數 */
  totalPages = input<number>(1);
  
  /** 總筆數 */
  totalItems = input<number>(0);
  
  /** 每頁筆數 */
  pageSize = input<number>(20);
  
  /** 顯示的頁碼數量 */
  visiblePages = input<number>(5);
  
  /** 頁碼變更事件 */
  pageChange = output<number>();
  
  /** 每頁筆數變更事件 */
  pageSizeChange = output<number>();
  
  /** 計算顯示的頁碼陣列 */
  pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const visible = this.visiblePages();
    
    if (total <= visible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const half = Math.floor(visible / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + visible - 1);
    
    if (end - start + 1 < visible) {
      start = Math.max(1, end - visible + 1);
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });
  
  /** 是否顯示第一頁省略號 */
  showStartEllipsis = computed(() => {
    const pages = this.pages();
    return pages.length > 0 && pages[0] > 1;
  });
  
  /** 是否顯示最後一頁省略號 */
  showEndEllipsis = computed(() => {
    const pages = this.pages();
    return pages.length > 0 && pages[pages.length - 1] < this.totalPages();
  });
  
  /** 計算起始筆數 */
  startItem = computed(() => {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });
  
  /** 計算結束筆數 */
  endItem = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalItems());
  });
  
  /** 切換頁碼 */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }
  
  /** 上一頁 */
  prevPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }
  
  /** 下一頁 */
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }
  
  /** 變更每頁筆數 */
  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const size = parseInt(select.value, 10);
    this.pageSizeChange.emit(size);
  }
}
