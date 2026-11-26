import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun } from "@/lib/lms"
import { infoUjian, namaSekolah, berkasSiswa, rekapSekolah } from "@/lib/ujian"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default async function Beranda() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const akun = await ambilAkun(user.id)
  if (!akun) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
        Akun ini tidak punya profil di LMS. Hubungi admin sekolah.
      </div>
    )
  }

  const [ujian, sekolah] = await Promise.all([infoUjian(), namaSekolah(akun.sekolah_id)])

  if (akun.role === "guru") {
    const siswa = (await import("@/lib/lms")).siswaSekolah
    const daftar = await siswa(akun.sekolah_id ?? "")
    const { baris } = await rekapSekolah(daftar, sekolah)
    const terkumpul = baris.filter((b) => b.berkas).length
    const dinilai = baris.filter((b) => b.nilai !== "").length
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Beranda Guru</h1>
          <p className="text-muted-foreground">{akun.nama} · {sekolah}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Kartu label="Siswa" nilai={baris.length} />
          <Kartu label="Sudah mengumpulkan" nilai={terkumpul} />
          <Kartu label="Sudah dinilai" nilai={dinilai} />
        </div>
        <div className="rounded-xl border p-5 space-y-2">
          <h2 className="font-semibold">{ujian.nama}</h2>
          <p className="text-sm text-muted-foreground">
            {ujian.tahunAjaran} · Semester {ujian.semester}
            {ujian.tutup ? ` · batas ${ujian.tutup}` : " · masih dibuka"}
          </p>
          <div className="flex flex-wrap gap-3 pt-2 text-sm">
            <Link className="text-primary underline" href="/nilai">Rekap &amp; input nilai →</Link>
            <a className="text-primary underline" href={ujian.folderUrl} target="_blank" rel="noreferrer">
              Folder Drive ujian
            </a>
          </div>
        </div>
      </div>
    )
  }

  const berkas = await berkasSiswa(akun, sekolah)
  const terbaru = berkas[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{ujian.nama}</h1>
        <p className="text-muted-foreground">
          {akun.nama} · NIS {akun.nis ?? "-"} · {sekolah} {akun.kelas ? `· Kelas ${akun.kelas}` : ""}
        </p>
      </div>

      <div className="rounded-xl border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status pengumpulan</span>
          <span
            className={
              "text-xs font-semibold px-2 py-1 rounded " +
              (terbaru ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")
            }
          >
            {terbaru ? "SUDAH TERKUMPUL" : "BELUM MENGUMPULKAN"}
          </span>
        </div>
        {terbaru ? (
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="break-all">Berkas: <strong>{terbaru.name}</strong></p>
            <p>
              Diunggah: {new Date(terbaru.createdTime).toLocaleString("id-ID")}
              {terbaru.size ? ` · ${(Number(terbaru.size) / 1048576).toFixed(2)} MB` : ""}
            </p>
            {terbaru.webViewLink && (
              <a className="text-primary underline" href={terbaru.webViewLink} target="_blank" rel="noreferrer">
                Lihat berkas di Drive
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{ujian.deskripsi || "Belum ada berkas yang dikumpulkan."}</p>
        )}
        <Link
          href="/unggah"
          className="inline-block px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          {terbaru ? "Ganti berkas" : "Kumpulkan sekarang"}
        </Link>
      </div>
    </div>
  )
}

function Kartu({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold">{nilai}</p>
    </div>
  )
}
