import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../../../shared/components/header/header.component';
import { OnboardingTemplatesPageComponent } from '../onboarding-templates-page/onboarding-templates-page.component';
import { OnboardingDocumentsPageComponent } from '../onboarding-documents-page/onboarding-documents-page.component';
import { OnboardingApprovalPageComponent } from '../onboarding-approval-page/onboarding-approval-page.component';
import { OnboardingProgressPageComponent } from '../onboarding-progress-page/onboarding-progress-page.component';

/**
 * 入職管理容器頁面
 * 使用 Tab 切換四個子功能：入職進度、入職文件管理、我的入職文件、入職簽核管理
 */
@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    OnboardingTemplatesPageComponent,
    OnboardingDocumentsPageComponent,
    OnboardingApprovalPageComponent,
    OnboardingProgressPageComponent
  ],
  templateUrl: './onboarding-page.component.html',
  styleUrl: './onboarding-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingPageComponent implements OnInit {
  private route = inject(ActivatedRoute);

  // Tab 定義
  readonly tabs = [
    { id: 'progress', label: '入職進度', icon: 'ri-user-received-line' },
    { id: 'templates', label: '入職文件管理', icon: 'ri-file-list-3-line' },
    { id: 'my-documents', label: '我的入職文件', icon: 'ri-file-user-line' },
    { id: 'approval', label: '入職簽核管理', icon: 'ri-checkbox-circle-line' }
  ];

  // 當前選中的 Tab
  activeTab = signal<string>('progress');

  ngOnInit(): void {
    // 讀取 query params 中的 tab 參數
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab && this.tabs.some(t => t.id === tab)) {
        this.activeTab.set(tab);
      }
    });
  }

  /**
   * 切換 Tab
   */
  setActiveTab(tabId: string): void {
    this.activeTab.set(tabId);
  }
}
