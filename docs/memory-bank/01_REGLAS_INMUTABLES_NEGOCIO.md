# 01. Reglas Inmutables de Negocio — Korum 2.0

Este documento contiene las reglas de dominio pedagógico y normativo que **NUNCA DEBEN MODIFICARSE NI ROMPERSE** bajo ninguna circunstancia. Cualquier cambio en el código debe verificar el estricto cumplimiento de estos preceptos.

---

## 1. Normativa RAM Catamarca (Régimen Académico Marco)

- **Condición Regular:** Requiere un mínimo del **70% de asistencia** a clases dictadas.
- **Régimen Especial Laboral / Familiar:** Aquellos estudiantes con `tiene_certificado_trabajo = true` (o certificado de familiar a cargo acreditado) tienen un umbral adaptativo reducido al **60% de asistencia**.
- **Alumnos por Equivalencia (`condicion === 'EQUIVALENCIA'` o `es_equivalencia = true`):**
  - Quedan formalmente **excluidos del cómputo de inasistencias**. No se les computan ausencias ni perjudican el promedio de la cátedra.
- **Higiene de Cálculos Numéricos:**
  - Los estados académicos `N/E` (No Evaluado), `Aus.` (Ausente) o alumnos sin notas cargadas **jamás deben generar `NaN` o `undefined%`** en promedios, porcentajes de asistencia ni sábanas de calificaciones. Se debe renderizar un guion legible (`-`) o `0%` controlado.

---

## 2. Decreto Acuerdo N° 1092/1979 (Régimen de Licencias Docentes)

- **Catálogo Centralizado Oficial:** [`src/utils/decreto1092Catalog.js`](file:///c:/Users/emili/Documents/docente/src/utils/decreto1092Catalog.js).
- **Tipos de Licencias:**
  1. **Con Tope Anual / Mensual:** Artículos como Art. 48° inc. a (Enfermedad común, hasta 30 días corridos), Art. 48° inc. b (Familiar enfermo, hasta 20 días continuos o discontinuos por año), Art. 50° inc. c (Razones particulares, hasta 6 días al año y máximo 2 por mes calendario).
  2. **Por Evento:** Artículos con cantidad fija por suceso (ej. Matrimonio 10 días, Nacimiento 3 días, Duelo 2 a 5 días según parentesco, Mesa de Examen).
  3. **Sin Límite / Extraordinarias:** Art. 48° inc. d (Enfermedad largo tratamiento), Art. 50° inc. f (Gremial/Política).
- **Tipos de Cómputo:**
  - `CORRIDOS`: Computa días consecutivos (incluyendo fines de semana y feriados dentro del intervalo).
  - `HABILES`: Computa únicamente días laborales (lunes a viernes que no sean feriados oficiales ni institucionales).
- **Exclusión en Edición:** Al editar una licencia ya registrada (`updateLicencia`), los días de esa misma licencia deben excluirse del cómputo de cupos consumidos para permitir reasignar o modificar la fecha sin falsos bloqueos de saldo.

---

## 3. Regla de Oro de Licencias, Días de Cursada y Feriados

1. **Impacto Estricto solo en Días Reales de Cursada:**
   - Una licencia docente (incluso si abarca del 10 al 15 de octubre) **SOLO** justifica inasistencias docentes en los días de la semana en que cada cátedra efectivamente tiene clases programadas (`dias_clase` / `horarios`).
   - Está terminantemente prohibido autogenerar clases en días en los que la cátedra no se dicta (ej. martes, miércoles, sábados o domingos si la cátedra es solo lunes).
2. **Prioridad Absoluta de Feriados Oficiales:**
   - Si una fecha coincide con un **Feriado Oficial Nacional o Provincial** (catálogo `FERIADOS_OFICIALES_2026`, por ejemplo el lunes 12/10/2026 "Día del Respeto a la Diversidad Cultural"):
     - El día es **FERIADO**.
     - No se solicita tomar asistencia ni asentar tema.
     - Tiene precedencia sobre la licencia docente: no genera doble justificación ni se computa como día hábil de clase.
3. **Unicidad Visual en el Calendario:**
   - En `CalendarPage.jsx`, cada licencia registrada se muestra como **UNA SOLA tarjeta consolidada** en la agenda y cronograma, identificada con el nombre oficial legible del artículo (ej. *"Art. 48° inc. b - Atención Familiar"*), **NUNCA** el código interno tipo `ART_48_B`, y **NUNCA** repetida por cada cátedra alcanzada.

---

## 4. Régimen de Evaluación Terciaria y Recuperatorio Diferenciado

1. **Columna Única de Recuperatorio con Configuración Individual por Alumno:**
   - En la sábana de notas existe una única columna general de Recuperatorio.
   - Cada alumno rinde de forma diferenciada los parciales que adeuda (no todos recuperan los mismos parciales).
   - Se persiste en la columna `notas.detalle_recuperatorio` (JSONB) con fallback en `observaciones`.
2. **Límites de Parciales Recuperables según Régimen:**
   - **Cuatrimestral (`modalidad === 'CUATRIMESTRAL'`):** Máximo **1 parcial** recuperable. Desaprobar 2 o más parciales en 1ra instancia $\rightarrow$ automáticamente **`LIBRE`** (excede límite de recuperación).
   - **Anual (`modalidad === 'ANUAL'`):** Máximo **2 parciales** recuperables. Desaprobar 3 o más parciales en 1ra instancia $\rightarrow$ automáticamente **`LIBRE`**.
3. **Reemplazo Efectivo de Notas & Trazabilidad Visual:**
   - Si la nota obtenida en el recuperatorio es aprobada ($\ge 4$), reemplaza la nota del parcial original a los efectos del cálculo del promedio y de la condición final.
   - En la celda del parcial original se exhibe la trazabilidad: `~nota_original~ ➔ nota_recuperada (R)` con tooltip informativo.
   - Desaprobar el recuperatorio (< 4 o Ausente) $\rightarrow$ automáticamente **`LIBRE`**.
4. **Condición Académica & Promoción Indirecta:**
   - **`PROMOCIONAL` (Badge `PROM. DIR`):** 0 parciales recuperados + notas $\ge 7$ + asistencia $\ge 80\%$.
   - **`PROMOCION_INDIRECTA` (Badge `PROM. IND`):** Exactamente 1 parcial recuperado con nota $\ge 7$ + notas finales $\ge 7$ + asistencia $\ge 80\%$. Si el estudiante recuperó 2 parciales (en materias anuales), su techo reglamentario máximo es **`REGULAR`**.
   - **`REGULAR` (Badge `REG`):** Parciales aprobados $\ge 4$ (en 1ra instancia o recuperados).
   - **`LIBRE` (Badge `LIB`):** Excede cupo de recuperatorios, desaprueba recuperatorio o no alcanza asistencia mínima.

