import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun, siswaSekolah, kelasDiampu } from "@/lib/lms"
import { infoUjian, namaSekolah, berkasSiswa, rekapSekolah } from "@/lib/ujian"

export const runtime = "edge"
export const dynamic = "force-dynamic"

function Chip({ children, tone = "netral" }: { children: React.ReactNode; tone?: "netral" | "ok" | "warn" }) {
  const map = {
    netral: "bg-[#f1f5f9] text-[#475569]",
    ok: "bg-[#dcfce7] text-[#15803d]",
    warn: "bg-[#fef3c7] text-[#b45309]",
  }
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[tone]}`}>{children}</span>
}

export default async function Beranda() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const akun = await ambilAkun(user.id)
  if (!akun) {
    return (
      <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-5 text-sm text-[#b91c1c]">
        Akun ini belum punya profil di LMS. Hubungi admin sekolah.
      </div>
    )
  }

  const [ujian, sekolah] = await Promise.all([infoUjian(), namaSekolah(akun.sekolah_id)])

  if (akun.role === "guru") {
    const [daftar, diampu] = await Promise.all([siswaSekolah(akun.sekolah_id ?? ""), kelasDiampu(akun.id)])
    const { baris } = await rekapSekolah(daftar, sekolah)
    // hanya kelas yang ditugaskan di LMS (guru_mengajar, mapel ICT)
    const kelasSaya = diampu.filter((k) => daftar.some((d) => (d.kelas ?? "").toUpperCase() === k))

    const perKelas = kelasSaya
      .map((k) => {
        const isi = baris.filter((b) => b.kelas === k)
        return {
          kelas: k,
          total: isi.length,
          terkumpul: isi.filter((b) => b.berkas).length,
          dinilai: isi.filter((b) => b.nilai !== "").length,
          rata:
            isi.filter((b) => b.nilai !== "").length > 0
              ? Math.round(
                  isi.filter((b) => b.nilai !== "").reduce((a, b) => a + Number(b.nilai), 0) /
                    isi.filter((b) => b.nilai !== "").length
                )
              : null,
        }
      })
      .sort((a, b) => a.kelas.localeCompare(b.kelas))

    const total = perKelas.reduce((a, k) => a + k.total, 0)
    const terkumpul = perKelas.reduce((a, k) => a + k.terkumpul, 0)
    const dinilai = perKelas.reduce((a, k) => a + k.dinilai, 0)

    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f766e]">Ruang guru</p>
              <h1 className="mt-1 text-xl font-semibold text-[#0f172a] sm:text-2xl">{ujian.nama}</h1>
              <p className="mt-1 text-sm text-[#64748b]">
                {sekolah} · {ujian.tahunAjaran} semester {ujian.semester}
                {ujian.tutup ? ` · batas ${ujian.tutup}` : " · masih dibuka"}
              </p>
            </div>
            <Link
              href="/nilai"
              className="rounded-xl bg-[#0f766e] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#115e59]"
            >
              Mulai menilai
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Kelas diampu", nilai: perKelas.length },
              { label: "Siswa", nilai: total },
              { label: "Sudah kumpul", nilai: terkumpul },
              { label: "Sudah dinilai", nilai: dinilai },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[#e2e8f0] bg-[#fbfdff] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#94a3b8]">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#0f172a]">{s.nilai}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0f172a]">Kelas yang Anda ampu di LMS</h2>
            <Link href="/nilai" className="text-[12px] font-medium text-[#0f766e] hover:underline">
              Buka rekap
            </Link>
          </div>
          {perKelas.length === 0 && (
            <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-5 text-[13px] text-[#92400e]">
              Anda belum ditugaskan mengajar ICT di LMS untuk tahun ajaran ini. Hubungi kurikulum bila
              seharusnya ada kelas yang tampil.
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {perKelas.map((k) => {
              const persen = k.total ? Math.round((k.terkumpul / k.total) * 100) : 0
              return (
                <Link
                  key={k.kelas}
                  href={`/nilai?kelas=${encodeURIComponent(k.kelas)}`}
                  className="group rounded-2xl border border-[#e2e8f0] bg-white p-4 transition hover:border-[#99f6e4] hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-[#0f172a]">Kelas {k.kelas}</span>
                    {k.rata !== null ? <Chip tone="ok">rata {k.rata}</Chip> : <Chip>belum dinilai</Chip>}
                  </div>
                  <p className="mt-1 text-[12px] text-[#64748b]">
                    {k.terkumpul}/{k.total} berkas terkumpul · {k.dinilai} dinilai
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eef2f6]">
                    <div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${persen}%` }} />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    )
  }

  // ---------- siswa ----------
  const berkas = await berkasSiswa(akun, sekolah)
  const terbaru = berkas[0]

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white">
        <div className="border-b border-[#e2e8f0] bg-gradient-to-br from-[#f0fdfa] to-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f766e]">Ujian praktik</p>
              <h1 className="mt-1 text-xl font-semibold text-[#0f172a] sm:text-2xl">{ujian.nama}</h1>
              <p className="mt-1 text-sm text-[#64748b]">
                {akun.nama} · NIS {akun.nis ?? "-"} · {sekolah}
                {akun.kelas ? ` · Kelas ${akun.kelas}` : ""}
              </p>
            </div>
            {terbaru ? <Chip tone="ok">Sudah mengumpulkan</Chip> : <Chip tone="warn">Belum mengumpulkan</Chip>}
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <div className="sm:col-span-2">
            <p className="text-sm text-[#334155]">{ujian.deskripsi || "Kumpulkan berkas tugas praktik ICT Anda."}</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-[#64748b]">
              <li>• Satu berkas per siswa (PDF, dokumen, gambar, atau arsip).</li>
              <li>• Mengunggah ulang akan mengganti berkas sebelumnya.</li>
              <li>• Berkas hanya bisa dilihat lewat halaman ini, bukan tautan luar.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-[#e2e8f0] bg-[#fbfdff] p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#94a3b8]">Batas waktu</p>
            <p className="mt-1 text-sm font-semibold text-[#0f172a]">{ujian.tutup || "Belum ditentukan"}</p>
            <Link
              href="/unggah"
              className="mt-3 block rounded-xl bg-[#0f766e] px-4 py-2 text-center text-[13px] font-semibold text-white transition hover:bg-[#115e59]"
            >
              {terbaru ? "Ganti berkas" : "Kumpulkan sekarang"}
            </Link>
          </div>
        </div>

        {terbaru && (
          <div className="border-t border-[#e2e8f0] p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">Berkas terkirim</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-[#fbfdff] p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#0f172a]">{terbaru.name}</p>
                <p className="text-[12px] text-[#64748b]">
                  {new Date(terbaru.createdTime).toLocaleString("id-ID")}
                  {terbaru.size ? ` · ${(Number(terbaru.size) / 1048576).toFixed(2)} MB` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/berkas/${terbaru.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-white"
                >
                  Lihat
                </a>
                <a
                  href={`/api/berkas/${terbaru.id}?mode=unduh`}
                  className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-white"
                >
                  Unduh
                </a>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
