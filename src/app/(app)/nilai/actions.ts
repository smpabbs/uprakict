"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun } from "@/lib/lms"
import { namaSekolah, simpanNilaiSiswa } from "@/lib/ujian"

export async function simpanNilaiAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Sesi habis")

  const guru = await ambilAkun(user.id)
  if (!guru || guru.role !== "guru") throw new Error("Hanya guru yang boleh menilai")

  const nis = String(formData.get("nis") ?? "").trim()
  const nama = String(formData.get("nama") ?? "").trim()
  const kelas = String(formData.get("kelas") ?? "").trim()
  const nilaiMentah = String(formData.get("nilai") ?? "").trim()
  const feedback = String(formData.get("feedback") ?? "").trim()

  if (!nis) throw new Error("NIS kosong")
  if (nilaiMentah !== "") {
    const n = Number(nilaiMentah)
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error("Nilai harus 0–100")
  }

  const sekolah = await namaSekolah(guru.sekolah_id)
  await simpanNilaiSiswa({
    namaSekolahStr: sekolah,
    nis,
    nama,
    kelas,
    nilai: nilaiMentah,
    feedback,
    oleh: guru.nama,
  })

  revalidatePath("/nilai")
  revalidatePath("/")
}
