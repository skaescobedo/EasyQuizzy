import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Insights } from '../../../../models/session.model';

@Component({
  selector: 'app-insights-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './insights-panel.html',
})
export class InsightsPanelComponent {
  @Input({ required: true }) insights!: Insights;
}