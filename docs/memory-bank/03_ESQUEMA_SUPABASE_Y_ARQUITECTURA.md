# 03. Esquema Supabase y Arquitectura Técnica — Korum 2.0

Este documento describe la estructura relacional real de la base de datos en Supabase, convenciones de nombres obligatorias y políticas de seguridad Row Level Security (RLS).

---

## 1. Nombres Reales de Tablas y Columnas

| Tabla | Columnas Clave | Regla de Oro / Restricciones |
|---|---|---|
| `catedras` | `id`, `docente_id`, `nombre`, `nivel` (`TERCIARIO`/`SECUNDARIO`), `anio`, `comision`, `dias_clase`, `horarios`, `institucion_id`, `ciclo_lectivo_id`, `cursada_finalizada` | `docente_id = auth.uid()` |
| `estudiantes` | `id`, `catedra_id`, `dni`, `nombre`, `apellido`, `email`, `telefono`, `condicion` (`REGULAR`/`EQUIVALENCIA`), `tiene_certificado_trabajo` (boolean), `es_equivalencia` (boolean) | La tabla es `estudiantes` (NO "alumnos"). La clave foránea es `estudiante_id`. |
| `clases` | `id`, `catedra_id`, `fecha` (YYYY-MM-DD), `numero_clase`, `tema`, `horas_catedra`, `caracter` (`TEORICA`, `PRACTICA`, etc.), `estado_clase` (`DICTADA`, `SUSPENDIDA`, `LICENCIA`, `FERIADO`), `licencia_id`, `observaciones` | Solo se insertan en fechas donde la cátedra tiene cursada real. |
| `asistencias` | `id`, `clase_id`, `estudiante_id`, `estado` (`PRESENTE`, `AUSENTE`, `JUSTIFICADO`, `TARDE`), `observacion` | **SIEMPRE `estudiante_id`** (jamás `alumno_id`). |
| `evaluaciones` | `id`, `catedra_id`, `titulo`, `tipo` (`PARCIAL`, `TP`, `RECUPERATORIO`, `FINAL`), `fecha`, `ponderacion`, `es_recuperatorio`, `evaluacion_origen_id` | Vinculada a `catedra_id`. |
| `notas` | `id`, `evaluacion_id`, `estudiante_id`, `valor` (numérico 1-10 o nulo para N/E), `observaciones` | Vinculada a `evaluacion_id` y `estudiante_id`. |
| `mesas_examen` | `id`, `catedra_id`, `fecha`, `turno_llamado`, `condicion_acta`, `presidente`, `vocal1`, `vocal2`, `libro`, `folio` | Control de actas volantes de examen final. |
| `actas_examen_estudiantes` | `id`, `mesa_id`, `estudiante_id`, `nota_escrito`, `nota_oral`, `nota_definitiva`, `resultado` (`APROBADO`, `DESAPROBADO`, `AUSENTE`) | La clave de vinculación con la mesa es **`mesa_id`**. |
| `licencias_docentes` | `id`, `docente_id`, `articulo`, `fecha_inicio`, `fecha_fin`, `cantidad_dias`, `tipo_computo` (`CORRIDOS`/`HABILES`), `aplica_todas_catedras` (boolean), `catedras_ids` (array text), `observacion`, `estado` | Administrada en `licenciasService.js`. |

---

## 2. Seguridad Row Level Security (RLS)

- **Aislamiento Multi-Docente Estricto:** Cada docente solo puede leer, insertar, modificar o eliminar registros vinculados a su cuenta mediante la condición SQL `auth.uid() = docente_id` o a través de sus cátedras asociadas (`catedra_id IN (SELECT id FROM catedras WHERE docente_id = auth.uid())`).
- **Portal Estudiantil (`/consulta`):** Las consultas se canalizan mediante RPC segura `consultar_estado_estudiante(p_dni, p_catedra_id)` o políticas `SELECT` restringidas que no exponen datos de otros alumnos ni credenciales docentes.
