import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun, siswaSekolah } from "@/lib/lms"
import { infoUjian, namaSekolah, rekapSekolah } from "@/lib/ujian"
import { kelasGuru } from "@/lib/prefs"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default async function NilaiPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string; ok?: string; e?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const akun = await ambilAkun(user.id)
  if (!akun) redirect("/")
  if (akun.role !== "guru") redirect("/")

  const [ujian, sekolah, daftar, pref] = await Promise.all([
    infoUjian(),
    namaSekolah(akun.sekolah_id),
    siswaSekolah(akun.sekolah_id ?? ""),
    kelasGuru(akun.username ?? akun.id),
  ])
  const { baris } = await rekapSekolah(daftar, sekolah)

  const semuaKelas = Array.from(new Set(daftar.map((d) => d.kelas ?? "-"))).sort()
  const kelasSaya = pref.length ? pref.filter((k) => semuaKelas.includes(k)) : []
  const kelasAktif = sp.kelas && semuaKelas.includes(sp.kelas) ? sp.kelas : kelasSaya[0] ?? semuaKelas[0] ?? "-"

  const isi = baris.filter((b) => b.kelas === kelasAktif)
  const terkumpul = isi.filter((b) => b.berkas).length
  const dinilai = isi.filter((b) => b.nilai !== "").length
  const rata =
    dinilai > 0
      ? Math.round(isi.filter((b) => b.nilai !== "").reduce((a, b) => a + Number(b.nilai), 0) / dinilai)
      : null

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f766e]">Rekap &amp; penilaian</p>
            <h1 className="mt-1 text-xl font-semibold text-[#0f172a]">{ujian.nama}</h1>
            <p className="mt-1 text-sm text-[#64748b]">
              {sekolah} · {ujian.tahunAjaran} semester {ujian.semester}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Siswa", v: isi.length },
              { label: "Kumpul", v: terkumpul },
              { label: "Dinilai", v: dinilai },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[#e2e8f0] bg-[#fbfdff] px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">{s.label}</p>
                <p className="text-lg font-semibold text-[#0f172a]">{s.v}</p>
              </div>
            ))}
          </div>
        </div>

        {sp.ok && (
          <p className="mt-4 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[13px] text-[#15803d]">
            {sp.ok === "kelas" ? "Kelas yang Anda ampu sudah disimpan." : `Nilai untuk NIS ${sp.ok} tersimpan.`}
            {rata !== null ? ` Rata-rata kelas ${kelasAktif}: ${rata}.` : ""}
          </p>
        )}
        {sp.e && (
          <p className="mt-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#b91c1c]">
            {sp.e}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[#e2e8f0] bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e2e8f0] p-3">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">Kelas</span>
          {semuaKelas.map((k) => {
            const aktif = k === kelasAktif
            const jumlah = baris.filter((b) => b.kelas === k).length
            return (
              <Link
                key={k}
                href={`/nilai?kelas=${encodeURIComponent(k)}`}
                className={
                  "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition " +
                  (aktif
                    ? "bg-[#0f766e] text-white shadow-sm"
                    : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]")
                }
              >
                {k} <span className={aktif ? "text-white/70" : "text-[#94a3b8]"}>({jumlah})</span>
              </Link>
            )
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-wide text-[#64748b]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">NIS</th>
                <th className="px-4 py-2.5 font-semibold">Nama</th>
                <th className="px-4 py-2.5 font-semibold">Berkas</th>
                <th className="px-4 py-2.5 font-semibold">Nilai &amp; catatan</th>
              </tr>
            </thead>
            <tbody>
              {isi.map((b) => (
                <tr key={b.nis + b.nama} className="border-t border-[#eef2f6] align-middle hover:bg-[#fbfdff]">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-[#64748b]">{b.nis}</td>
                  <td className="px-4 py-2.5 font-medium text-[#0f172a]">{b.nama}</td>
                  <td className="px-4 py-2.5">
                    {b.berkas ? (
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/api/berkas/${b.berkas.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-[#e2e8f0] px-2 py-1 text-[11px] font-medium text-[#334155] hover:bg-[#f1f5f9]"
                        >
                          Lihat
                        </a>
                        <a
                          href={`/api/berkas/${b.berkas.id}?mode=unduh`}
                          className="rounded-lg border border-[#e2e8f0] px-2 py-1 text-[11px] font-medium text-[#334155] hover:bg-[#f1f5f9]"
                        >
                          Unduh
                        </a>
                        <span className="ml-1 text-[10px] text-[#94a3b8]">
                          {new Date(b.berkas.createdTime).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                    ) : (
                      <span className="rounded-full bg-[#fef3c7] px-2 py-1 text-[10px] font-semibold text-[#b45309]">
                        belum
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <form method="POST" action="/api/nilai" className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="nis" value={b.nis} />
                      <input type="hidden" name="nama" value={b.nama} />
                      <input type="hidden" name="kelas" value={b.kelas} />
                      <input type="hidden" name="kembali" value={kelasAktif} />
                      <input
                        name="nilai"
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        defaultValue={b.nilai}
                        placeholder="0–100"
                        className="w-20 rounded-lg border border-[#e2e8f0] px-2 py-1.5 text-center text-[13px] focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#99f6e4]"
                      />
                      <input
                        name="feedback"
                        defaultValue={b.feedback}
                        placeholder="catatan untuk siswa"
                        className="min-w-[140px] flex-1 rounded-lg border border-[#e2e8f0] px-2 py-1.5 text-[13px] focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#99f6e4]"
                      />
                      <button className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#115e59]">
                        Simpan
                      </button>
                      {b.oleh && (
                        <span className="w-full text-[10px] text-[#94a3b8]">
                          {b.oleh}
                          {b.pada ? ` · ${new Date(b.pada).toLocaleString("id-ID")}` : ""}
                        </span>
                      )}
                    </form>
                  </td>
                </tr>
              ))}
              {isi.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[13px] text-[#94a3b8]">
                    Tidak ada siswa di kelas ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <details className="rounded-2xl border border-[#e2e8f0] bg-white p-4">
        <summary className="cursor-pointer text-[13px] font-semibold text-[#0f172a]">
          Atur kelas yang saya ampu {kelasSaya.length > 0 && <span className="text-[#0f766e]">({kelasSaya.join(", ")})</span>}
        </summary>
        <p className="mt-2 text-[12px] text-[#64748b]">
          Pilih kelas yang Anda ajar. Pilihan ini menentukan tampilan awal halaman rekap dan beranda.
        </p>
        <form method="POST" action="/api/kelas-saya" className="mt-3">
          <div className="flex flex-wrap gap-2">
            {semuaKelas.map((k) => (
              <label
                key={k}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-[12px] font-medium text-[#334155] has-[:checked]:border-[#0f766e] has-[:checked]:bg-[#f0fdfa]"
              >
                <input
                  type="checkbox"
                  name="kelas"
                  value={k}
                  defaultChecked={kelasSaya.includes(k)}
                  className="h-3.5 w-3.5 accent-[#0f766e]"
                />
                {k}
              </label>
            ))}
          </div>
          <button className="mt-3 rounded-lg bg-[#0f172a] px-4 py-2 text-[12px] font-semibold text-white">
            Simpan kelas saya
          </button>
        </form>
      </details>
    </div>
  )
}
