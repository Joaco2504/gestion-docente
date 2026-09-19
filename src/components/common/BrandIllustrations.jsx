import React from 'react';

/**
 * KorumIsotypeSvg - Isotipo oficial de Korum
 * Squircle de pizarra profunda (#0F172A) con glifo 'K' estilizado:
 * - Mástil vertical izquierdo en blanco puro (#FFFFFF)
 * - Brazo diagonal inferior en esmeralda (#10B981)
 * - Brazo diagonal superior en checkmark con gradiente esmeralda a menta (#10B981 a #34D399)
 */
export function KorumIsotypeSvg({ className = "w-8 h-8" }) {
  const gradId = React.useId();
  const shadowId = React.useId();

  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-label="Isotipo Korum"
      role="img"
    >
      <defs>
        {/* Gradiente esmeralda a menta para el brazo superior con checkmark */}
        <linearGradient id={`mintGrad-${gradId}`} x1="45" y1="52" x2="84" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        {/* Sombra sutil de profundidad para el glifo */}
        <filter id={`glyphShadow-${shadowId}`} x="0" y="0" width="100" height="100" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Squircle contenedor en pizarra profunda */}
      <rect 
        x="2" 
        y="2" 
        width="96" 
        height="96" 
        rx="27" 
        fill="#0F172A" 
        stroke="#1E293B" 
        strokeWidth="1.5" 
      />

      {/* Resplandor interno esmeralda tenue */}
      <circle cx="50" cy="50" r="38" fill="#10B981" fillOpacity="0.04" />

      {/* Glifo K */}
      <g filter={`url(#glyphShadow-${shadowId})`}>
        {/* Mástil vertical izquierdo blanco puro */}
        <rect 
          x="24" 
          y="22" 
          width="13" 
          height="56" 
          rx="6.5" 
          fill="#FFFFFF" 
        />

        {/* Brazo diagonal inferior esmeralda */}
        <path 
          d="M40 48.5C39.5 45.8 42 43.5 44.8 44.2L70.2 68.2C72.8 70.6 71.4 75 67.8 75H52.4C50.6 75 48.9 74.2 47.7 72.8L40 48.5Z" 
          fill="#10B981" 
        />

        {/* Brazo superior extendido emulando tilde de verificación (Checkmark Korum) */}
        <path 
          d="M37.5 50.8L51.2 38.6C52.8 37.2 55.2 37.3 56.6 38.9L77.4 20.6C79.8 18.5 83.5 20.3 83.3 23.5L78.6 31.4C77.8 32.7 76.5 33.7 75 34.1L54.6 57.8C52.7 60 49.3 59.9 47.5 57.6L37.5 50.8Z" 
          fill={`url(#mintGrad-${gradId})`} 
        />
      </g>
    </svg>
  );
}

/**
 * EmptyCatedrasSvg - Ilustración para estado vacío de cátedras
 * Trazo fino (1.5): libreta académica abierta o carpeta flotante, cuadrículas sutiles de hojas en gris pizarra
 * y un marcador o tilde esmeralda en primer plano.
 */
export function EmptyCatedrasSvg({ className = "w-40 h-40" }) {
  const uid = React.useId();

  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      role="img"
      aria-label="Sin cátedras registradas"
    >
      <defs>
        <linearGradient id={`gradEm-${uid}`} x1="70" y1="40" x2="150" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={`penGrad-${uid}`} x1="120" y1="45" x2="165" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Resplandor ambiental de fondo */}
      <circle cx="100" cy="100" r="70" fill={`url(#gradEm-${uid})`} />

      {/* Sombra de apoyo */}
      <ellipse cx="100" cy="168" rx="60" ry="8" fill="#0F172A" fillOpacity="0.08" />

      {/* Carpeta / Libreta Académica Abierta */}
      {/* Tapa posterior */}
      <path 
        d="M36 68C36 63.5817 39.5817 60 44 60H85L97 72H156C160.418 72 164 75.5817 164 80V148C164 152.418 160.418 156 156 156H44C39.5817 156 36 152.418 36 148V68Z" 
        fill="#1E293B" 
        stroke="#334155" 
        strokeWidth="1.5" 
        strokeLinejoin="round" 
      />

      {/* Hoja de papel interior (con cuadrícula sutil) */}
      <path 
        d="M48 76C48 72.6863 50.6863 70 54 70H146C149.314 70 152 72.6863 152 76V142H48V76Z" 
        fill="#0F172A" 
        stroke="#475569" 
        strokeWidth="1.5" 
        strokeDasharray="2 2" 
      />

      {/* Renglones / grilla de hoja de planificación */}
      <line x1="60" y1="86" x2="140" y2="86" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="60" y1="100" x2="140" y2="100" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="60" y1="114" x2="124" y2="114" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="60" y1="128" x2="108" y2="128" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />

      {/* Líneas verticales punteadas de cuadrícula */}
      <line x1="84" y1="80" x2="84" y2="134" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="112" y1="80" x2="112" y2="134" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />

      {/* Solapa frontal abierta con perspectiva */}
      <path 
        d="M32 94C32 90.6863 34.6863 88 38 88H82L96 100H162C165.314 100 168 102.686 168 106V148C168 153.523 163.523 158 158 158H42C36.4772 158 32 153.523 32 148V94Z" 
        fill="#0F172A" 
        stroke="#10B981" 
        strokeWidth="1.5" 
        strokeLinejoin="round" 
      />

      {/* Marcador flotante esmeralda */}
      <g transform="rotate(-24 135 60)">
        <rect x="126" y="32" width="14" height="46" rx="4" fill={`url(#penGrad-${uid})`} stroke="#10B981" strokeWidth="1.5" />
        <rect x="128" y="78" width="10" height="10" fill="#E2E8F0" />
        <polygon points="128,88 138,88 133,100" fill="#0F172A" stroke="#10B981" strokeWidth="1" />
        <rect x="123" y="38" width="3" height="22" rx="1.5" fill="#E2E8F0" />
      </g>

      {/* Tilde esmeralda de aprobación flotante */}
      <g filter="drop-shadow(0 2px 4px rgba(16, 185, 129, 0.4))">
        <circle cx="152" cy="136" r="16" fill="#10B981" />
        <path d="M145 136L150 141L159 131" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/**
 * EmptyAlumnosSvg - Ilustración para estado vacío de nómina de alumnos
 * Silueta esquemática de nómina/asistencia con líneas guía vacías, avatar sutil punteado
 * e ícono flotante de hoja de cálculo con destello esmeralda.
 */
export function EmptyAlumnosSvg({ className = "w-40 h-40" }) {
  const uid = React.useId();

  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      role="img"
      aria-label="Sin alumnos registrados"
    >
      <defs>
        <linearGradient id={`gradAl-${uid}`} x1="80" y1="30" x2="160" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={`sheetGrad-${uid}`} x1="130" y1="40" x2="175" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="70" fill={`url(#gradAl-${uid})`} />
      <ellipse cx="100" cy="168" rx="55" ry="7" fill="#0F172A" fillOpacity="0.08" />

      {/* Planilla de Nómina */}
      <rect 
        x="38" 
        y="42" 
        width="114" 
        height="120" 
        rx="12" 
        fill="#0F172A" 
        stroke="#334155" 
        strokeWidth="1.5" 
      />

      {/* Cabecera de la lista de asistencia */}
      <rect x="38" y="42" width="114" height="28" rx="12" fill="#1E293B" />
      <rect x="38" y="60" width="114" height="10" fill="#1E293B" />
      <circle cx="54" cy="56" r="4" fill="#10B981" />
      <line x1="66" y1="56" x2="108" y2="56" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <line x1="124" y1="56" x2="140" y2="56" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />

      {/* Renglón 1: Avatar punteado + Líneas Guía Vacías */}
      <g>
        <circle cx="54" cy="84" r="7" stroke="#64748B" strokeWidth="1.5" strokeDasharray="2 2" fill="none" />
        <line x1="70" y1="81" x2="114" y2="81" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="70" y1="87" x2="98" y2="87" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="124" y="78" width="16" height="12" rx="3" stroke="#334155" strokeWidth="1.2" strokeDasharray="2 2" fill="none" />
      </g>

      {/* Renglón 2 */}
      <g>
        <circle cx="54" cy="108" r="7" stroke="#64748B" strokeWidth="1.5" strokeDasharray="2 2" fill="none" />
        <line x1="70" y1="105" x2="120" y2="105" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="70" y1="111" x2="90" y2="111" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="124" y="102" width="16" height="12" rx="3" stroke="#334155" strokeWidth="1.2" strokeDasharray="2 2" fill="none" />
      </g>

      {/* Renglón 3 */}
      <g>
        <circle cx="54" cy="132" r="7" stroke="#64748B" strokeWidth="1.5" strokeDasharray="2 2" fill="none" />
        <line x1="70" y1="129" x2="106" y2="129" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="70" y1="135" x2="86" y2="135" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="124" y="126" width="16" height="12" rx="3" stroke="#334155" strokeWidth="1.2" strokeDasharray="2 2" fill="none" />
      </g>

      {/* Hoja de cálculo flotante con acento esmeralda */}
      <g filter="drop-shadow(0 4px 10px rgba(0,0,0,0.35))">
        <rect 
          x="128" 
          y="36" 
          width="46" 
          height="54" 
          rx="8" 
          fill={`url(#sheetGrad-${uid})`} 
          stroke="#10B981" 
          strokeWidth="1.5" 
        />
        <rect x="135" y="44" width="14" height="6" rx="2" fill="#10B981" />
        <rect x="153" y="44" width="14" height="6" rx="2" fill="#334155" />
        <rect x="135" y="54" width="14" height="6" rx="2" fill="#334155" />
        <rect x="153" y="54" width="14" height="6" rx="2" fill="#10B981" fillOpacity="0.4" />
        <rect x="135" y="64" width="14" height="6" rx="2" fill="#334155" />
        <rect x="153" y="64" width="14" height="6" rx="2" fill="#334155" />
        <rect x="135" y="74" width="32" height="6" rx="2" fill="#10B981" fillOpacity="0.2" />
        {/* Destello de brillo esmeralda */}
        <path d="M165 28L167 34L173 36L167 38L165 44L163 38L157 36L163 34L165 28Z" fill="#34D399" />
      </g>
    </svg>
  );
}

/**
 * EmptyMesasSvg - Ilustración para estado vacío de mesas examinadoras
 * Acta volante oficial con renglones tenues, birrete/medalla de examen en trazo fino
 * y un sello de certificación en verde esmeralda.
 */
export function EmptyMesasSvg({ className = "w-40 h-40" }) {
  const uid = React.useId();

  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      role="img"
      aria-label="Sin mesas de examen constituidas"
    >
      <defs>
        <linearGradient id={`gradMe-${uid}`} x1="70" y1="40" x2="160" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={`sealGrad-${uid}`} x1="130" y1="120" x2="170" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="70" fill={`url(#gradMe-${uid})`} />
      <ellipse cx="100" cy="168" rx="55" ry="7" fill="#0F172A" fillOpacity="0.08" />

      {/* Acta Volante Oficial de Examen */}
      <rect 
        x="42" 
        y="46" 
        width="116" 
        height="116" 
        rx="10" 
        fill="#0F172A" 
        stroke="#334155" 
        strokeWidth="1.5" 
      />

      {/* Encabezado del Acta Oficial */}
      <rect x="52" y="56" width="46" height="6" rx="2" fill="#64748B" />
      <rect x="104" y="56" width="42" height="6" rx="2" fill="#334155" />
      <line x1="52" y1="68" x2="148" y2="68" stroke="#1E293B" strokeWidth="1.5" />

      {/* Renglones tenues del Acta de Examen */}
      <line x1="52" y1="80" x2="132" y2="80" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="52" y1="92" x2="140" y2="92" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="52" y1="104" x2="120" y2="104" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="52" y1="116" x2="110" y2="116" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />

      {/* Firmas de vocales en el pie */}
      <line x1="54" y1="144" x2="80" y2="144" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="90" y1="144" x2="116" y2="144" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 2" />

      {/* Birrete académico en trazo fino (stroke 1.5) flotante */}
      <g transform="translate(112, 28)">
        <path 
          d="M32 6L60 16L32 26L4 16L32 6Z" 
          fill="#0F172A" 
          stroke="#10B981" 
          strokeWidth="1.5" 
          strokeLinejoin="round" 
        />
        <path 
          d="M16 21.5V30C16 34 23.1634 37 32 37C40.8366 37 48 34 48 30V21.5" 
          stroke="#34D399" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          fill="none" 
        />
        <path d="M32 16V28C32 30 30 31 30 34" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="30" cy="35" r="2" fill="#F59E0B" />
      </g>

      {/* Sello de certificación oficial en verde esmeralda */}
      <g filter="drop-shadow(0 3px 6px rgba(16, 185, 129, 0.45))">
        <circle cx="146" cy="136" r="18" fill={`url(#sealGrad-${uid})`} />
        <circle cx="146" cy="136" r="14" stroke="#FFFFFF" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
        <path d="M140 136L144 140L153 131" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/**
 * OnboardingStepIllustration - Ilustraciones asistidas vectoriales para el modal de Onboarding
 * @param {number} step - 1: Selector Bento niveles/cuatrimestres, 2: Indicador RAM 70/80, 3: Acta PDF con QR y DNI
 */
export function OnboardingStepIllustration({ step = 1, className = "w-full h-44" }) {
  const uid = React.useId();

  if (step === 1) {
    return (
      <svg 
        viewBox="0 0 340 160" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        role="img"
        aria-label="Organización de cátedras y ciclos"
      >
        <defs>
          <linearGradient id={`bento1-${uid}`} x1="10" y1="10" x2="160" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id={`bento2-${uid}`} x1="180" y1="10" x2="330" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#132338" />
          </linearGradient>
        </defs>

        {/* Tarjeta Bento 1: Niveles Educativos */}
        <rect x="12" y="16" width="148" height="128" rx="16" fill={`url(#bento1-${uid})`} stroke="#334155" strokeWidth="1.5" />
        <rect x="24" y="28" width="60" height="7" rx="3.5" fill="#64748B" />
        <rect x="24" y="40" width="100" height="5" rx="2.5" fill="#334155" />

        {/* Opciones de nivel */}
        <g>
          {/* Terciario Activo */}
          <rect x="24" y="56" width="124" height="22" rx="8" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="1.2" />
          <circle cx="36" cy="67" r="4" fill="#10B981" />
          <rect x="46" y="64" width="56" height="6" rx="3" fill="#E2E8F0" />
          <rect x="132" y="64" width="8" height="6" rx="2" fill="#10B981" />

          {/* Secundario */}
          <rect x="24" y="84" width="124" height="22" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1" />
          <circle cx="36" cy="95" r="4" fill="#64748B" />
          <rect x="46" y="92" width="64" height="6" rx="3" fill="#94A3B8" />

          {/* Universitario */}
          <rect x="24" y="112" width="124" height="22" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1" />
          <circle cx="36" cy="123" r="4" fill="#64748B" />
          <rect x="46" y="120" width="50" height="6" rx="3" fill="#94A3B8" />
        </g>

        {/* Tarjeta Bento 2: Régimen Cuatrimestral / Anual */}
        <rect x="176" y="16" width="152" height="128" rx="16" fill={`url(#bento2-${uid})`} stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.6" />
        <rect x="190" y="28" width="70" height="7" rx="3.5" fill="#34D399" />
        <rect x="190" y="40" width="90" height="5" rx="2.5" fill="#475569" />

        {/* Selector de División Académica */}
        <g>
          {/* 1° Cuatrimestre */}
          <rect x="190" y="56" width="58" height="42" rx="10" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeWidth="1.5" />
          <rect x="198" y="66" width="28" height="5" rx="2.5" fill="#E2E8F0" />
          <rect x="198" y="76" width="38" height="8" rx="3" fill="#10B981" />

          {/* 2° Cuatrimestre */}
          <rect x="256" y="56" width="58" height="42" rx="10" fill="#1E293B" stroke="#334155" strokeWidth="1" />
          <rect x="264" y="66" width="28" height="5" rx="2.5" fill="#64748B" />
          <rect x="264" y="76" width="38" height="8" rx="3" fill="#334155" />

          {/* Régimen Anual Completo Barra */}
          <rect x="190" y="106" width="124" height="24" rx="8" fill="#1E293B" stroke="#334155" strokeWidth="1" />
          <circle cx="202" cy="118" r="4" fill="#10B981" />
          <rect x="212" y="115" width="68" height="6" rx="3" fill="#94A3B8" />
          <path d="M302 118L296 114V122L302 118Z" fill="#10B981" />
        </g>
      </svg>
    );
  }

  if (step === 2) {
    return (
      <svg 
        viewBox="0 0 340 160" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        role="img"
        aria-label="Cálculo automático de porcentajes RAM"
      >
        <defs>
          <linearGradient id={`gaugePromo-${uid}`} x1="160" y1="20" x2="300" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id={`gaugeReg-${uid}`} x1="40" y1="20" x2="160" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
        </defs>

        {/* Panel Izquierdo: RAM 70% Regularidad */}
        <g>
          <rect x="20" y="18" width="140" height="124" rx="16" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />
          <rect x="34" y="30" width="60" height="6" rx="3" fill="#94A3B8" />
          <text x="34" y="52" fill="#F59E0B" fontSize="11" fontWeight="bold" fontFamily="sans-serif">REGULARIDAD</text>

          <circle cx="90" cy="95" r="32" stroke="#1E293B" strokeWidth="7" fill="none" />
          <circle 
            cx="90" 
            cy="95" 
            r="32" 
            stroke={`url(#gaugeReg-${uid})`} 
            strokeWidth="7" 
            fill="none" 
            strokeDasharray="201" 
            strokeDashoffset="60" 
            strokeLinecap="round" 
            transform="rotate(-90 90 95)" 
          />
          <text x="90" y="99" fill="#FFFFFF" fontSize="15" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">70%</text>
          <text x="90" y="112" fill="#94A3B8" fontSize="8" textAnchor="middle" fontFamily="sans-serif">Min. Asistencia</text>
        </g>

        {/* Panel Derecho: RAM 80% Promoción Directa */}
        <g>
          <rect x="180" y="18" width="140" height="124" rx="16" fill="#0F172A" stroke="#10B981" strokeWidth="1.5" />
          <rect x="194" y="30" width="60" height="6" rx="3" fill="#34D399" />
          <text x="194" y="52" fill="#10B981" fontSize="11" fontWeight="bold" fontFamily="sans-serif">PROMOCIÓN</text>

          <circle cx="250" cy="95" r="32" stroke="#1E293B" strokeWidth="7" fill="none" />
          <circle 
            cx="250" 
            cy="95" 
            r="32" 
            stroke={`url(#gaugePromo-${uid})`} 
            strokeWidth="7" 
            fill="none" 
            strokeDasharray="201" 
            strokeDashoffset="40" 
            strokeLinecap="round" 
            transform="rotate(-90 250 95)" 
          />
          <text x="250" y="99" fill="#FFFFFF" fontSize="15" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">80%</text>
          <text x="250" y="112" fill="#6EE7B7" fontSize="8" textAnchor="middle" fontFamily="sans-serif">Aprobación Directa</text>
        </g>
      </svg>
    );
  }

  // Paso 3: Acta oficial en PDF con QR y DNI
  return (
    <svg 
      viewBox="0 0 340 160" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      role="img"
      aria-label="Actas oficiales en PDF y consulta por DNI"
    >
      <defs>
        <linearGradient id={`pdfGrad-${uid}`} x1="60" y1="10" x2="200" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id={`qrGrad-${uid}`} x1="210" y1="30" x2="310" y2="130" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#162235" />
        </linearGradient>
      </defs>

      {/* Acta PDF */}
      <g filter="drop-shadow(0 4px 12px rgba(0,0,0,0.3))">
        <path 
          d="M48 20C48 15.5817 51.5817 12 56 12H150L178 40V140C178 144.418 174.418 148 170 148H56C51.5817 148 48 144.418 48 140V20Z" 
          fill={`url(#pdfGrad-${uid})`} 
          stroke="#334155" 
          strokeWidth="1.5" 
        />
        <path d="M150 12V36C150 38.2091 151.791 40 154 40H178" stroke="#10B981" strokeWidth="1.5" fill="#0F172A" />
        
        <rect x="60" y="24" width="30" height="12" rx="3" fill="#EF4444" fillOpacity="0.2" stroke="#EF4444" strokeWidth="1" />
        <text x="75" y="33" fill="#EF4444" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">PDF</text>
        
        <line x1="60" y1="48" x2="140" y2="48" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
        <line x1="60" y1="60" x2="162" y2="60" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="60" y1="72" x2="150" y2="72" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="60" y1="84" x2="162" y2="84" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="60" y1="96" x2="136" y2="96" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />

        <circle cx="146" cy="120" r="14" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="1.2" />
        <path d="M141 120L144 123L151 116" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Tarjeta de Consulta por DNI y Código QR */}
      <g>
        <rect x="194" y="22" width="124" height="118" rx="16" fill={`url(#qrGrad-${uid})`} stroke="#10B981" strokeWidth="1.5" />
        <text x="256" y="40" fill="#E2E8F0" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">CONSULTA DNI</text>

        <rect x="206" y="48" width="100" height="18" rx="5" fill="#0F172A" stroke="#334155" strokeWidth="1" />
        <text x="214" y="60" fill="#10B981" fontSize="9" fontFamily="monospace">DNI: 38.***.***</text>

        <g transform="translate(230, 72)">
          <rect x="0" y="0" width="52" height="52" rx="8" fill="#FFFFFF" />
          <rect x="6" y="6" width="14" height="14" rx="2" fill="#0F172A" />
          <rect x="9" y="9" width="8" height="8" rx="1" fill="#FFFFFF" />
          <rect x="11" y="11" width="4" height="4" fill="#10B981" />

          <rect x="32" y="6" width="14" height="14" rx="2" fill="#0F172A" />
          <rect x="35" y="9" width="8" height="8" rx="1" fill="#FFFFFF" />
          <rect x="37" y="11" width="4" height="4" fill="#10B981" />

          <rect x="6" y="32" width="14" height="14" rx="2" fill="#0F172A" />
          <rect x="9" y="35" width="8" height="8" rx="1" fill="#FFFFFF" />
          <rect x="11" y="37" width="4" height="4" fill="#10B981" />

          <rect x="24" y="8" width="4" height="8" fill="#0F172A" />
          <rect x="24" y="24" width="8" height="8" fill="#10B981" />
          <rect x="34" y="24" width="4" height="4" fill="#0F172A" />
          <rect x="24" y="36" width="6" height="6" fill="#0F172A" />
          <rect x="36" y="36" width="8" height="6" fill="#0F172A" />
        </g>
      </g>
    </svg>
  );
}
