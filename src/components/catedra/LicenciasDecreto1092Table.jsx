import React, { useState, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  FileText, 
  ShieldCheck, 
  Check, 
  Filter,
  Info,
  Clock,
  ExternalLink
} from 'lucide-react';
import Badge from '../common/Badge';
import { DECRETO_1092_CATAMARCA } from '../../data/decreto1092Catamarca';

/**
 * Tabla Resumen de Artículos de Licencia del Personal Docente
 * Basado en el Decreto Acuerdo N° 1092/2015 del Ministerio de Educación de Catamarca.
 * 
 * Columnas requeridas:
 * 1. N° de Art
 * 2. Título
 * 3. Descripción
 */
export default function LicenciasDecreto1092Table({
  onSelectArticle = null,
  selectedArticleNumero = '',
  compact = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [capituloFilter, setCapituloFilter] = useState('TODOS');

  // Capítulos únicos para filtros rápidos
  const capitulos = useMemo(() => {
    const list = Array.from(new Set(DECRETO_1092_CATAMARCA.map(item => item.capitulo)));
    return ['TODOS', ...list];
  }, []);

  // Filtrado reactivo por término y capítulo
  const filteredArticles = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return DECRETO_1092_CATAMARCA.filter(art => {
      const matchSearch = 
        art.numero.toLowerCase().includes(term) ||
        art.titulo.toLowerCase().includes(term) ||
        art.descripcion.toLowerCase().includes(term) ||
        (art.plazoMaximo && art.plazoMaximo.toLowerCase().includes(term));
      
      const matchCap = capituloFilter === 'TODOS' || art.capitulo === capituloFilter;
      return matchSearch && matchCap;
    });
  }, [searchTerm, capituloFilter]);

  return (
    <div className="space-y-4">
      {/* Barra superior de herramientas y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Input de búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por N° de Art, título o causa (ej: 20, maternidad, duelo, examen)..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-surface border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden text-text-primary transition-all placeholder:text-text-muted"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded-md hover:bg-surface-hover"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Selector de capítulo */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-muted shrink-0 hidden sm:inline" />
          <select
            value={capituloFilter}
            onChange={(e) => setCapituloFilter(e.target.value)}
            aria-label="Filtrar por capítulo"
            className="text-xs px-3 py-2 bg-surface border border-surface-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden cursor-pointer"
          >
            <option value="TODOS">Todos los Capítulos ({DECRETO_1092_CATAMARCA.length} arts.)</option>
            {capitulos.filter(c => c !== 'TODOS').map(c => (
              <option key={c} value={c}>
                {c.replace('Capítulo ', 'Cap. ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla Resumen Oficial: N° de Art | Título | Descripción */}
      <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-hover/60 border-b border-surface-border text-[11px] uppercase tracking-wider text-text-muted font-bold">
              <th className="py-3 px-3 sm:px-4 w-28 sm:w-36">
                N° de Art
              </th>
              <th className="py-3 px-3 sm:px-4 w-48 sm:w-64">
                Título
              </th>
              <th className="py-3 px-3 sm:px-4">
                Descripción
              </th>
              {onSelectArticle && (
                <th className="py-3 px-3 sm:px-4 text-center w-28">
                  Acción
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border text-xs sm:text-sm">
            {filteredArticles.length === 0 ? (
              <tr>
                <td 
                  colSpan={onSelectArticle ? 4 : 3} 
                  className="py-10 px-4 text-center text-text-muted space-y-2"
                >
                  <FileText className="w-8 h-8 mx-auto text-text-muted/40" />
                  <p className="font-semibold">No se encontraron artículos con el término "{searchTerm}"</p>
                  <p className="text-xs">Intenta buscar por número (ej: 20) o palabra clave como salud, duelo o maternidad.</p>
                </td>
              </tr>
            ) : (
              filteredArticles.map((art) => {
                const isSelected = selectedArticleNumero && (
                  selectedArticleNumero.includes(art.numero) ||
                  art.numero.includes(selectedArticleNumero)
                );

                return (
                  <tr 
                    key={art.numero}
                    className={`group transition-colors ${
                      isSelected 
                        ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary' 
                        : 'hover:bg-surface-hover/50'
                    }`}
                  >
                    {/* 1. Columna: N° de Art */}
                    <td className="py-3.5 px-3 sm:px-4 align-top">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                          {art.numero}
                        </span>
                        <span className="text-[10px] text-text-muted hidden sm:inline font-mono">
                          Dec. 1092/15
                        </span>
                      </div>
                    </td>

                    {/* 2. Columna: Título */}
                    <td className="py-3.5 px-3 sm:px-4 align-top">
                      <div className="space-y-1">
                        <div className="font-bold text-text-primary group-hover:text-primary transition-colors leading-snug">
                          {art.titulo}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-hover text-text-muted border border-surface-border">
                            {art.conGoce}
                          </span>
                          {art.plazoMaximo && (
                            <span className="text-[10px] text-text-muted flex items-center gap-1">
                              <Clock className="w-3 h-3 text-text-muted shrink-0" />
                              <span className="truncate max-w-[140px]" title={art.plazoMaximo}>
                                {art.plazoMaximo}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Columna: Descripción */}
                    <td className="py-3.5 px-3 sm:px-4 align-top leading-relaxed text-text-secondary">
                      <p className="text-xs sm:text-sm">
                        {art.descripcion}
                      </p>
                      <div className="mt-1.5 text-[10px] text-text-muted/80 italic">
                        {art.capitulo}
                      </div>
                    </td>

                    {/* Columna Acciones (si se provee callback) */}
                    {onSelectArticle && (
                      <td className="py-3.5 px-3 sm:px-4 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => onSelectArticle(art)}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-primary text-white shadow-xs cursor-default'
                              : 'bg-surface hover:bg-primary hover:text-white border border-surface-border hover:border-primary text-text-primary shadow-2xs'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Elegido</span>
                            </>
                          ) : (
                            <span>Elegir</span>
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Nota al pie reglamentaria institucional */}
      <div className="p-3 bg-surface-hover/40 border border-surface-border rounded-xl flex items-start gap-2.5 text-xs text-text-muted">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Fuente Oficial:</strong> Decreto Acuerdo N° 1092/2015 del Ministerio de Educación, Ciencia y Tecnología de Catamarca. Las solicitudes de licencia médica requieren comunicación en el plazo de 24 horas y presentación de certificado ante la Dirección de Control y Reconocimiento Médico Docente.
        </p>
      </div>
    </div>
  );
}
