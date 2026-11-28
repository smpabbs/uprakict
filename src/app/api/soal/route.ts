import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun, penugasanGuru } from "@/lib/lms"
import { MAKS_BYTE, MAKS_MB } from "@/lib/env"
import { hapusBerkas, unggahBerkas } from "@/lib/drive"
import { folderSoal, simpanSoal, slotDariKunci, tingkatKelas } from "@/lib/soal"

export const runtime = "edge"
export const dynamic = "force-dynamic"

/** Simpan soal satu slot: unggah berkas (guru/admin) atau teks. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const asal = new URL("/soal", request.url)
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303)

  const akun = await ambilAkun(user.id)
  if (!akun || !["admin", "guru"].includes(akun.role)) {
    asal.searchParams.set("e", "Hanya admin atau guru yang boleh mengubah soal.")
    return NextResponse.redirect(asal, 303)
  }

  const form = await request.formData()
  const kunci = String(form.get("kunci") ?? "")
  const slot = slotDariKunci(kunci)
  if (!slot) {
    asal.searchParams.set("e", "Slot soal tidak dikenal.")
    return NextResponse.redirect(asal, 303)
  }

  // guru hanya boleh mengunggah slot (jenjang + progul) yang diampu
  if (akun.role !== "admin") {
    const daftar = await penugasanGuru(akun.id)
    const cocok = daftar.some(
      (p) => tingkatKelas(p.kelas) === slot.tingkat && p.target === slot.target
    )
    if (!cocok) {
      asal.searchParams.set("e", `Anda tidak mengajar ${slot.label}.`)
      return NextResponse.redirect(asal, 303)
    }
  }

  const berkas = form.get("berkas")
  const lampiranMasuk = form.get("lampiran")
  const hapusLampiran = String(form.get("hapus_lampiran") ?? "") === "1"
  const judul = String(form.get("judul") ?? "").trim()
  const isi = String(form.get("isi") ?? "")

  const soalFile = berkas instanceof File && berkas.size > 0 ? berkas : null
  const lampiranFile = lampiranMasuk instanceof File && lampiranMasuk.size > 0 ? lampiranMasuk : null

  const salah = (pesan: string) => {
    asal.searchParams.set("e", pesan)
    return NextResponse.redirect(asal, 303)
  }

  // Berkas soal wajib PDF supaya bisa ditampilkan tersemat di halaman siswa;
  // dokumen lain masuk sebagai lampiran yang bisa diunduh.
  if (soalFile && soalFile.type !== "application/pdf") {
    return salah("Berkas soal harus PDF. Dokumen lain silakan unggah di kolom lampiran.")
  }
  const terlaluBesar = [soalFile, lampiranFile].find((f) => f && f.size > MAKS_BYTE)
  if (terlaluBesar) return salah(`Berkas melebihi batas ${MAKS_MB} MB.`)

  const unggahan: string[] = []
  const bersihkan = async () => {
    for (const id of unggahan) {
      try {
        await hapusBerkas(id)
      } catch {
        /* biarkan */
      }
    }
  }

  // nama berkas di Drive WAJIB ASCII: Drive menolak nama non-ASCII pada unggahan
  // multipart. Nama asli tetap disimpan di metadata untuk ditampilkan.
  const namaAman = (f: File, cadangan: string) => {
    const ascii = (f.name || cadangan).normalize("NFKD").replace(/[^\x20-\x7E]/g, "")
    return ascii.replace(/[\\/:*?"<>|]/g, "").trim() || cadangan
  }
  const namaAsli = (f: File, cadangan: string) =>
    (f.name || cadangan).replace(/[\\/:*?"<>|]/g, "").trim() || cadangan

  try {
    const folder = await folderSoal()

    const data: Parameters<typeof simpanSoal>[1] = { oleh: akun.nama }

    if (soalFile) {
      const hasil = await unggahBerkas(
        folder,
        `${kunci} - ${namaAman(soalFile, "soal.pdf")}`,
        await soalFile.arrayBuffer(),
        "application/pdf"
      )
      unggahan.push(hasil.id)
      data.file = { id: hasil.id, name: namaAsli(soalFile, "soal.pdf"), mime: "application/pdf" }
      data.judul = judul || namaAsli(soalFile, "soal.pdf").replace(/\.[^.]+$/, "")
    }

    if (lampiranFile) {
      const hasil = await unggahBerkas(
        folder,
        `${kunci} - lampiran - ${namaAman(lampiranFile, "lampiran")}`,
        await lampiranFile.arrayBuffer(),
        lampiranFile.type || "application/octet-stream"
      )
      unggahan.push(hasil.id)
      data.lampiran = {
        id: hasil.id,
        name: namaAsli(lampiranFile, "lampiran"),
        mime: hasil.mimeType,
      }
    } else if (hapusLampiran) {
      data.lampiran = null
    }

    if (!soalFile) {
      if (judul) data.judul = judul
      if (isi.trim() || judul) data.isi = isi
      const adaPerubahan = Boolean(judul || isi.trim() || lampiranFile || hapusLampiran)
      if (!adaPerubahan) {
        return salah("Pilih berkas soal PDF, lampiran, atau isi judul/instruksi.")
      }
    }

    await simpanSoal(kunci, data)
  } catch (e) {
    await bersihkan()
    return salah((e as Error).message)
  }

  asal.searchParams.set("k", kunci)
  asal.searchParams.set("ok", "1")
  return NextResponse.redirect(asal, 303)
}
