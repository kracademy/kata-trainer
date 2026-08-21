// Vídeos locales (sin anuncios, sin conexión): se guardan en el almacenamiento privado
// de la app (OPFS) y se reconocen por nombre de archivo:
//   <performanceId>.mp4 → clip del encuentro ya cortado (empieza en el inicio del bout)
//   <videoId>.mp4       → vídeo completo de YouTube (se usan los tiempos absolutos)

const EXTS = ['mp4', 'm4v', 'mov', 'webm'];

async function videosDir(create: boolean): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle('videos', { create });
  } catch {
    return null; // OPFS no disponible
  }
}

export interface LocalVideoInfo {
  name: string;
  size: number;
}

export async function listLocalVideos(): Promise<LocalVideoInfo[]> {
  const dir = await videosDir(false);
  if (!dir) return [];
  const out: LocalVideoInfo[] = [];
  for await (const handle of dir.values()) {
    if (handle.kind === 'file') {
      const f = await (handle as FileSystemFileHandle).getFile();
      out.push({ name: f.name, size: f.size });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function importVideoFile(file: File, onProgress?: (pct: number) => void): Promise<void> {
  const dir = await videosDir(true);
  if (!dir) throw new Error('Este navegador no soporta el almacén de vídeos (OPFS).');
  const fh = await dir.getFileHandle(file.name, { create: true });
  const writable = await fh.createWritable();
  const reader = file.stream().getReader();
  let written = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    await writable.write(value);
    written += value.byteLength;
    onProgress?.(Math.round((written / file.size) * 100));
  }
  await writable.close();
}

export async function deleteLocalVideo(name: string): Promise<void> {
  const dir = await videosDir(false);
  if (dir) await dir.removeEntry(name);
}

/** Busca un archivo local probando cada base con las extensiones conocidas (o el nombre exacto). */
export async function findLocalVideo(baseNames: string[]): Promise<File | null> {
  const dir = await videosDir(false);
  if (!dir) return null;
  for (const base of baseNames) {
    for (const ext of EXTS) {
      try {
        const fh = await dir.getFileHandle(`${base}.${ext}`);
        return await fh.getFile();
      } catch {
        // no existe con esta extensión
      }
    }
  }
  return null;
}
