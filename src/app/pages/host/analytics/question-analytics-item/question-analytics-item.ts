import { Component, Input, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { QuestionAnalytics } from '../../../../models/session.model';

@Component({
  selector: 'app-question-analytics-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './question-analytics-item.html',
})
export class QuestionAnalyticsItemComponent {
  @Input({ required: true }) question!: QuestionAnalytics;
  @Input() totalParticipants: number = 0;

  collapsed = signal(true);

  toggle() {
    this.collapsed.update(v => !v);
  }

  getAccuracyColor(accuracy: number): string {
    if (accuracy >= 75) return 'text-[var(--color-success)]';
    if (accuracy >= 50) return 'text-[var(--color-primary)]';
    return 'text-[var(--color-danger)]';
  }

  getBarColor(isCorrect: boolean): string {
    return isCorrect ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]';
  }

  getBarWidth(percentage: number): string {
    return `${Math.min(percentage, 100)}%`;
  }
}