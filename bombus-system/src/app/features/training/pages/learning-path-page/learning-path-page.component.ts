import {
  Component,
  ChangeDetectionStrategy
} from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { LearningPathTabComponent } from '../../components/learning-path-tab/learning-path-tab.component';

@Component({
  selector: 'app-learning-path-page',
  standalone: true,
  imports: [
    HeaderComponent,
    LearningPathTabComponent
  ],
  templateUrl: './learning-path-page.component.html',
  styleUrl: './learning-path-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LearningPathPageComponent {}

