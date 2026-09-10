---
name: excel-sheetjs-manager
description: Procesamiento en frontend de archivos Excel y CSV (.xlsx, .xls, .csv) con SheetJS/xlsx y exportación de reportes.
triggers:
  - importar excel
  - exportar planilla
  - xlsx
  - csv
---

# Excel & SheetJS Manager Skill

## Funcionalidades
1. **Importación de Alumnos**:
   - Leer archivos subidos vía drag-and-drop o selector de archivos en el teléfono.
   - Mapear automáticamente o con asistente visual las columnas: "Apellido", "Nombre", "DNI".
   - Validar duplicados y DNIs antes de insertar en Supabase en lote (*bulk insert*).
2. **Exportación de Sábanas de Calificaciones**:
   - Generar archivos `.xlsx` descargables con la matriz completa de notas (TPs, Parciales, Recuperatorios, % Asistencia y Condición Final).
