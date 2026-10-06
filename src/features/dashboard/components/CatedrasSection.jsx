import React from 'react';
import { BookOpen, X, Plus } from 'lucide-react';
import AnimatedSearchBar from '../../../components/common/AnimatedSearchBar';
import EmptyState from '../../../components/common/EmptyState';
import { SkeletonCatedraCard } from '../../../components/common/SkeletonLoader';
import SectionHeader from '../../../components/common/SectionHeader';
import Button from '../../../components/common/Button';
import Badge from '../../../components/common/Badge';
import CatedraCard from './CatedraCard';

export default function CatedrasSection({
  loading,
  searchQuery,
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  filteredCatedras,
  totalCatedrasCount,
  activeMenuCatedraId,
  onToggleMenu,
  onEditCatedra,
  onRegisterFirstClass,
  onOpenNewCatedra
}) {
  const subtitleText = searchQuery.trim()
    ? `Mostrando ${filteredCatedras.length} de ${totalCatedrasCount} materias`
    : `${filteredCatedras.length} de ${totalCatedrasCount} materias registradas`;

  return (
    <section className="space-y-4" aria-label="Sección de cátedras activas">
      {/* Cabecera de Sección Unificada Korum */}
      <SectionHeader
        title="Mis Cátedras Activas"
        subtitle={subtitleText}
        icon={BookOpen}
        badge={
          <Badge variant="primary" size="sm">
            {filteredCatedras.length}
          </Badge>
        }
        titleAs="h2"
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={onOpenNewCatedra}
            aria-label="Crear nueva cátedra"
          >
            Nueva Cátedra
          </Button>
        }
        search={
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {/* Buscador de texto expandible Korum */}
              <AnimatedSearchBar
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar materia o colegio..."
              />

              {/* Contador de coincidencias en vivo si hay búsqueda activa */}
              {searchQuery.trim() && (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary animate-fadeIn shrink-0 shadow-xs">
                  <span>
                    Mostrando <strong className="font-mono font-bold text-primary">{filteredCatedras.length}</strong> de <span className="font-mono">{totalCatedrasCount}</span> cátedras
                  </span>
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="p-1 hover:bg-primary/20 rounded-full transition-colors text-primary ml-0.5 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                    title="Limpiar búsqueda"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Chips de filtro por nivel */}
            <div className="flex items-center bg-surface p-1 rounded-xl border border-surface-border shrink-0 shadow-xs">
              <button
                type="button"
                onClick={() => onLevelFilterChange('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color,box-shadow] duration-150 cursor-pointer min-h-[36px] sm:min-h-[28px] ${
                  levelFilter === 'ALL'
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                aria-label="Mostrar todas las cátedras"
              >
                Todas ({totalCatedrasCount})
              </button>
              <button
                type="button"
                onClick={() => onLevelFilterChange('TERCIARIO')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color,box-shadow] duration-150 cursor-pointer min-h-[36px] sm:min-h-[28px] ${
                  levelFilter === 'TERCIARIO'
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                aria-label="Filtrar por nivel terciario"
              >
                Terciario
              </button>
              <button
                type="button"
                onClick={() => onLevelFilterChange('SECUNDARIO')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color,box-shadow] duration-150 cursor-pointer min-h-[36px] sm:min-h-[28px] ${
                  levelFilter === 'SECUNDARIO'
                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                aria-label="Filtrar por nivel secundario"
              >
                Secundario
              </button>
            </div>
          </div>
        }
      />

      {/* Grilla Responsive de Cátedras Bento */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCatedraCard count={3} />
        </div>
      ) : filteredCatedras.length === 0 ? (
        searchQuery ? (
          <EmptyState
            illustration="search"
            title={`No se encontraron cátedras que coincidan con "${searchQuery}"`}
            description={`No hay materias ni colegios que coincidan con "${searchQuery}". Intenta con otro término de búsqueda o cambia de nivel.`}
            actionLabel="Restablecer Vista"
            actionIcon={X}
            onAction={() => {
              onSearchChange('');
              onLevelFilterChange('ALL');
            }}
          />
        ) : (
          <EmptyState
            tipo="catedras"
            onAction={onOpenNewCatedra}
            actionIcon={Plus}
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCatedras.map((cat) => (
            <CatedraCard
              key={cat.id}
              cat={cat}
              activeMenuCatedraId={activeMenuCatedraId}
              onToggleMenu={onToggleMenu}
              onEdit={onEditCatedra}
              onRegisterFirstClass={onRegisterFirstClass}
            />
          ))}
        </div>
      )}
    </section>
  );
}
