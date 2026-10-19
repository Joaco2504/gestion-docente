# Product Context — Korum

## Usuarios del Sistema
- **Docentes Titulares / Adjuntos / JTP:** Administran sus cátedras, toman asistencia, completan el Libro de Temas, cargan notas de parciales/TPs y registran licencias docentes.
- **Estudiantes:** Consultan su estado académico en el portal `/consulta` ("Mi espacio académico") ingresando su DNI o legajo.
- **SuperAdmin:** Gestiona usuarios docentes, planes, métricas globales y auditoría de plataforma.

## Reglas de Negocio Críticas
1. **Prioridad de Estado de Clase:** `Feriado Oficial / Institucional` > `Licencia Docente` > `Sin Clase / Suspendida` > `Clase Normal`.
2. **Autogeneración Estricta de Clases:** Solo se crean registros automáticos en fechas cuyo día de la semana coincide con `dias_clase` / `horarios` de la cátedra.
3. **Cómputo de Licencias (Decreto 1092):** Soporta días `CORRIDOS` y `HABILES` (excluyendo sábados, domingos y feriados oficiales del catálogo `FERIADOS_OFICIALES_2026`).
