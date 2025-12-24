import {
  Component,
  ChangeDetectionStrategy
} from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { KeyTalentTabComponent } from '../../components/key-talent-tab/key-talent-tab.component';

@Component({
  selector: 'app-key-talent-page',
  standalone: true,
  imports: [
    HeaderComponent,
    KeyTalentTabComponent
  ],
  templateUrl: './key-talent-page.component.html',
  styleUrl: './key-talent-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KeyTalentPageComponent {}

