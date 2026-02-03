# Plan de Validación de Flujos Nutricionales

## Objetivo general
Definir, guiar y medir dos flujos diferenciados (Sin IA y Con IA) dentro del sistema para validar su impacto mediante métricas cuantitativas y cualitativas.

## Escenario preconfigurado en el front (sin backend)
- **Paciente Manual (Lucía Pérez)**: cuenta con historial previo y tiene asignado el flujo "Protocolo Manual (Sin IA)" con los dos primeros pasos ya registrados para evidenciar tiempos mayores y ausencia de autocompletado.
- **Paciente Asistido (Diego Torres)**: llega sin historial y tiene asignado "Protocolo Asistido (Con IA)", donde los primeros pasos ya muestran tiempos reducidos y campos autocompletados por IA.
- **Mismo resultado esperado**: ambos flujos apuntan al mismo objetivo final (pauta mediterránea de 1800 kcal con menú sugerido). Esto permite comparar cuánto tarda cada modalidad en alcanzar el mismo entregable.
- Los datos se cargan desde `localStorage` mediante `DataService.createFakeData()` y los flujos se asignan automáticamente desde `WorkflowService.seedScenarioAssignments()`.

### Configuración previa del flujo
- La asignación del protocolo ahora se realiza desde la pantalla de Inicio mediante un asistente paso a paso.
- El wizard ahora solo solicita: paciente, protocolo (manual vs asistido) y etiqueta de iteración; el modo y el orden experimental se fijan automáticamente.
- Sin esta configuración ningún módulo (Evaluación, Seguimiento) permite registrar cálculos o seguimientos; muestran advertencias con enlace directo al wizard.
- Desde el listado de pacientes sólo se ofrece un acceso rápido que redirige al asistente; ya no se puede asignar el flujo ahí mismo, evitando inconsistencias.

### Cohorte experimental expandida (mínimo 8 iteraciones)
- Se añadieron seis pacientes demo adicionales (`pac_validacion_01` a `pac_validacion_06`) para acumular al menos 8 ejecuciones documentadas.
- Cada iteración se ejecuta como dos corridas consecutivas: primero el flujo manual (control) y luego el asistido con IA (validación), sin necesidad de configurar nada adicional.
- Sólo se registra `iteracionEtiqueta`; `ordenValidacion` se fuerza internamente al esquema `manual-ia` para mantener consistencia.

| Iteración | Control (Manual) | Validación (IA) | Notas |
| --- | --- | --- | --- |
| Caso guía | Lucía Pérez (`pac_manual`) | Diego Torres (`pac_ia`) | Pareja base de referencia |
| 01 | Camila Rojas (`pac_validacion_01`) | Javier Soto (`pac_validacion_02`) | Registro largo vs importación y menú autogenerado |
| 02 | Valentina Muñoz (`pac_validacion_03`) | Tomás Contreras (`pac_validacion_04`) | Comparar menor autocompletado con ahorro operativo |
| 03 | María José Silva (`pac_validacion_05`) | Felipe Araya (`pac_validacion_06`) | Enfoque en adherencia documentada vs confirmación profesional |

- Cada iteración incorpora los dos primeros pasos ya completados para que el panel Analítico pueda comparar tiempos iniciales reales.
- Se recomienda completar manualmente los pasos restantes y registrar la facilidad percibida inmediatamente después de cada actividad.

## 1. Plantillas de flujo prescrito
- **Modelo `FlujoTrabajo`**: lista ordenada de pasos, criterios de éxito, tiempo estimado y tipo de modo (sin IA vs con IA).
- **Catálogo de flujos**: pantalla para crear/editar plantillas (ej. "Protocolo Manual" y "Protocolo Asistido").
- **Asignación por paciente**: botón en Gestión de Pacientes para seleccionar la plantilla; guardar referencia en la ficha y registrar fecha/responsable.

## 2. Ejecución guiada por paso
- Panel lateral contextual que muestre el paso actual, checklist requerido y botones "Completar paso" / "Marcar incidencia".
- Registro automático de logs (`workflow-log.service.ts`) con timestamp, usuario, notas y modo.
- Validaciones específicas por modo:
  - **Sin IA**: campos obligatorios (recordatorio 24h, notas clínicas, decisiones manuales) y cálculo visible de fórmulas (TMB, calorías).
  - **Con IA**: acciones automatizadas (simular análisis, generar menú, proyectar resultados) y confirmaciones de aprobación del profesional.

## 3. Medición de resultados
- Nuevos campos en modelos (`confianzaIA`, `tiempoPaso`, `resultadoPaso`) para guardar KPIs.
- Captura automática de tiempo por paso (inicio/fin) y acciones manuales vs automatizadas.
- Recolección de datos finales en Seguimiento: peso objetivo, satisfacción paciente, adherencia, costos estimados.

### Instrumentación detallada
- **Logs de workflow**: `iniciarPaso(pacienteId, flujoId, pasoId, modo)` y `completarPaso(...)` guardan timestamps. Tiempo por paso se calcula como $t_{paso}=t_{fin}-t_{inicio}$.
- **Clasificación de acciones**: registrar si cada campo se completó manualmente o fue auto-rellenado por IA (`origenDato: 'manual' | 'ia'`).
- **Encuesta de facilidad**: al terminar un paso, popup con escala Likert 1-5 + comentario libre; se asocia al registro del paso.
- **Contador de clics/inputs**: opcionalmente guardar `interacciones` para medir esfuerzo operativo.

## 4. Panel de validación
- Dashboard en Análisis: comparación de indicadores Sin IA vs Con IA.
- Métricas sugeridas:
  - % de flujos completados con éxito por modo.
  - Tiempo promedio por paciente.
  - Delta de IMC/peso alcanzado respecto al objetivo ($\Delta = \frac{\text{Resultado Real} - \text{Resultado Esperado}}{\text{Resultado Esperado}} \times 100\%$).
  - Índice de satisfacción del paciente y del profesional.
- Exportación de informe (PDF/HTML) con resumen, conclusiones y recomendaciones.

## 5. Consideraciones de datos y UX
- Guardar todo en `localStorage` para prototipo, pero diseñar interfaces del servicio pensando en un backend futuro.
- Mantener recuerdos visuales (badges, timelines) que distingan claramente ambos modos.
- Añadir tooltips/contexto educativo para que la nutri entienda por qué se solicita cada dato.

## Ideas adicionales / siguientes sugerencias
1. **Consentimiento informado digital**: registrar que el paciente autoriza el uso de IA y almacenar la evidencia dentro del flujo.
2. **Versión experimental A/B**: permitir asignar aleatoriamente el flujo para generar evidencia sin sesgos.
3. **Alertas tempranas**: módulo que envíe notificaciones si un flujo con IA detecta riesgo (ej. baja adherencia) y compare con la detección manual.
4. **Benchmarking**: crear una sección donde se simule un conjunto mayor de pacientes y se comparen resultados agregados para reforzar la tesina.
5. **Trazabilidad documental**: generar automáticamente anexos (PDF) que describan los pasos ejecutados y quién los realizó, útil para la defensa del trabajo.

## 6. Simulación realista del modo IA
- **Ahorro operativo tangible**: cada paso con IA debe ofrecer botones que ejecuten acciones complejas en un clic (auto-rellenar datos históricos, generar menú, predecir progreso). El log guarda que fue asistencia IA.
- **Comparador de esfuerzo**: almacenar `camposAutocompletados`, `camposManuales` y `horasEstimadas` para mostrar la diferencia de carga laboral.
- **Validaciones explícitas**: tras una acción IA, solicitar confirmación del profesional para mantener trazabilidad.
- **Repetición del mismo flujo**: permitir asignar al mismo paciente dos flujos idénticos en distintas fechas (manual vs IA) y etiquetar `flujoReferencia` para comparar resultados sobre base común.
- **Resumen de delta**: calcular automáticamente $\Delta tiempo = t_{sin-ia}-t_{con-ia}$, $\Delta facilidad = score_{con-ia}-score_{sin-ia}$ y mostrarlos en el dashboard de validación.
