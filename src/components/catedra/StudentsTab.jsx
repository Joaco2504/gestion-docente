import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  FileSpreadsheet, 
  Search, 
  Edit3, 
  UserMinus, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { SkeletonTable } from '../common/SkeletonLoader';
import ExcelImporter from './ExcelImporter';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function StudentsTab({ catedraId, catedraName }) {
  const { user, isDemo } = useAuth();

  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'import-excel'

  // Modal: Carga Manual
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [dniManual, setDniManual] = useState('');
  const [apellidoManual, setApellidoManual] = useState('');
  const [nombreManual, setNombreManual] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // Modal: Editar Estudiante
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [dniEdit, setDniEdit] = useState('');
  const [apellidoEdit, setApellidoEdit] = useState('');
  const [nombreEdit, setNombreEdit] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal: Confirmar Baja
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [catedraId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('inscripciones')
          .select(`
            estudiante_id,
            estudiantes (
              id,
              dni,
              apellido,
              nombre,
              email,
              telefono
            )
          `)
          .eq('catedra_id', catedraId);

        if (error) throw error;

        const list = (data || []).map(item => item.estudiantes).filter(Boolean);
        list.sort((a, b) => a.apellido.localeCompare(b.apellido));
        setEstudiantes(list);
      } else {
        const stored = localStorage.getItem(`estudiantes_${catedraId}`);
        if (stored) {
          setEstudiantes(JSON.parse(stored));
        } else {
          const sample = [
            { id: 'est-1', dni: '40111222', apellido: 'Álvarez', nombre: 'Martín' },
            { id: 'est-2', dni: '39444555', apellido: 'Benítez', nombre: 'Lucía' },
            { id: 'est-3', dni: '41888999', apellido: 'Castillo', nombre: 'Ignacio' },
            { id: 'est-4', dni: '38222333', apellido: 'Domínguez', nombre: 'Valentina' },
            { id: 'est-5', dni: '42333444', apellido: 'Fernández', nombre: 'Santiago' }
          ];
          setEstudiantes(sample);
          localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(sample));
        }
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error('No se pudo cargar la lista de alumnos.');
    } finally {
      setLoading(false);
    }
  };

  // Carga Manual de Alumno
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const cleanDni = dniManual.trim().replace(/\D/g, '');
    const cleanApellido = apellidoManual.trim();
    const cleanNombre = nombreManual.trim();

    if (!cleanDni || !cleanApellido || !cleanNombre) {
      toast.error('Por favor completa todos los campos requeridos (DNI, Apellido y Nombre).');
      return;
    }

    setSavingManual(true);
    try {
      if (isSupabaseConfigured && !isDemo && user) {
        // 1. Buscar si el estudiante ya existe para este docente
        const { data: existingStudent, error: findErr } = await supabase
          .from('estudiantes')
          .select('id, dni')
          .eq('docente_id', user.id)
          .eq('dni', cleanDni)
          .maybeSingle();

        if (findErr) throw findErr;

        let studentId = existingStudent?.id;

        if (!studentId) {
          // Crear nuevo estudiante
          const { data: newEst, error: insertEstErr } = await supabase
            .from('estudiantes')
            .insert({
              docente_id: user.id,
              dni: cleanDni,
              apellido: cleanApellido,
              nombre: cleanNombre
            })
            .select()
            .single();

          if (insertEstErr) throw insertEstErr;
          studentId = newEst.id;
        } else {
          // Actualizar apellido y nombre
          await supabase
            .from('estudiantes')
            .update({
              apellido: cleanApellido,
              nombre: cleanNombre
            })
            .eq('id', studentId);
        }

        // 2. Inscribir en la cátedra si no lo estaba
        const { data: existingInsc } = await supabase
          .from('inscripciones')
          .select('id')
          .eq('catedra_id', catedraId)
          .eq('estudiante_id', studentId)
          .maybeSingle();

        if (!existingInsc) {
          const { error: inscErr } = await supabase
            .from('inscripciones')
            .insert({
              catedra_id: catedraId,
              estudiante_id: studentId
            });

          if (inscErr) throw inscErr;
        } else {
          toast.info('El alumno ya se encontraba inscripto en esta cátedra.');
        }

        await fetchStudents();
      } else {
        // Demo mode
        const newStudent = {
          id: 'est-' + Date.now(),
          dni: cleanDni,
          apellido: cleanApellido,
          nombre: cleanNombre
        };
        const updated = [...estudiantes, newStudent];
        updated.sort((a, b) => a.apellido.localeCompare(b.apellido));
        setEstudiantes(updated);
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(updated));
      }

      toast.success(`${cleanApellido}, ${cleanNombre} matriculado correctamente.`);
      setIsManualModalOpen(false);
      setDniManual('');
      setApellidoManual('');
      setNombreManual('');
    } catch (err) {
      console.error('Error registering student:', err);
      toast.error('Error al guardar el alumno: ' + err.message);
    } finally {
      setSavingManual(false);
    }
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setDniEdit(student.dni || '');
    setApellidoEdit(student.apellido || '');
    setNombreEdit(student.nombre || '');
    setIsEditModalOpen(true);
  };

  // Guardar Edición
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    const cleanDni = dniEdit.trim().replace(/\D/g, '');
    const cleanApellido = apellidoEdit.trim();
    const cleanNombre = nombreEdit.trim();

    if (!cleanDni || !cleanApellido || !cleanNombre) {
      toast.error('Por favor completa todos los campos.');
      return;
    }

    setSavingEdit(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('estudiantes')
          .update({
            dni: cleanDni,
            apellido: cleanApellido,
            nombre: cleanNombre
          })
          .eq('id', editingStudent.id);

        if (error) throw error;
      }

      const updated = estudiantes.map(st => 
        st.id === editingStudent.id 
          ? { ...st, dni: cleanDni, apellido: cleanApellido, nombre: cleanNombre }
          : st
      );
      updated.sort((a, b) => a.apellido.localeCompare(b.apellido));
      setEstudiantes(updated);

      if (!isSupabaseConfigured || isDemo) {
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(updated));
      }

      toast.success('Datos del estudiante actualizados con éxito.');
      setIsEditModalOpen(false);
      setEditingStudent(null);
    } catch (err) {
      console.error('Error updating student:', err);
      toast.error('Error al actualizar datos: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Abrir Modal de Baja
  const handleOpenDelete = (student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  // Confirmar Baja de la Cátedra
  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    setDeletingStudent(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('inscripciones')
          .delete()
          .eq('catedra_id', catedraId)
          .eq('estudiante_id', studentToDelete.id);

        if (error) throw error;
      }

      const updated = estudiantes.filter(st => st.id !== studentToDelete.id);
      setEstudiantes(updated);

      if (!isSupabaseConfigured || isDemo) {
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(updated));
      }

      toast.success(`${studentToDelete.apellido}, ${studentToDelete.nombre} dado de baja de la cátedra.`);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    } catch (err) {
      console.error('Error unenrolling student:', err);
      toast.error('Error al desvincular estudiante: ' + err.message);
    } finally {
      setDeletingStudent(false);
    }
  };

  // Filtrado en tiempo real
  const filteredStudents = estudiantes.filter(st => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${st.apellido} ${st.nombre}`.toLowerCase();
    const dni = String(st.dni || '').toLowerCase();
    return fullName.includes(q) || dni.includes(q);
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12 sm:pb-0">
      {/* View Mode: Excel Importer View */}
      {viewMode === 'import-excel' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-surface p-4 rounded-2xl border border-surface-border">
            <button
              onClick={() => setViewMode('list')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Listado de Alumnos</span>
            </button>
            <Badge variant="primary">Modo Importador Excel</Badge>
          </div>

          <ExcelImporter
            catedraId={catedraId}
            onStudentsImported={() => {
              fetchStudents();
              setViewMode('list');
              toast.success('Lista de alumnos actualizada desde archivo Excel.');
            }}
          />
        </div>
      ) : (
        /* View Mode: Students List View */
        <>
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-surface p-4 rounded-2xl border border-surface-border shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-text-primary">
                    Nómina de Alumnos Matriculados
                  </h3>
                  <Badge variant="default" className="font-mono text-[11px]">
                    {estudiantes.length} {estudiantes.length === 1 ? 'alumno' : 'alumnos'}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Gestiona la matrícula activa mediante carga manual rápida o importación masiva.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Button
                variant="secondary"
                size="sm"
                icon={FileSpreadsheet}
                onClick={() => setViewMode('import-excel')}
                className="flex-1 sm:flex-initial text-xs"
              >
                Importar Excel / CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={UserPlus}
                onClick={() => setIsManualModalOpen(true)}
                className="flex-1 sm:flex-initial text-xs shadow-xs"
              >
                Nuevo Alumno (Manual)
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar alumno por Apellido, Nombre o DNI..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-surface border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-text-primary placeholder:text-text-muted transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary font-medium"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Student Table / Cards */}
          {loading ? (
            <div className="py-4 space-y-3">
              <SkeletonTable rows={5} cols={4} />
            </div>
          ) : estudiantes.length === 0 ? (
            <Card className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 opacity-70" />
              </div>
              <h4 className="text-base font-bold text-text-primary">
                Aún no hay alumnos matriculados en esta cátedra
              </h4>
              <p className="text-xs text-text-muted max-w-md mx-auto mt-1 mb-5">
                Comienza agregando el primer estudiante individualmente o importa tu planilla de Excel con un solo clic.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={FileSpreadsheet}
                  onClick={() => setViewMode('import-excel')}
                >
                  Importar Planilla Excel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={UserPlus}
                  onClick={() => setIsManualModalOpen(true)}
                >
                  Carga Manual Rápida
                </Button>
              </div>
            </Card>
          ) : filteredStudents.length === 0 ? (
            <Card className="text-center py-12">
              <Search className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-text-primary">
                No se encontraron alumnos para "{searchTerm}"
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Verifica los términos de búsqueda o borra el filtro.
              </p>
            </Card>
          ) : (
            <div className="bg-surface rounded-2xl border border-surface-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-surface-hover/80 text-text-secondary font-semibold border-b border-surface-border">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3 font-mono">DNI</th>
                      <th className="px-4 py-3">Apellido y Nombre</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {filteredStudents.map((st, index) => (
                      <tr key={st.id} className="hover:bg-surface-hover/40 transition-colors group">
                        <td className="px-4 py-3 text-center text-text-muted font-mono">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-text-secondary">
                          {st.dni}
                        </td>
                        <td className="px-4 py-3 font-semibold text-text-primary">
                          <div className="flex items-center gap-2">
                            <span>{st.apellido}, {st.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(st)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-hover transition-colors"
                              title="Editar datos del alumno"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(st)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                              title="Dar de baja de la cátedra"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: Carga Manual Rápida */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Matricular Nuevo Alumno"
        subtitle="Ingreso manual ágil a la cátedra"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              DNI / Documento *
            </label>
            <input
              type="text"
              required
              value={dniManual}
              onChange={(e) => setDniManual(e.target.value)}
              placeholder="Ej: 42123456"
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={apellidoManual}
                onChange={(e) => setApellidoManual(e.target.value)}
                placeholder="Ej: Pérez"
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={nombreManual}
                onChange={(e) => setNombreManual(e.target.value)}
                placeholder="Ej: Juan Manuel"
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsManualModalOpen(false)}
              disabled={savingManual}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingManual}
            >
              Matricular Alumno
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Estudiante */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Datos del Estudiante"
        subtitle="Actualiza la información personal"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              DNI / Documento *
            </label>
            <input
              type="text"
              required
              value={dniEdit}
              onChange={(e) => setDniEdit(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={apellidoEdit}
                onChange={(e) => setApellidoEdit(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={nombreEdit}
                onChange={(e) => setNombreEdit(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingEdit}
            >
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmación de Baja */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Dar de Baja de la Cátedra"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="text-xs text-danger leading-relaxed">
              ¿Estás seguro de que deseas dar de baja a{' '}
              <strong>{studentToDelete?.apellido}, {studentToDelete?.nombre}</strong> (DNI: {studentToDelete?.dni}) de esta cátedra?
              El alumno dejará de aparecer en la lista de asistencias y calificaciones de <strong>{catedraName}</strong>.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deletingStudent}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deletingStudent}
              onClick={handleDeleteConfirm}
            >
              Confirmar Baja
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
