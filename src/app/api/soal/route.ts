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
  const judul = String(form.get("judul") ?? "").trim()
  const isi = String(form.get("isi") ?? "")

  if (berkas instanceof File && berkas.size > 0) {
    if (berkas.size > MAKS_BYTE) {
      asal.searchParams.set("e", `Berkas melebihi batas ${MAKS_MB} MB.`)
      return NextResponse.redirect(asal, 303)
    }

    let unggahId: string | null = null
    try {
      // nama berkas di Drive WAJIB ASCII: Drive menolak nama non-ASCII pada unggahan
      // multipart. Judul di metadata tetap memakai nama asli.
      const aman = (berkas.name || "soal").normalize("NFKD").replace(/[^\x20-\x7E]/g, "")
      const asli = (berkas.name || "soal").replace(/[\\/:*?"<>|]/g, "").trim() || "soal"
      const namaDrive = aman.replace(/[\\/:*?"<>|]/g, "").trim() || "soal.pdf"
      const folder = await folderSoal()
      const hasil = await unggahBerkas(
        folder,
        `${kunci} - ${namaDrive}`,
        await berkas.arrayBuffer(),
        berkas.type
      )
      unggahId = hasil.id
      await simpanSoal(kunci, {
        judul: judul || asli.replace(/\.[^.]+$/, ""),
        file: { id: hasil.id, name: asli, mime: hasil.mimeType },
        oleh: akun.nama,
      })
    } catch (e) {
      if (unggahId) {
        try {
          await hapusBerkas(unggahId)
        } catch {
          /* biarkan */
        }
      }
      asal.searchParams.set("e", (e as Error).message)
      return NextResponse.redirect(asal, 303)
    }
  } else {
    if (!judul && !isi.trim()) {
      asal.searchParams.set("e", "Pilih berkas soal atau isi judul/instruksi.")
      return NextResponse.redirect(asal, 303)
    }
    try {
      await simpanSoal(kunci, { judul, isi, oleh: akun.nama })
    } catch (e) {
      asal.searchParams.set("e", (e as Error).message)
      return NextResponse.redirect(asal, 303)
    }
  }

  asal.searchParams.set("k", kunci)
  asal.searchParams.set("ok", "1")
  return NextResponse.redirect(asal, 303)
}
