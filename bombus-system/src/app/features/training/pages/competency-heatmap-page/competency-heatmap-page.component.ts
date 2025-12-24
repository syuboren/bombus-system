import {
  Component,
  ChangeDetectionStrategy
} from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { HeatmapTabComponent } from '../../components/heatmap-tab/heatmap-tab.component';

@Component({
  selector: 'app-competency-heatmap-page',
  standalone: true,
  imports: [
    HeaderComponent,
    HeatmapTabComponent
  ],
  templateUrl: './competency-heatmap-page.component.html',
  styleUrl: './competency-heatmap-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompetencyHeatmapPageComponent {}

