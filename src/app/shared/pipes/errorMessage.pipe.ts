// src/app/shared/pipes/error-message.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Pipe({
  name: 'errorMessage',
  standalone: true
})
export class ErrorMessagePipe implements PipeTransform {
  transform(error: unknown): string {
    if (!error) return '';

    if (error instanceof HttpErrorResponse) {
      // Si FastAPI devolvió detail
      if (error.error?.detail) {
        if (typeof error.error.detail === 'string') {
          return error.error.detail;
        }
        if (Array.isArray(error.error.detail)) {
          return error.error.detail.map((d: any) => d.msg).join(', ');
        }
      }
      // fallback por status
      return `Error ${error.status}: ${error.statusText}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Ocurrió un error inesperado';
  }
}
