import React from 'react';
import Card from './Card';
import Button from './Button';
import {
  EmptyCatedrasSvg,
  EmptyAlumnosSvg,
  EmptyMesasSvg
} from './BrandIllustrations';
import {
  EmptyStateIllustration,
  SuccessTaskIllustration,
  SupportMailIllustration,
  CloudUploadIllustration,
  SearchEmptyIllustration
} from '../illustrations';

/**
 * EmptyState - Componente universal para estados vacíos con ilustraciones vectoriales Korum.
 * 
 * @param {'catedras'|'alumnos'|'mesas'|null} tipo - Tipo de estado vacío estándar de Korum
 * @param {'folder'|'empty'|'upload'|'success'|'task'|'support'|'search'|'catedras'|'alumnos'|'mesas'|React.ReactNode} illustration - Tipo o elemento de ilustración
 * @param {string} title - Título del estado vacío
 * @param {string} description - Explicación o guía para el usuario
 * @param {React.ReactNode} action - Botón o elemento de acción directa (opcional)
 * @param {string} actionLabel - Etiqueta para botón de acción principal automático
 * @param {React.Component} actionIcon - Icono para el botón de acción principal
 * @param {function} onAction - Handler de click para acción principal
 * @param {string} actionVariant - Variante del botón de acción principal ('primary' por defecto)
 * @param {string} secondaryActionLabel - Etiqueta para botón de acción secundaria automático
 * @param {React.Component} secondaryActionIcon - Icono para acción secundaria
 * @param {function} onSecondaryAction - Handler de click para acción secundaria
 * @param {string} secondaryActionVariant - Variante del botón de acción secundaria ('secondary' por defecto)
 * @param {string} className - Clases adicionales de estilo
 */
export default function EmptyState({
  tipo = null,
  illustration = null,
  title = null,
  description = '',
  action = null,
  actionLabel = '',
  actionIcon = null,
  onAction = null,
  actionVariant = 'primary',
  secondaryActionLabel = '',
  secondaryActionIcon = null,
  onSecondaryAction = null,
  secondaryActionVariant = 'secondary',
  className = ''
}) {
  // Inferir tipo según prop illustration si tipo no fue indicado explícitamente
  const effectiveTipo = tipo || (
    illustration === 'catedras' ? 'catedras' :
    illustration === 'alumnos' ? 'alumnos' :
    illustration === 'mesas' ? 'mesas' : null
  );

  // Valores predeterminados según tipo de Korum
  let defaultTitle = 'No hay elementos registrados';
  let defaultActionLabel = '';

  if (effectiveTipo === 'catedras') {
    defaultTitle = 'No tienes cátedras creadas en este ciclo';
    defaultActionLabel = '+ Crear mi primera cátedra';
  } else if (effectiveTipo === 'alumnos') {
    defaultTitle = 'Nómina sin alumnos registrados';
    defaultActionLabel = '📥 Importar Excel / CSV';
  } else if (effectiveTipo === 'mesas') {
    defaultTitle = 'Aún no has constituido mesas evaluadoras';
    defaultActionLabel = '+ Nueva Mesa de Examen';
  }

  const finalTitle = title !== null ? title : defaultTitle;
  const finalActionLabel = actionLabel || defaultActionLabel;

  const renderIllustration = () => {
    // Si se pasa un elemento React explícito
    if (React.isValidElement(illustration)) {
      return illustration;
    }

    // Ilustraciones estándar Korum por tipo
    if (effectiveTipo === 'catedras') {
      return <EmptyCatedrasSvg className="w-40 h-40 mx-auto mb-2" />;
    }
    if (effectiveTipo === 'alumnos') {
      return <EmptyAlumnosSvg className="w-40 h-40 mx-auto mb-2" />;
    }
    if (effectiveTipo === 'mesas') {
      return <EmptyMesasSvg className="w-40 h-40 mx-auto mb-2" />;
    }

    // Ilustraciones clásicas/genéricas Tabler
    const illKey = illustration || 'folder';
    switch (illKey) {
      case 'search':
        return <SearchEmptyIllustration className="w-36 h-36 sm:w-44 sm:h-44 mx-auto mb-2" />;
      case 'support':
      case 'mail':
        return <SupportMailIllustration className="w-36 h-36 sm:w-44 sm:h-44 mx-auto mb-2" />;
      case 'upload':
      case 'cloud':
        return <CloudUploadIllustration className="w-36 h-36 sm:w-44 sm:h-44 mx-auto mb-2" />;
      case 'success':
      case 'task':
        return <SuccessTaskIllustration className="w-36 h-36 sm:w-44 sm:h-44 mx-auto mb-2" />;
      case 'folder':
      case 'empty':
      default:
        return <EmptyStateIllustration className="w-36 h-36 sm:w-44 sm:h-44 mx-auto mb-2" />;
    }
  };

  const hasAnyAction = action || finalActionLabel || secondaryActionLabel;

  return (
    <Card className={`text-center py-10 sm:py-12 px-4 sm:px-6 flex flex-col items-center justify-center animate-fadeInUp border-slate-200/80 dark:border-slate-800 ${className}`}>
      {renderIllustration()}
      
      <h4 className="text-base sm:text-lg font-bold text-text-primary tracking-tight mt-1 max-w-md">
        {finalTitle}
      </h4>

      {description && (
        <p className="text-xs sm:text-sm text-text-muted mt-1.5 max-w-sm sm:max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}

      {hasAnyAction && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {action ? (
            action
          ) : (
            <>
              {secondaryActionLabel && (
                <Button
                  variant={secondaryActionVariant}
                  size="sm"
                  icon={secondaryActionIcon}
                  onClick={onSecondaryAction}
                  className="active:scale-95 duration-100"
                >
                  {secondaryActionLabel}
                </Button>
              )}

              {finalActionLabel && (
                <Button
                  variant={actionVariant}
                  size="sm"
                  icon={actionIcon}
                  onClick={onAction}
                  className="active:scale-95 duration-100 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20"
                >
                  {finalActionLabel}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
