import {
  Component,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { HeatmapTabComponent } from '../../components/heatmap-tab/heatmap-tab.component';
import { NineBoxTabComponent } from '../../components/nine-box-tab/nine-box-tab.component';
import { LearningPathTabComponent } from '../../components/learning-path-tab/learning-path-tab.component';
import { KeyTalentTabComponent } from '../../components/key-talent-tab/key-talent-tab.component';
import { TalentMapTab } from '../../models/talent-map.model';

interface TabItem {
  key: TalentMapTab;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-talent-map-page',
  standalone: true,
  imports: [
    HeaderComponent,
    HeatmapTabComponent,
    NineBoxTabComponent,
    LearningPathTabComponent,
    KeyTalentTabComponent
  ],
  templateUrl: './talent-map-page.component.html',
  styleUrl: './talent-map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TalentMapPageComponent {
  activeTab = signal<TalentMapTab>('heatmap');

  readonly tabs: TabItem[] = [
    { key: 'heatmap', label: '組織職能熱力圖', icon: 'ri-fire-line' },
    { key: 'nine-box', label: '人才九宮格', icon: 'ri-grid-line' },
    { key: 'learning-path', label: '學習發展路徑圖', icon: 'ri-route-line' },
    { key: 'key-talent', label: '關鍵人才儀表板', icon: 'ri-star-line' }
  ];

  setActiveTab(tab: TalentMapTab): void {
    this.activeTab.set(tab);
  }
}
