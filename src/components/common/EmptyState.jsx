import React from 'react';
import Card from './Card';
import Button from './Button';
import EmptyFolderIllustration from '../illustrations/EmptyFolderIllustration';
import CloudUploadIllustration from '../illustrations/CloudUploadIllustration';
import SuccessCheckIllustration from '../illustrations/SuccessCheckIllustration';

/**
 * EmptyState - Componente reutilizable para estados vacíos con ilustraciones vectoriales Tabler.
 * 
 * @param {'folder'|'upload'|'success'|React.ReactNode} illustration - Tipo de ilustración a mostrar
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
  illustration = 'folder',
  title = 'No hay elementos registrados',
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
  const renderIllustration = () => {
    if (React.isValidElement(illustration)) {
      return illustration;
    }

    switch (illustration) {
      case 'upload':
        return <CloudUploadIllustration className="w-36 h-36 sm:w-44 sm:h-44 mx-auto mb-2" />;
      case 'success':
        return <SuccessCheckIllustration className="w-36 h-36 sm:w-44 sm:h-44 mx-auto mb-2" />;
      case 'folder':
      default:
        return <EmptyFolderIllustration className="w-36 h-36 sm:w-44 sm:h-44 mx-auto mb-2" />;
    }
  };

  const hasAnyAction = action || actionLabel || secondaryActionLabel;

  return (
    <Card className={`text-center py-10 sm:py-12 px-4 sm:px-6 flex flex-col items-center justify-center animate-fadeInUp ${className}`}>
      {renderIllustration()}
      
      <h4 className="text-base sm:text-lg font-bold text-text-primary tracking-tight mt-1 max-w-md">
        {title}
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
              {actionLabel && (
                <Button
                  variant={actionVariant}
                  size="sm"
                  icon={actionIcon}
                  onClick={onAction}
                  className="active:scale-95 duration-100"
                >
                  {actionLabel}
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
