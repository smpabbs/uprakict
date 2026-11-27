// Soal / instruksi ujian per jenjang (7/8/9) dan progul (ICT / Non-ICT).
// Disimpan di Google Drive sebagai _soal.json di folder ujian — tanpa database.
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

export interface Soal {
  judul: string
  isi: string
  updated_at?: string
  oleh?: string
}

export type PetaSoal = Record<string, Soal>

const NAMA_BERKAS = "_soal.json"

/** Kunci slot: "7-ICT", "7-NONICT", ... */
export function kunciSoal(tingkat: string | number, target: "ICT" | "NONICT"): string {
  return `${tingkat}-${target}`
}

export function semuaSlot(): { kunci: string; tingkat: string; target: "ICT" | "NONICT"; label: string }[] {
  const hasil = []
  for (const tingkat of ["7", "8", "9"]) {
    for (const target of ["ICT", "NONICT"] as const) {
      hasil.push({
        kunci: kunciSoal(tingkat, target),
        tingkat,
        target,
        label: `Kelas ${tingkat} · ${target === "ICT" ? "Progul ICT" : "Non-ICT (TCP/VCP)"}`,
      })
    }
  }
  return hasil
}

/** Tingkat (7/8/9) dari kelas "7C" atau "8A IBN FIRNAS". */
export function tingkatKelas(kelas: string | null | undefined): string | null {
  const m = String(kelas ?? "").trim().match(/^(\d{1,2})/)
  return m ? m[1] : null
}

/** Target progul dari nilai kolom progul siswa. */
export function targetProgul(progul: string | null | undefined): "ICT" | "NONICT" {
  return (progul ?? "").toUpperCase() === "ICT" ? "ICT" : "NONICT"
}

async function folderUjian(): Promise<string> {
  return pastikanFolder(folderUjianRoot(), namaFolderUjian(UJIAN.tahunAjaran, UJIAN.semester))
}

export async function bacaSoal(): Promise<PetaSoal> {
  const folder = await folderUjian()
  const berkas = await daftarBerkas(folder, NAMA_BERKAS)
  if (!berkas.length) return {}
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${berkas[0].id}?alt=media`, {
    headers: { Authorization: "Bearer " + (await tokenInternal()) },
    cache: "no-store",
  })
  if (!res.ok) return {}
  try {
    return (await res.json()) as PetaSoal
  } catch {
    return {}
  }
}

export async function simpanSoal(
  kunci: string,
  data: { judul: string; isi: string; oleh: string }
): Promise<void> {
  const folder = await folderUjian()
  const lama = await bacaSoal()
  const peta: PetaSoal = {
    ...lama,
    [kunci]: {
      judul: data.judul,
      isi: data.isi,
      oleh: data.oleh,
      updated_at: new Date().toISOString(),
    },
  }
  const isiBaru = new TextEncoder().encode(JSON.stringify(peta, null, 2))
  const berkas = await daftarBerkas(folder, NAMA_BERKAS)
  for (const b of berkas) {
    try {
      await hapusBerkas(b.id)
    } catch {
      /* lanjut */
    }
  }
  await unggahBerkas(folder, NAMA_BERKAS, isiBaru.buffer as ArrayBuffer, "application/json")
}
