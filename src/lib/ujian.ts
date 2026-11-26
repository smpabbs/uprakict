// Logika domain: struktur folder Drive, simpan pengumpulan, rekap & nilai.
// SEMUA data (berkas + nilai) tinggal di Google Drive — tidak ada tabel Supabase.
import {
  pastikanFolder,
  pastikanRekap,
  daftarBerkas,
  unggahBerkas,
  hapusBerkas,
  bacaNilai,
  simpanNilai,
  folderUjianRoot,
  namaFolderUjian,
  tautanFolder,
  type BerkasDrive,
} from "./drive"
import { UJIAN } from "./env"
import { daftarSekolah, type Akun } from "./lms"

export interface UjianAktif {
  nama: string
  deskripsi: string
  tahunAjaran: string
  semester: number
  tutup: string
  folderId: string
  folderUrl: string
  rekapId: string
}

const cacheFolder = new Map<string, string>()

export async function infoUjian(): Promise<UjianAktif> {
  const nama = namaFolderUjian(UJIAN.tahunAjaran, UJIAN.semester)
  let folderId = cacheFolder.get(nama)
  if (!folderId) {
    folderId = await pastikanFolder(folderUjianRoot(), nama)
    cacheFolder.set(nama, folderId)
  }
  const rekapId = await pastikanRekap(folderId)
  return {
    nama: UJIAN.nama,
    deskripsi: UJIAN.deskripsi,
    tahunAjaran: UJIAN.tahunAjaran,
    semester: UJIAN.semester,
    tutup: UJIAN.tutup,
    folderId,
    folderUrl: tautanFolder(folderId),
    rekapId,
  }
}

export async function namaSekolah(sekolahId: string | null): Promise<string> {
  if (!sekolahId) return "Tanpa Sekolah"
  try {
    const semua = await daftarSekolah()
    return semua.find((s) => s.id === sekolahId)?.nama ?? "Sekolah " + sekolahId.slice(0, 8)
  } catch {
    return "Sekolah"
  }
}

/** Folder per sekolah di dalam folder ujian aktif. */
export async function folderSekolah(nama: string): Promise<string> {
  const ujian = await infoUjian()
  return pastikanFolder(ujian.folderId, nama)
}

export function namaBerkasSiswa(akun: Akun): string {
  return `${akun.nis ?? akun.id.slice(0, 8)} ${akun.nama}`
}

/** Berkas yang sudah dikumpulkan siswa ini (bisa lebih dari satu versi). */
export async function berkasSiswa(akun: Akun, namaSekolahStr: string): Promise<BerkasDrive[]> {
  const folder = await folderSekolah(namaSekolahStr)
  const semua = await daftarBerkas(folder)
  const nis = akun.nis ?? ""
  if (!nis) return []
  return semua.filter((f) => f.name.startsWith(nis + " "))
}

export interface BarisRekap {
  nis: string
  nama: string
  kelas: string
  berkas: BerkasDrive | null
  nilai: string
  feedback: string
  oleh: string
  pada: string
}

/** Rekap semua siswa satu sekolah: status kumpul (Drive) + nilai (Sheets). */
export async function rekapSekolah(
  siswa: Akun[],
  namaSekolahStr: string
): Promise<{ baris: BarisRekap[]; folderUrl: string; rekapUrl: string }> {
  const ujian = await infoUjian()
  const folderId = await folderSekolah(namaSekolahStr)
  const [berkas, nilai] = await Promise.all([daftarBerkas(folderId), bacaNilai(ujian.rekapId)])

  const peta = new Map<string, BerkasDrive>()
  for (const b of berkas) {
    const nis = b.name.split(" ")[0]
    const lama = peta.get(nis)
    if (!lama || (b.createdTime ?? "") > (lama.createdTime ?? "")) peta.set(nis, b)
  }

  const baris: BarisRekap[] = siswa.map((s) => {
    const n = nilai.get(namaSekolahStr + "|" + (s.nis ?? ""))
    return {
      nis: s.nis ?? "-",
      nama: s.nama,
      kelas: s.kelas ?? "-",
      berkas: peta.get(s.nis ?? "") ?? null,
      nilai: n?.nilai ?? "",
      feedback: n?.feedback ?? "",
      oleh: n?.oleh ?? "",
      pada: n?.pada ?? "",
    }
  })
  return {
    baris,
    folderUrl: tautanFolder(folderId),
    rekapUrl: `https://docs.google.com/spreadsheets/d/${ujian.rekapId}/edit`,
  }
}

export async function simpanPengumpulan(
  akun: Akun,
  namaSekolahStr: string,
  data: { nama: string; mime: string; bytes: ArrayBuffer }
): Promise<BerkasDrive> {
  const folder = await folderSekolah(namaSekolahStr)
  const nis = akun.nis ?? akun.id.slice(0, 8)
  const ekst = data.nama.includes(".") ? data.nama.slice(data.nama.lastIndexOf(".")) : ""
  const bersih = akun.nama.replace(/[\\/:*?"<>|]/g, "").trim()
  const namaBerkas = `${nis} ${bersih}${ekst}`

  // versi lama dihapus supaya tidak menumpuk
  const lama = (await daftarBerkas(folder)).filter((f) => f.name.startsWith(nis + " "))
  for (const l of lama) {
    try {
      await hapusBerkas(l.id)
    } catch {
      /* biarkan bila gagal, unggahan baru tetap lanjut */
    }
  }

  return unggahBerkas(folder, namaBerkas, data.bytes, data.mime)
}

export async function simpanNilaiSiswa(args: {
  namaSekolahStr: string
  nis: string
  nama: string
  kelas: string
  nilai: string
  feedback: string
  oleh: string
}): Promise<void> {
  const ujian = await infoUjian()
  await simpanNilai(ujian.rekapId, {
    sekolah: args.namaSekolahStr,
    nis: args.nis,
    nama: args.nama,
    kelas: args.kelas,
    nilai: args.nilai,
    feedback: args.feedback,
    oleh: args.oleh,
    pada: new Date().toISOString(),
  })
}
