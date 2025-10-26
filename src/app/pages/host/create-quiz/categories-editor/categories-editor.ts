import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-categories-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './categories-editor.html',
})
export class CategoriesEditor {
  @Input({ required: true }) formArray!: FormArray;
  private fb = inject(FormBuilder);

  addCategory() {
    const orderIndex = this.formArray.length + 1;
    this.formArray.push(
      this.fb.group({
        name: ['', Validators.required],
        weight: [1, [Validators.required, Validators.min(0)]],
        order_index: [orderIndex],
        is_active: [true],
      })
    );
  }

  removeCategory(i: number) {
    this.formArray.removeAt(i);
    this.formArray.controls.forEach((ctrl, idx) => ctrl.get('order_index')?.setValue(idx + 1));
  }

  groupAt(i: number): FormGroup {
    return this.formArray.at(i) as FormGroup;
  }

  get controls() {
    return this.formArray.controls;
  }
}
