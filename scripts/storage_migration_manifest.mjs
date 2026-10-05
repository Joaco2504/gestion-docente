import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

/**
 * ==============================================================================
 * KORUM: STORAGE OBJECTS MIGRATION & MANIFEST GENERATOR
 * ==============================================================================
 * 
 * Audita y normaliza los objetos en el bucket 'archivos-docentes' para que sigan
 * la estructura segura: {docente_id}/{catedra_id}/{filename}.
 * 
 * Uso:
 *   node scripts/storage_migration_manifest.mjs               (Modo dry-run por defecto)
 *   node scripts/storage_migration_manifest.mjs --dry-run     (Genera manifiesto sin cambios)
 *   node scripts/storage_migration_manifest.mjs --execute     (Aplica copias y actualiza referencias)
 * 
 * Regla de seguridad: Cero borrado de archivos originales sin confirmación explícita.
 */

// Cargar variables de entorno
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match && !match[1].startsWith('#')) {
      const key = match[1];
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[key] = val.trim();
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const isDryRun = !process.argv.includes('--execute');

async function run() {
  console.log('================================================================');
  console.log(`  AUDITORÍA Y MIGRACIÓN DE STORAGE: ARCHIVOS-DOCENTES`);
  console.log(`  Modo: ${isDryRun ? 'DRY-RUN (Solo reporte y manifiesto)' : 'EJECUCIÓN REAL'}`);
  console.log('================================================================\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Listar objetos en el bucket
  const { data: objects, error: listErr } = await supabase.storage
    .from('archivos-docentes')
    .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

  if (listErr) {
    console.error('Error al listar bucket archivos-docentes:', listErr.message);
    process.exit(1);
  }

  // 2. Traer cátedras para resolver docente_id si falta en el path
  const { data: catedras } = await supabase
    .from('catedras')
    .select('id, docente_id, nombre');

  const catMap = new Map((catedras || []).map(c => [c.id, c]));

  const manifest = [];
  const compliant = [];
  const nonCompliant = [];

  // Función recursiva para listar objetos en subcarpetas
  async function scanFolder(folderPrefix = '') {
    const { data: items, error } = await supabase.storage
      .from('archivos-docentes')
      .list(folderPrefix, { limit: 1000 });

    if (error) return;

    for (const item of (items || [])) {
      const itemPath = folderPrefix ? `${folderPrefix}/${item.name}` : item.name;
      if (item.id === null) {
        // Es un directorio
        await scanFolder(itemPath);
      } else {
        // Es un archivo
        const parts = itemPath.split('/');
        if (parts.length >= 3) {
          // Ya tiene formato {docente_id}/{catedra_id}/{filename}
          compliant.push({ path: itemPath, size: item.metadata?.size });
        } else {
          // Formato legacy {catedra_id}/{filename} o plano
          nonCompliant.push({ path: itemPath, parts });
        }
      }
    }
  }

  await scanFolder('');

  console.log(`Objetos encontrados: ${compliant.length + nonCompliant.length}`);
  console.log(`- Cumplen convención {docente_id}/{catedra_id}/{archivo}: ${compliant.length}`);
  console.log(`- Requieren migración: ${nonCompliant.length}\n`);

  for (const item of nonCompliant) {
    let sourcePath = item.path;
    let targetPath = sourcePath;
    let docenteId = null;
    let catedraId = null;

    if (item.parts.length === 2) {
      // Posible catedra_id/filename
      const candidateCatId = item.parts[0];
      const filename = item.parts[1];
      const cat = catMap.get(candidateCatId);
      if (cat) {
        catedraId = cat.id;
        docenteId = cat.docente_id;
        targetPath = `${docenteId}/${catedraId}/${filename}`;
      }
    }

    manifest.push({
      source_path: sourcePath,
      target_path: targetPath,
      docente_id: docenteId,
      catedra_id: catedraId,
      status: targetPath !== sourcePath ? 'PENDING_MIGRATION' : 'UNRESOLVED_PATH'
    });
  }

  const manifestFile = path.resolve('storage_migration_manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify({
    generated_at: new Date().toISOString(),
    is_dry_run: isDryRun,
    compliant_count: compliant.length,
    migration_count: manifest.length,
    manifest
  }, null, 2));

  console.log(`Manifiesto escrito en: ${manifestFile}`);

  if (isDryRun) {
    console.log('\n[Dry-Run Finalizado] No se modificó ningún objeto en Storage ni en la base.');
  } else {
    console.log('\n[Ejecución] Ejecutando copias y actualización de referencias...');
    for (const entry of manifest) {
      if (entry.status === 'PENDING_MIGRATION') {
        // Copiar objeto
        const { error: copyErr } = await supabase.storage
          .from('archivos-docentes')
          .copy(entry.source_path, entry.target_path);

        if (!copyErr) {
          entry.status = 'COPIED';
          // Actualizar referencias en recursos
          await supabase
            .from('recursos')
            .update({ url_o_path: entry.target_path })
            .ilike('url_o_path', `%${entry.source_path}%`);

          // Actualizar referencias en evaluaciones
          await supabase
            .from('evaluaciones')
            .update({ archivo_url: entry.target_path })
            .ilike('archivo_url', `%${entry.source_path}%`);
        }
      }
    }
    fs.writeFileSync(manifestFile, JSON.stringify({
      completed_at: new Date().toISOString(),
      manifest
    }, null, 2));
    console.log('Migración completada. Los archivos originales NO han sido eliminados.');
  }
}

run().catch(err => {
  console.error('Error durante la auditoría de storage:', err);
  process.exit(1);
});
