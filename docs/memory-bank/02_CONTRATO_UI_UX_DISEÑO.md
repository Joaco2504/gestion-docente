# 02. Contrato de Diseño UI/UX y Estilo — Korum 2.0

Este documento define las reglas visuales, estándares de diseño y ergonomía que deben cumplirse en **todas las pantallas, modales y componentes**.

---

## 1. Identidad de Marca y Sistema de Color

- **Marca Oficial:** **Korum 2.0** (Plataforma Académica Integral).
- **Regla Estricta:** Queda terminantemente prohibido cualquier rastro, texto, logo o mención heredada de *"PlanillaDocente"*.
- **Paleta de Colores:**
  - **Primario / Acción:** Esmeralda Dinámico (`#10B981` / `rgb(16, 185, 129)` / `emerald-600` en claro, `emerald-500` en oscuro).
  - **Fondo / Superficie:** Slate Porcelana (`#F8FAFC` en claro) y Slate Grafito Profundo (`#0F172A` / `#020617` en oscuro).
  - **Acentos Funcionales:**
    - Éxito / Presente: Esmeralda (`#10B981`)
    - Alerta / Riesgo Medio / Justificado: Ámbar (`#F59E0B`)
    - Crítico / Ausente / Libre: Rosa/Rojo (`#E11D48` / `#EF4444`)
    - Feriado / Festivo: Celeste / Azul Cielo (`#0EA5E9`)
    - Licencia Docente: Púrpura / Violeta (`#8B5CF6`)

---

## 2. Soporte Dual Obligatorio (Modo Claro & Modo Oscuro)

- **Todo componente, pantalla, modal y tabla** debe estar probado y optimizado para **Modo Claro** y **Modo Oscuro**.
- Clases obligatorias de contraste: `bg-white dark:bg-slate-900`, `text-slate-900 dark:text-slate-100`, `border-slate-200 dark:border-slate-800`.
- Modales especiales como `SupportHubModal`, `LicenciasDocenteModal`, `QADiagnosticModal` y la pantalla de `Login` deben contar con contraste legible sin fondos transparentes ilegibles.

---

## 3. Ergonomía Táctil y Mobile-First (Phone 360px–430px & Tablet 768px–1024px)

1. **Touch Targets Seguros:**
   - Todo botón, enlace o elemento interactivo táctil en celulares debe tener un área mínima de contacto de **$44\times 44\text{px}$** (o al menos $42\text{px}$ de altura útil).
2. **Higiene en Botones:**
   - Prohibido el doble símbolo `+ +`. Si un botón utiliza el ícono `<Plus />`, el texto debe ser `"Nueva Cátedra"`, `"Nuevo Alumno"`, etc. (nunca `"+ Nueva Cátedra"`).
3. **Contención Universal de Modales (`Modal.jsx`):**
   - Diálogos contenidos en `w-[95vw] sm:w-[90vw] max-h-[88dvh] overflow-hidden rounded-2xl sm:rounded-3xl`.
   - Cabecera fija con botón `[x]` táctil de $40\times 40\text{px}$.
   - Cuerpo interno desplazable con `flex-1 overflow-y-auto overscroll-contain min-w-0`.
4. **Header Desktop vs Mobile (`Navbar.jsx`):**
   - En **PC ($\ge 1024\text{px}$)**: Layout `flex items-center justify-between` en 3 bloques independientes (Logo + selector cátedra truncado a la izquierda, barra central estilizada sin `absolute`, herramientas a la derecha).
   - En **Phone (< 640px)**: Selector de cátedra con `max-w-[130px] xs:max-w-[160px] truncate text-xs`, barra de búsqueda compacta con botón ícono `<Search className="w-4 h-4" />` y avatar compacto.
5. **Navegación Inferior Móvil (`BottomNav.jsx`):**
   - Fija en la base con `z-40 lg:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800`.
   - Altura mínima táctil $\ge 48\text{px}$ y padding respetando `env(safe-area-inset-bottom)`.
   - `<main>` con padding inferior `pb-28 lg:pb-12` para que nunca tape botones ni formularios.
6. **Portal Estudiantil ("Mi espacio académico"):**
   - Privacidad por defecto: DNI enmascarado (`42.***.302`).
   - Tarjetas de condición claras (`REGULAR`, `PROMOCIONAL`, `LIBRE`) con explicación pedagógica sin recortes en móvil.
