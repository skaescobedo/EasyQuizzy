import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SessionService } from '../../../../services/session.service';
import { SessionAnalytics, TopsisRanking, TopsisParticipant } from '../../../../models/session.model';
import { GlobalStatsCardComponent } from '../global-stats-card/global-stats-card';
import { QuestionAnalyticsItemComponent } from '../question-analytics-item/question-analytics-item';
import { InsightsPanelComponent } from '../insights-panel/insights-panel';

@Component({
  selector: 'app-session-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    GlobalStatsCardComponent,
    QuestionAnalyticsItemComponent,
    InsightsPanelComponent
  ],
  templateUrl: './session-analytics.html',
})
export class SessionAnalyticsComponent implements OnInit {
  private sessionService = inject(SessionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  analytics = signal<SessionAnalytics | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  sessionId = signal<number | null>(null);
  cheaters = signal<any[]>([]);

  // 🎯 NUEVO: Signals para TOPSIS
  topsisData = signal<TopsisRanking | null>(null);
  expandedParticipant = signal<number | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('sessionId'));
    if (!id) {
      this.error.set('ID de sesión inválido');
      this.loading.set(false);
      return;
    }

    this.sessionId.set(id);
    await this.loadAnalytics(id);
  }

  async loadAnalytics(sessionId: number) {
    try {
      this.loading.set(true);
      this.error.set(null);

      const data = await this.sessionService.getSessionAnalytics(sessionId);
      this.analytics.set(data);

      // 🎯 NUEVO: Cargar TOPSIS
      try {
        const topsis = await this.sessionService.fetchTopsisRanking(sessionId);
        if (topsis.has_categories) {
          this.topsisData.set(topsis);
        }
      } catch (err) {
        console.warn('No se pudo cargar TOPSIS:', err);
      }

      try {
        const cheatData = await this.sessionService.fetchAnomalyDetection(sessionId);
        this.cheaters.set(cheatData.suspects || []);
      } catch (err) {
        console.warn("No se pudo cargar anomalías:", err);
      }
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar analytics');
    } finally {
      this.loading.set(false);
    }
  }

  isCheater(participantId: number): boolean {
    return this.cheaters().some(c => c.participant_id === participantId);
  }

  cheaterReasons(participantId: number): string[] {
    return this.cheaters().find(c => c.participant_id === participantId)?.reasons || [];
  }

  goBack() {
    this.router.navigate(['/host/sessions']);
  }

  // 🎯 NUEVO: Métodos para TOPSIS
  
  toggleParticipantDetails(participantId: number) {
    if (this.expandedParticipant() === participantId) {
      this.expandedParticipant.set(null);
    } else {
      this.expandedParticipant.set(participantId);
    }
  }

  getCategoryEntries(participant: TopsisParticipant): [string, any][] {
    return Object.entries(participant.category_performance);
  }

  getCategoryColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  getCategoryTextColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  exportCSV() {
    const analytics = this.analytics();
    const topsis = this.topsisData();

    if (!analytics) {
      alert("No hay datos para exportar");
      return;
    }

    let csv = [];

    // =============================
    //  🧩 1. Información general
    // =============================
    csv.push("INFORMACIÓN GENERAL");
    csv.push(`Título del quiz,${analytics.session_info.quiz_title}`);
    csv.push(`Código,${analytics.session_info.code}`);
    csv.push(`Modo,${analytics.session_info.mode}`);
    csv.push(`Craeado en,${analytics.session_info.created_at || 'N/A'}`);
    csv.push("");

    // =============================
    //  📊 2. Estadísticas globales
    // =============================
    const gs = analytics.global_stats;

    csv.push("ESTADÍSTICAS GLOBALES");

    // Encabezados en español
    csv.push([
      "Total de participantes",
      "Promedio de puntaje",
      "Mediana de puntaje",
      "Puntaje más alto",
      "Puntaje más bajo",
      "Exactitud global (%)",
      "Tiempo promedio de respuesta (ms)",
      "Total de respuestas",
      "Respuestas correctas",
      "Respuestas incorrectas"
    ].join(","));

    // Valores
    csv.push([
      gs.total_participants,
      gs.avg_score,
      gs.median_score,
      gs.highest_score,
      gs.lowest_score,
      gs.overall_accuracy,
      gs.avg_response_time_ms,
      gs.total_responses,
      gs.correct_responses,
      gs.incorrect_responses
    ].join(","));

    csv.push("");

    // =============================
    //  🏆 3. Ranking SAW/TOPSIS
    // =============================
    if (topsis?.ranking?.length) {
      csv.push("RANKING GENERAL SAW");
      csv.push("Posición,Participante,Puntaje bruto,Puntaje de SAW,Total de correctas");

      for (const p of topsis.ranking) {

        // Sumar correctas de todas las categorías
        const totalCorrectas = Object.values(p.category_performance)
          .reduce((sum, cat) => sum + cat.correct, 0);

        csv.push([
          p.topsis_rank,
          `"${p.nickname}"`,
          p.raw_score,
          p.topsis_score,
          totalCorrectas
        ].join(","));
      }

      csv.push("");

        // =============================
        // 🧩 Ranking detallado por categoría
        // =============================
        csv.push("RANKING POR CATEGORÍA (SAW )");
        csv.push("Posición,Participante,Categoría,Puntaje de categoría,Peso de categoría,Preguntas Correctas,Total de Preguntas");

        for (const p of topsis.ranking) {
          const categories = Object.entries(p.category_performance);

          for (const [categoria, cat] of categories) {
            csv.push([
              p.topsis_rank,
              `"${p.nickname}"`,
              `"${categoria}"`,
              cat.score,
              cat.weight,
              cat.correct,
              cat.total
            ].join(","));
          }
        }

        csv.push("");
    }

    // =============================
    //  ❓ 4. Analytics por pregunta
    // =============================
    csv.push("ANALITICAS POR PREGUNTA");

    csv.push([
      "Numero de pregunta",
      "Texto de pregunta",
      "Respuestas correctas",
      "Respuestas incorrectas",
      "Sin respuesta",
      "Tasa de aciertos",
      "Tiempo promedio de respuesta (ms)"
    ].join(","));

    for (const q of analytics.question_analytics) {
      csv.push([
        q.order_index,
        `"${q.question_text.replace(/"/g, '""')}"`,
        q.correct_count,
        q.incorrect_count,
        q.no_response_count,
        q.accuracy_rate,
        q.avg_response_time_ms
      ].join(","));
    }

    csv.push("");

    // =============================
    //  📥  Descargar archivo
    // =============================
    const BOM = "\ufeff"; // ← BOM UTF-8 requerido para Excel

    const blob = new Blob(
      [BOM + csv.join("\n")], // ← prepend BOM
      { type: "text/csv;charset=utf-8;" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `Analíticas_${analytics.session_info.quiz_title}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

}