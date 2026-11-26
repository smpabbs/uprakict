import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun } from "@/lib/lms"
import { infoUjian, namaSekolah, berkasSiswa } from "@/lib/ujian"
import { MAKS_MB } from "@/lib/env"
import UploadForm from "@/components/UploadForm"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default async function UnggahPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const akun = await ambilAkun(user.id)
  if (!akun) redirect("/")
  if (akun.role === "guru") redirect("/nilai")

  const [ujian, sekolah, berkas] = await Promise.all([
    infoUjian(),
    namaSekolah(akun.sekolah_id),
    berkasSiswa(akun, await namaSekolah(akun.sekolah_id)),
  ])

  const tutupLewat = ujian.tutup ? new Date(ujian.tutup) < new Date() : false

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Kumpulkan berkas</h1>
        <p className="text-muted-foreground">
          {ujian.nama} · {ujian.tahunAjaran} Semester {ujian.semester}
        </p>
        <p className="text-muted-foreground text-sm">
          {akun.nama} · NIS {akun.nis ?? "-"} · {sekolah}
        </p>
      </div>

      {ujian.deskripsi && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">{ujian.deskripsi}</div>
      )}

      {tutupLewat ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Batas pengumpulan sudah lewat ({ujian.tutup}). Hubungi guru ICT bila masih perlu mengumpulkan.
        </div>
      ) : (
        <UploadForm maksMb={MAKS_MB} tutup={ujian.tutup} />
      )}

      {berkas.length > 0 && (
        <div className="rounded-lg border p-4 space-y-1">
          <p className="text-sm font-medium">Berkas yang sudah ada</p>
          {berkas.map((b) => (
            <p key={b.id} className="text-xs text-muted-foreground break-all">
              {b.name} · {new Date(b.createdTime).toLocaleString("id-ID")}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">Mengunggah berkas baru akan mengganti berkas lama.</p>
        </div>
      )}

      <Link href="/" className="text-sm text-primary underline">← Kembali ke beranda</Link>
    </div>
  )
}
