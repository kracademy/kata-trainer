import { useEffect, useRef, useState } from 'react';
import { db } from '../db/db';
import { downloadJson, exportBackup, importBackup, type BackupFile } from '../logic/backup';
import { syncDataset } from '../data/dataset';

export default function Settings() {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  async function doExport() {
    const data = await exportBackup();
    downloadJson(data, `kata-trainer-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setMsg(`Backup exportado (${data.attempts.length} intentos).`);
  }

  async function doImport(file: File) {
    try {
      const data = JSON.parse(await file.text()) as BackupFile;
      await importBackup(data);
      setMsg('Backup importado correctamente.');
    } catch (e) {
      setMsg(`Error al importar: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function resetAttempts() {
    if (!confirm('¿Borrar TODOS tus intentos y estadísticas? Esta acción no se puede deshacer.')) return;
    await db.attempts.clear();
    setMsg('Intentos borrados.');
  }

  return (
    <>
      <h1>Ajustes</h1>

      <h2>Copia de seguridad</h2>
      <div className="card">
        <p className="muted">
          Tus intentos y estadísticas viven solo en este dispositivo. Exporta un backup de vez en cuando
          (especialmente en iPhone, donde el sistema puede purgar datos de apps poco usadas).
        </p>
        <button className="btn-primary" onClick={doExport}>⬇️ Exportar datos (JSON)</button>
        <button className="btn-secondary" onClick={() => fileRef.current?.click()}>⬆️ Importar datos</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
        />
      </div>

      <h2>Datos</h2>
      <div className="card">
        <p className="muted">
          El catálogo de actuaciones se publica con la app. Para añadir un campeonato nuevo, pídeselo a Claude
          en un chat y aparecerá aquí tras la actualización.
        </p>
        <button className="btn-secondary" onClick={async () => { await syncDataset(); setMsg('Dataset sincronizado.'); }}>
          🔄 Re-sincronizar dataset
        </button>
        <p className="muted">
          Almacenamiento persistente: {persisted == null ? 'desconocido' : persisted ? '✅ concedido' : '⚠️ no concedido'}
        </p>
      </div>

      <h2>Zona de peligro</h2>
      <div className="card">
        <button className="btn-secondary" style={{ borderColor: '#8f2a22', color: '#ef9a93' }} onClick={resetAttempts}>
          🗑️ Borrar todos mis intentos
        </button>
      </div>

      {msg && <div className="card" role="status">{msg}</div>}
      <p className="muted center">Kracademy Kata Trainer · v0.1 · Fase 1</p>
    </>
  );
}
