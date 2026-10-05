
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "actas_examen_alumnos": {
                  Row: {
                    "alumno_dni": string,"alumno_nombre_completo": string,"condicion_previa": string,"created_at": string,"dictamen": string,"estudiante_id": string | null,"id": string,"mesa_id": string,"nota_definitiva": number | null,"nota_escrito": number | null,"nota_oral": number | null,"observaciones": string | null
                  }
                  Insert: {
                    "alumno_dni"?: string,"alumno_nombre_completo"?: string,"condicion_previa"?: string,"created_at"?: string,"dictamen"?: string,"estudiante_id"?: string | null,"id"?: string,"mesa_id": string,"nota_definitiva"?: number | null,"nota_escrito"?: number | null,"nota_oral"?: number | null,"observaciones"?: string | null
                  }
                  Update: {
                    "alumno_dni"?: string,"alumno_nombre_completo"?: string,"condicion_previa"?: string,"created_at"?: string,"dictamen"?: string,"estudiante_id"?: string | null,"id"?: string,"mesa_id"?: string,"nota_definitiva"?: number | null,"nota_escrito"?: number | null,"nota_oral"?: number | null,"observaciones"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "actas_examen_alumnos_estudiante_id_fkey"
      columns: ["estudiante_id"]
isOneToOne: false
      referencedRelation: "estudiantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "actas_examen_alumnos_mesa_id_fkey"
      columns: ["mesa_id"]
isOneToOne: false
      referencedRelation: "mesas_examen"
      referencedColumns: ["id"]
    }
                  ]
                },"actas_examen_detalle": {
                  Row: {
                    "catedra_id": string,"condicion_al_rendir": string,"created_at": string | null,"estudiante_id": string,"id": string,"mesa_id": string,"nota_definitiva": number | null,"nota_escrito": number | null,"nota_oral": number | null,"observaciones": string | null,"resultado": string
                  }
                  Insert: {
                    "catedra_id": string,"condicion_al_rendir": string,"created_at"?: string | null,"estudiante_id": string,"id"?: string,"mesa_id": string,"nota_definitiva"?: number | null,"nota_escrito"?: number | null,"nota_oral"?: number | null,"observaciones"?: string | null,"resultado": string
                  }
                  Update: {
                    "catedra_id"?: string,"condicion_al_rendir"?: string,"created_at"?: string | null,"estudiante_id"?: string,"id"?: string,"mesa_id"?: string,"nota_definitiva"?: number | null,"nota_escrito"?: number | null,"nota_oral"?: number | null,"observaciones"?: string | null,"resultado"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "actas_examen_detalle_catedra_id_fkey"
      columns: ["catedra_id"]
isOneToOne: false
      referencedRelation: "catedras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "actas_examen_detalle_estudiante_id_fkey"
      columns: ["estudiante_id"]
isOneToOne: false
      referencedRelation: "estudiantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "actas_examen_detalle_mesa_id_fkey"
      columns: ["mesa_id"]
isOneToOne: false
      referencedRelation: "mesas_examen"
      referencedColumns: ["id"]
    }
                  ]
                },"actas_examen_estudiantes": {
                  Row: {
                    "condicion_previa": string | null,"estudiante_id": string,"id": string,"mesa_id": string,"nota_definitiva": number | null,"nota_escrito": number | null,"nota_oral": number | null,"observaciones": string | null,"resultado": string | null
                  }
                  Insert: {
                    "condicion_previa"?: string | null,"estudiante_id": string,"id"?: string,"mesa_id": string,"nota_definitiva"?: number | null,"nota_escrito"?: number | null,"nota_oral"?: number | null,"observaciones"?: string | null,"resultado"?: string | null
                  }
                  Update: {
                    "condicion_previa"?: string | null,"estudiante_id"?: string,"id"?: string,"mesa_id"?: string,"nota_definitiva"?: number | null,"nota_escrito"?: number | null,"nota_oral"?: number | null,"observaciones"?: string | null,"resultado"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "actas_examen_estudiantes_estudiante_id_fkey"
      columns: ["estudiante_id"]
isOneToOne: false
      referencedRelation: "estudiantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "actas_examen_estudiantes_mesa_id_fkey"
      columns: ["mesa_id"]
isOneToOne: false
      referencedRelation: "mesas_examen"
      referencedColumns: ["id"]
    }
                  ]
                },"asistencias": {
                  Row: {
                    "clase_id": string,"created_at": string | null,"estado": string,"estudiante_id": string,"id": string,"updated_at": string | null
                  }
                  Insert: {
                    "clase_id": string,"created_at"?: string | null,"estado": string,"estudiante_id": string,"id"?: string,"updated_at"?: string | null
                  }
                  Update: {
                    "clase_id"?: string,"created_at"?: string | null,"estado"?: string,"estudiante_id"?: string,"id"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "asistencias_clase_id_fkey"
      columns: ["clase_id"]
isOneToOne: false
      referencedRelation: "clases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "asistencias_estudiante_id_fkey"
      columns: ["estudiante_id"]
isOneToOne: false
      referencedRelation: "estudiantes"
      referencedColumns: ["id"]
    }
                  ]
                },"catedras": {
                  Row: {
                    "ciclo_id": string,"created_at": string | null,"cursada_finalizada": boolean | null,"docente_id": string,"fecha_cierre_cursada": string | null,"horarios_semanales": Json | null,"id": string,"institucion_id": string,"modalidad": string,"nivel": string,"nombre": string,"portal_activo": boolean | null,"portal_mostrar_asistencia": boolean | null,"portal_mostrar_condicion": boolean | null,"portal_mostrar_notas": boolean | null,"ram_asistencia_promocion": number | null,"ram_asistencia_regular": number | null,"ram_asistencia_trabajo": number | null,"updated_at": string | null
                  }
                  Insert: {
                    "ciclo_id": string,"created_at"?: string | null,"cursada_finalizada"?: boolean | null,"docente_id"?: string,"fecha_cierre_cursada"?: string | null,"horarios_semanales"?: Json | null,"id"?: string,"institucion_id": string,"modalidad"?: string,"nivel": string,"nombre": string,"portal_activo"?: boolean | null,"portal_mostrar_asistencia"?: boolean | null,"portal_mostrar_condicion"?: boolean | null,"portal_mostrar_notas"?: boolean | null,"ram_asistencia_promocion"?: number | null,"ram_asistencia_regular"?: number | null,"ram_asistencia_trabajo"?: number | null,"updated_at"?: string | null
                  }
                  Update: {
                    "ciclo_id"?: string,"created_at"?: string | null,"cursada_finalizada"?: boolean | null,"docente_id"?: string,"fecha_cierre_cursada"?: string | null,"horarios_semanales"?: Json | null,"id"?: string,"institucion_id"?: string,"modalidad"?: string,"nivel"?: string,"nombre"?: string,"portal_activo"?: boolean | null,"portal_mostrar_asistencia"?: boolean | null,"portal_mostrar_condicion"?: boolean | null,"portal_mostrar_notas"?: boolean | null,"ram_asistencia_promocion"?: number | null,"ram_asistencia_regular"?: number | null,"ram_asistencia_trabajo"?: number | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "catedras_ciclo_id_fkey"
      columns: ["ciclo_id"]
isOneToOne: false
      referencedRelation: "ciclos_lectivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "catedras_institucion_id_fkey"
      columns: ["institucion_id"]
isOneToOne: false
      referencedRelation: "instituciones"
      referencedColumns: ["id"]
    }
                  ]
                },"ciclos_lectivos": {
                  Row: {
                    "activo": boolean | null,"anio": number,"created_at": string | null,"docente_id": string,"id": string,"institucion_id": string | null,"nombre": string | null
                  }
                  Insert: {
                    "activo"?: boolean | null,"anio": number,"created_at"?: string | null,"docente_id"?: string,"id"?: string,"institucion_id"?: string | null,"nombre"?: string | null
                  }
                  Update: {
                    "activo"?: boolean | null,"anio"?: number,"created_at"?: string | null,"docente_id"?: string,"id"?: string,"institucion_id"?: string | null,"nombre"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ciclos_lectivos_institucion_id_fkey"
      columns: ["institucion_id"]
isOneToOne: false
      referencedRelation: "instituciones"
      referencedColumns: ["id"]
    }
                  ]
                },"clases": {
                  Row: {
                    "archivo_adjunto": string | null,"caracter": string | null,"caracter_clase": string | null,"catedra_id": string,"contenido": string | null,"created_at": string | null,"fecha": string,"horas_catedra": number | null,"id": string,"numero_clase": number | null,"observaciones": string | null,"tema": string,"unidad_id": string | null,"unidad_texto": string | null,"updated_at": string | null
                  }
                  Insert: {
                    "archivo_adjunto"?: string | null,"caracter"?: string | null,"caracter_clase"?: string | null,"catedra_id": string,"contenido"?: string | null,"created_at"?: string | null,"fecha"?: string,"horas_catedra"?: number | null,"id"?: string,"numero_clase"?: number | null,"observaciones"?: string | null,"tema": string,"unidad_id"?: string | null,"unidad_texto"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "archivo_adjunto"?: string | null,"caracter"?: string | null,"caracter_clase"?: string | null,"catedra_id"?: string,"contenido"?: string | null,"created_at"?: string | null,"fecha"?: string,"horas_catedra"?: number | null,"id"?: string,"numero_clase"?: number | null,"observaciones"?: string | null,"tema"?: string,"unidad_id"?: string | null,"unidad_texto"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "clases_catedra_id_fkey"
      columns: ["catedra_id"]
isOneToOne: false
      referencedRelation: "catedras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clases_unidad_id_fkey"
      columns: ["unidad_id"]
isOneToOne: false
      referencedRelation: "unidades_tematicas"
      referencedColumns: ["id"]
    }
                  ]
                },"configuracion_sistema": {
                  Row: {
                    "banner_activo": boolean | null,"banner_mensaje": string | null,"discord_canal_recordatorios": string | null,"id": string,"modo_mantenimiento": boolean | null,"permitir_nuevos_registros": boolean | null,"updated_at": string | null
                  }
                  Insert: {
                    "banner_activo"?: boolean | null,"banner_mensaje"?: string | null,"discord_canal_recordatorios"?: string | null,"id"?: string,"modo_mantenimiento"?: boolean | null,"permitir_nuevos_registros"?: boolean | null,"updated_at"?: string | null
                  }
                  Update: {
                    "banner_activo"?: boolean | null,"banner_mensaje"?: string | null,"discord_canal_recordatorios"?: string | null,"id"?: string,"modo_mantenimiento"?: boolean | null,"permitir_nuevos_registros"?: boolean | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"criterios_evaluacion": {
                  Row: {
                    "catedra_id": string,"id": string,"min_asist_promo": number | null,"min_asist_reg": number | null,"nota_min_promo": number | null,"nota_min_reg": number | null,"nota_min_sec": number | null
                  }
                  Insert: {
                    "catedra_id": string,"id"?: string,"min_asist_promo"?: number | null,"min_asist_reg"?: number | null,"nota_min_promo"?: number | null,"nota_min_reg"?: number | null,"nota_min_sec"?: number | null
                  }
                  Update: {
                    "catedra_id"?: string,"id"?: string,"min_asist_promo"?: number | null,"min_asist_reg"?: number | null,"nota_min_promo"?: number | null,"nota_min_reg"?: number | null,"nota_min_sec"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "criterios_evaluacion_catedra_id_fkey"
      columns: ["catedra_id"]
isOneToOne: true
      referencedRelation: "catedras"
      referencedColumns: ["id"]
    }
                  ]
                },"docentes": {
                  Row: {
                    "created_at": string | null,"email": string | null,"id": string,"nombre": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"email"?: string | null,"id": string,"nombre"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"email"?: string | null,"id"?: string,"nombre"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"estudiantes": {
                  Row: {
                    "apellido": string,"created_at": string | null,"dni": string,"docente_id": string,"email": string | null,"id": string,"legajo": string | null,"nombre": string,"observaciones": string | null,"telefono": string | null,"updated_at": string | null
                  }
                  Insert: {
                    "apellido": string,"created_at"?: string | null,"dni": string,"docente_id"?: string,"email"?: string | null,"id"?: string,"legajo"?: string | null,"nombre": string,"observaciones"?: string | null,"telefono"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "apellido"?: string,"created_at"?: string | null,"dni"?: string,"docente_id"?: string,"email"?: string | null,"id"?: string,"legajo"?: string | null,"nombre"?: string,"observaciones"?: string | null,"telefono"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"evaluaciones": {
                  Row: {
                    "archivo_nombre": string | null,"archivo_url": string | null,"catedra_id": string,"created_at": string | null,"escala_maxima": number | null,"evaluacion_origen_id": string | null,"fecha": string | null,"fecha_entrega": string | null,"id": string,"periodo_id": string | null,"ponderacion": number | null,"tipo": string,"titulo": string,"updated_at": string | null
                  }
                  Insert: {
                    "archivo_nombre"?: string | null,"archivo_url"?: string | null,"catedra_id": string,"created_at"?: string | null,"escala_maxima"?: number | null,"evaluacion_origen_id"?: string | null,"fecha"?: string | null,"fecha_entrega"?: string | null,"id"?: string,"periodo_id"?: string | null,"ponderacion"?: number | null,"tipo": string,"titulo": string,"updated_at"?: string | null
                  }
                  Update: {
                    "archivo_nombre"?: string | null,"archivo_url"?: string | null,"catedra_id"?: string,"created_at"?: string | null,"escala_maxima"?: number | null,"evaluacion_origen_id"?: string | null,"fecha"?: string | null,"fecha_entrega"?: string | null,"id"?: string,"periodo_id"?: string | null,"ponderacion"?: number | null,"tipo"?: string,"titulo"?: string,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "evaluaciones_catedra_id_fkey"
      columns: ["catedra_id"]
isOneToOne: false
      referencedRelation: "catedras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evaluaciones_evaluacion_origen_id_fkey"
      columns: ["evaluacion_origen_id"]
isOneToOne: false
      referencedRelation: "evaluaciones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evaluaciones_periodo_id_fkey"
      columns: ["periodo_id"]
isOneToOne: false
      referencedRelation: "periodos_academicos"
      referencedColumns: ["id"]
    }
                  ]
                },"eventos_calendario": {
                  Row: {
                    "docente_id": string,"editable": boolean | null,"fecha_fin": string,"fecha_inicio": string,"id": string,"notas": string | null,"tipo": string,"titulo": string
                  }
                  Insert: {
                    "docente_id"?: string,"editable"?: boolean | null,"fecha_fin": string,"fecha_inicio": string,"id"?: string,"notas"?: string | null,"tipo": string,"titulo": string
                  }
                  Update: {
                    "docente_id"?: string,"editable"?: boolean | null,"fecha_fin"?: string,"fecha_inicio"?: string,"id"?: string,"notas"?: string | null,"tipo"?: string,"titulo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"inasistencias_docente": {
                  Row: {
                    "articulo_licencia": string | null,"catedra_id": string | null,"created_at": string | null,"docente_id": string,"fecha": string,"id": string,"observaciones": string | null,"tipo": string
                  }
                  Insert: {
                    "articulo_licencia"?: string | null,"catedra_id"?: string | null,"created_at"?: string | null,"docente_id"?: string,"fecha": string,"id"?: string,"observaciones"?: string | null,"tipo": string
                  }
                  Update: {
                    "articulo_licencia"?: string | null,"catedra_id"?: string | null,"created_at"?: string | null,"docente_id"?: string,"fecha"?: string,"id"?: string,"observaciones"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inasistencias_docente_catedra_id_fkey"
      columns: ["catedra_id"]
isOneToOne: false
      referencedRelation: "catedras"
      referencedColumns: ["id"]
    }
                  ]
                },"inscripciones": {
                  Row: {
                    "catedra_id": string,"ciclo_id": string,"condicion": string | null,"created_at": string | null,"es_equivalencia": boolean | null,"estado": string | null,"estado_academico": string | null,"estudiante_id": string,"fecha_acreditacion": string | null,"fecha_equivalencia": string | null,"fecha_inscripcion": string | null,"id": string,"nota_final": number | null,"nota_final_acreditacion": number | null,"observaciones": string | null,"porcentaje_asistencia": number | null,"resolucion_equivalencia": string | null,"tiene_certificado_trabajo": boolean | null,"updated_at": string | null
                  }
                  Insert: {
                    "catedra_id": string,"ciclo_id": string,"condicion"?: string | null,"created_at"?: string | null,"es_equivalencia"?: boolean | null,"estado"?: string | null,"estado_academico"?: string | null,"estudiante_id": string,"fecha_acreditacion"?: string | null,"fecha_equivalencia"?: string | null,"fecha_inscripcion"?: string | null,"id"?: string,"nota_final"?: number | null,"nota_final_acreditacion"?: number | null,"observaciones"?: string | null,"porcentaje_asistencia"?: number | null,"resolucion_equivalencia"?: string | null,"tiene_certificado_trabajo"?: boolean | null,"updated_at"?: string | null
                  }
                  Update: {
                    "catedra_id"?: string,"ciclo_id"?: string,"condicion"?: string | null,"created_at"?: string | null,"es_equivalencia"?: boolean | null,"estado"?: string | null,"estado_academico"?: string | null,"estudiante_id"?: string,"fecha_acreditacion"?: string | null,"fecha_equivalencia"?: string | null,"fecha_inscripcion"?: string | null,"id"?: string,"nota_final"?: number | null,"nota_final_acreditacion"?: number | null,"observaciones"?: string | null,"porcentaje_asistencia"?: number | null,"resolucion_equivalencia"?: string | null,"tiene_certificado_trabajo"?: boolean | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inscripciones_catedra_id_fkey"
      columns: ["catedra_id"]
isOneToOne: false
      referencedRelation: "catedras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inscripciones_ciclo_id_fkey"
      columns: ["ciclo_id"]
isOneToOne: false
      referencedRelation: "ciclos_lectivos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inscripciones_estudiante_id_fkey"
      columns: ["estudiante_id"]
isOneToOne: false
      referencedRelation: "estudiantes"
      referencedColumns: ["id"]
    }
                  ]
                },"instituciones": {
                  Row: {
                    "activa": boolean | null,"created_at": string | null,"docente_id": string,"id": string,"nivel": string,"nombre": string
                  }
                  Insert: {
                    "activa"?: boolean | null,"created_at"?: string | null,"docente_id"?: string,"id"?: string,"nivel": string,"nombre": string
                  }
                  Update: {
                    "activa"?: boolean | null,"created_at"?: string | null,"docente_id"?: string,"id"?: string,"nivel"?: string,"nombre"?: string
                  }
                  Relationships: [
                    
                  ]
                },"mesas_examen": {
                  Row: {
                    "acta_numero": string | null,"catedra_id": string,"condicion_acta": string | null,"created_at": string | null,"docente_id": string,"fecha": string,"folio": string | null,"id": string,"libro": string | null,"presidente": string,"tipo_mesa": string | null,"tomo": string | null,"turno_llamado": string,"vocal_1": string | null,"vocal_2": string | null
                  }
                  Insert: {
                    "acta_numero"?: string | null,"catedra_id": string,"condicion_acta"?: string | null,"created_at"?: string | null,"docente_id"?: string,"fecha": string,"folio"?: string | null,"id"?: string,"libro"?: string | null,"presidente": string,"tipo_mesa"?: string | null,"tomo"?: string | null,"turno_llamado": string,"vocal_1"?: string | null,"vocal_2"?: string | null
                  }
                  Update: {
                    "acta_numero"?: string | null,"catedra_id"?: string,"condicion_acta"?: string | null,"created_at"?: string | null,"docente_id"?: string,"fecha"?: string,"folio"?: string | null,"id"?: string,"libro"?: string | null,"presidente"?: string,"tipo_mesa"?: string | null,"tomo"?: string | null,"turno_llamado"?: string,"vocal_1"?: string | null,"vocal_2"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mesas_examen_catedra_id_fkey"
      columns: ["catedra_id"]
isOneToOne: false
      referencedRelation: "catedras"
      referencedColumns: ["id"]
    }
                  ]
                },"notas": {
                  Row: {
                    "calificacion": number | null,"created_at": string | null,"estado": string | null,"estudiante_id": string,"evaluacion_id": string,"id": string,"nota": number | null,"observaciones": string | null,"updated_at": string | null,"valor": number | null
                  }
                  Insert: {
                    "calificacion"?: number | null,"created_at"?: string | null,"estado"?: string | null,"estudiante_id": string,"evaluacion_id": string,"id"?: string,"nota"?: number | null,"observaciones"?: string | null,"updated_at"?: string | null,"valor"?: number | null
                  }
                  Update: {
                    "calificacion"?: number | null,"created_at"?: string | null,"estado"?: string | null,"estudiante_id"?: string,"evaluacion_id"?: string,"id"?: string,"nota"?: number | null,"observaciones"?: string | null,"updated_at"?: string | null,"valor"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notas_estudiante_id_fkey"
      columns: ["estudiante_id"]
isOneToOne: false
      referencedRelation: "estudiantes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notas_evaluacion_id_fkey"
      columns: ["evaluacion_id"]
isOneToOne: false
      referencedRelation: "evaluaciones"
      referencedColumns: ["id"]
    }
                  ]
                },"perfiles": {
                  Row: {
                    "created_at": string | null,"email": string | null,"id": string,"nombre": string | null,"rol": string | null,"updated_at": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"email"?: string | null,"id": string,"nombre"?: string | null,"rol"?: string | null,"updated_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"email"?: string | null,"id"?: string,"nombre"?: string | null,"rol"?: string | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"periodos_academicos": {
                  Row: {
                    "ciclo_id": string,"docente_id": string | null,"fecha_fin": string | null,"fecha_inicio": string | null,"id": string,"nombre": string,"tipo": string | null
                  }
                  Insert: {
                    "ciclo_id": string,"docente_id"?: string | null,"fecha_fin"?: string | null,"fecha_inicio"?: string | null,"id"?: string,"nombre": string,"tipo"?: string | null
                  }
                  Update: {
                    "ciclo_id"?: string,"docente_id"?: string | null,"fecha_fin"?: string | null,"fecha_inicio"?: string | null,"id"?: string,"nombre"?: string,"tipo"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "periodos_academicos_ciclo_id_fkey"
      columns: ["ciclo_id"]
isOneToOne: false
      referencedRelation: "ciclos_lectivos"
      referencedColumns: ["id"]
    }
                  ]
                },"recordatorios_enviados": {
                  Row: {
                    "created_at": string,"destinatario_canal": string,"enviado_en": string,"error": string | null,"estado": string,"evento_id": string,"evento_origen": string,"evento_uuid": string | null,"id": string,"intentos": number,"payload_hash": string | null,"tipo_aviso": string,"tipo_evento": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"destinatario_canal": string,"enviado_en"?: string,"error"?: string | null,"estado"?: string,"evento_id": string,"evento_origen"?: string,"evento_uuid"?: string | null,"id"?: string,"intentos"?: number,"payload_hash"?: string | null,"tipo_aviso": string,"tipo_evento": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"destinatario_canal"?: string,"enviado_en"?: string,"error"?: string | null,"estado"?: string,"evento_id"?: string,"evento_origen"?: string,"evento_uuid"?: string | null,"id"?: string,"intentos"?: number,"payload_hash"?: string | null,"tipo_aviso"?: string,"tipo_evento"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recursos": {
                  Row: {
                    "catedra_id": string,"categoria": string,"created_at": string | null,"id": string,"tipo_origen": string,"titulo": string,"url_o_path": string
                  }
                  Insert: {
                    "catedra_id": string,"categoria": string,"created_at"?: string | null,"id"?: string,"tipo_origen": string,"titulo": string,"url_o_path": string
                  }
                  Update: {
                    "catedra_id"?: string,"categoria"?: string,"created_at"?: string | null,"id"?: string,"tipo_origen"?: string,"titulo"?: string,"url_o_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recursos_catedra_id_fkey"
      columns: ["catedra_id"]
isOneToOne: false
      referencedRelation: "catedras"
      referencedColumns: ["id"]
    }
                  ]
                },"unidades_tematicas": {
                  Row: {
                    "catedra_id": string,"created_at": string | null,"descripcion": string | null,"docente_id": string,"id": string,"numero": number,"titulo": string
                  }
                  Insert: {
                    "catedra_id": string,"created_at"?: string | null,"descripcion"?: string | null,"docente_id"?: string,"id"?: string,"numero": number,"titulo": string
                  }
                  Update: {
                    "catedra_id"?: string,"created_at"?: string | null,"descripcion"?: string | null,"docente_id"?: string,"id"?: string,"numero"?: number,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "unidades_tematicas_catedra_id_fkey"
      columns: ["catedra_id"]
isOneToOne: false
      referencedRelation: "catedras"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_cambiar_rol":
{ Args: { "p_nuevo_rol": string,"p_usuario_id": string }; Returns: undefined
                           },
"admin_purgar_huerfanos_docente":
{ Args: { "p_docente_id": string }; Returns: Json
                           },
"consultar_estado_alumno":
{ Args: { "p_catedra_id": string,"p_dni": string }; Returns: Json
                           },
"consultar_estado_estudiante":
{ Args: { "p_catedra_id": string,"p_dni": string }; Returns: Json
                           },
"es_superadmin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"get_alumnos_elegibles_mesa":
{ Args: { "p_catedra_id": string,"p_condicion_acta": string }; Returns: {
              "apellido": string,"ciclo_anio": number,"ciclo_nombre": string,"dni": string,"estado_cursada": string,"estudiante_id": string,"intentos_previos": number,"nombre": string
            }[]
                           },
"guardar_acta_examen_lote":
{ Args: { "p_catedra_id": string,"p_filas": Json,"p_mesa_id": string }; Returns: Json
                           },
"registrar_resultado_examen":
{ Args: { "p_catedra_id": string,"p_ciclo_id": string,"p_condicion": string,"p_estudiante_id": string,"p_mesa_id": string,"p_nota_definitiva": number,"p_nota_escrito": number,"p_nota_oral": number,"p_observaciones"?: string,"p_resultado": string }; Returns: undefined
                           },
"set_institucion_activa":
{ Args: { "p_docente_id": string,"p_inst_id": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
