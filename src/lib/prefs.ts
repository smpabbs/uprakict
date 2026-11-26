// Preferensi guru (kelas yang diampu) disimpan di Drive sebagai _guru.json,
// supaya daftar kelas per guru ada tanpa menyentuh database LMS.
import {
  pastikanFolder,
  daftarBerkas,
  unggahBerkas,
  hapusBerkas,
  folderUjianRoot,
  namaFolderUjian,
  tokenInternal,
} from "./drive"
import { UJIAN } from "./env"

type Peta = Record<string, string[]>

const NAMA_BERKAS = "_guru.json"

async function folderUjian(): Promise<string> {
  return pastikanFolder(folderUjianRoot(), namaFolderUjian(UJIAN.tahunAjaran, UJIAN.semester))
}

async function bacaPeta(): Promise<{ peta: Peta; id: string | null; folder: string }> {
  const folder = await folderUjian()
  const berkas = await daftarBerkas(folder, NAMA_BERKAS)
  if (!berkas.length) return { peta: {}, id: null, folder }
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${berkas[0].id}?alt=media`, {
    headers: { Authorization: "Bearer " + (await tokenInternal()) },
    cache: "no-store",
  })
  if (!res.ok) return { peta: {}, id: berkas[0].id, folder }
  try {
    return { peta: (await res.json()) as Peta, id: berkas[0].id, folder }
  } catch {
    return { peta: {}, id: berkas[0].id, folder }
  }
}

export async function kelasGuru(username: string): Promise<string[]> {
  try {
    const { peta } = await bacaPeta()
    return peta[username] ?? []
  } catch {
    return []
  }
}

export async function simpanKelasGuru(username: string, kelas: string[]): Promise<void> {
  const { peta, id, folder } = await bacaPeta()
  peta[username] = kelas
  const isi = new TextEncoder().encode(JSON.stringify(peta, null, 2))
  if (id) {
    try {
      await hapusBerkas(id)
    } catch {
      /* lanjut: unggahan baru tetap dibuat */
    }
  }
  await unggahBerkas(folder, NAMA_BERKAS, isi.buffer as ArrayBuffer, "application/json")
}
