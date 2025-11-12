import { Component, inject } from '@angular/core';
import { FooterComponent } from "../../shared/footer/footer.component";
import { HeaderComponent } from "../../shared/header/header.component";
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  imports: [FooterComponent, HeaderComponent, RouterLink, FormsModule]
})
export class LandingComponent {
  joinCode = '';
  private router = inject(Router);
  private toastr = inject(ToastrService);

  joinQuiz() {
    const code = this.joinCode.trim().toUpperCase();

    if (!code || code.length < 3) {
      this.toastr.error('Por favor ingresa un código válido.', '⚠️ Código incorrecto');
      return;
    }

    this.router.navigate([`/quizz/${code}`]);
  }
}
