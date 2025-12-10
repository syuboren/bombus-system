import { Component, ChangeDetectionStrategy } from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

@Component({
  selector: 'app-talent-pool-page',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './talent-pool-page.component.html',
  styleUrl: './talent-pool-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TalentPoolPageComponent {}

