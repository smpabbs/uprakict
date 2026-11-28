// Soal / instruksi ujian per jenjang (7/8/9) dan progul (ICT / Non-ICT).
// Berkas soal disimpan di subfolder _soal; metadata di _soal.json — tanpa database.
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

export interface BerkasSoal {
  id: string
  name: string
  mime: string
}

export interface Soal {
  judul: string
  isi: string
  fileId?: string
  fileName?: string
  mime?: string
  lampiran?: BerkasSoal | null
  updated_at?: string
  oleh?: string
}

export type PetaSoal = Record<string, Soal>

const NAMA_BERKAS = "_soal.json"
const NAMA_FOLDER = "_soal"

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

export function slotDariKunci(kunci: string) {
  return semuaSlot().find((s) => s.kunci === kunci) ?? null
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

/** Folder berkas soal (dibuat bila belum ada). */
export async function folderSoal(): Promise<string> {
  return pastikanFolder(await folderUjian(), NAMA_FOLDER)
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

/**
 * Simpan satu slot. Berkas baru menggantikan berkas lama; teks/lampiran lama
 * dipertahankan bila tidak dikirim. `lampiran: null` menghapus lampiran.
 */
export async function simpanSoal(
  kunci: string,
  data: {
    judul?: string
    isi?: string
    file?: { id: string; name: string; mime: string }
    lampiran?: { id: string; name: string; mime: string } | null
    oleh: string
  }
): Promise<void> {
  const folder = await folderUjian()
  const lama = await bacaSoal()
  const sebelum = lama[kunci]
  const baru: Soal = {
    judul: data.judul ?? sebelum?.judul ?? "",
    isi: data.isi ?? sebelum?.isi ?? "",
    fileId: data.file?.id ?? sebelum?.fileId,
    fileName: data.file?.name ?? sebelum?.fileName,
    mime: data.file?.mime ?? sebelum?.mime,
    lampiran: data.lampiran === undefined ? (sebelum?.lampiran ?? null) : data.lampiran,
    updated_at: new Date().toISOString(),
    oleh: data.oleh,
  }
  const peta: PetaSoal = { ...lama, [kunci]: baru }
  const isiBaru = new TextEncoder().encode(JSON.stringify(peta, null, 2))
  const berkasLama = await daftarBerkas(folder, NAMA_BERKAS)

  // Unggah versi baru dulu; bacaSoal mengambil yang terbaru (createdTime desc),
  // jadi metadata lama tetap utuh bila unggahan gagal.
  const tersimpan = await unggahBerkas(
    folder,
    NAMA_BERKAS,
    isiBaru.buffer as ArrayBuffer,
    "application/json"
  )
  for (const b of berkasLama) {
    if (b.id === tersimpan.id) continue
    try {
      await hapusBerkas(b.id)
    } catch {
      /* biarkan */
    }
  }

  // berkas soal/lampiran lama baru dihapus setelah metadata tersimpan
  const takTerpakai = [sebelum?.fileId, sebelum?.lampiran?.id]
  const masihDipakai = [baru.fileId, baru.lampiran?.id]
  for (const id of takTerpakai) {
    if (!id || masihDipakai.includes(id)) continue
    try {
      await hapusBerkas(id)
    } catch {
      /* biarkan */
    }
  }
}
