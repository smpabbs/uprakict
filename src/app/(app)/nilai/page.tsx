import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun, siswaSekolah, penugasanGuru, siswaCocok, type Akun, type Penugasan } from "@/lib/lms"
import { infoUjian, namaSekolah, rekapSekolah, labelBatas, terlambat } from "@/lib/ujian"
import { bacaSoal, kunciSoal, tingkatKelas } from "@/lib/soal"

export const runtime = "edge"
export const dynamic = "force-dynamic"

const key = (p: Penugasan) => p.kelas + p.target

export default async function NilaiPage({
  searchParams,
}: {
  searchParams: Promise<{ k?: string; ok?: string; e?: string }>
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

  const [ujian, sekolah, daftar, penugasan] = await Promise.all([
    infoUjian(),
    namaSekolah(akun.sekolah_id),
    siswaSekolah(akun.sekolah_id ?? ""),
    penugasanGuru(akun.id),
  ])
  const { baris } = await rekapSekolah(daftar, sekolah)
  const perNis = new Map(baris.map((b) => [b.nis, b]))
  const petaSoal = await bacaSoal()

  // hanya penugasan yang punya siswa
  const tugas = penugasan
    .map((p) => ({ p, siswa: daftar.filter((d: Akun) => siswaCocok(d, p)) }))
    .filter((t) => t.siswa.length > 0)

  const aktif = tugas.find((t) => key(t.p) === sp.k) ?? tugas[0]
  const barisAktif = aktif ? aktif.siswa.map((s) => perNis.get(s.nis ?? "")).filter(Boolean) : []

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#cbd5e1] bg-[#f5f8fb] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f6b63]">Rekap &amp; penilaian</p>
            <h1 className="mt-1 text-xl font-semibold text-[#0f172a]">{ujian.nama}</h1>
            <p className="mt-1 text-sm text-[#495663]">
              {sekolah} · {ujian.tahunAjaran} semester {ujian.semester} · acuan kumpul {labelBatas()}
            </p>
          </div>
          {aktif && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Siswa", v: barisAktif.length },
                { label: "Kumpul", v: barisAktif.filter((b) => b!.berkas).length },
                { label: "Terlambat", v: barisAktif.filter((b) => terlambat(b!.berkas?.createdTime)).length },
                { label: "Dinilai", v: barisAktif.filter((b) => b!.nilai !== "").length },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-[#cbd5e1] bg-[#eef3f8] px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[#4d5968]">{s.label}</p>
                  <p className="text-lg font-semibold text-[#0f172a]">{s.v}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {sp.ok && (
          <p className="mt-4 rounded-xl border border-[#a7e8bc] bg-[#e7f6ed] px-3 py-2 text-[13px] text-[#166534]">
            Nilai untuk NIS {sp.ok} tersimpan.
          </p>
        )}
        {sp.e && (
          <p className="mt-4 rounded-xl border border-[#f2b8b8] bg-[#fdeaea] px-3 py-2 text-[13px] text-[#b91c1c]">
            {sp.e}
          </p>
        )}
      </section>

      {tugas.length === 0 ? (
        <div className="rounded-2xl border border-[#f5d17f] bg-[#fdf1d3] p-5 text-[13px] text-[#92400e]">
          Anda belum ditugaskan mengajar ICT di LMS untuk tahun ajaran ini (atau kelas yang ditugaskan belum
          punya siswa). Hubungi kurikulum bila seharusnya ada kelas yang tampil.
        </div>
      ) : (
        <section className="rounded-2xl border border-[#cbd5e1] bg-[#f5f8fb]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#cbd5e1] p-3">
            <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[#4d5968]">
              Kelas ampu
            </span>
            {tugas.map((t) => {
              const on = aktif && key(aktif.p) === key(t.p)
              return (
                <Link
                  key={key(t.p)}
                  href={`/nilai?k=${encodeURIComponent(key(t.p))}`}
                  className={
                    "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition " +
                    (on ? "bg-[#115e59] text-white shadow-sm" : "bg-[#dde5ee] text-[#475569] hover:bg-[#cbd5e1]")
                  }
                >
                  {t.p.label} <span className={on ? "text-white/70" : "text-[#4d5968]"}>({t.siswa.length})</span>
                </Link>
              )
            })}
          </div>

          {aktif && (() => {
            const t = tingkatKelas(aktif.p.kelas)
            const s = t ? petaSoal[kunciSoal(t, aktif.p.target)] : undefined
            const ada = Boolean(s?.fileId || s?.judul || s?.isi)
            return (
              <details className="border-b border-[#cbd5e1] bg-[#eef3f8] px-5 py-3">
                <summary className="cursor-pointer text-[12px] font-semibold text-[#0f172a]">
                  Soal / instruksi {aktif.p.label}{" "}
                  {ada ? `— ${s?.judul || s?.fileName || ""}` : "(belum diisi)"}
                </summary>
                {s?.fileId &&
                  (s.mime === "application/pdf" ? (
                    <iframe
                      src={`/api/berkas/${s.fileId}`}
                      title={s.judul || "Berkas soal"}
                      className="mt-2 h-[70vh] min-h-[360px] w-full rounded-xl border border-[#cbd5e1] bg-[#f5f8fb]"
                    />
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f5f8fb] p-3">
                      <span className="min-w-0 truncate text-[12.5px] font-medium text-[#334155]">
                        {s.fileName || "Berkas soal"}
                      </span>
                      <a
                        href={`/api/berkas/${s.fileId}?mode=unduh`}
                        className="rounded-lg border border-[#cbd5e1] px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:bg-[#dde5ee]"
                      >
                        Unduh berkas soal
                      </a>
                    </div>
                  ))}
                {s?.lampiran && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f5f8fb] p-3">
                    <span className="min-w-0 truncate text-[12.5px] text-[#334155]">
                      Lampiran: {s.lampiran.name}
                    </span>
                    <a
                      href={`/api/berkas/${s.lampiran.id}?mode=unduh`}
                      className="rounded-lg border border-[#cbd5e1] px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:bg-[#dde5ee]"
                    >
                      Unduh lampiran
                    </a>
                  </div>
                )}
                {s?.isi && (
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-[#f5f8fb] p-3 font-sans text-[12.5px] leading-relaxed text-[#334155]">
                    {s.isi}
                  </pre>
                )}
                {!ada && (
                  <p className="mt-2 text-[12.5px] text-[#495663]">
                    Belum ada soal untuk jenjang/progul ini. Unggah di menu Soal.
                  </p>
                )}
              </details>
            )
          })()}

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-[#e6ecf3] text-left text-[11px] uppercase tracking-wide text-[#495663]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">NIS</th>
                  <th className="px-4 py-2.5 font-semibold">Nama</th>
                  <th className="px-4 py-2.5 font-semibold">Berkas</th>
                  <th className="px-4 py-2.5 font-semibold">Nilai &amp; catatan</th>
                </tr>
              </thead>
              <tbody>
                {barisAktif.map((b) => (
                  <tr key={b!.nis + b!.nama} className="border-t border-[#d8e0ea] align-middle hover:bg-[#eef3f8]">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-[#495663]">{b!.nis}</td>
                    <td className="px-4 py-2.5 font-medium text-[#0f172a]">{b!.nama}</td>
                    <td className="px-4 py-2.5">
                      {b!.berkas ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`/api/berkas/${b!.berkas.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-[#cbd5e1] px-2 py-1 text-[11px] font-medium text-[#334155] hover:bg-[#dde5ee]"
                          >
                            Lihat
                          </a>
                          <a
                            href={`/api/berkas/${b!.berkas.id}?mode=unduh`}
                            className="rounded-lg border border-[#cbd5e1] px-2 py-1 text-[11px] font-medium text-[#334155] hover:bg-[#dde5ee]"
                          >
                            Unduh
                          </a>
                          <span
                            className={
                              "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold " +
                              (terlambat(b!.berkas.createdTime)
                                ? "bg-[#f8dfae] text-[#92400e]"
                                : "bg-[#d0f2dc] text-[#166534]")
                            }
                          >
                            {terlambat(b!.berkas.createdTime) ? "terlambat" : "tepat"}
                          </span>
                          <span className="ml-1 text-[10px] text-[#4d5968]">
                            {new Date(b!.berkas.createdTime).toLocaleString("id-ID")}
                          </span>
                        </div>
                      ) : (
                        <span className="rounded-full bg-[#f8dfae] px-2 py-1 text-[10px] font-semibold text-[#92400e]">
                          belum
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <form method="POST" action="/api/nilai" className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="nis" value={b!.nis} />
                        <input type="hidden" name="nama" value={b!.nama} />
                        <input type="hidden" name="kelas" value={b!.kelas} />
                        <input type="hidden" name="kembali" value={aktif ? key(aktif.p) : ""} />
                        <input
                          name="nilai"
                          type="number"
                          min={0}
                          max={100}
                          inputMode="numeric"
                          defaultValue={b!.nilai}
                          placeholder="0–100"
                          className="w-20 rounded-lg border border-[#cbd5e1] px-2 py-1.5 text-center text-[13px] focus:border-[#0f6b63] focus:outline-none focus:ring-2 focus:ring-[#7ddcc9]"
                        />
                        <input
                          name="feedback"
                          defaultValue={b!.feedback}
                          placeholder="catatan untuk siswa"
                          className="min-w-[140px] flex-1 rounded-lg border border-[#cbd5e1] px-2 py-1.5 text-[13px] focus:border-[#0f6b63] focus:outline-none focus:ring-2 focus:ring-[#7ddcc9]"
                        />
                        <button className="rounded-lg bg-[#115e59] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#0c4a44]">
                          Simpan
                        </button>
                        {b!.oleh && (
                          <span className="w-full text-[10px] text-[#4d5968]">
                            {b!.oleh}
                            {b!.pada ? ` · ${new Date(b!.pada).toLocaleString("id-ID")}` : ""}
                          </span>
                        )}
                      </form>
                    </td>
                  </tr>
                ))}
                {barisAktif.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-[13px] text-[#4d5968]">
                      Tidak ada siswa pada kelas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
