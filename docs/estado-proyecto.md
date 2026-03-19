# Estado del Proyecto – Marzo 2026

## Contexto General
- Aplicación Angular 19 enfocada en comparar flujos manuales vs asistidos por IA para la atención nutricional. El arranque local se documenta en [README.md](README.md) y se ejecuta con `ng serve`.
- El enrutamiento expone secciones enfocadas (Inicio, Pacientes, Flujos, Evaluación, Análisis, Seguimiento y Contacto) según [src/app/app.routes.ts](src/app/app.routes.ts).
- Todo el prototipo funciona 100% en el front: los datos viven en `localStorage`, con servicios que simulan persistencia para validar la experiencia completa sin backend.

## Capacidades Implementadas
- **Gestión de datos y cohortes de validación**: [src/app/services/data.service.ts](src/app/services/data.service.ts) siembra pacientes, registros, seguimientos y pautas diferenciando casos manuales (`pac_manual`) y asistidos (`pac_ia`). Expone `BehaviorSubject`s para reaccionar en tiempo real y permite reinicializar el dataset para pruebas repetibles.
- **Catálogo de flujos operativos**: [src/app/services/workflow.service.ts](src/app/services/workflow.service.ts) mantiene plantillas (`FlujoTrabajo`) para los modos "Protocolo Manual" y "Protocolo Asistido". Soporta duplicar, asignar y registrar la ejecución paso a paso, almacenando tiempos, facilidad percibida y campos autocompletados para los KPIs de la tesina.
- **Scenario Wizard**: El panel lateral descrito en [src/app/components/scenario-wizard/scenario-wizard.component.ts](src/app/components/scenario-wizard/scenario-wizard.component.ts) y orquestado por [src/app/services/scenario.service.ts](src/app/services/scenario.service.ts) guía cuatro escenarios (A1/A2/B1/B2). Reinicia datos, bloquea escenarios paralelos y navega automáticamente al módulo correspondiente de cada visita.
- **Resumen post-escenario**: cada flujo completado ya persiste un `ScenarioRunSummary` (tiempo total, facilidad, campos autocompletados vs manuales y pasos cerrados). El wizard renderiza estas métricas en tarjetas dentro de [src/app/components/scenario-wizard/scenario-wizard.component.html](src/app/components/scenario-wizard/scenario-wizard.component.html) para que la comparación manual vs IA quede visible sin salir del frontend.
- **Evaluación antropométrica y pauta diaria**: [src/app/evaluacion/evaluacion.component.ts](src/app/evaluacion/evaluacion.component.ts) calcula TMB vía Harris-Benedict, distribuye macros por tiempo de comida, arma planes diarios arrastrando porciones y registra la pauta en el servicio de datos. El modo IA agrega recomendaciones automáticas y registro de ahorro operativo.
- **Sugerencias de menú real**: [src/app/services/meal-catalog.service.ts](src/app/services/meal-catalog.service.ts) consume el catálogo de 66 platos (`src/app/data/meal-recipes.json`) y puntúa coincidencias vs macros objetivo. La UI de Evaluación muestra hasta tres sugerencias por tiempo con totales comparativos.
- **Documentación funcional existente**: [docs/flujo-validacion.md](docs/flujo-validacion.md) detalla el plan de pruebas cruzadas y [docs/menu-system.md](docs/menu-system.md) describe el módulo de menús reales, sirviendo como referencia previa para diseño y desarrollo.

## Estado de Datos e Instrumentación
- Todos los servicios guardan en `localStorage`, incluido el historial de escenarios y logs de workflow. `DataService.resetToSeedData()` permite mantener condiciones iniciales consistentes antes de medir cada escenario.
- `WorkflowService` registra métricas de cada paso (tiempo, facilidad, campos autocompletados vs manuales) y calcula promedios por flujo para comparar `sin-ia` vs `con-ia`.
- `ScenarioService` sincroniza visitas completadas con la ejecución real y persiste el estado actual para reanudar escenarios después de un refresh.

## Riesgos y Brechas Conocidas
- No existe backend; cualquier limpieza del navegador borra toda la evidencia. La extracción de resultados requiere exportes manuales desde DevTools o futuras vistas en el dashboard de Análisis.
- No hay pruebas automatizadas ni verificación de regresiones pese al uso intensivo de lógica en servicios. Tampoco se incluye documentación de arquitecturas o diagramas que resuman dependencias.
- Las pantallas Análisis, Seguimiento y Contacto tienen cobertura limitada en esta fase; varias métricas descritas en [docs/flujo-validacion.md](docs/flujo-validacion.md) todavía no se renderizan en UI.
- Falta consolidar un reporte final (PDF/HTML) o dashboards auto-generados que comparen deltas entre escenarios.

## Próximos Pasos Recomendados
1. Persistencia real (REST o Supabase) para conservar ejecuciones y métricas entre sesiones.
2. Visualizaciones en la vista de Análisis que consuman `WorkflowService.getResumenPorModo()` y muestren delta de tiempo/facilidad.
3. Pruebas unitarias básicas para servicios críticos (`DataService`, `WorkflowService`, `ScenarioService`) y pruebas de integración sobre el flujo A/B.
4. Exportadores (CSV/PDF) de resultados por escenario para documentación de la tesina.
5. Documentar arquitectura y dependencias (diagrama alto nivel + secuencia del Scenario Wizard) para complementar este estado del proyecto.
