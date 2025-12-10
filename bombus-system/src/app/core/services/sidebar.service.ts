import { Injectable, signal, computed, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly STORAGE_KEY = 'bombus_sidebar_minimized';

  private isMinimizedSignal = signal<boolean>(this.loadState());
  private isMobileOpenSignal = signal<boolean>(false);

  readonly isMinimized = computed(() => this.isMinimizedSignal());
  readonly isMobileOpen = computed(() => this.isMobileOpenSignal());

  constructor() {
    // 自動儲存狀態到 localStorage
    effect(() => {
      const isMinimized = this.isMinimizedSignal();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(isMinimized));
    });
  }

  toggle(): void {
    this.isMinimizedSignal.update(value => !value);
  }

  minimize(): void {
    this.isMinimizedSignal.set(true);
  }

  expand(): void {
    this.isMinimizedSignal.set(false);
  }

  toggleMobile(): void {
    this.isMobileOpenSignal.update(value => !value);
  }

  openMobile(): void {
    this.isMobileOpenSignal.set(true);
  }

  closeMobile(): void {
    this.isMobileOpenSignal.set(false);
  }

  private loadState(): boolean {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved ? JSON.parse(saved) : false;
  }
}

