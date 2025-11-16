import { Component, ChangeDetectionStrategy, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { QuizListItem } from '../../../../services/quiz.service';

@Component({
  selector: 'app-quiz-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, RouterLink],
  templateUrl: './quiz-card.html',
})
export class QuizCard {
  @Input({ required: true }) quiz!: QuizListItem;
  @Output() createSession = new EventEmitter<number>();
  @Output() createSelfStudy = new EventEmitter<number>();
}
