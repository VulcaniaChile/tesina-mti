import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ScenarioWizardComponent } from './components/scenario-wizard/scenario-wizard.component';
import { ScenarioService, ScenarioDefinition } from './services/scenario.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ScenarioWizardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'sistema-nutricional';
  scenarioActive = false;
  showStartModal = false;
  nextScenario: ScenarioDefinition | null = null;
  private pendingStart = false;
  private experimentSub: Subscription | null = null;

  constructor(private scenarioService: ScenarioService, private router: Router) {}

  ngOnInit(): void {
    this.experimentSub = this.scenarioService.experimentStarted$.subscribe(() => {
      if (this.pendingStart) {
        this.pendingStart = false;
        this.onReadyForNext();
      }
    });
  }

  ngOnDestroy(): void {
    this.experimentSub?.unsubscribe();
  }

  onScenarioChange(active: boolean): void {
    this.scenarioActive = active;
  }

  onReadyForNext(): void {
    const experimentStarted = localStorage.getItem('experiment_modal_seen') === 'true';
    if (!experimentStarted) {
      this.pendingStart = true;
      return;
    }
    this.nextScenario = this.scenarioService.getNextScenario();
    if (this.nextScenario) {
      this.showStartModal = true;
    } else {
      this.showStartModal = false;
      this.router.navigate(['/analisis']);
    }
  }

  startNext(): void {
    if (!this.nextScenario) { return; }
    this.scenarioService.startScenario(this.nextScenario.id);
    this.showStartModal = false;
  }

  dismissStartModal(): void {
    this.showStartModal = false;
  }

  getEstimatedTime(scenario: ScenarioDefinition): number {
    return scenario.visits.reduce((sum, v) => sum + v.targetMinutes, 0);
  }
}
