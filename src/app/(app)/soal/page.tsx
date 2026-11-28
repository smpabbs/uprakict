import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun, penugasanGuru } from "@/lib/lms"
import { bacaSoal, semuaSlot, tingkatKelas } from "@/lib/soal"
import { MAKS_MB } from "@/lib/env"

export const runtime = "edge"
export const dynamic = "force-dynamic"

export default async function SoalPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; e?: string; k?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const akun = await ambilAkun(user.id)
  if (!akun) redirect("/")
  if (!["admin", "guru"].includes(akun.role)) redirect("/")

  const peta = await bacaSoal()
  const semua = semuaSlot()
  const penugasan = akun.role === "guru" ? await penugasanGuru(akun.id) : []
  const slot =
    akun.role === "admin"
      ? semua
      : semua.filter((s) =>
          penugasan.some((p) => tingkatKelas(p.kelas) === s.tingkat && p.target === s.target)
        )

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#e2e8f0] bg-white p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0f766e]">Pengaturan ujian</p>
        <h1 className="mt-1 text-xl font-semibold text-[#0f172a]">Berkas soal per jenjang</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Unggah satu berkas untuk tiap slot. Unggahan berlaku untuk semua siswa dan guru di slot itu;
          guru hanya melihat slot yang diampu.
        </p>
        {sp.ok && (
          <p className="mt-4 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[13px] text-[#15803d]">
            Soal tersimpan{sp.k ? ` (${sp.k})` : ""}.
          </p>
        )}
        {sp.e && (
          <p className="mt-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[13px] text-[#b91c1c]">
            {sp.e}
          </p>
        )}
      </section>

      {slot.length === 0 && (
        <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-5 text-[13px] text-[#92400e]">
          Anda belum ditugaskan mengajar ICT di LMS, jadi belum ada slot soal yang bisa diunggah.
          Hubungi kurikulum bila seharusnya ada.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {slot.map((s) => {
          const isi = peta[s.kunci]
          const terisi = Boolean(isi?.fileId || isi?.judul || isi?.isi)
          return (
            <section key={s.kunci} className="rounded-2xl border border-[#e2e8f0] bg-white">
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-3">
                <div>
                  <h2 className="text-[13px] font-semibold text-[#0f172a]">{s.label}</h2>
                  <p className="text-[11px] text-[#94a3b8]">
                    {isi?.updated_at
                      ? `Terakhir diubah ${new Date(isi.updated_at).toLocaleString("id-ID")}${isi.oleh ? ` oleh ${isi.oleh}` : ""}`
                      : "Belum diisi"}
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-2 py-1 text-[10px] font-semibold " +
                    (terisi ? "bg-[#dcfce7] text-[#15803d]" : "bg-[#fef3c7] text-[#b45309]")
                  }
                >
                  {terisi ? "TERISI" : "KOSONG"}
                </span>
              </div>

              {isi?.fileId && (
                <div className="border-b border-[#e2e8f0] px-5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">Berkas soal</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-[#fbfdff] p-3">
                    <p className="min-w-0 truncate text-[13px] font-medium text-[#0f172a]">
                      {isi.fileName || isi.judul}
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={`/api/berkas/${isi.fileId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-[#e2e8f0] px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:bg-white"
                      >
                        Lihat
                      </a>
                      <a
                        href={`/api/berkas/${isi.fileId}?mode=unduh`}
                        className="rounded-lg border border-[#e2e8f0] px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:bg-white"
                      >
                        Unduh
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {isi?.lampiran && (
                <div className="border-b border-[#e2e8f0] px-5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">Lampiran</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e2e8f0] bg-[#fbfdff] p-3">
                    <p className="min-w-0 truncate text-[13px] text-[#334155]">{isi.lampiran.name}</p>
                    <a
                      href={`/api/berkas/${isi.lampiran.id}?mode=unduh`}
                      className="rounded-lg border border-[#e2e8f0] px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:bg-white"
                    >
                      Unduh lampiran
                    </a>
                  </div>
                </div>
              )}

              <form method="POST" action="/api/soal" encType="multipart/form-data" className="space-y-3 p-5">
                <input type="hidden" name="kunci" value={s.kunci} />
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Judul (opsional)
                  </label>
                  <input
                    name="judul"
                    defaultValue={isi?.judul ?? ""}
                    placeholder={`Ujian Praktik ICT Kelas ${s.tingkat}`}
                    className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#99f6e4]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Berkas soal (PDF)
                  </label>
                  <input
                    type="file"
                    name="berkas"
                    accept="application/pdf,.pdf"
                    className="block w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[12px] file:mr-3 file:rounded-md file:border-0 file:bg-[#0f766e] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
                  />
                  <p className="mt-1 text-[11px] text-[#94a3b8]">
                    Wajib PDF — tampil langsung di halaman siswa. Maks {MAKS_MB} MB. Unggahan baru
                    menggantikan berkas lama.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                    Lampiran (opsional)
                  </label>
                  <input
                    type="file"
                    name="lampiran"
                    accept=".doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.txt,.pdf"
                    className="block w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[12px] file:mr-3 file:rounded-md file:border-0 file:bg-[#475569] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-white"
                  />
                  <p className="mt-1 text-[11px] text-[#94a3b8]">
                    Berkas pendukung bebas format, bisa diunduh siswa. Maks {MAKS_MB} MB.
                  </p>
                  {isi?.lampiran && (
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-[#64748b]">
                      <input type="checkbox" name="hapus_lampiran" value="1" />
                      Hapus lampiran saat ini ({isi.lampiran.name})
                    </label>
                  )}
                </div>
                <button className="rounded-lg bg-[#0f766e] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#115e59]">
                  Simpan soal
                </button>
              </form>
            </section>
          )
        })}
      </div>
    </div>
  )
}
