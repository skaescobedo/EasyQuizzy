import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GlobalStats } from '../../../../models/session.model';

@Component({
  selector: 'app-global-stats-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './global-stats-card.html',
})
export class GlobalStatsCardComponent {
  @Input({ required: true }) stats!: GlobalStats;
}