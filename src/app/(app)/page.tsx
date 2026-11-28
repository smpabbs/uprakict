import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun, siswaSekolah, penugasanGuru, siswaCocok } from "@/lib/lms"
import { infoUjian, namaSekolah, berkasSiswa, rekapSekolah, waktuMundur, labelBatas, terlambat } from "@/lib/ujian"
import { bacaSoal, kunciSoal, targetProgul, tingkatKelas } from "@/lib/soal"

export const runtime = "edge"
export const dynamic = "force-dynamic"

function Chip({ children, tone = "netral" }: { children: React.ReactNode; tone?: "netral" | "ok" | "warn" }) {
  const map = {
    netral: "bg-[#d2dbe6] text-[#475569]",
    ok: "bg-[#c4ebd2] text-[#14532d]",
    warn: "bg-[#f0d59f] text-[#7c2d12]",
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
      <div className="rounded-2xl border border-[#e9adad] bg-[#f9dede] p-5 text-sm text-[#991b1b]">
        Akun ini belum punya profil di LMS. Hubungi admin sekolah.
      </div>
    )
  }

  // admin mengelola soal; peran lain tanpa halaman ujian diberi pesan (bukan redirect loop)
  if (akun.role === "admin") redirect("/soal")
  if (akun.role !== "siswa" && akun.role !== "guru") {
    return (
      <div className="rounded-2xl border border-[#e9c474] bg-[#f5e8c6] p-5 text-sm text-[#7c2d12]">
        Akun dengan peran {akun.role} belum punya akses ke halaman ujian. Hubungi admin sekolah.
      </div>
    )
  }

  const [ujian, sekolah] = await Promise.all([infoUjian(), namaSekolah(akun.sekolah_id)])

  if (akun.role === "guru") {
    const [daftar, penugasan] = await Promise.all([siswaSekolah(akun.sekolah_id ?? ""), penugasanGuru(akun.id)])
    const { baris } = await rekapSekolah(daftar, sekolah)
    const perNis = new Map(baris.map((b) => [b.nis, b]))

    // satu kartu per penugasan LMS (kelas + progul), hanya yang ada siswanya
    const perKelas = penugasan
      .map((p) => {
        const isi = daftar.filter((d) => siswaCocok(d, p)).map((d) => perNis.get(d.nis ?? "")).filter(Boolean)
        const dinilaiArr = isi.filter((b) => b!.nilai !== "")
        return {
          kunci: p.kelas + p.target,
          label: p.label,
          total: isi.length,
          terkumpul: isi.filter((b) => b!.berkas).length,
          dinilai: dinilaiArr.length,
          rata:
            dinilaiArr.length > 0
              ? Math.round(dinilaiArr.reduce((a, b) => a + Number(b!.nilai), 0) / dinilaiArr.length)
              : null,
        }
      })
      .filter((k) => k.total > 0)
      .sort((a, b) => a.label.localeCompare(b.label))

    const total = perKelas.reduce((a, k) => a + k.total, 0)
    const terkumpul = perKelas.reduce((a, k) => a + k.terkumpul, 0)
    const dinilai = perKelas.reduce((a, k) => a + k.dinilai, 0)

    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-[#b7c2cf] bg-[#eef2f7] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f5f58]">Ruang guru</p>
              <h1 className="mt-1 text-xl font-semibold text-[#0f172a] sm:text-2xl">{ujian.nama}</h1>
              <p className="mt-1 text-sm text-[#37424f]">
                {sekolah} · {ujian.tahunAjaran} semester {ujian.semester}
                {ujian.tutup ? ` · batas ${labelBatas()}` : " · pengumpulan masih dibuka"}
              </p>
            </div>
            <Link
              href="/nilai"
              className="rounded-xl bg-[#115e59] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0c4a44]"
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
              <div key={s.label} className="rounded-xl border border-[#b7c2cf] bg-[#e5ebf2] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#3f4a58]">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#0f172a]">{s.nilai}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0f172a]">Kelas yang Anda ampu di LMS</h2>
            <Link href="/nilai" className="text-[12px] font-medium text-[#0f5f58] hover:underline">
              Buka rekap
            </Link>
          </div>
          {perKelas.length === 0 && (
            <div className="rounded-2xl border border-[#e9c474] bg-[#f5e8c6] p-5 text-[13px] text-[#7c2d12]">
              Anda belum ditugaskan mengajar ICT di LMS untuk tahun ajaran ini. Hubungi kurikulum bila
              seharusnya ada kelas yang tampil.
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {perKelas.map((k) => {
              const persen = k.total ? Math.round((k.terkumpul / k.total) * 100) : 0
              return (
                <Link
                  key={k.kunci}
                  href={`/nilai?k=${encodeURIComponent(k.kunci)}`}
                  className="group rounded-2xl border border-[#b7c2cf] bg-[#eef2f7] p-4 transition hover:border-[#6ccbb7] hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-[#0f172a]">{k.label}</span>
                    {k.rata !== null ? <Chip tone="ok">rata {k.rata}</Chip> : <Chip>belum dinilai</Chip>}
                  </div>
                  <p className="mt-1 text-[12px] text-[#37424f]">
                    {k.terkumpul}/{k.total} berkas terkumpul · {k.dinilai} dinilai
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#c6d1de]">
                    <div className="h-full rounded-full bg-[#115e59]" style={{ width: `${persen}%` }} />
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
  const tingkat = tingkatKelas(akun.kelas)
  const target = targetProgul(akun.progul)
  const mundur = waktuMundur()
  let soalSiswa: {
    judul: string
    isi: string
    fileId?: string
    fileName?: string
    mime?: string
    lampiran?: { id: string; name: string } | null
  } | null = null
  if (tingkat) {
    const peta = await bacaSoal()
    const s = peta[kunciSoal(tingkat, target)]
    if (s && (s.judul || s.isi || s.fileId || s.lampiran)) {
      soalSiswa = {
        judul: s.judul,
        isi: s.isi,
        fileId: s.fileId,
        fileName: s.fileName,
        mime: s.mime,
        lampiran: s.lampiran,
      }
    }
  }
  const pdfSoal = soalSiswa?.fileId && soalSiswa.mime === "application/pdf" ? soalSiswa : null

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-[#b7c2cf] bg-[#eef2f7]">
        <div className="border-b border-[#b7c2cf] bg-gradient-to-br from-[#d7ece7] to-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f5f58]">Ujian praktik</p>
              <h1 className="mt-1 text-xl font-semibold text-[#0f172a] sm:text-2xl">{ujian.nama}</h1>
              <p className="mt-1 text-sm text-[#37424f]">
                {akun.nama} · NIS {akun.nis ?? "-"} · {sekolah}
                {akun.kelas ? ` · Kelas ${akun.kelas}` : ""}
              </p>
            </div>
            {terbaru ? (
              <Chip tone={terlambat(terbaru.createdTime) ? "warn" : "ok"}>
                {terlambat(terbaru.createdTime) ? "Terkumpul (terlambat)" : "Sudah mengumpulkan"}
              </Chip>
            ) : (
              <Chip tone="warn">Belum mengumpulkan</Chip>
            )}
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <div className="sm:col-span-2">
            <p className="text-sm text-[#334155]">{ujian.deskripsi || "Kumpulkan berkas tugas praktik ICT Anda."}</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-[#37424f]">
              <li>• Satu berkas per siswa (PDF, dokumen, gambar, atau arsip).</li>
              <li>• Mengunggah ulang akan mengganti berkas sebelumnya.</li>
              <li>• Berkas hanya bisa dilihat lewat halaman ini, bukan tautan luar.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-[#b7c2cf] bg-[#e5ebf2] p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#3f4a58]">Batas waktu</p>
            <p className="mt-1 text-sm font-semibold text-[#0f172a]">{labelBatas()}</p>
            {mundur && !mundur.pakaiJadwal && (
              <p className="mt-1 text-[11px] leading-relaxed text-[#37424f]">
                Pengumpulan tetap terbuka. Waktu acuan hanya untuk menandai siswa yang terlambat.
              </p>
            )}
            <Link
              href="/unggah"
              className="mt-3 block rounded-xl bg-[#115e59] px-4 py-2 text-center text-[13px] font-semibold text-white transition hover:bg-[#0c4a44]"
            >
              {terbaru ? "Ganti berkas" : "Kumpulkan sekarang"}
            </Link>
          </div>
        </div>

        {terbaru && (
          <div className="border-t border-[#b7c2cf] p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#3f4a58]">Berkas terkirim</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b7c2cf] bg-[#e5ebf2] p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#0f172a]">{terbaru.name}</p>
                <p className="text-[12px] text-[#37424f]">
                  {new Date(terbaru.createdTime).toLocaleString("id-ID")}
                  {terbaru.size ? ` · ${(Number(terbaru.size) / 1048576).toFixed(2)} MB` : ""}
                  {terlambat(terbaru.createdTime) ? " · terlambat" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/api/berkas/${terbaru.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[#b7c2cf] px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#eef2f7]"
                >
                  Lihat
                </a>
                <a
                  href={`/api/berkas/${terbaru.id}?mode=unduh`}
                  className="rounded-lg border border-[#b7c2cf] px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#eef2f7]"
                >
                  Unduh
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#b7c2cf] bg-[#eef2f7] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f5f58]">
          Soal &amp; instruksi {tingkat ? `kelas ${tingkat}` : ""} {target === "ICT" ? "· progul ICT" : "· non-ICT"}
        </p>
        {soalSiswa ? (
          <>
            <h2 className="mt-1 text-base font-semibold text-[#0f172a]">
              {soalSiswa.judul || soalSiswa.fileName || "Soal"}
            </h2>
            {soalSiswa.isi && (
              <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-[#dbe3ec] p-4 font-sans text-[13px] leading-relaxed text-[#334155]">
                {soalSiswa.isi}
              </pre>
            )}
            {pdfSoal ? (
              <iframe
                src={`/api/berkas/${pdfSoal.fileId}`}
                title={soalSiswa.judul || "Berkas soal"}
                className="mt-3 h-[80vh] min-h-[420px] w-full rounded-xl border border-[#b7c2cf] bg-[#eef2f7]"
              />
            ) : (
              soalSiswa.fileId && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#b7c2cf] bg-[#e5ebf2] p-3">
                  <span className="min-w-0 truncate text-[13px] font-medium text-[#334155]">
                    {soalSiswa.fileName || "Berkas soal"}
                  </span>
                  <a
                    href={`/api/berkas/${soalSiswa.fileId}?mode=unduh`}
                    className="rounded-lg border border-[#b7c2cf] bg-[#eef2f7] px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#d2dbe6]"
                  >
                    Unduh berkas soal
                  </a>
                </div>
              )
            )}
            {soalSiswa.lampiran && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#b7c2cf] bg-[#e5ebf2] p-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#3f4a58]">Lampiran</p>
                  <p className="truncate text-[13px] font-medium text-[#334155]">{soalSiswa.lampiran.name}</p>
                </div>
                <a
                  href={`/api/berkas/${soalSiswa.lampiran.id}?mode=unduh`}
                  className="rounded-lg border border-[#b7c2cf] bg-[#eef2f7] px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#d2dbe6]"
                >
                  Unduh lampiran
                </a>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-[13px] text-[#37424f]">
            Instruksi untuk jenjang dan progul Anda belum diisi guru/admin. Silakan cek kembali nanti.
          </p>
        )}
      </section>
    </div>
  )
}
