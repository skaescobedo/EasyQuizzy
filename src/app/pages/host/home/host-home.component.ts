import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-host-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './host-home.component.html',
})
export class HostHomeComponent {}
