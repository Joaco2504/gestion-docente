import React from 'react';
import { BookOpen, X, Plus } from 'lucide-react';
import AnimatedSearchBar from '../../../components/common/AnimatedSearchBar';
import EmptyState from '../../../components/common/EmptyState';
import { SkeletonCatedraCard } from '../../../components/common/SkeletonLoader';
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
  return (
    <section className="space-y-4">
      {/* Cabecera de Cátedras con Filtros y Buscador */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
              Mis Cátedras Activas
            </h2>
            <p className="text-[11px] text-text-muted font-mono">
              {searchQuery.trim()
                ? `Mostrando ${filteredCatedras.length} de ${totalCatedrasCount} materias`
                : `${filteredCatedras.length} de ${totalCatedrasCount} materias visibles`
              }
            </p>
          </div>
        </div>

        {/* Barra de Filtros interactiva */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
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
                className="p-0.5 hover:bg-primary/20 rounded-full transition-colors text-primary ml-0.5 cursor-pointer"
                title="Limpiar búsqueda"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Chips de filtro por nivel */}
          <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => onLevelFilterChange('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                levelFilter === 'ALL'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Todas ({totalCatedrasCount})
            </button>
            <button
              type="button"
              onClick={() => onLevelFilterChange('TERCIARIO')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                levelFilter === 'TERCIARIO'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Terciario
            </button>
            <button
              type="button"
              onClick={() => onLevelFilterChange('SECUNDARIO')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                levelFilter === 'SECUNDARIO'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Secundario
            </button>
          </div>
        </div>
      </div>

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
