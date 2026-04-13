import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../services/data.service';
import { VersionService } from '../services/version.service';
import { WorkflowService } from '../services/workflow.service';
import { ScenarioService, ScenarioRunSummary } from '../services/scenario.service';
import { Paciente, RegistroNutricional, FlujoAsignado } from '../models/nutricion.models';

interface PairGroup {
  id: string;
  label: string;
  s1id: string;
  s2id: string;
  s1: ScenarioRunSummary | null;
  s2: ScenarioRunSummary | null;
  delta: { tiempo: number; clicks: number; facilidad: number } | null;
}

@Component({
  selector: 'app-analisis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analisis.component.html',
  styleUrl: './analisis.component.scss'
})
export class AnalisisComponent implements OnInit {
  isAIEnabled = false;
  pacientes: Paciente[] = [];
  registros: RegistroNutricional[] = [];
  flujosAsignados: FlujoAsignado[] = [];
  scenarioSummaries: ScenarioRunSummary[] = [];
  pairGroups: PairGroup[] = [];

  estadisticas = {
    totalPacientes: 0,
    pacientesActivos: 0,
    totalConsultas: 0,
    consultasConIA: 0,
    consultasSinIA: 0,
    promedioIMC: 0
  };
  metricasFlujo = {
    sinIA: { total: 0, tiempoPromedio: 0, facilidadPromedio: 0, interaccionesPromedio: 0, manualesPromedio: 0 },
    conIA: { total: 0, tiempoPromedio: 0, facilidadPromedio: 0, interaccionesPromedio: 0, manualesPromedio: 0 },
    deltaTiempo: 0,
    deltaFacilidad: 0,
    deltaInteracciones: 0,
    deltaManuales: 0
  };

  constructor(
    private dataService: DataService,
    private versionService: VersionService,
    private workflowService: WorkflowService,
    private scenarioService: ScenarioService
  ) {}

  ngOnInit() {
    this.versionService.version$.subscribe(version => {
      this.isAIEnabled = this.versionService.isAIEnabled();
    });

    this.dataService.pacientes$.subscribe(pacientes => {
      this.pacientes = pacientes;
      this.calcularEstadisticas();
    });

    this.dataService.registros$.subscribe(registros => {
      this.registros = registros;
      this.calcularEstadisticas();
    });

    this.workflowService.asignaciones$.subscribe(asignaciones => {
      this.flujosAsignados = asignaciones;
      this.calcularMetricasFlujo();
    });

    this.scenarioService.scenarioSummaries$.subscribe(records => {
      this.scenarioSummaries = Object.values(records).filter((s): s is ScenarioRunSummary => !!s);
      this.buildPairGroups();
    });
  }

  get studyComplete(): boolean {
    return this.pairGroups.every(g => g.s1 && g.s2);
  }

  get completedCount(): number {
    return this.scenarioSummaries.length;
  }

  private buildPairGroups(): void {
    const scenarios = this.scenarioService.getScenarios();
    const getSummary = (id: string) => this.scenarioSummaries.find(s => s.scenarioId === id) ?? null;

    const makePair = (s1id: string, s2id: string): PairGroup => {
      const s1 = getSummary(s1id);
      const s2 = getSummary(s2id);
      const label = scenarios.find(s => s.id === s1id)?.patientName ?? s1id;
      let delta: PairGroup['delta'] = null;
      if (s1 && s2) {
        delta = {
          tiempo: (s1.tiempoTotalMin ?? 0) - (s2.tiempoTotalMin ?? 0),
          clicks: (s1.interaccionesTotal ?? 0) - (s2.interaccionesTotal ?? 0),
          facilidad: (s2.facilidadPromedio ?? 0) - (s1.facilidadPromedio ?? 0)
        };
      }
      return { id: s1id.charAt(0), label, s1id, s2id, s1, s2, delta };
    };

    this.pairGroups = [
      makePair('A1', 'A2'),
      makePair('B1', 'B2')
    ];
  }

  calcularEstadisticas() {
    this.estadisticas = {
      totalPacientes: this.pacientes.length,
      pacientesActivos: this.pacientes.filter(p => p.activo).length,
      totalConsultas: this.registros.length,
      consultasConIA: this.registros.filter(r => r.createdWith === 'con-ia').length,
      consultasSinIA: this.registros.filter(r => r.createdWith === 'sin-ia').length,
      promedioIMC: this.registros.length > 0 
        ? this.registros.reduce((sum, r) => sum + (r.peso / ((r.altura/100) * (r.altura/100))), 0) / this.registros.length
        : 0
    };
  }

  getObjetivosMasComunes() {
    const objetivos = this.registros.map(r => r.objetivo);
    const contador = objetivos.reduce((acc, obj) => {
      acc[obj] = (acc[obj] || 0) + 1;
      return acc;
    }, {} as any);
    
    return Object.entries(contador)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3);
  }

  getPacientesMasActivos() {
    const pacientesConConsultas = this.pacientes.map(p => ({
      ...p,
      totalConsultas: this.registros.filter(r => r.pacienteId === p.id).length
    })).filter(p => p.totalConsultas > 0)
      .sort((a, b) => b.totalConsultas - a.totalConsultas)
      .slice(0, 5);
    
    return pacientesConConsultas;
  }

  getNombreFlujo(flujoId: string): string {
    return this.workflowService.getFlujoById(flujoId)?.nombre ?? flujoId;
  }

  private calcularMetricasFlujo() {
    const completados = this.flujosAsignados.filter(f => f.estado === 'completado' && f.resultado);

    const construirMetricas = (modo: 'sin-ia' | 'con-ia') => {
      const subset = completados.filter(f => f.modoEjecutado === modo);
      const total = subset.length;
      const tiempoPromedio = total > 0
        ? subset.reduce((sum, f) => sum + (f.resultado?.tiempoTotalMin || 0), 0) / total
        : 0;
      const facilidadPromedio = total > 0
        ? subset.reduce((sum, f) => sum + (f.resultado?.facilidadPromedio || 0), 0) / total
        : 0;
      const interaccionesPromedio = total > 0
        ? subset.reduce((sum, f) => sum + (f.resultado?.interaccionesTotal || 0), 0) / total
        : 0;
      const manualesPromedio = total > 0
        ? subset.reduce((sum, f) => sum + (f.resultado?.camposManualesTotal || 0), 0) / total
        : 0;
      return { total, tiempoPromedio, facilidadPromedio, interaccionesPromedio, manualesPromedio };
    };

    const sinIA = construirMetricas('sin-ia');
    const conIA = construirMetricas('con-ia');
    const deltaTiempo = sinIA.total > 0 && conIA.total > 0
      ? sinIA.tiempoPromedio - conIA.tiempoPromedio
      : 0;
    const deltaFacilidad = sinIA.total > 0 && conIA.total > 0
      ? conIA.facilidadPromedio - sinIA.facilidadPromedio
      : 0;
    const deltaInteracciones = sinIA.total > 0 && conIA.total > 0
      ? sinIA.interaccionesPromedio - conIA.interaccionesPromedio
      : 0;
    const deltaManuales = sinIA.total > 0 && conIA.total > 0
      ? sinIA.manualesPromedio - conIA.manualesPromedio
      : 0;

    this.metricasFlujo = {
      sinIA,
      conIA,
      deltaTiempo,
      deltaFacilidad,
      deltaInteracciones,
      deltaManuales
    };
  }
}

