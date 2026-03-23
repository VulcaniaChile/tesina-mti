import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScenarioService, ScenarioDefinition, ScenarioId, ScenarioState, ScenarioRunSummary, ScenarioVisit } from '../../services/scenario.service';
import { filter, Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';

type VisitStatus = 'completed' | 'in-progress' | 'not-started';

@Component({
  selector: 'app-scenario-wizard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scenario-wizard.component.html',
  styleUrl: './scenario-wizard.component.scss'
})
export class ScenarioWizardComponent implements OnInit, OnDestroy {
  scenarios: ScenarioDefinition[] = [];
  scenarioStates: Record<string, ScenarioState> = {};
  currentScenario: ScenarioDefinition | null = null;
  visitId: string | null = null;
  completedVisits: string[] = [];
  loading = true;
  summaries: ScenarioRunSummary[] = [];
  showCompletionModal = false;
  completionSummary: ScenarioRunSummary | null = null;
  completionTwinSummary: ScenarioRunSummary | null = null;
  private summaryByScenarioId: Partial<Record<ScenarioId, ScenarioRunSummary>> = {};
  private pendingCompletedScenarioId: ScenarioId | null = null;
  private lastActiveScenarioId: ScenarioId | null = null;
  private lastCompletionSignature: string | null = null;
  private currentRouteModule = '';
  private lastVisitRoute: string | null = null;

  @Output() scenarioChange = new EventEmitter<boolean>();

  private subscriptions: Subscription[] = [];

  constructor(private scenarioService: ScenarioService, private router: Router) {}

  ngOnInit(): void {
    this.scenarios = this.scenarioService.getScenarios();
    this.currentRouteModule = this.getRouteModule(this.router.url);
    this.subscriptions.push(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(event => {
          this.currentRouteModule = this.getRouteModule(event.urlAfterRedirects || event.url);
        }),
      this.scenarioService.scenarioStates$.subscribe(states => {
        this.scenarioStates = states;
        this.tryOpenCompletionModal();
      }),
      this.scenarioService.activeProgress$.subscribe(progress => {
        if (!progress) {
          this.currentScenario = null;
          this.visitId = null;
          this.completedVisits = [];
          this.scenarioChange.emit(false);
          this.lastVisitRoute = null;

          if (this.lastActiveScenarioId && this.scenarioStates[this.lastActiveScenarioId] === 'completed') {
            this.pendingCompletedScenarioId = this.lastActiveScenarioId;
            this.tryOpenCompletionModal();
          }

          this.lastActiveScenarioId = null;
        } else {
          this.currentScenario = this.scenarioService.getScenario(progress.scenarioId);
          this.visitId = progress.visitId;
          this.completedVisits = progress.completedVisits;
          this.scenarioChange.emit(true);
          this.lastActiveScenarioId = progress.scenarioId;
          this.navigateToCurrentVisit();
        }
        this.loading = false;
      }),
      this.scenarioService.scenarioSummaries$.subscribe(records => {
        this.summaryByScenarioId = {};
        (Object.keys(records) as ScenarioId[]).forEach(id => {
          const summary = records[id];
          if (summary) {
            this.summaryByScenarioId[id] = summary;
          }
        });

        this.summaries = Object.values(records)
          .filter((summary): summary is ScenarioRunSummary => !!summary)
          .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime());

        this.tryOpenCompletionModal();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  get currentVisit() {
    if (!this.currentScenario) {
      return null;
    }

    const activeVisitId = this.getActiveVisitId();
    if (!activeVisitId) {
      return null;
    }

    return this.currentScenario.visits.find(v => v.id === activeVisitId) || null;
  }

  isVisitActive(visit: ScenarioVisit): boolean {
    return visit.id === this.getActiveVisitId();
  }

  getVisitStatus(visit: ScenarioVisit): VisitStatus {
    if (this.completedVisits.includes(visit.id)) {
      return 'completed';
    }

    if (this.isVisitActive(visit)) {
      return 'in-progress';
    }

    return 'not-started';
  }

  getVisitStatusLabel(visit: ScenarioVisit): string {
    const status = this.getVisitStatus(visit);
    if (status === 'completed') {
      return 'Completada';
    }
    if (status === 'in-progress') {
      return 'En curso';
    }
    return 'No empezada';
  }

  getVisitStatusIcon(visit: ScenarioVisit): string {
    const status = this.getVisitStatus(visit);
    if (status === 'completed') {
      return 'fas fa-check-circle';
    }
    if (status === 'in-progress') {
      return 'fas fa-play-circle';
    }
    return 'far fa-circle';
  }

  getCurrentPhaseTitle(): string {
    return this.currentVisit?.title || 'Flujo finalizado';
  }

  getCurrentPhaseStatusLabel(): string {
    if (!this.currentVisit) {
      return 'Completada';
    }
    return this.getVisitStatusLabel(this.currentVisit);
  }

  getCurrentPhaseStatusClass(): string {
    if (!this.currentVisit) {
      return 'status-completed';
    }
    return `status-${this.getVisitStatus(this.currentVisit)}`;
  }

  startScenario(id: string) {
    this.scenarioService.startScenario(id as any);
    const scenario = this.scenarioService.getScenario(id as any);
    const firstRoute = scenario.visits[0]?.route;
    this.navigateToRoute(firstRoute);
  }

  resetScenario(id: string) {
    this.scenarioService.resetScenario(id as any);
  }

  resetAll() {
    this.scenarioService.resetAllScenarios();
    this.closeCompletionModal();
  }

  isScenarioDisabled(id: string): boolean {
    if (!this.currentScenario) {
      return false;
    }
    return this.currentScenario.id !== id;
  }

  getStateClass(id: string): string {
    const state = this.scenarioStates[id];
    switch (state) {
      case 'completed':
        return 'state-completed';
      case 'in-progress':
        return 'state-active';
      default:
        return 'state-idle';
    }
  }

  private navigateToCurrentVisit(): void {
    const route = this.currentVisit?.route;
    this.navigateToRoute(route);
  }

  private navigateToRoute(route?: string): void {
    if (!route) {
      return;
    }
    if (this.lastVisitRoute === route) {
      return;
    }
    this.lastVisitRoute = route;
    this.router.navigate(['/', route]);
  }

  get hasSummaries(): boolean {
    return this.summaries.length > 0;
  }

  closeCompletionModal(): void {
    this.showCompletionModal = false;
  }

  get completionTwinLabel(): string {
    if (!this.completionTwinSummary) {
      return 'Escenario gemelo';
    }
    return this.completionTwinSummary.scenarioTitle;
  }

  get timeDeltaVsTwin(): number | null {
    if (!this.completionSummary || !this.completionTwinSummary) {
      return null;
    }

    if (typeof this.completionSummary.tiempoTotalMin !== 'number' || typeof this.completionTwinSummary.tiempoTotalMin !== 'number') {
      return null;
    }

    return this.completionTwinSummary.tiempoTotalMin - this.completionSummary.tiempoTotalMin;
  }

  get facilidadDeltaVsTwin(): number | null {
    if (!this.completionSummary || !this.completionTwinSummary) {
      return null;
    }

    if (typeof this.completionSummary.facilidadPromedio !== 'number' || typeof this.completionTwinSummary.facilidadPromedio !== 'number') {
      return null;
    }

    return this.completionSummary.facilidadPromedio - this.completionTwinSummary.facilidadPromedio;
  }

  get hasTwinComparison(): boolean {
    return !!this.completionSummary && !!this.completionTwinSummary;
  }

  private tryOpenCompletionModal(): void {
    if (!this.pendingCompletedScenarioId) {
      return;
    }

    const summary = this.summaryByScenarioId[this.pendingCompletedScenarioId];
    if (!summary) {
      return;
    }

    const signature = `${summary.scenarioId}|${summary.finishedAt}`;
    if (signature === this.lastCompletionSignature) {
      this.pendingCompletedScenarioId = null;
      return;
    }

    const twinId = this.getTwinScenarioId(summary.scenarioId);
    this.completionSummary = summary;
    this.completionTwinSummary = twinId ? this.summaryByScenarioId[twinId] || null : null;
    this.showCompletionModal = true;
    this.lastCompletionSignature = signature;
    this.pendingCompletedScenarioId = null;
  }

  private getTwinScenarioId(id: ScenarioId): ScenarioId | null {
    switch (id) {
      case 'A1':
        return 'A2';
      case 'A2':
        return 'A1';
      case 'B1':
        return 'B2';
      case 'B2':
        return 'B1';
      default:
        return null;
    }
  }

  private getRouteModule(url: string): string {
    const clean = (url || '').split('?')[0].replace(/^\//, '');
    return clean.split('/')[0] || '';
  }

  private getActiveVisitId(): string | null {
    if (!this.currentScenario) {
      return null;
    }

    const pendingSequential = this.currentScenario.visits.find(v => !this.completedVisits.includes(v.id));
    if (pendingSequential) {
      return pendingSequential.id;
    }

    if (this.currentScenario.visits.length > 0) {
      return this.currentScenario.visits[this.currentScenario.visits.length - 1].id;
    }

    if (this.visitId) {
      const visitById = this.currentScenario.visits.find(v => v.id === this.visitId);
      if (visitById && (!this.currentRouteModule || visitById.route === this.currentRouteModule)) {
        return visitById.id;
      }
    }

    const sameRouteVisits = this.currentScenario.visits.filter(v => v.route === this.currentRouteModule);
    if (sameRouteVisits.length > 0) {
      const pendingInRoute = sameRouteVisits.find(v => !this.completedVisits.includes(v.id));
      return (pendingInRoute || sameRouteVisits[sameRouteVisits.length - 1]).id;
    }

    return this.visitId;
  }
}
