import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ScenarioWizardComponent } from './components/scenario-wizard/scenario-wizard.component';
import { ScenarioService } from './services/scenario.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ScenarioWizardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'sistema-nutricional';
  scenarioActive = false;
  firstPendingScenarioTitle: string | null = null;

  constructor(private scenarioService: ScenarioService) {}

  ngOnInit() {
    this.scenarioService.scenarioStates$.subscribe(states => {
      const scenarios = this.scenarioService.getScenarios();
      const pending = scenarios.find(s => states[s.id] === 'idle' || states[s.id] === undefined);
      this.firstPendingScenarioTitle = pending
        ? `${pending.recommendedOrder}.º ${pending.title}`
        : null;
    });
  }

  onScenarioChange(active: boolean) {
    this.scenarioActive = active;
  }
}
