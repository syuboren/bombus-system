import {
  Component,
  ChangeDetectionStrategy
} from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { NineBoxTabComponent } from '../../components/nine-box-tab/nine-box-tab.component';

@Component({
  selector: 'app-nine-box-page',
  standalone: true,
  imports: [
    HeaderComponent,
    NineBoxTabComponent
  ],
  templateUrl: './nine-box-page.component.html',
  styleUrl: './nine-box-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NineBoxPageComponent {}

