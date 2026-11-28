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

  const ujian = await infoUjian()
  const sekolah = await namaSekolah(akun.sekolah_id)
  const berkas = await berkasSiswa(akun, sekolah)
  const tutupLewat = ujian.tutup ? new Date(ujian.tutup) < new Date() : false

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-2xl border border-[#cbd5e1] bg-[#f5f8fb] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f6b63]">Pengumpulan berkas</p>
        <h1 className="mt-1 text-xl font-semibold text-[#0f172a]">{ujian.nama}</h1>
        <p className="mt-1 text-sm text-[#495663]">
          {akun.nama} · NIS {akun.nis ?? "-"} · {sekolah}
          {akun.kelas ? ` · Kelas ${akun.kelas}` : ""}
        </p>
        {ujian.deskripsi && <p className="mt-3 text-[13px] text-[#334155]">{ujian.deskripsi}</p>}
        <p className="mt-2 text-[12px] text-[#4d5968]">
          Berkas hanya bisa dilihat lewat akun sekolah Anda.
        </p>
      </section>

      {tutupLewat ? (
        <div className="rounded-2xl border border-[#f2b8b8] bg-[#fdeaea] p-5 text-sm text-[#b91c1c]">
          Batas pengumpulan sudah lewat ({ujian.tutup}). Hubungi guru ICT bila masih perlu mengumpulkan.
        </div>
      ) : (
        <section className="rounded-2xl border border-[#cbd5e1] bg-[#f5f8fb] p-5 sm:p-6">
          <UploadForm maksMb={MAKS_MB} tutup={ujian.tutup} />
        </section>
      )}

      {berkas.length > 0 && (
        <section className="rounded-2xl border border-[#cbd5e1] bg-[#f5f8fb] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4d5968]">Berkas tersimpan</p>
          <div className="mt-2 space-y-2">
            {berkas.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#cbd5e1] bg-[#eef3f8] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#0f172a]">{b.name}</p>
                  <p className="text-[11px] text-[#495663]">
                    {new Date(b.createdTime).toLocaleString("id-ID")}
                    {b.size ? ` · ${(Number(b.size) / 1048576).toFixed(2)} MB` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/api/berkas/${b.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[#b6c2d0] px-2.5 py-1 text-[11px] font-semibold text-[#334155] hover:bg-[#dde5ee]"
                  >
                    Lihat
                  </a>
                  <a
                    href={`/api/berkas/${b.id}?mode=unduh`}
                    className="rounded-lg border border-[#b6c2d0] px-2.5 py-1 text-[11px] font-semibold text-[#334155] hover:bg-[#dde5ee]"
                  >
                    Unduh
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[#4d5968]">
            Mengunggah berkas baru akan mengganti berkas lama.
          </p>
        </section>
      )}

      <Link href="/" className="inline-block text-[13px] font-medium text-[#0f6b63] hover:underline">
        ← Kembali ke beranda
      </Link>
    </div>
  )
}
