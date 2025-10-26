import { Component, Output, EventEmitter, ChangeDetectionStrategy, Input, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './image-uploader.html',
})
export class ImageUploader {
  @Output() fileSelected = new EventEmitter<File>();

  /** URL para previsualización (blob: o http(s):) */
  @Input() previewUrl: string | null = null;

  /** Nombre visible del archivo (opcional) */
  @Input() filename: string | null = null;

  /** Estado del lightbox */
  overlayOpen = signal(false);

  onChange(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (file) this.fileSelected.emit(file);
  }

  openOverlay() {
    if (!this.previewUrl) return;
    this.overlayOpen.set(true);
  }

  closeOverlay() {
    this.overlayOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.overlayOpen()) this.closeOverlay();
  }
}
