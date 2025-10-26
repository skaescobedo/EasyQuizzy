import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-time-limit-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './time-limit-toggle.html',
})
export class TimeLimitToggle {
  @Input({ required: true }) group!: FormGroup;

  toggle() {
    const has = this.group.get('has_time_limit')?.value;
    if (!has) this.group.get('time_limit_sec')?.setValue(null);
  }
}
